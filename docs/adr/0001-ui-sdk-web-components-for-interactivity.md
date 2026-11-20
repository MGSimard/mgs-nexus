# UI SDK Web Components for all interactivity, no UI framework

The Nexus is a static Astro site, and every interactive component in it is built from UI SDK behaviors (`@ui-sdk/web` + `@ui-sdk/core`) as Web Components, styled entirely by hand. There are no React/Vue/Svelte islands. UI SDK is headless and composes small behaviors (popup, selection, typeahead, roving focus…) into whatever component is needed, which suits a fully custom neo-industrial look better than a styled kit. Targeting Web Components keeps the site free of any client framework runtime.

## Considered Options

- **Radix / Ark / Base UI / React Aria**: mature, but each ships fixed component shapes and (except Ark) ties the site to React islands.
- **UI SDK via React 19 islands**: same behaviors, but adds React to a site that otherwise needs none.

## Consequences

- UI SDK is in beta; API churn is accepted, and this choice will not be reversed because of it.
- Before building with it, agents follow the `ui-sdk` skill and read `node_modules/@ui-sdk/web/docs/llms.txt` (see AGENTS.md once installed).
