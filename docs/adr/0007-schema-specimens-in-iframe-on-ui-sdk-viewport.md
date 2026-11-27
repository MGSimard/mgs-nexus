# Schema renders Specimens in a same-origin iframe on a ui-sdk viewport

Each component's Specimens render on a bare frame route (`/schema/<component>/frame`) that Schema loads in an iframe, placed on a stage built from ui-sdk's `createViewport` and `createResize`. The iframe gives Specimens a real viewport, so media queries respond to the frame's width presets, and its own top layer, where ui-sdk renders popovers, menus, selects and dialogs; outside an iframe those would ignore the stage's zoom and clipping and cover Schema itself. It also keeps Schema's own styles away from the components.

## Considered Options

- **A resizable `<div>` with container queries**: no iframe, but it would force every component onto container queries and leave the top layer unscoped.
- **Stage scrollbars at 100%**, as Storybook does: rejected for design-tool pan and zoom, which `createViewport` provides with Fit and focus reveal, and which a later free-form canvas reuses.

## Consequences

- One document holds at most one modal, which blankets the whole frame. Dialog and Alert Dialog Specimens in an open State render with ui-sdk's `inline` attribute and `modal="trap-focus"`, so each stays in its own cell. Drawer has no `inline` mode and slides from the viewport edge, so each open Drawer Specimen gets its own iframe.
- Wheel and pointer events inside the iframe do not reach the parent, so the stage listens on the frame's document (same-origin) and forwards them to the viewport.
- Hover, focus-visible and active are not forced on Specimens; they are checked by interacting with them.
