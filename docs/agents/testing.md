# Testing

The rules every test follows. They take priority over the `tdd` skill where the two differ.

Rules a machine can check are enforced by the `mgs-testing` Oxlint plugin in `scripts/lint-tests/` (`pnpm lint:tests`). The rest take judgment and are applied by the `mgs-testing-conventions` skill whenever a test is written, changed, reviewed or pruned. The stack and its trade-offs are recorded in `docs/adr/0005-test-layers.md`.

## 1. Pick the layer by what the behavior needs

- **Vitest (node)**: logic in `scripts/` and `src/lib/`. Test files sit next to their source as `*.test.ts`.
- **Vitest + Container API**: output of an `.astro` component or page that depends on its inputs (props, slots, request URL), as a table over those inputs. Render with `renderToString`; pass `partial: false` for a full page.
- **Playwright against the built site**: anything that needs the shipped bundle or a browser (interaction, ui-sdk components, focus, keyboard, build-time URL rewriting, accessibility). Specs live in `e2e/` as `*.spec.ts` and run against `astro preview`.

Behavior that changes with inputs no page exercises goes to the Container layer; behavior that needs the bundle or a browser goes to Playwright. When both could hold a test, use Playwright: the Container API is experimental and may change in a minor release. Behavior that needs neither is already covered by the page it renders on.

## 2. Tie a test to behavior

A test protects behavior a user or caller can see, and fails only when that behavior breaks. A refactor that keeps the behavior keeps the test green.

Assert what callers see: rendered output, return values, exit codes, what the user finds on the page. Expected values come from an independent source (a literal, a worked example, the spec), never from the same logic as the code. The browser, Astro, ui-sdk, a library and the type system are already tested by their authors.

## 3. One test per behavior

One test owns each behavior. Overlapping tests are merged into the strongest one. A second test at another layer needs a risk the first can't catch.

## 4. Mocks

A mock never supplies the result the test asserts, and the module under test is real. The site makes no network calls, so nothing fakes the network; the first feature that does make one decides how in an ADR.

Lint: `mgs-testing/no-mocking-subject`.

## 5. Flaky tests

Await the operation or a signal it emits: a returned promise, an event, a Playwright web-first assertion (`await expect(locator).toBeVisible()`). Fixed sleeps, retries, raised timeouts and skipped tests hide flakes, so they never ship. A flaky test is fixed at its root cause; if the cause can't be found, the test is deleted and the reason written in the PR description.

`globalTimeout` in `playwright.config.ts` caps a whole CI run and is not a per-test timeout.

Lint: `mgs-testing/no-fixed-sleep`, `mgs-testing/no-unsignaled-poll`, `mgs-testing/no-flake-masking`, `vitest/no-disabled-tests`, `vitest/no-focused-tests`.

## 6. Production code serves production

Production code exports only what production uses. Test through the real entry point and delete any seam that exists only for tests, together with the tests that used it.

Lint: `mgs-testing/no-test-seams` (by name; a seam with an ordinary name is caught in review).

## 7. Prove the test can fail

A new or kept test is shown to fail when the code breaks: break the code once and watch it fail, or, for a bug fix, watch it fail before the fix and pass after.

## 8. Tests guard behavior, not files

Tests that assert removed code stays gone, that a file exists, or what source text contains are deleted. A structural rule belongs in lint.

The CLI tests in `scripts/` are the one place a test touches files: `scripts/fixture.ts` builds a throwaway repo, runs the CLI in it, and reads back what the CLI wrote. That is the CLI's behavior, so the reads stay inside the fixture.

Lint: `mgs-testing/no-source-inspection`.

## 9. Test at the highest boundary that still fails clearly

Prefer the rendered page or component over a helper on its own. In Playwright, find things the way a user does: `getByRole`, `getByLabel`, `getByText`. ui-sdk renders in light DOM, so its parts are found the same way. Tiny unit tests that mirror the implementation are removed.

## 10. Every engine

Playwright runs every spec on Chromium, Firefox and WebKit. Their layout, events, focus and CSS differ, and a fix for one engine is checked on all three.

Native browser UI (Safari's own tooltip on truncated text, autofill, scrollbars) is outside the page, so no test can see it. A fix for it ships as the CSS workaround with an ADR or an issue saying why, and is checked by hand in the real browser.

## 11. Accessibility

`e2e/pages.spec.ts` runs the axe WCAG 2.1 A/AA checks on every page in the sitemap and on the 404 page. A new page is covered by being in the sitemap. Automated checks find only part of the problems, so keyboard and screen-reader behavior still gets a manual pass.

## 12. Pruning is part of the work

Deleting tests is a deliverable, not a side effect. When an area changes, read its code, name its behaviors, keep the strongest test for each and delete the rest. Never delete the only test guarding a behavior.

## 13. Cheap checks run before the PR

Before opening a PR, run the lint and the tests affected by the change locally. CI still runs everything.

```sh
pnpm lint:tests
pnpm exec vitest related --run <changed files>
pnpm build && pnpm test:e2e
```

The last line is for changes to pages, components, styles or scripts that run in the browser.

## 14. Rules are enforced by machine where possible

Lint, hooks and CI enforce what a machine can check. The skill covers what takes judgment, and its work is checked by a reviewer other than the author, against this guide, with the author's evidence (what each test guards and the break that proved it).

A change keeps the rules that judge it fixed. Editing this guide, the skill, the lint plugin, the Oxlint config or the CI workflows is its own pull request. `scripts/check-rule-changes.ts` enforces it in CI, run from the base branch's copy so a pull request can't edit the guard to pass.

## Sources

- Addy Osmani, [_How the Claude Code team thinks about verification_](https://claude.dev/blog/how-the-claude-code-team-thinks-about-verification/) (2026-11-16, [thread](https://x.com/addyosmani/status/2122590683055993308))
- Interfere, [_landmines_](https://github.com/interfere-inc/landmines/blob/main/README.md) (Oxlint rules), README
- Vincent Koc, [_Making CI faster and 95% cheaper_](https://vincent.build/openclaw-ci-cost-reduction/) (2026-11-17)
- `prune-tests` skill (no public link; the skill text was shared directly)
- `test-audit` skill from the OpenClaw repository (no public link; the skill text was shared directly)
- [Astro testing guide](https://docs.astro.build/en/guides/testing/) and [Container API reference](https://docs.astro.build/en/reference/container-reference/)
- Playwright [best practices](https://playwright.dev/docs/best-practices), [locators](https://playwright.dev/docs/locators), [CI](https://playwright.dev/docs/ci) and [accessibility testing](https://playwright.dev/docs/accessibility-testing)
