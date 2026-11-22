import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { sitemapURLs } from "./sitemap.ts";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test("every page's canonical URL is the URL the sitemap lists for it", async ({ page, request }) => {
  const urls = await sitemapURLs(request);
  expect(urls.length).toBeGreaterThan(0);
  for (const url of urls) {
    await test.step(url, async () => {
      await page.goto(new URL(url).pathname);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", url);
    });
  }
});

test("every page, including the 404 page, passes the automated WCAG 2.1 AA checks", async ({ page, request }) => {
  const paths = [...(await sitemapURLs(request)).map((url) => new URL(url).pathname), "/404"];
  for (const path of paths) {
    await test.step(path, async () => {
      await page.goto(path);
      const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
      expect(violations).toEqual([]);
    });
  }
});
