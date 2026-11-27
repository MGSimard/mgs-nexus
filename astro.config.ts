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
      provider: fontProviders.local(),
      name: "Maratype",
      cssVariable: "--font-maratype",
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/maratype/Maratype.woff2"],
            weight: "400",
            style: "normal",
            display: "swap",
          },
        ],
      },
    },
    {
      provider: fontProviders.fontsource(),
      name: "Geist Mono",
      styles: ["normal"],
      weights: ["100 900"],
      display: "swap",
      cssVariable: "--font-geist-mono",
    },
    {
      provider: fontProviders.local(),
      name: "Geist Serif",
      cssVariable: "--font-geist-serif",
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/GeistSerif/GeistSerif.woff2"],
            weight: "400",
            style: "normal",
            display: "swap",
          },
        ],
      },
    },
  ],
});
