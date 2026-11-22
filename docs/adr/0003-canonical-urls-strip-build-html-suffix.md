# Canonical URLs strip the build-time `.html` suffix

Pages build as flat files (`build.format: "file"`, `trailingSlash: "never"`), so `/about` is served from `about.html`. At build time `Astro.url.pathname` still carries that suffix (`/about.html`, and `/index.html` for the root), so `BaseHead.astro` strips `(/index)?.html` before building the canonical and `og:url` URLs. Without that step they would disagree with the extensionless URLs the sitemap lists.

## Consequences

- The strip is coupled to `build.format`. If the build format changes, revisit the regex in `BaseHead.astro`.
