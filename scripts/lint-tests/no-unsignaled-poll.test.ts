import { noUnsignaledPoll } from "./no-unsignaled-poll.ts";
import { tester } from "./rule-tester.ts";

const TEST = "src/lib/feature.test.ts";
const error = [{ messageId: "noUnsignaledPoll" }];

tester.run("no-unsignaled-poll", noUnsignaledPoll, {
  valid: [
    {
      name: "polling what the user sees",
      filename: TEST,
      code: 'await vi.waitFor(() => expect(document.title).toBe("Saved"));',
    },
    {
      name: "asserting a spy once, after awaiting",
      filename: TEST,
      code: "await save(); expect(onSave).toHaveBeenCalledOnce();",
    },
  ],
  invalid: [
    { filename: TEST, code: "await waitFor(() => expect(onSave).toHaveBeenCalled());", errors: error },
    { filename: TEST, code: "await vi.waitFor(() => expect(spy).toHaveBeenCalledWith(1));", errors: error },
    { filename: TEST, code: "await expect.poll(() => spy.mock.calls.length).toBe(2);", errors: error },
  ],
});
