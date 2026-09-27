import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:5173/Kids-app/";

export default defineConfig({
  testDir: "e2e",
  outputDir: "test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI
    ? [["list"], ["github"], ["json", { outputFile: "test-results/e2e-results.json" }]]
    : [["list"], ["json", { outputFile: "test-results/e2e-results.json" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5173",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "iphone", use: { ...devices["iPhone 13"] } },
    { name: "pixel", use: { ...devices["Pixel 7"] } },
  ],
});
