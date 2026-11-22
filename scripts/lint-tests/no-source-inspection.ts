import { isTestContext, stringValue, type NodeOf, type Rule } from "./test-context.ts";

const FILE_SYSTEM_MODULES = new Set(["fs", "node:fs", "fs/promises", "node:fs/promises"]);
const RAW_SOURCE = /\.(?:[cm]?[jt]sx?|astro)\?raw$/;

const inspectsSource = (specifier: string | null): boolean =>
  specifier !== null && (FILE_SYSTEM_MODULES.has(specifier) || RAW_SOURCE.test(specifier));

const isImportMetaGlob = ({ callee }: NodeOf<"CallExpression">): boolean =>
  callee.type === "MemberExpression" &&
  callee.object.type === "MetaProperty" &&
  callee.property.type === "Identifier" &&
  callee.property.name.startsWith("glob");

export const noSourceInspection = {
  meta: {
    type: "problem",
    docs: { description: "Don't inspect files or source text in tests." },
    messages: {
      noSourceInspection:
        "Tests guard behavior, not files. Don't read the file system or source text here; a structural rule (a file exists, is gone, contains a string) belongs in lint.",
    },
  },
  create(context) {
    if (!isTestContext(context.filename)) return {};
    return {
      ImportDeclaration(node) {
        if (inspectsSource(stringValue(node.source))) context.report({ node, messageId: "noSourceInspection" });
      },
      ImportExpression(node) {
        if (inspectsSource(stringValue(node.source))) context.report({ node, messageId: "noSourceInspection" });
      },
      CallExpression(node) {
        const requiresSource =
          node.callee.type === "Identifier" &&
          node.callee.name === "require" &&
          inspectsSource(stringValue(node.arguments[0]));
        if (requiresSource || isImportMetaGlob(node)) context.report({ node, messageId: "noSourceInspection" });
      },
    };
  },
} satisfies Rule;
