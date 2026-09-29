import { expect, test, type Page } from "@playwright/test";
import { answerGate } from "./gate";
import { createdThisWeek } from "./clock";

/**
 * The one-time unlock, through the web preview: the website shows the locked
 * app when the preview flag is set, and its "store" unlocks with no charge.
 * The iPhone app runs the same screens against the App Store.
 */
function child(weeksAgo: number) {
  const created = new Date(new Date(createdThisWeek()).getTime() - weeksAgo * 7 * 24 * 60 * 60 * 1000).toISOString();
  return { id: "mia", name: "Mia", ageRange: "5", animal: "fox", createdAt: created, stars: 0, days: {}, ladder: { step: 1, successes: 0 } };
}

async function install(page: Page, weeksAgo: number, preview = true) {
  await page.addInitScript(
    ({ saved, preview }) => {
      if (sessionStorage.getItem("littlenest-test-seeded")) return;
      sessionStorage.setItem("littlenest-test-seeded", "1");
      localStorage.setItem("littlenest-profiles-v1", JSON.stringify({ activeId: "mia", profiles: [saved] }));
      localStorage.setItem("littlenest-silent-hint-v1", "1");
      if (preview) localStorage.setItem("littlenest-paywall-preview-v1", "1");
    },
    { saved: child(weeksAgo), preview },
  );
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
}

async function passGate(page: Page) {
  await answerGate(page, true);
}

test("past the free weeks, the lesson replays week 2 until a grown-up unlocks, then picks up where the child is", async ({ page }) => {
  await install(page, 5);
  const today = page.locator("[data-screen=today]");
  await expect(today).toHaveAttribute("data-week", "1");
  await expect(today).toHaveAttribute("data-letters", "st");
  const held = page.locator("[data-held=true]");
  await expect(held).toBeVisible();
  // The child sees no price, only "ask a grown-up".
  await held.click();
  const sheet = page.locator("[data-screen=locked]");
  await expect(sheet).toContainText("Ask a grown-up");
  await expect(sheet).not.toContainText("$");
  await expect(sheet).not.toContainText(/more|waiting|unlock|open it/i);
  await expect(held).toHaveText("");
  await sheet.getByRole("button", { name: "Grown-ups" }).click();
  await passGate(page);

  const panel = page.locator("[data-section=unlock]");
  await expect(panel).toHaveAttribute("data-unlock", "locked");
  await expect(panel.locator("[data-action=buy]")).toHaveText("Unlock everything · $29.99");
  await expect(panel.locator("[data-action=restore]")).toBeVisible();
  await expect(panel.locator("[data-preview=true]")).toBeVisible();
  await panel.locator("[data-action=buy]").click();
  await expect(panel).toHaveAttribute("data-unlock", "open");

  await page.getByRole("button", { name: "Back" }).first().click();
  await expect(today).toHaveAttribute("data-week", "5");
  await expect(held).toHaveCount(0);
  // It stays unlocked after a relaunch.
  await page.reload();
  await page.getByRole("button", { name: "Mia" }).click();
  await expect(today).toHaveAttribute("data-week", "5");
});

test("the first activity of each Explore area is open, and the rest ask for a grown-up", async ({ page }) => {
  await install(page, 0);
  await expect(page.locator("[data-held=true]")).toHaveCount(0);
  await page.locator("[data-course=math]").click();
  await expect(page.locator("[data-activity=count]")).not.toHaveAttribute("data-locked", "true");
  await expect(page.locator("[data-activity=know]")).toHaveAttribute("data-locked", "true");
  await page.locator("[data-activity=know]").click();
  await expect(page.locator("[data-screen=locked]")).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).last().click();
  await expect(page.locator("[data-screen=locked]")).toHaveCount(0);
  await page.locator("[data-activity=count]").click();
  await expect(page.locator("[data-screen=count]")).toBeVisible();
});

test("the website without the preview flag is fully open", async ({ page }) => {
  await install(page, 5, false);
  const today = page.locator("[data-screen=today]");
  await expect(today).toHaveAttribute("data-week", "5");
  await expect(page.locator("[data-held=true]")).toHaveCount(0);
  await expect(page.locator("[data-locked=true]")).toHaveCount(0);
});
