import { defineConfig } from "oxlint";
import plugin from "./scripts/lint-tests/plugin.ts";

const testingRules = Object.fromEntries(
  Object.keys(plugin.rules).map((rule) => [`${plugin.meta.name}/${rule}`, "error" as const])
);

export default defineConfig({
  categories: { correctness: "off" },
  plugins: ["vitest"],
  jsPlugins: ["./scripts/lint-tests/plugin.ts"],
  ignorePatterns: [".agents", ".astro", ".claude", "dist", "node_modules"],
  rules: {
    ...testingRules,
    "vitest/no-disabled-tests": "error",
    "vitest/no-focused-tests": "error",
  },
});
