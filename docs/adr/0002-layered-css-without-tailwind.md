# Hand-written layered CSS, no Tailwind

The Nexus is styled with hand-written CSS organised by cascade layers, not Tailwind or any CSS-in-JS/atomic tool. The aesthetic (neo-industrial, Marathon-esque: clip-paths, pseudo-elements, scanlines, grid overlays, precise type) is almost entirely bespoke, which utility classes make harder to read and maintain. Native CSS nesting; no preprocessor.

The layer order is declared once, in `src/css/global.css`:

```css
@layer reset, ui-sdk, components;
```

- **`reset`**: the vendored Tailwind Preflight in `src/css/reset.css`.
- **`ui-sdk`**: the behaviour CSS `@ui-sdk/web` injects at runtime (hiding closed popups, default `display`, popover resets).
- **`components`**: each Astro component's scoped `<style>`, so its styles ship only on pages that render it and are deleted with it.

A new layer is added to the statement when its first rule is written, not before.

## Considered Options

- **Tailwind v4**: rejected — author fatigue, and bespoke visuals end up as long arbitrary-value strings anyway.
- **One large global stylesheet**: the bundle cost is negligible at this site's size, but rules can't be safely deleted once nobody knows which page uses them.
- **CSS Modules**: redundant with Astro's scoped styles.
- **`ui-sdk` below `reset`**, as ui-sdk's Tailwind setup does: rejected, because the reset's element rules would then override ui-sdk's behaviour rules. For example, the reset's `svg { display: block }` would beat ui-sdk's `display: inline-block` for mirrored icons.

## Consequences

- `@ui-sdk/web` injects its layer at runtime, so the layer must already be named in the order statement. Otherwise it would be created when injected, landing above our own layers.
- A layer's position is fixed where it first appears. The build folds the order statement into the reset's `@layer reset {}` block, so the built CSS opens with `@layer reset{…}` and then `@layer ui-sdk,components;`. That only gives the declared order while `reset` stays first in the statement.
- The reset's `[hidden]` rule is `!important`; important declarations in an earlier layer beat later layers, so nothing can un-hide a `[hidden]` element.
- `src/css/reset.css` is Preflight v4 pinned to the commit in its license header. The reasoning behind each rule lives in that upstream file. Our copy is wrapped in `@layer reset`, swaps Tailwind's `--theme(--default-*, …)` hooks for plain `var(--font-sans*, …)` / `var(--font-mono*, …)` properties with upstream's fallbacks, and drops upstream's comments (ADR-0004).
