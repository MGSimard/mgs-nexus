import { isMemberCall, isTestContext, type NodeOf, type Rule } from "./test-context.ts";

const SPY_STATE =
  /\.(?:toHaveBeenCalled\w*|toHaveBeenLastCalledWith|toHaveBeenNthCalledWith|toBeCalled\w*|toHaveReturned\w*|toHaveLastReturnedWith|toHaveNthReturnedWith)\b|\.mock\.(?:calls|results|lastCall|instances)\b/;

const isPoll = (node: NodeOf<"CallExpression">): boolean =>
  isMemberCall(node, "vi", "waitFor") ||
  isMemberCall(node, "expect", "poll") ||
  (node.callee.type === "Identifier" && node.callee.name === "waitFor");

export const noUnsignaledPoll = {
  meta: {
    type: "problem",
    docs: { description: "Don't poll spy state until it changes." },
    messages: {
      noUnsignaledPoll:
        "Don't poll a spy until it is called; that races a deadline. Await the action that triggers the call, then assert once.",
    },
  },
  create(context) {
    if (!isTestContext(context.filename)) return {};
    return {
      CallExpression(node) {
        if (!isPoll(node)) return;
        const callback = node.arguments[0];
        if (callback !== undefined && SPY_STATE.test(context.sourceCode.getText(callback))) {
          context.report({ node, messageId: "noUnsignaledPoll" });
        }
      },
    };
  },
} satisfies Rule;
