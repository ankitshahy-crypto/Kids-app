import { expect, test, type Page } from "@playwright/test";
import { answerGate } from "./gate";
import { createdThisWeek } from "./clock";

/**
 * The public web demo, built with VITE_WEB_LOCK=1: the same free part as the
 * iPhone app, the rest locked, and the App Store (or Google Play, on Android)
 * as the way to open it. Nothing on the web unlocks anything, not even the
 * preview flag's pretend purchase or an unlock cached before the lock.
 *
 * These tests only mean something against a locked build; on any other
 * build (local dev, CI's dev server) they skip.
 */

function child(weeksAgo: number) {
  const created = new Date(new Date(createdThisWeek()).getTime() - weeksAgo * 7 * 24 * 60 * 60 * 1000).toISOString();
  return { id: "mia", name: "Mia", ageRange: "5", animal: "fox", createdAt: created, stars: 0, days: {}, ladder: { step: 1, successes: 0 } };
}

async function install(page: Page, weeksAgo: number, extra: { preview?: boolean; cachedUnlock?: boolean } = {}) {
  await page.addInitScript(
    ({ saved, extra }) => {
      if (sessionStorage.getItem("littlenest-test-seeded")) return;
      sessionStorage.setItem("littlenest-test-seeded", "1");
      localStorage.setItem("littlenest-profiles-v1", JSON.stringify({ activeId: "mia", profiles: [saved] }));
      localStorage.setItem("littlenest-silent-hint-v1", "1");
      if (extra.preview) localStorage.setItem("littlenest-paywall-preview-v1", "1");
      if (extra.cachedUnlock) localStorage.setItem("littlenest-unlock-v1", JSON.stringify({ owned: true }));
    },
    { saved: child(weeksAgo), extra },
  );
  await page.goto("./");
  const locked = (await page.locator("html").getAttribute("data-web-lock")) === "1";
  test.skip(!locked, "not a locked web build (VITE_WEB_LOCK=1)");
  await page.getByRole("button", { name: "Mia" }).click();
}

async function openUnlockPage(page: Page) {
  await page.locator("[data-held=true]").click();
  const sheet = page.locator("[data-screen=locked]");
  await expect(sheet).toContainText("Ask a grown-up");
  await expect(sheet).not.toContainText("$");
  await sheet.getByRole("button", { name: "Grown-ups" }).click();
  await answerGate(page, true);
  const panel = page.locator("[data-section=unlock]");
  await expect(panel).toHaveAttribute("data-unlock", "locked");
  return panel;
}

test("past the free weeks the demo locks like the app, and points to the App Store instead of selling anything", async ({ page }) => {
  await install(page, 5);
  const today = page.locator("[data-screen=today]");
  await expect(today).toHaveAttribute("data-week", "1");
  const panel = await openUnlockPage(page);
  await expect(panel.locator("[data-web-demo]")).toBeVisible();
  await expect(panel.locator("[data-store=app-store]")).toBeVisible();
  await expect(panel.locator("[data-store=app-store]")).toContainText(/App Store/);
  await expect(panel.locator("[data-action=buy]")).toHaveCount(0);
  await expect(panel.locator("[data-action=restore]")).toHaveCount(0);
  await expect(panel.locator("[data-action=code]")).toHaveCount(0);
  await expect(panel.locator("[data-preview]")).toHaveCount(0);
  await expect(panel).not.toContainText("$");
});

test("the free part is the app's: weeks 1–2 and the first Explore activity, with the rest asking for a grown-up", async ({ page }) => {
  await install(page, 0);
  await expect(page.locator("[data-held=true]")).toHaveCount(0);
  await page.locator("[data-course=math]").click();
  await expect(page.locator("[data-activity=count]")).not.toHaveAttribute("data-locked", "true");
  await expect(page.locator("[data-activity=know]")).toHaveAttribute("data-locked", "true");
});

test("neither the preview flag's pretend purchase nor an unlock cached before the lock opens the demo", async ({ page }) => {
  await install(page, 5, { preview: true, cachedUnlock: true });
  await expect(page.locator("[data-screen=today]")).toHaveAttribute("data-week", "1");
  const panel = await openUnlockPage(page);
  await expect(panel.locator("[data-action=buy]")).toHaveCount(0);
  await expect(panel.locator("[data-preview]")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Mia" }).click();
  await expect(page.locator("[data-screen=today]")).toHaveAttribute("data-week", "1");
});

test.describe("on Android", () => {
  test.use({ userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36" });
  test("the demo says the app is coming to Google Play, and never links to the App Store", async ({ page }) => {
    await install(page, 5);
    const panel = await openUnlockPage(page);
    await expect(panel.locator("[data-store=play]")).toContainText("Google Play");
    await expect(panel.locator("[data-store=app-store]")).toHaveCount(0);
  });
});

test("the demo asks search engines not to list it", async ({ page }) => {
  await install(page, 0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});
