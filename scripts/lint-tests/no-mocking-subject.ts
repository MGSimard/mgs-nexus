import { isMemberCall, isTestFile, normalizePath, stringValue, type Rule } from "./test-context.ts";

const MOCK_CALLS = ["mock", "doMock"];
const SOURCE_EXTENSION = /\.[cm]?[jt]sx?$/;
const TEST_SUFFIX = /\.(?:test|spec)\.[cm]?[jt]sx?$/;
const TEST_FOLDER = /\/(?:__tests__|tests)$/;
const ALIASES = ["@/"];

const collapse = (path: string): string => {
  const parts: string[] = [];
  for (const part of path.split("/")) {
    if (part === "..") parts.pop();
    else if (part !== ".") parts.push(part);
  }
  return parts.join("/");
};

const subjectPaths = (filename: string): string[] => {
  const testPath = normalizePath(filename);
  const directory = testPath.slice(0, testPath.lastIndexOf("/"));
  const base = testPath.slice(directory.length + 1).replace(TEST_SUFFIX, "");
  const paths = [`${directory}/${base}`, `${directory}/${base}/index`];
  if (TEST_FOLDER.test(directory)) {
    const parent = directory.replace(TEST_FOLDER, "");
    paths.push(`${parent}/${base}`, `${parent}/${base}/index`);
  }
  return paths;
};

const resolveSpecifier = (specifier: string, filename: string): string | null => {
  const testPath = normalizePath(filename);
  const stripped = specifier.replace(SOURCE_EXTENSION, "");
  if (stripped.startsWith(".")) return collapse(`${testPath.slice(0, testPath.lastIndexOf("/"))}/${stripped}`);
  const alias = ALIASES.find((prefix) => stripped.startsWith(prefix));
  const srcIndex = testPath.lastIndexOf("/src/");
  if (alias === undefined || srcIndex === -1) return null;
  return `${testPath.slice(0, srcIndex)}/src/${stripped.slice(alias.length)}`;
};

export const noMockingSubject = {
  meta: {
    type: "problem",
    docs: { description: "Don't mock the module under test." },
    messages: {
      noMockingSubject:
        "This test mocks `{{specifier}}`, the module it tests, so it can only assert what the mock returns. Test the real module.",
    },
  },
  create(context) {
    if (!isTestFile(context.filename)) return {};
    const subjects = new Set(subjectPaths(context.filename));
    return {
      CallExpression(node) {
        if (!MOCK_CALLS.some((call) => isMemberCall(node, "vi", call))) return;
        const specifier = stringValue(node.arguments[0]);
        if (specifier === null) return;
        const resolved = resolveSpecifier(specifier, context.filename);
        if (resolved !== null && subjects.has(resolved)) {
          context.report({ node, messageId: "noMockingSubject", data: { specifier } });
        }
      },
    };
  },
} satisfies Rule;
