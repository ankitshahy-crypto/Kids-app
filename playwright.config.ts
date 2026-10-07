import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:5173/Kids-app/";

export default defineConfig({
  testDir: "e2e",
  outputDir: "test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // On CI a failed test is tried once more: one slow moment on a shared runner should not turn a
  // good commit red. A test that passes only on its second try is still named, in a warning
  // (scripts/slowest-tests.mjs), because it is hiding a race. At a desk there is no second try.
  retries: process.env.CI ? 1 : 0,
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
    // The two sizes the app is used at, an iPhone's and an iPad's, in the same engine as above:
    // every test again, on a screen a child holds. CI runs both on each pull request.
    { name: "phone-size", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
    { name: "ipad-size", use: { ...devices["Desktop Chrome"], viewport: { width: 810, height: 1080 }, hasTouch: true } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    // WebKit is the engine the iPhone and iPad app draws with. CI runs this one too.
    { name: "iphone", use: { ...devices["iPhone 13"] } },
    { name: "pixel", use: { ...devices["Pixel 7"] } },
  ],
});
