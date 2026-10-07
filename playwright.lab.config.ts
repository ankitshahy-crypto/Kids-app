import { defineConfig, devices } from "@playwright/test";

/**
 * The measuring bench (branch lab/**, never merged): the app in WebKit at an iPad's sizes, beside
 * Chromium at the same sizes, so what the two engines draw can be compared number by number.
 * The note about the silent switch has been read in every project (it lies over the bottom of the
 * screen on an iPhone or iPad until OK is tapped, and nothing here is about it).
 */
const origin = "http://127.0.0.1:5173";
const baseURL = `${origin}/Kids-app/`;
const read = { cookies: [], origins: [{ origin, localStorage: [{ name: "littlenest-silent-hint-v1", value: "1" }] }] };

export default defineConfig({
  testDir: "e2e",
  outputDir: "test-results",
  fullyParallel: true,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"], ["github"], ["json", { outputFile: "test-results/e2e-results.json" }]],
  use: { baseURL, trace: "off", storageState: read },
  webServer: { command: "npm run dev -- --host 127.0.0.1 --port 5173", url: baseURL, reuseExistingServer: false, timeout: 120000 },
  projects: [
    { name: "wk-ipad", use: { ...devices["iPad (gen 7)"] } },
    { name: "wk-ipad-land", use: { ...devices["iPad (gen 7) landscape"] } },
    { name: "wk-iphone", use: { ...devices["iPhone 13"], viewport: { width: 390, height: 763 } } },
    { name: "cr-ipad", use: { ...devices["iPad (gen 7)"], browserName: "chromium" } },
    { name: "cr-ipad-land", use: { ...devices["iPad (gen 7) landscape"], browserName: "chromium" } },
    { name: "cr-iphone", use: { ...devices["iPhone 13"], viewport: { width: 390, height: 763 }, browserName: "chromium" } },
  ],
});
