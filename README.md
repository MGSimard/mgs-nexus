# MGSIMARD NEXUS

## Task list

- [ ] Build a Design System (Marathon, Neo-Industrialism)
- [ ] Custom Components using UI SDK
- [ ] Pages
  - [ ] Home
  - [ ] Projects
  - [ ] mgs-recs
  - [ ] mgs-exps
  - [ ] Design System
  - [ ] Blog
  - [ ] 404
- [ ] Metadata Pass
- [ ] Deploy to Cloudflare Workers

---

- [ ] Oxlint when full support is available

```ts
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [],
  env: {
    browser: true,
    node: true,
    builtin: true,
  },
  options: {
    typeAware: true,
    typeCheck: true,
  },
  ignorePatterns: [".astro", "dist", "node_modules"],
  plugins: ["eslint", "import", "jsdoc", "jsx-a11y", "node", "oxc", "promise", "typescript", "unicorn", "vitest"],
  jsPlugins: [],
  rules: {
    "import/no-duplicates": "warn",
    "typescript/array-type": ["warn", { default: "generic" }],
    "typescript/consistent-type-definitions": "error",
  },
});
```
