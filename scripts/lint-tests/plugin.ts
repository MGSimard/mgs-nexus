import { noFixedSleep } from "./no-fixed-sleep.ts";
import { noFlakeMasking } from "./no-flake-masking.ts";
import { noMockingSubject } from "./no-mocking-subject.ts";
import { noSourceInspection } from "./no-source-inspection.ts";
import { noTestSeams } from "./no-test-seams.ts";
import { noUnsignaledPoll } from "./no-unsignaled-poll.ts";

export default {
  meta: { name: "mgs-testing" },
  rules: {
    "no-fixed-sleep": noFixedSleep,
    "no-flake-masking": noFlakeMasking,
    "no-mocking-subject": noMockingSubject,
    "no-source-inspection": noSourceInspection,
    "no-test-seams": noTestSeams,
    "no-unsignaled-poll": noUnsignaledPoll,
  },
};
