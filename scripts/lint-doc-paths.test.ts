import assert from "node:assert/strict";
import { resolve } from "node:path";
import { test } from "node:test";
import { createFixture } from "./fixture.ts";

const SCRIPT = resolve(import.meta.dirname, "lint-doc-paths.ts");
const run = (files: Record<string, string>) => createFixture(SCRIPT, files).run();

test("reports a backticked repo path that does not exist, with its line", () => {
  const { code, out } = run({ "docs/a.md": "# A\n\nSee `src/missing.ts`.\n" });
  assert.equal(code, 1);
  assert.match(out, /docs\/a\.md:3 .*src\/missing\.ts/);
});

test("passes when every backticked path exists, including folders", () => {
  const { code, out } = run({
    "src/real.ts": "",
    "docs/adr/x.md": "",
    "AGENTS.md": "See `src/real.ts` and `docs/adr/`.\n",
  });
  assert.equal(code, 0, out);
});

test("ignores globs, placeholders and fenced code blocks", () => {
  const { code, out } = run({
    "docs/a.md": "`.vscode/*.json` and `src/<context>/docs/adr/`\n\n```\n`src/nope.ts`\n```\n",
  });
  assert.equal(code, 0, out);
});

test("skips the installed skill folders", () => {
  const { code, out } = run({
    ".agents/skills/x/SKILL.md": "`src/nope.ts`\n",
    ".claude/skills/x/SKILL.md": "`src/nope.ts`\n",
  });
  assert.equal(code, 0, out);
});
