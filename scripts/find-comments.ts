export type Comment = { line: number; text: string };

type Span = { start: number; end: number };

const REGEX_PRECEDING_PUNCTUATORS = new Set([..."(,=:[!&|?{};+-*%<>~^}"]);
const REGEX_PRECEDING_KEYWORDS = new Set([
  "return",
  "typeof",
  "instanceof",
  "in",
  "of",
  "new",
  "delete",
  "void",
  "throw",
  "case",
  "do",
  "else",
  "yield",
  "await",
]);
const ASTRO_TEMPLATE_PATTERN =
  /<(script|style)\b[^>]*>([\s\S]*?)<\/\1\s*>|<!--[\s\S]*?(?:-->|$)|\{\s*(\/\*[\s\S]*?\*\/|\/\/[^\n]*)/g;

const findOrEnd = (src: string, needle: string, from: number, end: number): number => {
  const index = src.indexOf(needle, from);
  return index === -1 || index > end ? end : index;
};

const recordUntil = (spans: Span[], start: number, end: number): number => {
  spans.push({ start, end });
  return end;
};

const skipLineComment = (src: string, i: number, end: number, spans: Span[]): number =>
  recordUntil(spans, i, findOrEnd(src, "\n", i, end));

const skipBlockComment = (src: string, i: number, end: number, spans: Span[]): number =>
  recordUntil(spans, i, Math.min(findOrEnd(src, "*/", i + 2, end) + 2, end));

const skipString = (src: string, i: number, end: number, quote: string): number => {
  let j = i + 1;
  while (j < end) {
    const c = src[j];
    if (c === "\\") j += 2;
    else if (c === quote) return j + 1;
    else if (c === "\n") return j;
    else j++;
  }
  return end;
};

const skipRegexLiteral = (src: string, i: number, end: number): number => {
  let j = i + 1;
  let inCharacterClass = false;
  while (j < end && src[j] !== "\n") {
    const c = src[j];
    j += c === "\\" ? 2 : 1;
    if (c === "[") inCharacterClass = true;
    else if (c === "]") inCharacterClass = false;
    else if (c === "/" && !inCharacterClass) break;
  }
  while (j < end && /[a-z]/i.test(src.charAt(j))) j++;
  return j;
};

const regexCanFollow = (previousToken: string): boolean =>
  previousToken === "" || REGEX_PRECEDING_PUNCTUATORS.has(previousToken) || REGEX_PRECEDING_KEYWORDS.has(previousToken);

const scanScript = (src: string, start: number, end: number, spans: Span[]): void => {
  const stack = [{ inTemplate: false, braceDepth: 0 }];
  let previousToken = "";
  let i = start;
  while (i < end) {
    const frame = stack[stack.length - 1];
    if (!frame) break;
    const c = src.charAt(i);
    const next = src.charAt(i + 1);
    if (frame.inTemplate) {
      if (c === "\\") {
        i += 2;
      } else if (c === "`") {
        stack.pop();
        previousToken = ")";
        i++;
      } else if (c === "$" && next === "{") {
        stack.push({ inTemplate: false, braceDepth: 0 });
        previousToken = "{";
        i += 2;
      } else {
        i++;
      }
      continue;
    }
    if (/\s/.test(c)) {
      i++;
    } else if (c === "/" && next === "/") {
      i = skipLineComment(src, i, end, spans);
    } else if (c === "/" && next === "*") {
      i = skipBlockComment(src, i, end, spans);
    } else if (c === "/" && regexCanFollow(previousToken)) {
      i = skipRegexLiteral(src, i, end);
      previousToken = ")";
    } else if (c === "'" || c === '"') {
      i = skipString(src, i, end, c);
      previousToken = ")";
    } else if (c === "`") {
      stack.push({ inTemplate: true, braceDepth: 0 });
      i++;
    } else if (c === "{") {
      frame.braceDepth++;
      previousToken = "{";
      i++;
    } else if (c === "}") {
      if (frame.braceDepth === 0 && stack.length > 1) stack.pop();
      else frame.braceDepth--;
      previousToken = "}";
      i++;
    } else if (/[\w$]/.test(c)) {
      let j = i;
      while (j < end && /[\w$]/.test(src.charAt(j))) j++;
      previousToken = src.slice(i, j);
      i = j;
    } else {
      previousToken = c;
      i++;
    }
  }
};

const scanCss = (src: string, start: number, end: number, spans: Span[]): void => {
  let i = start;
  while (i < end) {
    const c = src.charAt(i);
    if (c === "'" || c === '"') i = skipString(src, i, end, c);
    else if (c === "/" && src[i + 1] === "*") i = skipBlockComment(src, i, end, spans);
    else i++;
  }
};

const scanAstro = (src: string, spans: Span[]): void => {
  const frontmatter = /^---\r?\n[\s\S]*?\r?\n---/.exec(src);
  let templateStart = 0;
  if (frontmatter) {
    scanScript(src, frontmatter[0].indexOf("\n") + 1, frontmatter[0].length - 3, spans);
    templateStart = frontmatter[0].length;
  }
  ASTRO_TEMPLATE_PATTERN.lastIndex = templateStart;
  for (const match of src.matchAll(ASTRO_TEMPLATE_PATTERN)) {
    const whole = match[0];
    const [, tag, body = "", expressionComment] = match;
    if (tag) {
      const bodyStart = match.index + whole.indexOf(">") + 1;
      const scan = tag === "script" ? scanScript : scanCss;
      scan(src, bodyStart, bodyStart + body.length, spans);
    } else if (expressionComment) {
      const commentStart = match.index + whole.indexOf(expressionComment);
      spans.push({ start: commentStart, end: commentStart + expressionComment.length });
    } else {
      spans.push({ start: match.index, end: match.index + whole.length });
    }
  }
};

const isExempt = (text: string): boolean => text.startsWith("/*!") || /^\/\/\/\s*<reference\b/.test(text);

export const findComments = (path: string, source: string): Comment[] => {
  const spans: Span[] = [];
  if (path.endsWith(".astro")) scanAstro(source, spans);
  else if (path.endsWith(".css")) scanCss(source, 0, source.length, spans);
  else scanScript(source, 0, source.length, spans);
  return spans
    .map(({ start, end }) => ({ line: source.slice(0, start).split("\n").length, text: source.slice(start, end) }))
    .filter(({ text }) => !isExempt(text));
};
