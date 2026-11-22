import { defineConfig, devices } from "@playwright/test";

const BASE_URL = "http://localhost:4321";
const CI = Boolean(process.env["CI"]);

export default defineConfig({
  testDir: "e2e",
  forbidOnly: CI,
  globalTimeout: 10 * 60 * 1000,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : "list",
  ...(CI ? { workers: 1 } : {}),
  use: { baseURL: BASE_URL, trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "pnpm preview",
    url: BASE_URL,
    reuseExistingServer: !CI,
  },
});
