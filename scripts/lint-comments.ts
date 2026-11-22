import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

type Range = [start: number, end: number];
type Comment = { line: number; preview: string };
type Baseline = Record<string, number>;
type Scanner = (src: string, start: number, end: number, ranges: Range[]) => void;

const BASELINE_PATH = "scripts/comment-baseline.json";
const SCANNED_EXTENSIONS = /\.(ts|js|mjs|cjs|astro|css|json)$/;
const EXCLUDED_DIRECTORIES = /^(\.agents|\.claude|node_modules|dist|\.astro)\//;
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

const findOrEnd = (src: string, needle: string, from: number, end: number): number => {
  const index = src.indexOf(needle, from);
  return index === -1 || index > end ? end : index;
};

const skipString = (src: string, i: number, end: number, quote: string): number => {
  let j = i + 1;
  while (j < end) {
    if (src[j] === "\\") j += 2;
    else if (src[j] === quote) return j + 1;
    else if (src[j] === "\n") return j;
    else j++;
  }
  return end;
};

const skipRegexLiteral = (src: string, i: number, end: number): number => {
  let j = i + 1;
  let inCharacterClass = false;
  while (j < end && src[j] !== "\n") {
    const c = src[j];
    if (c === "\\") j += 2;
    else if (c === "[") ((inCharacterClass = true), j++);
    else if (c === "]") ((inCharacterClass = false), j++);
    else if (c === "/" && !inCharacterClass) {
      j++;
      break;
    } else j++;
  }
  while (j < end && /[a-z]/i.test(src.charAt(j))) j++;
  return j;
};

const regexCanFollow = (previousToken: string): boolean =>
  previousToken === "" || REGEX_PRECEDING_PUNCTUATORS.has(previousToken) || REGEX_PRECEDING_KEYWORDS.has(previousToken);

