import { noFlakeMasking } from "./no-flake-masking.ts";
import { tester } from "./rule-tester.ts";

const TEST = "src/lib/feature.test.ts";
const SPEC = "e2e/home.spec.ts";
const VITEST_CONFIG = "vitest.config.ts";
const PLAYWRIGHT_CONFIG = "playwright.config.ts";
const error = [{ messageId: "noFlakeMasking" }];

tester.run("no-flake-masking", noFlakeMasking, {
  valid: [
    { filename: TEST, code: 'it("saves", async () => {});' },
    { filename: TEST, code: 'it.each([1, 2])("handles %i", (n) => {});' },
    { filename: TEST, code: 'describe("cards", () => {});' },
    { filename: SPEC, code: 'test.describe.configure({ mode: "parallel" });' },
    { filename: VITEST_CONFIG, code: 'export default { test: { environment: "node" } };' },
    {
      name: "a global timeout caps the run instead of retrying a test",
      filename: PLAYWRIGHT_CONFIG,
      code: "export default { globalTimeout: 600_000, workers: 1 };",
    },
  ],
  invalid: [
    { name: "timeout argument", filename: TEST, code: 'it("saves", async () => {}, 10_000);', errors: error },
    {
      name: "retry option",
      filename: TEST,
      code: 'test("saves", { retry: 3 }, async () => {});',
      errors: error,
    },
    {
      name: "timeout option on each",
      filename: TEST,
      code: 'it.each([1])("n %i", (n) => {}, { timeout: 9000 });',
      errors: error,
    },
    {
      name: "suite timeout",
      filename: TEST,
      code: 'describe("cards", { timeout: 9000 }, () => {});',
      errors: error,
    },
    { name: "hook timeout", filename: TEST, code: "beforeEach(async () => {}, 20_000);", errors: error },
    { name: "runtime config", filename: TEST, code: "vi.setConfig({ testTimeout: 20_000 });", errors: error },
    { name: "Playwright test timeout", filename: SPEC, code: "test.setTimeout(60_000);", errors: error },
    { name: "Playwright slow test", filename: SPEC, code: "test.slow();", errors: error },
    {
      name: "Playwright suite retries",
      filename: SPEC,
      code: "test.describe.configure({ retries: 2 });",
      errors: error,
    },
    { name: "Playwright skipped test", filename: SPEC, code: 'test.skip("opens", async () => {});', errors: error },
    { name: "Playwright fixme test", filename: SPEC, code: 'test.fixme("opens", async () => {});', errors: error },
    {
      name: "Playwright skipped suite",
      filename: SPEC,
      code: 'test.describe.skip("menu", () => {});',
      errors: error,
    },
    {
      name: "Playwright focused test",
      filename: SPEC,
      code: 'test.only("opens", async () => {});',
      errors: error,
    },
    {
      name: "Vitest config file",
      filename: VITEST_CONFIG,
      code: "export default { test: { retry: 2, testTimeout: 20_000, hookTimeout: 20_000 } };",
      errors: [...error, ...error, ...error],
    },
    {
      name: "Playwright config file",
      filename: PLAYWRIGHT_CONFIG,
      code: "export default { retries: 2, timeout: 60_000 };",
      errors: [...error, ...error],
    },
  ],
});
