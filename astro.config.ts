import { defineConfig, fontProviders } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://mgsimard.dev",
  trailingSlash: "never",
  build: { format: "file" },
  prefetch: true,
  integrations: [
    sitemap({
      filter: (page) => !/\/schema(\/[^/]+\/frame)?$/.test(new URL(page).pathname),
    }),
  ],
  vite: {
    plugins: [],
  },
  experimental: {
    incrementalBuild: true,
  },
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: "Oxanium",
      styles: ["normal"],
      weights: ["200 800"],
      display: "swap",
      cssVariable: "--font-oxanium",
    },
    {
      provider: fontProviders.fontsource(),
      name: "Zalando Sans Expanded",
      styles: ["normal"],
      weights: ["200 900"],
      display: "swap",
      cssVariable: "--font-zalando",
    },
    {
      provider: fontProviders.local(),
      name: "Alloy Sans",
      cssVariable: "--font-alloy",
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/AlloySans/AlloySans.woff2"],
            weight: "200 900",
            style: "normal",
            display: "swap",
          },
        ],
      },
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