const scanScript: Scanner = (src, start, end, ranges) => {
  const stack = [{ inTemplate: false, braceDepth: 0 }];
  let previousToken = "";
  let i = start;
  while (i < end) {
    const frame = stack[stack.length - 1];
    if (!frame) break;
    const c = src.charAt(i);
    const next = src.charAt(i + 1);
    if (frame.inTemplate) {
      if (c === "\\") i += 2;
      else if (c === "`") (stack.pop(), (previousToken = ")"), i++);
      else if (c === "$" && next === "{")
        (stack.push({ inTemplate: false, braceDepth: 0 }), (previousToken = "{"), (i += 2));
      else i++;
      continue;
    }
    if (/\s/.test(c)) {
      i++;
    } else if (c === "/" && next === "/") {
      const commentEnd = findOrEnd(src, "\n", i, end);
      ranges.push([i, commentEnd]);
      i = commentEnd;
    } else if (c === "/" && next === "*") {
      const commentEnd = Math.min(findOrEnd(src, "*/", i + 2, end) + 2, end);
      ranges.push([i, commentEnd]);
      i = commentEnd;
    } else if (c === "/") {
      if (regexCanFollow(previousToken)) ((i = skipRegexLiteral(src, i, end)), (previousToken = ")"));
      else ((previousToken = "/"), i++);
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

const scanCss: Scanner = (src, start, end, ranges) => {
  let i = start;
  while (i < end) {
    const c = src.charAt(i);
    if (c === "'" || c === '"') i = skipString(src, i, end, c);
    else if (c === "/" && src[i + 1] === "*") {
      const commentEnd = Math.min(findOrEnd(src, "*/", i + 2, end) + 2, end);
      ranges.push([i, commentEnd]);
      i = commentEnd;
    } else i++;
  }
};

const ASTRO_TEMPLATE_PATTERN =
  /<(script|style)\b[^>]*>([\s\S]*?)<\/\1\s*>|<!--[\s\S]*?(?:-->|$)|\{\s*(\/\*[\s\S]*?\*\/|\/\/[^\n]*)/g;

const scanAstro = (src: string, ranges: Range[]): void => {
  const frontmatter = /^---\r?\n[\s\S]*?\r?\n---/.exec(src);
  let templateStart = 0;
  if (frontmatter) {
    scanScript(src, frontmatter[0].indexOf("\n") + 1, frontmatter[0].length - 3, ranges);
    templateStart = frontmatter[0].length;
  }
  ASTRO_TEMPLATE_PATTERN.lastIndex = templateStart;
  for (const match of src.matchAll(ASTRO_TEMPLATE_PATTERN)) {
    const whole = match[0];
    const [, tag, body = "", expressionComment] = match;
    if (tag) {
      const bodyStart = match.index + whole.indexOf(">") + 1;
      const scan = tag === "script" ? scanScript : scanCss;
      scan(src, bodyStart, bodyStart + body.length, ranges);
    } else if (expressionComment) {
      const commentStart = match.index + whole.indexOf(expressionComment);
      ranges.push([commentStart, commentStart + expressionComment.length]);
    } else {
      ranges.push([match.index, match.index + whole.length]);
    }
  }
};

const isExempt = (text: string): boolean => text.startsWith("/*!") || /^\/\/\/\s*<reference\b/.test(text);

const findComments = (file: string): Comment[] => {
  const src = readFileSync(file, "utf8");
  const ranges: Range[] = [];
  if (file.endsWith(".astro")) scanAstro(src, ranges);
  else if (file.endsWith(".css")) scanCss(src, 0, src.length, ranges);
  else scanScript(src, 0, src.length, ranges);
  return ranges
    .map(([start, end]) => ({
      line: src.slice(0, start).split("\n").length,
      text: src.slice(start, end),
    }))
    .filter(({ text }) => !isExempt(text))
    .map(({ line, text }) => ({ line, preview: (text.split("\n")[0] ?? "").trim().slice(0, 100) }));
};

const isScanned = (file: string): boolean =>
  file !== "" && SCANNED_EXTENSIONS.test(file) && !EXCLUDED_DIRECTORIES.test(file) && existsSync(file);

const listFiles = (): string[] =>
  execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
    .split("\n")
    .map((file) => file.trim())
    .filter(isScanned);

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((arg) => arg.startsWith("--")));
const toRepoPath = (path: string): string => relative(process.cwd(), resolve(path)).split(sep).join("/");
const paths = argv.filter((arg) => !arg.startsWith("--")).map(toRepoPath);
const files = paths.length > 0 ? paths.filter(isScanned) : listFiles();
const baseline: Baseline = existsSync(BASELINE_PATH) ? JSON.parse(readFileSync(BASELINE_PATH, "utf8")) : {};
const found = new Map(files.map((file) => [file, findComments(file)]));

if (flags.has("--list")) {
  for (const [file, comments] of found)
    for (const { line, preview } of comments) console.log(`${file}:${line}  ${preview}`);
  process.exit(0);
}

const problems: string[] = [];
const nextBaseline: Baseline = { ...baseline };
let overBaseline = false;
const checked = paths.length > 0 ? [...found.keys()] : [...new Set([...Object.keys(baseline), ...found.keys()])];
for (const file of checked.sort()) {
  const allowed = baseline[file] ?? 0;
  const comments = found.get(file) ?? [];
  if (comments.length > allowed) {
    overBaseline = true;
    problems.push(`${file}: ${comments.length} comment(s), baseline allows ${allowed}`);
    for (const { line, preview } of comments) problems.push(`  ${file}:${line}  ${preview}`);
  } else if (comments.length < allowed && !flags.has("--update")) {
    problems.push(
      `${file}: down to ${comments.length} comment(s) from ${allowed}; run \`pnpm lint --update\` to lock in the ratchet`
    );
  }
  const kept = Math.min(allowed, comments.length);
  if (kept > 0) nextBaseline[file] = kept;
  else delete nextBaseline[file];
}

if (flags.has("--update")) writeFileSync(BASELINE_PATH, `${JSON.stringify(nextBaseline, null, 2)}\n`);

if (problems.length > 0) {
  console.error(problems.join("\n"));
  if (overBaseline) {
    console.error(
      "\nCode comments are banned (docs/adr/0004-no-code-comments.md). Run /delete-comment to triage them."
    );
  }
  process.exit(1);
}
