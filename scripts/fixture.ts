import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll } from "vitest";

const fixtures: string[] = [];

afterAll(() => {
  for (const dir of fixtures) rmSync(dir, { recursive: true, force: true });
});

export const createFixture = (script: string, files: Record<string, string>) => {
  const dir = mkdtempSync(join(tmpdir(), "script-fixture-"));
  fixtures.push(dir);
  spawnSync("git", ["init", "-q"], { cwd: dir });
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return {
    dir,
    read: (path: string) => readFileSync(join(dir, path), "utf8"),
    run: (...args: string[]) => {
      const result = spawnSync(process.execPath, [script, ...args], { cwd: dir, encoding: "utf8" });
      return { code: result.status, out: result.stdout + result.stderr };
    },
  };
};
