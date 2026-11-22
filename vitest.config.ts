/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

export default getViteConfig({
  test: {
    include: ["scripts/**/*.test.ts", "src/**/*.test.ts"],
  },
});
