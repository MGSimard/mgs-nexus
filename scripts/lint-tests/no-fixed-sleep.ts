import { calleeName, isTestContext, type Argument, type Context, type Rule } from "./test-context.ts";

const SLEEP_NAMES = new Set(["sleep", "delay", "wait", "pause", "setTimeout", "waitForTimeout"]);
const TIMER_NAMES = ["setTimeout", "setInterval"];

const executorStartsTimer = (executor: Argument | undefined, context: Context): boolean => {
  if (executor?.type !== "ArrowFunctionExpression" && executor?.type !== "FunctionExpression") return false;
  const text = context.sourceCode.getText(executor);
  return TIMER_NAMES.some((name) => text.includes(`${name}(`));
};

export const noFixedSleep = {
  meta: {
    type: "problem",
    docs: { description: "Don't wait a fixed real-time delay in tests." },
    messages: {
      noFixedSleep:
        "Don't wait a fixed delay. Await the operation itself or a signal it emits (a web-first assertion, a returned promise, an event).",
    },
  },
  create(context) {
    if (!isTestContext(context.filename)) return {};
    return {
      NewExpression(node) {
        if (node.callee.type !== "Identifier" || node.callee.name !== "Promise") return;
        if (executorStartsTimer(node.arguments[0], context)) context.report({ node, messageId: "noFixedSleep" });
      },
      AwaitExpression(node) {
        const { argument } = node;
        if (argument.type !== "CallExpression") return;
        const name = calleeName(argument);
        if (name !== null && SLEEP_NAMES.has(name) && argument.arguments.length > 0) {
          context.report({ node, messageId: "noFixedSleep" });
        }
      },
    };
  },
} satisfies Rule;
