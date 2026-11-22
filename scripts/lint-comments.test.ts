import { join, resolve } from "node:path";
import { expect, test } from "vitest";
import { createFixture } from "./fixture.ts";

const LINT = resolve(import.meta.dirname, "lint-comments.ts");
const BASELINE = "scripts/comment-baseline.json";

const fixture = (files: Record<string, string>, baseline?: Record<string, number>) => {
  const created = createFixture(LINT, baseline ? { ...files, [BASELINE]: JSON.stringify(baseline) } : files);
  return { ...created, baseline: () => JSON.parse(created.read(BASELINE)) };
};

const COMMENTED_TS = "const a = 1;\n// line comment\n/* block comment */\n";

test("reports every comment in TypeScript, Astro and CSS with its line", () => {
  const { run } = fixture({
    "a.ts": COMMENTED_TS,
    "b.astro": [
      "---",
      "const x = 1; // frontmatter",
      "---",
      "<!-- markup -->",
      "{/* expression */}",
      "<script>",
      "  // script",
      "</script>",
      "<style>",
      "  /* style */",
      "</style>",
      "",
    ].join("\n"),
    "c.css": "a {}\n/* css */\n",
  });
  const { code, out } = run();
  expect(code).toBe(1);
  for (const location of [
    "a.ts:2",
    "a.ts:3",
    "b.astro:2",
    "b.astro:4",
    "b.astro:5",
    "b.astro:7",
    "b.astro:10",
    "c.css:2",
  ]) {
    expect(out).toMatch(new RegExp(location.replace(".", "\\.")));
  }
});

test("ignores comment markers inside strings, regexes, templates and markup", () => {
  const { code, out } = fixture({
    "a.ts": [
      'const a = "http://example.com";',
      "const b = 'it\\'s // fine';",
      "const r = /\\/\\*x\\*\\//g;",
      "const d = 10 / 2 / 1;",
      'const t = `a ${"/*"} // b`;',
      "",
    ].join("\n"),
    "b.astro":
      '<a href="https://example.com/a//b">text // and /* stars</a>\n<style>\n  a { background: url("//cdn/x.png"); }\n</style>\n',
  }).run();
  expect(code, out).toBe(0);
});

test("reports comments in JSON config files, not comment markers inside their strings", () => {
  const { code, out } = fixture({
    ".vscode/settings.json": '{\n  "url": "https://example.com/*x*/",\n  // reminder\n  "a": 1\n}\n',
  }).run();
  expect(code).toBe(1);
  expect(out).toMatch(/\.vscode\/settings\.json:3/);
  expect(out).not.toMatch(/settings\.json:2/);
});

test("allows license comments and triple-slash references", () => {
  const { code, out } = fixture({
    "a.ts": '/*! license */\n/// <reference types="astro/client" />\nconst a = 1;\n',
  }).run();
  expect(code, out).toBe(0);
});

test("skips the installed skill folders", () => {
  const { code, out } = fixture({ ".agents/s/x.ts": COMMENTED_TS, ".claude/s/x.ts": COMMENTED_TS }).run();
  expect(code, out).toBe(0);
});

test("passes when a file holds exactly its baseline count", () => {
  const { code, out } = fixture({ "a.ts": COMMENTED_TS }, { "a.ts": 2 }).run();
  expect(code, out).toBe(0);
});

test("fails when a file goes above its baseline count", () => {
  const { code, out } = fixture({ "a.ts": COMMENTED_TS }, { "a.ts": 1 }).run();
  expect(code).toBe(1);
  expect(out).toMatch(/a\.ts: 2 comment\(s\), baseline allows 1/);
  expect(out).toMatch(/Code comments are banned/);
});

test("fails when a file drops below its baseline until the baseline is lowered", () => {
  const { code, out } = fixture({ "a.ts": COMMENTED_TS }, { "a.ts": 3 }).run();
  expect(code).toBe(1);
  expect(out).toMatch(/run `pnpm lint --update`/);
  expect(out).not.toMatch(/Code comments are banned/);
});

test("with paths, checks only the files it is given", () => {
  const { run } = fixture({ "clean.ts": "const a = 1;\n", "dirty.ts": COMMENTED_TS });
  expect(run("clean.ts").code).toBe(0);
  expect(run("dirty.ts").code).toBe(1);
});

test("with paths, ignores baseline entries for files it was not given", () => {
  const { code, out } = fixture(
    { "clean.ts": "const a = 1;\n", "other.ts": "const b = 2;\n" },
    { "other.ts": 1, "gone.ts": 2 }
  ).run("clean.ts");
  expect(code, out).toBe(0);
});

test("with paths, --update lowers only those files and keeps the rest of the baseline", () => {
  const lint = fixture({ "a.ts": COMMENTED_TS, "other.ts": COMMENTED_TS }, { "a.ts": 3, "other.ts": 5 });
  expect(lint.run("--update", "a.ts").code).toBe(0);
  expect(lint.baseline()).toEqual({ "a.ts": 2, "other.ts": 5 });
});

test("with paths, matches absolute paths to their baseline entries", () => {
  const { dir, run } = fixture({ "src/a.ts": COMMENTED_TS }, { "src/a.ts": 2 });
  const { code, out } = run(join(dir, "src", "a.ts"));
  expect(code, out).toBe(0);
});

test("with paths, ignores files outside the scanned types and folders", () => {
  const { code, out } = fixture({
    "notes.md": "<!-- note -->\n",
    ".agents/s/x.ts": COMMENTED_TS,
    "dirty.ts": COMMENTED_TS,
  }).run("notes.md", ".agents/s/x.ts");
  expect(code, out).toBe(0);
});

test("--update lowers counts, drops stale entries and never raises a count", () => {
  const lint = fixture({ "a.ts": COMMENTED_TS, "new.ts": "// new\n" }, { "a.ts": 3, "gone.ts": 1 });
  expect(lint.run("--update").code).toBe(1);
  expect(lint.baseline()).toEqual({ "a.ts": 2 });
});
