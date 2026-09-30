import { defineConfig, devices } from "@playwright/test";

/**
 * The public web demo's build (VITE_WEB_LOCK=1), served by `vite preview`,
 * for e2e/web-lock.spec.ts. Build first: VITE_BASE=/Kids-app/ VITE_WEB_LOCK=1 npm run build.
 */
const baseURL = "http://127.0.0.1:5175/Kids-app/";

export default defineConfig({
  testDir: "e2e",
  testMatch: /web-lock\.spec\.ts/,
  outputDir: "test-results-locked",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [["list"], ["github"]] : [["list"]],
  use: { baseURL, trace: "retain-on-failure" },
  webServer: {
    command: "npx vite preview --host 127.0.0.1 --port 5175",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: { VITE_BASE: "/Kids-app/" },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
