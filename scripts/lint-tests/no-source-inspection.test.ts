import { noSourceInspection } from "./no-source-inspection.ts";
import { tester } from "./rule-tester.ts";

const TEST = "src/lib/feature.test.ts";
const error = [{ messageId: "noSourceInspection" }];

tester.run("no-source-inspection", noSourceInspection, {
  valid: [
    { filename: TEST, code: 'import { experimental_AstroContainer } from "astro/container";' },
    { name: "raw text fixture", filename: TEST, code: 'import advisory from "./advisory.fixture.md?raw";' },
    {
      name: "production code is not checked",
      filename: "astro.config.ts",
      code: 'import { readFileSync } from "node:fs";',
    },
  ],
  invalid: [
    { filename: TEST, code: 'import { existsSync } from "node:fs";', errors: error },
    { filename: TEST, code: 'const fs = await import("fs/promises");', errors: error },
    { filename: TEST, code: 'const fs = require("fs");', errors: error },
    { filename: TEST, code: 'import source from "./feature.ts?raw";', errors: error },
    { name: "Astro source as text", filename: TEST, code: 'import source from "./Card.astro?raw";', errors: error },
    { filename: TEST, code: 'const modules = import.meta.glob("./**/*.astro");', errors: error },
    { name: "in a Playwright spec", filename: "e2e/home.spec.ts", code: 'import fs from "node:fs";', errors: error },
  ],
});
