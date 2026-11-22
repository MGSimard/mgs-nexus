import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after } from "node:test";

const fixtures: string[] = [];

after(() => {
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
    run: (...args: string[]) => {
      const result = spawnSync(process.execPath, [script, ...args], { cwd: dir, encoding: "utf8" });
      return { code: result.status, out: result.stdout + result.stderr };
    },
  };
};
