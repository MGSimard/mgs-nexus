import {
  findProperty,
  isMemberCall,
  isTestConfigFile,
  isTestContext,
  normalizePath,
  propertyKeyName,
  type Argument,
  type Expression,
  type NodeOf,
  type Rule,
} from "./test-context.ts";

const TEST_CALLS = new Set(["it", "test", "describe", "suite"]);
const HOOK_CALLS = new Set(["beforeEach", "afterEach", "beforeAll", "afterAll"]);
const BUILDERS = new Set(["each", "for", "skipIf", "runIf"]);
const MASKING_OPTIONS = ["retry", "retries", "timeout"];
const VITEST_CONFIG_KEYS = new Set(["retry", "testTimeout", "hookTimeout"]);
const PLAYWRIGHT_CONFIG_KEYS = new Set(["retries", "timeout"]);
const PLAYWRIGHT_CONFIG = /(?:^|\/)playwright(?:\.[\w-]+)*\.config\./;
const PLAYWRIGHT_TIMEOUT_CALLS = ["setTimeout", "slow"];
const PLAYWRIGHT_SPEC = /\.spec\.[cm]?[jt]sx?$/;
const PLAYWRIGHT_DISABLERS = new Set(["skip", "fixme", "only"]);

const disablesSpec = ({ callee }: NodeOf<"CallExpression">): boolean =>
  callee.type === "MemberExpression" &&
  callee.property.type === "Identifier" &&
  PLAYWRIGHT_DISABLERS.has(callee.property.name) &&
  rootName(callee) === "test";

const rootName = (callee: Expression): string | null => {
  let current = callee;
  while (current.type === "MemberExpression" || current.type === "CallExpression") {
    current = current.type === "MemberExpression" ? current.object : current.callee;
  }
  return current.type === "Identifier" ? current.name : null;
};

const isBuilderCall = ({ callee }: NodeOf<"CallExpression">): boolean =>
  callee.type === "MemberExpression" && callee.property.type === "Identifier" && BUILDERS.has(callee.property.name);

const isMaskingArgument = (argument: Argument): boolean =>
  (argument.type === "Literal" && typeof argument.value === "number") ||
  MASKING_OPTIONS.some((key) => findProperty(argument, key) !== null);

const masksTestCall = (node: NodeOf<"CallExpression">): boolean => {
  const name = rootName(node.callee);
  if (name === null) return false;
  const isTestCall = TEST_CALLS.has(name) && !isBuilderCall(node);
  if (!HOOK_CALLS.has(name) && !isTestCall) return false;
  return node.arguments.slice(1).some(isMaskingArgument);
};

const isConfigureCall = (node: NodeOf<"CallExpression">): boolean => {
  const { callee } = node;
  if (isMemberCall(node, "vi", "setConfig")) return true;
  return (
    callee.type === "MemberExpression" &&
    callee.property.type === "Identifier" &&
    callee.property.name === "configure" &&
    rootName(callee) === "test"
  );
};

const masksRuntimeConfig = (node: NodeOf<"CallExpression">): boolean => {
  if (PLAYWRIGHT_TIMEOUT_CALLS.some((call) => isMemberCall(node, "test", call))) return true;
  const options = node.arguments[0];
  if (!isConfigureCall(node) || options?.type !== "ObjectExpression") return false;
  return options.properties.some((property) => {
    const key = propertyKeyName(property);
    return key !== null && (VITEST_CONFIG_KEYS.has(key) || MASKING_OPTIONS.includes(key));
  });
};

export const noFlakeMasking = {
  meta: {
    type: "problem",
    docs: { description: "Don't retry, skip or focus tests, or raise their timeouts." },
    messages: {
      noFlakeMasking:
        "Don't retry, skip or focus a test, or raise its timeout; that hides a flake. Fix the root cause, or delete the test and write down why.",
    },
  },
  create(context) {
    if (isTestConfigFile(context.filename)) {
      const keys = PLAYWRIGHT_CONFIG.test(normalizePath(context.filename))
        ? PLAYWRIGHT_CONFIG_KEYS
        : VITEST_CONFIG_KEYS;
      return {
        Property(node) {
          const key = propertyKeyName(node);
          if (key !== null && keys.has(key)) context.report({ node, messageId: "noFlakeMasking" });
        },
      };
    }
    if (!isTestContext(context.filename)) return {};
    const isSpec = PLAYWRIGHT_SPEC.test(normalizePath(context.filename));
    return {
      CallExpression(node) {
        if (masksTestCall(node) || masksRuntimeConfig(node) || (isSpec && disablesSpec(node))) {
          context.report({ node, messageId: "noFlakeMasking" });
        }
      },
    };
  },
} satisfies Rule;
