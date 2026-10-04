import { expect, test, type Page } from "@playwright/test";
import { createdThisWeek } from "./clock";

/**
 * From the design review: on an iPad the games stayed phone-sized in the top half of the screen,
 * on a phone the scene stayed small over an empty bottom, and on a 375 px phone three choices
 * wrapped onto a second row.
 */

async function open(page: Page, size: { width: number; height: number }) {
  await page.setViewportSize(size);
  await page.addInitScript((created) => {
    if (sessionStorage.getItem("fit-seeded")) return;
    sessionStorage.setItem("fit-seeded", "1");
    const mia = { id: "mia", name: "Mia", ageRange: "4", animal: "fox", createdAt: created, stars: 0, days: {} };
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify({ activeId: "mia", profiles: [mia] }));
    localStorage.setItem("kids-app-silent-hint-v1", "1");
    localStorage.setItem("littlenest-settings-v1", JSON.stringify({ showTips: false }));
  }, createdThisWeek());
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
}

async function openActivity(page: Page, course: string, activity: string) {
  await page.locator(`[data-course=${course}]`).first().click();
  await page.locator(`[data-activity="${activity}"]`).click();
  await expect(page.locator(".game-frame")).toBeVisible();
}

async function boxes(page: Page) {
  return page.evaluate(() => {
    const box = (selector: string) => {
      const rect = document.querySelector(selector)!.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    const picks = [...document.querySelectorAll(".game-tray .pick")].map((pick) => {
      const rect = pick.getBoundingClientRect();
      return { top: Math.round(rect.top), width: rect.width, height: rect.height };
    });
    return { scene: box(".game-scene"), tray: box(".game-tray"), picks, viewport: window.innerHeight };
  });
}

for (const size of [{ width: 820, height: 1180 }, { width: 1180, height: 820 }]) {
  test(`${size.width}x${size.height}: a game is drawn large on an iPad, all on one screen`, async ({ page }) => {
    await open(page, size);
    await openActivity(page, "math", "count");
    const fit = await boxes(page);
    expect(fit.scene.width).toBeGreaterThanOrEqual(540);
    expect(fit.tray.height).toBeGreaterThanOrEqual(140);
    for (const pick of fit.picks) expect(pick.width).toBeGreaterThanOrEqual(120);
    // Nothing runs off the bottom, and no more than a third of the screen is left empty under it.
    expect(fit.tray.bottom).toBeLessThanOrEqual(fit.viewport);
    expect(fit.viewport - fit.tray.bottom).toBeLessThan(fit.viewport * 0.35);
  });
}

test("on an iPad, taps land on the picture that was touched even though the game is drawn larger", async ({ page }) => {
  await open(page, { width: 820, height: 1180 });
  await openActivity(page, "math", "shape");
  const frame = page.locator(".game-frame");
  await expect(frame).toHaveAttribute("data-round", "0");
  const answer = await frame.getAttribute("data-answer");
  await page.locator(`.game-tray [data-shape="${answer}"]`).click();
  await expect(frame).toHaveAttribute("data-solved", "true");
});

test("390x844: the scene takes the free height, and the choices sit under it in one row", async ({ page }) => {
  await open(page, { width: 390, height: 844 });
  await openActivity(page, "math", "count");
  const fit = await boxes(page);
  expect(fit.scene.height).toBeGreaterThanOrEqual(340);
  expect(fit.scene.height).toBeLessThanOrEqual(fit.scene.width + 2);
  expect(new Set(fit.picks.map((pick) => pick.top)).size).toBe(1);
  expect(fit.tray.bottom).toBeLessThanOrEqual(fit.viewport);
});

test("375x667: three choices fit one row, four do too, and Memory keeps three to a row", async ({ page }) => {
  await open(page, { width: 375, height: 667 });
  await openActivity(page, "math", "count");
  let fit = await boxes(page);
  expect(fit.picks).toHaveLength(3);
  expect(new Set(fit.picks.map((pick) => pick.top)).size).toBe(1);
  for (const pick of fit.picks) expect(pick.width).toBeGreaterThanOrEqual(100);
  expect(fit.tray.bottom).toBeLessThanOrEqual(fit.viewport);

  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  await page.locator("[data-dock=games]").click();
  await page.locator('[data-game-tile^="feed"]').first().click();
  await expect(page.locator(".game-frame")).toBeVisible();
  fit = await boxes(page);
  expect(fit.picks).toHaveLength(4);
  expect(new Set(fit.picks.map((pick) => pick.top)).size).toBe(1);

  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  await page.locator("[data-dock=games]").click();
  await page.locator('[data-game-tile^="memory"]').first().click();
  await expect(page.locator(".game-frame")).toBeVisible();
  fit = await boxes(page);
  const rows = new Map<number, number>();
  for (const pick of fit.picks) rows.set(pick.top, (rows.get(pick.top) ?? 0) + 1);
  expect([...rows.values()]).toEqual([3, 3]);
});
