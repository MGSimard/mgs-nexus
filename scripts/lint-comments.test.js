import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";

const LINT = resolve(import.meta.dirname, "lint-comments.js");
const BASELINE = "scripts/comment-baseline.json";
const fixtures = [];

after(() => {
  for (const dir of fixtures) rmSync(dir, { recursive: true, force: true });
});

const fixture = (files, baseline) => {
  const dir = mkdtempSync(join(tmpdir(), "lint-comments-"));
  fixtures.push(dir);
  spawnSync("git", ["init", "-q"], { cwd: dir });
  const all = baseline ? { ...files, [BASELINE]: JSON.stringify(baseline) } : files;
  for (const [path, content] of Object.entries(all)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return {
    dir,
    run: (...args) => {
      const result = spawnSync(process.execPath, [LINT, ...args], { cwd: dir, encoding: "utf8" });
      return { code: result.status, out: result.stdout + result.stderr };
    },
    baseline: () => JSON.parse(readFileSync(join(dir, BASELINE), "utf8")),
  };
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
  assert.equal(code, 1);
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
    assert.match(out, new RegExp(location.replace(".", "\\.")));
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
  assert.equal(code, 0, out);
});

test("allows license comments and triple-slash references", () => {
  const { code, out } = fixture({
    "a.ts": '/*! license */\n/// <reference types="astro/client" />\nconst a = 1;\n',
  }).run();
  assert.equal(code, 0, out);
});

test("skips the vendored skill folders", () => {
  const { code, out } = fixture({ ".agents/s/x.ts": COMMENTED_TS, ".claude/s/x.ts": COMMENTED_TS }).run();
  assert.equal(code, 0, out);
});

test("passes when a file holds exactly its baseline count", () => {
  const { code, out } = fixture({ "a.ts": COMMENTED_TS }, { "a.ts": 2 }).run();
  assert.equal(code, 0, out);
});

test("fails when a file goes above its baseline count", () => {
  const { code, out } = fixture({ "a.ts": COMMENTED_TS }, { "a.ts": 1 }).run();
  assert.equal(code, 1);
  assert.match(out, /a\.ts: 2 comment\(s\), baseline allows 1/);
  assert.match(out, /Code comments are banned/);
});

test("fails when a file drops below its baseline until the baseline is lowered", () => {
  const { code, out } = fixture({ "a.ts": COMMENTED_TS }, { "a.ts": 3 }).run();
  assert.equal(code, 1);
  assert.match(out, /run `pnpm lint --update`/);
  assert.doesNotMatch(out, /Code comments are banned/);
});

test("with paths, checks only the files it is given", () => {
  const { run } = fixture({ "clean.ts": "const a = 1;\n", "dirty.ts": COMMENTED_TS });
  assert.equal(run("clean.ts").code, 0);
  assert.equal(run("dirty.ts").code, 1);
});

test("with paths, ignores baseline entries for files it was not given", () => {
  const { code, out } = fixture(
    { "clean.ts": "const a = 1;\n", "other.ts": "const b = 2;\n" },
    { "other.ts": 1, "gone.ts": 2 }
  ).run("clean.ts");
  assert.equal(code, 0, out);
});

test("with paths, --update lowers only those files and keeps the rest of the baseline", () => {
  const lint = fixture({ "a.ts": COMMENTED_TS, "other.ts": COMMENTED_TS }, { "a.ts": 3, "other.ts": 5 });
  assert.equal(lint.run("--update", "a.ts").code, 0);
  assert.deepEqual(lint.baseline(), { "a.ts": 2, "other.ts": 5 });
});

test("with paths, matches absolute paths to their baseline entries", () => {
  const { dir, run } = fixture({ "src/a.ts": COMMENTED_TS }, { "src/a.ts": 2 });
  const { code, out } = run(join(dir, "src", "a.ts"));
  assert.equal(code, 0, out);
});

test("with paths, ignores files outside the scanned types and folders", () => {
  const { code, out } = fixture({
    "notes.md": "<!-- note -->\n",
    ".agents/s/x.ts": COMMENTED_TS,
    "dirty.ts": COMMENTED_TS,
  }).run("notes.md", ".agents/s/x.ts");
  assert.equal(code, 0, out);
});

test("--update lowers counts, drops stale entries and never raises a count", () => {
  const lint = fixture({ "a.ts": COMMENTED_TS, "new.ts": "// new\n" }, { "a.ts": 3, "gone.ts": 1 });
  assert.equal(lint.run("--update").code, 1);
  assert.deepEqual(lint.baseline(), { "a.ts": 2 });
});
