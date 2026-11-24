# MGSIMARD NEXUS

`grill-with-docs → to-spec → to-tickets → implement → code-review → retro`

## Task list

- [ ] Build a Design System (Marathon, Neo-Industrialism)
- [ ] Custom Components using UI SDK
- [ ] Pages
  - [ ] Home
  - [ ] Projects (WORK)
  - [ ] mgs-recs (LOADOUT)
  - [ ] mgs-exps (INTEL)
  - [ ] Design System (???)
  - [ ] Blog (TRANSMISSIONS)
  - [ ] 404
- [ ] Metadata Pass
- [ ] Deploy to Cloudflare Workers

---

- [ ] Oxlint when full support is available
  - [ ] In `.vscode/settings.json`, turn on `"oxc.typeAware": true` and `"editor.codeActionsOnSave": { "source.fixAll.oxc": "always" }`

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
  ignorePatterns: [".agents", ".astro", ".claude", "dist", "node_modules"],
  plugins: ["eslint", "import", "jsdoc", "jsx-a11y", "node", "oxc", "promise", "typescript", "unicorn", "vitest"],
  jsPlugins: [],
  rules: {
    "import/no-duplicates": "warn",
    "typescript/array-type": ["warn", { default: "generic" }],
    "typescript/consistent-type-definitions": "error",
  },
});
```
