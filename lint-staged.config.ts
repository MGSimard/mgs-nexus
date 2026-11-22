import type { Configuration } from "lint-staged";

export default {
  "*": "oxfmt --no-error-on-unmatched-pattern",
  "*.{ts,js,mjs,cjs,astro,css,json}": "node scripts/lint-comments.ts",
} satisfies Configuration;
