---
name: delete-comment
description: Triage every code comment still in the codebase into tautology, stale, excuse or decision record, then delete it, file an issue, or move it into an ADR.
disable-model-invocation: true
---

# Delete comments

Comments are banned (`docs/adr/0004-no-code-comments.md`). This skill removes the ones that remain. If the user names files or a directory, scope the run to those. Otherwise cover every comment `pnpm lint --list` prints, plus any in config files the lint doesn't scan (ADR-0004, Scope).

## 1. Inventory

Run `pnpm lint --list`. Read each listed file in full, since the category depends on the code around the comment. The step is done when every listed comment has been read in context.

## 2. Categorise

Give each comment exactly one category:

- **Tautology**: restates what the code already shows (section labels, "loop over items", a restated declaration).
- **Stale**: describes code, files, or behaviour that no longer match. Check the claim against the code before you trust it.
- **Excuse**: justifies a hack, workaround, TODO, `@ts-expect-error`, or "temporary" shortcut that should be fixed instead.
- **Decision Record**: records a non-obvious decision a future reader would otherwise "fix" (a coupling to config, a browser quirk, an ordering constraint). Weigh it against "When to offer an ADR" in `.agents/skills/domain-modeling/ADR-FORMAT.md`. A comment that is merely true but obvious is a tautology.

Vendored code: when its rationale lives at a pinned upstream source, record that pointer once in an ADR and treat the per-line comments as tautology. Keep license and copyright notices, written as `/*! … */` so the lint exempts them.

The step is done when every comment from step 1 has exactly one category.

## 3. Act

Edit comments only; any fix to the code itself belongs in the issue.

- **Tautology / Stale**: delete the comment. If deleting it leaves a run of blank lines, collapse them to one.
- **Excuse**: delete the comment, then file a GitHub issue following `docs/agents/issue-tracker.md`. Title the issue after the fix, not the symptom. The body names the file and line, describes the hack, states what a proper implementation looks like, and quotes the deleted comment. Apply the `needs-triage` label. If `gh` is not authenticated, write the issue drafts to the scratchpad and tell the user how to file them.
- **Decision Record**: move the reasoning into `docs/adr/`. Extend an existing ADR when one already covers the topic. Otherwise create the next-numbered ADR in the format of `.agents/skills/domain-modeling/ADR-FORMAT.md`. While there, fix anything stale the ADR says about the same code.

The step is done when every categorised comment is gone from the code and each excuse has an issue URL and each decision record an ADR path.

## 4. Lock in the ratchet

1. Run `pnpm lint --update` to lower `scripts/comment-baseline.json`.
2. Run `pnpm lint`. It must exit 0.
3. Run `pnpm format:check`.

## 5. Report

List each comment (`file:line`), its category, and the action taken: deleted, the issue URL, or the ADR path. Finish with the comment lines removed (`git diff --numstat`) and the baseline entries that remain.
