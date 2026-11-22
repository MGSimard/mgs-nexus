import { defineConfig } from "oxfmt";

export default defineConfig({
  astro: true,
  ignorePatterns: [".agents", ".astro", ".claude", "dist", "node_modules"],
  semi: true,
  tabWidth: 2,
  printWidth: 120,
  singleQuote: false,
  trailingComma: "es5",
  bracketSameLine: true,
  overrides: [
    {
      files: ["*.astro"],
      options: {
        parser: "astro",
      },
    },
  ],
});
