import { resolve } from "node:path";
import { expect, test } from "vitest";
import { createFixture } from "./fixture.ts";

const SCRIPT = resolve(import.meta.dirname, "check-rule-changes.ts");
const run = (...changed: string[]) => createFixture(SCRIPT, {}).run(...changed);

test("fails a change that edits a testing rule together with other files", () => {
  const { code, out } = run("scripts/lint-tests/no-fixed-sleep.ts", "src/pages/index.astro");
  expect(code).toBe(1);
  expect(out).toMatch(/scripts\/lint-tests\/no-fixed-sleep\.ts/);
  expect(out).toMatch(/src\/pages\/index\.astro/);
});

test.each([
  ["only testing rules", [".agents/skills/mgs-testing-conventions/SKILL.md", "docs/agents/testing.md"]],
  ["only other files", ["src/pages/index.astro", "scripts/lint-comments.ts", "docs/agents/domain.md"]],
  ["nothing", []],
])("passes a change that touches %s", (_, changed) => {
  const { code, out } = run(...changed);
  expect(code, out).toBe(0);
});
