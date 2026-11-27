# Variants are a `defineVariants` table rendered as `data-*` attributes

Each UI component's Variants and States are declared in a plain `.ts` table beside it (for Button, a `button.ts` next to `Button.astro`), built with a small in-house `defineVariants` helper. The component imports the table for its prop types and renders each Variant as a `data-*` attribute (`data-variant="ghost"`, `data-size="sm"`); its CSS styles those attributes. Schema imports the same table to render every Variant combination in every State, so the table is the single source of truth for both.

## Considered Options

- **cva / tailwind-variants**: the same `{ variants, defaults }` shape, but their job is mapping props to class strings, which hand-written CSS styled from `data-*` attributes (ADR-0002) has no use for.
- **The table inside the `.astro` file**: Astro frontmatter cannot export values to other modules, so Schema could not read it.
- **A separate hand-written specimen file per component**: duplicates the Variant list and drifts from the component.

## Consequences

- Compound Variants (a style for one combination) are CSS attribute selectors such as `[data-variant="danger"][data-size="sm"]`, not entries in the table.
- Axes are independent, as in cva. A combination with no meaning is listed in the table's `exclude`, so Schema skips it. The types still allow it.
- `data-variant` matches the attribute ui-sdk's own docs use for button variants.
- A component whose Specimens need more than default slot text adds an optional `*.demo.astro` that receives the Variant and State props.
