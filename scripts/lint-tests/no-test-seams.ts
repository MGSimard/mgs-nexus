import { isTestConfigFile, isTestContext, type NodeOf, type Rule } from "./test-context.ts";

const SEAM_NAME = /for_?tests?$|for_?testing$|^__test|test_?only|^_?reset\w*for_?tests?/i;

const exportedNames = (node: NodeOf<"ExportNamedDeclaration">): string[] => {
  if (node.specifiers.length > 0) {
    return node.specifiers.map(({ exported }) => (exported.type === "Literal" ? exported.value : exported.name));
  }
  const { declaration } = node;
  if (declaration === null) return [];
  if (declaration.type === "VariableDeclaration") {
    return declaration.declarations.flatMap(({ id }) => (id.type === "Identifier" ? [id.name] : []));
  }
  return "id" in declaration && declaration.id?.type === "Identifier" ? [declaration.id.name] : [];
};

export const noTestSeams = {
  meta: {
    type: "problem",
    docs: { description: "Don't export test-only seams from production code." },
    messages: {
      noTestSeams:
        "`{{name}}` looks like it exists only for tests. Test through the real entry point and delete the seam.",
    },
  },
  create(context) {
    if (isTestContext(context.filename) || isTestConfigFile(context.filename)) return {};
    return {
      ExportNamedDeclaration(node) {
        for (const name of exportedNames(node)) {
          if (SEAM_NAME.test(name)) context.report({ node, messageId: "noTestSeams", data: { name } });
        }
      },
    };
  },
} satisfies Rule;
