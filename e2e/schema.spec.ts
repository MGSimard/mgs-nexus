import { expect, test, type Page } from "@playwright/test";

const frameSize = (page: Page) =>
  page.locator("iframe").evaluate((iframe: HTMLIFrameElement) => ({
    width: iframe.contentWindow!.innerWidth,
    fits: iframe.contentDocument!.documentElement.scrollHeight <= iframe.contentWindow!.innerHeight,
  }));

test.beforeEach(async ({ page }) => {
  await page.goto("/schema/button");
  await expect(page.frameLocator("iframe").getByRole("table")).toBeVisible();
});

test("a width preset sets the frame's viewport width and its height follows the content", async ({ page }) => {
  await page.getByRole("button", { name: "768" }).click();
  await expect(page.getByRole("textbox", { name: "Frame width", exact: true })).toHaveValue("768");
  await expect.poll(() => frameSize(page)).toEqual({ width: 768, fits: true });
});

test("typing a width resizes the frame and clears the preset", async ({ page }) => {
  await page.getByRole("button", { name: "1024" }).click();
  const width = page.getByRole("textbox", { name: "Frame width", exact: true });
  await width.fill("500");
  await width.press("Enter");
  await expect.poll(async () => (await frameSize(page)).width).toBe(500);
  await expect(page.getByRole("button", { name: "1024" })).toHaveAttribute("aria-pressed", "false");
});

test("a frame wider than the stage is fitted, and 100% restores actual size", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.getByRole("button", { name: "1440" }).click();
  const zoom = page.getByRole("status", { name: "Zoom" });
  await expect.poll(async () => parseInt((await zoom.textContent()) ?? "", 10)).toBeLessThan(100);
  await page.getByRole("button", { name: "100%" }).click();
  await expect(zoom).toHaveText("100%");
});
