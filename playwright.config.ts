import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.BROWSER_PORT ?? 3300);

export default defineConfig({
  testDir: "tests/browser",
  outputDir: "tests/browser/.results",
  fullyParallel: false, // нэг SQLite сан хуваалцана
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: "chrome", // системийн Chrome — тусдаа browser татахгүй
    locale: "mn-MN",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1366, height: 860 } }, testIgnore: /mobile\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"], channel: "chrome" }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: `node tests/browser/serve.mjs ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 180_000,
    reuseExistingServer: false,
  },
});
