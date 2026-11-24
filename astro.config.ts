import { defineConfig, fontProviders } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://mgsimard.dev",
  trailingSlash: "never",
  build: { format: "file" },
  prefetch: true,
  integrations: [sitemap()],
  vite: {
    plugins: [],
  },
  experimental: {
    incrementalBuild: true,
  },
  fonts: [
    {
      provider: fontProviders.local(),
      name: "Maratype",
      options: {
        variants: [{ src: ["./src/assets/fonts/maratype/Maratype.woff2"], weight: "400", style: "normal" }],
      },
      display: "swap",
      cssVariable: "--font-display",
    },
    {
      provider: fontProviders.fontsource(),
      name: "Geist",
      styles: ["normal"],
      weights: ["100 900"],
      display: "swap",
      cssVariable: "--font-geist",
    },
    {
      provider: fontProviders.fontsource(),
      name: "Geist Mono",
      styles: ["normal"],
      weights: ["100 900"],
      display: "swap",
      cssVariable: "--font-geist-mono",
    },
  ],
});
