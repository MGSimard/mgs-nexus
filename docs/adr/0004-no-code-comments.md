# No code comments

Source files carry no comments. Comments drift from the code they describe, restate what the code already says, or excuse a hack instead of fixing it. A decision worth keeping goes into an ADR, a hack gets an issue, and everything else is deleted. The `/delete-comment` skill holds the triage procedure.

`pnpm lint` (`scripts/lint-comments.js`) enforces the ban.

## Consequences

- **Ratchet.** `scripts/comment-baseline.json` records how many comments each grandfathered file may still hold. A file may never go above its count. When a file drops below it, the lint fails until `pnpm lint --update` lowers the baseline, so progress is locked in by a commit. `--update` only ever lowers counts.
- **Exemptions.** Comments opening with `/*!` (the license-preservation convention minifiers honour) and `/// <reference …>` directives are allowed. The vendored Preflight license header uses `/*!` because the MIT license requires the notice to be kept.
