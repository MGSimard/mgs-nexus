# Hand-written layered CSS, no Tailwind

The Nexus is styled with hand-written CSS organised by cascade layers, not Tailwind or any CSS-in-JS/atomic tool. The aesthetic (neo-industrial, Marathon-esque: clip-paths, pseudo-elements, scanlines, grid overlays, precise type) is almost entirely bespoke, which utility classes make harder to read and maintain.

Layer order, declared once at the top of the global stylesheet:

```css
@layer reset, ui-sdk, tokens, base, layout, primitives, components, utilities;
```

- **Global stylesheet** holds only what every page needs: `reset` (vendored Tailwind Preflight, see `src/styles/reset.css`), `tokens` (custom properties), `base` typography, `layout`, and `primitives` — the shared Marathon frame pieces, configured through custom properties rather than variants.
- **Component styles** live in each Astro component's scoped `<style>` inside `@layer components`, so they ship only on pages that render the component and are deleted with it.
- A pattern used by three or more components is promoted into `primitives`.
- Native CSS nesting; no preprocessor, no CSS Modules.

## Considered Options

- **Tailwind v4**: rejected — author fatigue, and bespoke visuals end up as long arbitrary-value strings anyway.
- **One large global stylesheet**: the bundle cost is negligible at this site's size, but rules can't be safely deleted once nobody knows which page uses them.
- **CSS Modules**: redundant with Astro's scoped styles.

## Consequences

- `reset` sits *before* `ui-sdk` so UI SDK's functional rules (hiding closed popups, default `display`) aren't overridden by the reset.
- The reset's `[hidden]` rule is `!important`; important declarations in an earlier layer beat later layers, so nothing can un-hide a `[hidden]` element.
