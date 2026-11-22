import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { isExcluded } from "./excluded-paths.ts";
import { findComments, isScannable, type FoundComment } from "./find-comments.ts";

type Baseline = Record<string, number>;

const BASELINE_PATH = "scripts/comment-baseline.json";

const isScanned = (file: string): boolean => file !== "" && isScannable(file) && !isExcluded(file) && existsSync(file);

const listFiles = (): string[] =>
  execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
    .split("\n")
    .map((file) => file.trim())
    .filter(isScanned);

const toRepoPath = (path: string): string => relative(process.cwd(), resolve(path)).split(sep).join("/");

const formatFinding = (file: string, { line, text }: FoundComment): string =>
  `${file}:${line}  ${(text.split("\n")[0] ?? "").trim().slice(0, 100)}`;

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((arg) => arg.startsWith("--")));
const paths = argv.filter((arg) => !arg.startsWith("--")).map(toRepoPath);
const files = paths.length > 0 ? paths.filter(isScanned) : listFiles();
const baseline: Baseline = existsSync(BASELINE_PATH) ? JSON.parse(readFileSync(BASELINE_PATH, "utf8")) : {};
const found = new Map(files.map((file) => [file, findComments(file, readFileSync(file, "utf8"))]));

if (flags.has("--list")) {
  for (const [file, comments] of found) for (const comment of comments) console.log(formatFinding(file, comment));
  process.exit(0);
}

const problems: string[] = [];
const nextBaseline: Baseline = { ...baseline };
let overBaseline = false;
const checked = paths.length > 0 ? [...found.keys()] : [...new Set([...Object.keys(baseline), ...found.keys()])];
for (const file of checked.sort()) {
  const allowed = baseline[file] ?? 0;
  const comments = found.get(file) ?? [];
  if (comments.length > allowed) {
    overBaseline = true;
    problems.push(`${file}: ${comments.length} comment(s), baseline allows ${allowed}`);
    for (const comment of comments) problems.push(`  ${formatFinding(file, comment)}`);
  } else if (comments.length < allowed && !flags.has("--update")) {
    problems.push(
      `${file}: down to ${comments.length} comment(s) from ${allowed}; run \`pnpm lint --update\` to lock in the ratchet`
    );
  }
  const kept = Math.min(allowed, comments.length);
  if (kept > 0) nextBaseline[file] = kept;
  else delete nextBaseline[file];
}

if (flags.has("--update")) writeFileSync(BASELINE_PATH, `${JSON.stringify(nextBaseline, null, 2)}\n`);

if (problems.length > 0) {
  console.error(problems.join("\n"));
  if (overBaseline) {
    console.error(
      "\nCode comments are banned (docs/adr/0004-no-code-comments.md). Run /delete-comment to triage them."
    );
  }
  process.exit(1);
}
