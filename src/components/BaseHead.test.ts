import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { expect, test } from "vitest";
import astroConfig from "../../astro.config.ts";
import BaseHead from "./BaseHead.astro";

const { site } = astroConfig;
const container = await AstroContainer.create({ astroConfig: site === undefined ? {} : { site } });

const renderAt = (url: string) =>
  container.renderToString(BaseHead, {
    props: { title: "Title", description: "Description" },
    request: new Request(url),
  });

test.each([
  ["https://mgsimard.dev/about.html", "https://mgsimard.dev/about"],
  ["https://mgsimard.dev/intel/index.html", "https://mgsimard.dev/intel"],
  ["https://mgsimard.dev/intel/snapshots.html", "https://mgsimard.dev/intel/snapshots"],
  ["https://mgsimard.dev/about", "https://mgsimard.dev/about"],
])("canonical and og:url for %s are %s", async (url, canonical) => {
  const html = await renderAt(url);
  expect(html).toContain(`<link rel="canonical" href="${canonical}">`);
  expect(html).toContain(`<meta property="og:url" content="${canonical}">`);
});
