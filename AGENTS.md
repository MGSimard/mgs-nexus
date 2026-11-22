## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues (MGSimard/mgs-nexus) via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Code comments

Code carries no comments. Record a non-obvious decision as an ADR in `docs/adr/`; for a workaround, fix it or file an issue. `pnpm lint` enforces this (ADR-0004).

## Astro Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Astro Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## ui-sdk

Before using ui-sdk, follow the ui-sdk skill if it's installed, and read `node_modules/@ui-sdk/web/docs/llms.txt`. To build a new component, also search `node_modules/@ui-sdk/web/docs/core.md` by heading, and read `rendering.md` next to it.

- Register tags by importing a component's entry (e.g. `import "@ui-sdk/web/dialog"`) inside a `<script>` in the Astro component that uses it. The root `@ui-sdk/web` entry registers nothing.
- The default stylesheet (`@ui-sdk/core/web.css`) is intentionally not used; style components with hand-written CSS via their `data-*` state attributes. Cascade layer order: ADR-0002.
