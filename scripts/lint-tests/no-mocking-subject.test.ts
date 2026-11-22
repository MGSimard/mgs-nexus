import { noMockingSubject } from "./no-mocking-subject.ts";
import { tester } from "./rule-tester.ts";

const TEST = "/repo/src/lib/intel-feed.test.ts";
const error = [{ messageId: "noMockingSubject" }];

tester.run("no-mocking-subject", noMockingSubject, {
  valid: [
    { name: "mocking a dependency", filename: TEST, code: 'vi.mock("./snapshot-store");' },
    { name: "mocking a package", filename: TEST, code: 'vi.mock("astro:content");' },
    {
      name: "only test files are checked",
      filename: "/repo/src/lib/intel-feed.test-utils.ts",
      code: 'vi.mock("./intel-feed");',
    },
  ],
  invalid: [
    { name: "relative sibling", filename: TEST, code: 'vi.mock("./intel-feed");', errors: error },
    { name: "with extension", filename: TEST, code: 'vi.doMock("./intel-feed.ts");', errors: error },
    { name: "through the @/ alias", filename: TEST, code: 'vi.mock("@/lib/intel-feed");', errors: error },
    {
      name: "from a tests/ folder",
      filename: "/repo/src/lib/tests/intel-feed.test.ts",
      code: 'vi.mock("../intel-feed");',
      errors: error,
    },
    { name: "a folder's index", filename: TEST, code: 'vi.mock("./intel-feed/index");', errors: error },
  ],
});
