const PROTECTED = [
  "docs/agents/testing.md",
  ".agents/skills/mgs-testing-conventions/",
  ".claude/skills/mgs-testing-conventions/",
  "scripts/lint-tests/",
  "scripts/check-rule-changes.ts",
  "scripts/check-rule-changes.test.ts",
  "oxlint.config.ts",
  ".github/workflows/",
];

const isProtected = (file: string): boolean =>
  PROTECTED.some((path) => (path.endsWith("/") ? file.startsWith(path) : file === path));

const changed = process.argv.slice(2).filter((file) => file !== "");
const ruleFiles = changed.filter(isProtected);
const others = changed.filter((file) => !isProtected(file));

if (ruleFiles.length > 0 && others.length > 0) {
  console.error(
    [
      "A change to the testing rules goes in its own pull request (docs/agents/testing.md, rule 14).",
      "",
      "Testing rules changed:",
      ...ruleFiles.map((file) => `  ${file}`),
      "",
      "Other files changed:",
      ...others.map((file) => `  ${file}`),
    ].join("\n")
  );
  process.exit(1);
}
