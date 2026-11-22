import { noTestSeams } from "./no-test-seams.ts";
import { tester } from "./rule-tester.ts";

const SOURCE = "src/lib/session.ts";
const error = [{ messageId: "noTestSeams" }];

tester.run("no-test-seams", noTestSeams, {
  valid: [
    { filename: SOURCE, code: "export function resetSession() {}" },
    { filename: SOURCE, code: "export const latestTest = 1;" },
    {
      name: "test helpers may export anything",
      filename: "src/lib/session.test-utils.ts",
      code: "export function resetForTests() {}",
    },
  ],
  invalid: [
    { filename: SOURCE, code: "export function _resetCacheForTests() {}", errors: error },
    { filename: SOURCE, code: "export const cacheSizeForTesting = () => 0;", errors: error },
    { filename: SOURCE, code: "const internals = {}; export { internals as __testInternals };", errors: error },
    { filename: SOURCE, code: "export const TEST_ONLY_FLAG = true;", errors: error },
  ],
});
