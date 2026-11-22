import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { isExcluded } from "./excluded-paths.ts";

const REPO_PATH = /^(src|scripts|docs|public|\.agents|\.claude|\.github|\.husky|\.vscode)\/[\w./-]*$/;
const INLINE_CODE = /`([^`\n]+)`/g;

const listDocs = (): string[] =>
  execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "*.md"], { encoding: "utf8" })
    .split("\n")
    .map((file) => file.trim())
    .filter((file) => file !== "" && !isExcluded(file) && existsSync(file));

const findMissingPaths = (doc: string): string[] => {
  const missing: string[] = [];
  let inFence = false;
  readFileSync(doc, "utf8")
    .split("\n")
    .forEach((line, index) => {
      if (line.trimStart().startsWith("```")) inFence = !inFence;
      if (inFence) return;
      for (const [, path = ""] of line.matchAll(INLINE_CODE)) {
        if (REPO_PATH.test(path) && !existsSync(path)) missing.push(`${doc}:${index + 1}  \`${path}\` does not exist`);
      }
    });
  return missing;
};

const problems = listDocs().flatMap(findMissingPaths);

if (problems.length > 0) {
  console.error(problems.join("\n"));
  console.error("\nA doc names a path that isn't in the repo. Fix the path or the doc.");
  process.exit(1);
}
