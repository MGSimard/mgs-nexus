# Two test layers: Vitest in node, Playwright against the build

Tests run in two places. Vitest runs in node for `scripts/`, `src/lib/`, and `.astro` output rendered through the Container API (`renderToString`). Playwright runs every spec on Chromium, Firefox and WebKit against `astro preview` of the real build. Anything that needs the shipped bundle or a browser goes to Playwright; output that varies with inputs no built page exercises goes to the Container layer.

Vitest Browser Mode and the Container API's `renderComponent()` were the tempting third option: render a component in isolation, mount it in a real browser, and test its interaction without a build. `renderComponent()` only renders inlined scripts and styles, and our components register ui-sdk through a processed `<script>` with an `import`, which it drops. A Browser Mode test would have to import the ui-sdk entries itself, so it would test a component reassembled by the test rather than the one that ships, and would still pass if the component lost its `<script>`. Playwright against the build has no such gap, and the site is small enough that building it is cheap.

The machine-checkable testing rules run as an Oxlint JS plugin (`scripts/lint-tests/`), while the comment ban stays a text-scanning script. The testing rules need an AST; the comment scan does not. Oxlint lints only these rules and the two Vitest rules for disabled and focused tests, with every default category off, so it adds no general-purpose linting.

## Consequences

- The Container API is experimental and may break in a minor release. Container tests stay limited to rendered output so a break touches few tests; when a test could live in either layer, it goes to Playwright.
- `astroConfig` is passed to `AstroContainer.create()` with the project's `site`, which the container does not load on its own; the option is typed but not in the docs.
- Oxlint is pinned to an exact version because JS plugins are alpha and outside semver.
- Native browser UI (Safari's tooltip on truncated text, autofill, scrollbars) is invisible to Playwright in every engine, so fixes for it are checked by hand.
- The rules in the testing guide change only in their own pull request, enforced by `scripts/check-rule-changes.ts` run from the base branch. The pull request that introduced the guard is the one exception: it shipped the rules with everything they judge, and CI skips the guard while the base branch has no copy of the script.
