# No code comments

Code carries no comments. Comments drift from the code they describe, restate what the code already says, or excuse a hack instead of fixing it. A decision worth keeping goes into an ADR, a hack gets an issue, and everything else is deleted. The `/delete-comment` skill holds the triage procedure.

`scripts/lint-comments.ts` enforces the ban in two layers. The pre-commit hook runs it through lint-staged on staged files only, so it checks exactly what is being committed, not unstaged work in the same tree. CI runs the full scan (`pnpm lint`) as the backstop: it also catches what a staged-only check cannot, like a lowered count never committed to the baseline, and it can't be skipped with `--no-verify`.

## Consequences

- **Scope.** The lint scans script, Astro, CSS and JSON files (JSON so that comments in JSONC configs like `tsconfig.json` and `.vscode/*.json` are caught). YAML, shell and `.gitignore` are not scanned, but the rule still applies to them; a reminder belongs in an issue or the README task list. The installed skill folders (`.agents/`, `.claude/`) are skipped, since most of their content comes from upstream repos.
- **Ratchet.** `scripts/comment-baseline.json` records how many comments each grandfathered file may still hold. A file may never go above its count. When a file drops below it, the lint fails until `pnpm lint --update` lowers the baseline, so progress is locked in by a commit. `--update` only ever lowers counts.
- **Exemptions.** Comments opening with `/*!` (the license-preservation convention minifiers honour) and `/// <reference …>` directives are allowed. The vendored Preflight license header uses `/*!` because the MIT license requires the notice to be kept. Block comments opening with a hex color (`/* #c0fe04 Marathon Green */`) are allowed while the design system is being built: they keep the source hex next to its converted `oklch()` value. Remove this exemption once the palette settles.
