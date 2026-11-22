import { noFixedSleep } from "./no-fixed-sleep.ts";
import { tester } from "./rule-tester.ts";

const TEST = "src/lib/feature.test.ts";
const SPEC = "e2e/home.spec.ts";
const error = [{ messageId: "noFixedSleep" }];

tester.run("no-fixed-sleep", noFixedSleep, {
  valid: [
    { filename: TEST, code: "await save();" },
    { filename: TEST, code: "await vi.advanceTimersByTimeAsync(500);" },
    { filename: SPEC, code: 'await expect(page.getByRole("dialog")).toBeVisible();' },
    {
      name: "production code is not checked",
      filename: "src/lib/retry.ts",
      code: "await new Promise((r) => setTimeout(r, 500));",
    },
  ],
  invalid: [
    { filename: TEST, code: "await new Promise((r) => setTimeout(r, 50));", errors: error },
    { filename: TEST, code: "await new Promise(function (resolve) { setTimeout(resolve, 0); });", errors: error },
    { filename: TEST, code: "await sleep(100);", errors: error },
    { name: "node:timers/promises", filename: TEST, code: "await setTimeout(100);", errors: error },
    { name: "Playwright fixed wait", filename: SPEC, code: "await page.waitForTimeout(500);", errors: error },
    {
      name: "in a test helper",
      filename: "src/lib/feature.test-utils.ts",
      code: "export const settle = () => new Promise((r) => setTimeout(r, 10));",
      errors: error,
    },
  ],
});
