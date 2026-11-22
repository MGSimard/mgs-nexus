import type { Configuration } from "lint-staged";

export default {
  "*": "oxfmt --no-error-on-unmatched-pattern",
  "*.{ts,js,mjs,cjs,astro,css,json}": "node scripts/lint-comments.ts",
  "*.{ts,js,mjs,cjs}": "oxlint",
} satisfies Configuration;
