import { expect, test } from "@playwright/test";

/**
 * A device left open overnight rolls to the new day without a reload: the
 * Today screen picks up the new date, and a Thursday night becomes Friday's
 * review with its sound game.
 */
test.use({ timezoneId: "America/New_York" });

const mia = {
  id: "mia",
  name: "Mia",
  ageRange: "4",
  animal: "fox",
  // Three weeks in, so the sound game has sounds to ask about.
  createdAt: "2026-09-14T12:00:00.000Z",
  stars: 0,
  days: {},
};

test("the day rolls over while the app stays open", async ({ page }) => {
  // Thursday 1 October 2026, 23:59 in New York.
  await page.clock.install({ time: new Date("2026-10-02T03:59:00Z") });
  await page.addInitScript((saved) => {
    localStorage.setItem("littlenest-profiles-v1", JSON.stringify({ activeId: "mia", profiles: [saved] }));
    localStorage.setItem("littlenest-silent-hint-v1", "1");
  }, mia);
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  const today = page.locator("[data-screen=today]");
  await expect(today).toHaveAttribute("data-day", "2026-10-01");
  await expect(today).toHaveAttribute("data-review", "false");
  await expect(page.locator("[data-practice=sounds]")).toHaveCount(0);

  // Two minutes pass: midnight, then the minute check.
  await page.clock.runFor(2 * 60_000);
  await expect(today).toHaveAttribute("data-day", "2026-10-02");
  await expect(today).toHaveAttribute("data-review", "true");
  await expect(page.locator("[data-practice=sounds]")).toBeVisible();
});

test("coming back to the foreground on a new day refreshes at once", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-02T03:30:00Z") });
  await page.addInitScript((saved) => {
    localStorage.setItem("littlenest-profiles-v1", JSON.stringify({ activeId: "mia", profiles: [saved] }));
    localStorage.setItem("littlenest-silent-hint-v1", "1");
  }, mia);
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  const today = page.locator("[data-screen=today]");
  await expect(today).toHaveAttribute("data-day", "2026-10-01");
  // Jump the clock past midnight without letting the minute timer run, then come back to the foreground.
  await page.clock.setSystemTime(new Date("2026-10-02T12:00:00Z"));
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(today).toHaveAttribute("data-day", "2026-10-02");
  await expect(today).toHaveAttribute("data-review", "true");
});
