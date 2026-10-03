import { expect, type Locator, type Page } from "@playwright/test";
import { createdThisWeek } from "./clock";

/**
 * Helpers for the games built on the game kit (src/game/kit.tsx).
 *
 * A kit game waits for its praise to be said before the next round. `quick`
 * turns that wait off (a development-build switch), so a test can play a
 * whole game through in a second or two. Tests about what is said leave it on.
 */

export const stageOfWeek: Record<number, string> = { 0: "day", 1: "routine", 2: "clock", 3: "coins", 4: "shop", 5: "hours", 6: "minutes", 8: "values", 9: "change", 15: "cards", 16: "cards" };

export function timePlacement(weekIndex: number, stageId = stageOfWeek[weekIndex]) {
  return {
    version: 1,
    origin: "device",
    classId: "device-class",
    updatedAt: "2026-09-26T00:00:00.000Z",
    subjects: { time: { classDefault: { subject: "time", stageId, weekIndex }, byChildId: {} } },
  };
}

export function child(ageRange = "4") {
  return {
    activeId: "mia",
    profiles: [{ id: "mia", name: "Mia", ageRange, animal: "fox", createdAt: createdThisWeek(), stars: 0, days: {} }],
  };
}

/** Open the app on a child's Time & Money page. */
export async function openTimeMoney(page: Page, options: { week?: number; quick?: boolean; ageRange?: string; tips?: boolean } = {}) {
  const { week = 0, quick = true, ageRange = "4", tips = false } = options;
  await page.addInitScript(
    ({ saved, placed, quick, tips }) => {
      if (sessionStorage.getItem("kit-seeded")) return;
      sessionStorage.setItem("kit-seeded", "1");
      localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
      localStorage.setItem("littlenest-placement-v1", JSON.stringify(placed));
      localStorage.removeItem("kids-app-silent-hint-v1");
      if (quick) localStorage.setItem("littlenest-quick-rounds", "1");
      if (!tips) localStorage.setItem("littlenest-settings-v1", JSON.stringify({ showTips: false }));
    },
    { saved: child(ageRange), placed: timePlacement(week), quick, tips },
  );
  await page.goto("./");
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "LittleNest Time & Money" }).click();
  await expect(page.locator("[data-screen=today]")).toHaveAttribute("data-subject", "time");
}

/** A kit game, by its screen id. */
export function game(page: Page, id: string): Locator {
  return page.locator(`.game-frame[data-screen=${id}]`);
}

export async function openGame(page: Page, id: string): Promise<Locator> {
  await page.locator(`[data-activity=${id}]`).click();
  const frame = game(page, id);
  await expect(frame).toBeVisible();
  return frame;
}

/** Wait for the round with this number (from 0) to be the one being played. */
export async function onRound(frame: Locator, round: number) {
  await expect(frame).toHaveAttribute("data-round", String(round));
  await expect(frame).toHaveAttribute("data-solved", "false");
}

/** The game is over and the child is back on the section page with a star. */
export async function expectStar(page: Page, stars = 1) {
  await expect(page.locator("[data-screen=today] .star-count")).toHaveAttribute("data-stars", String(stars), { timeout: 10_000 });
}

/** Has this choice wiggled? The wiggle has two names, turn about, so that it can play twice running. */
export async function expectWiggle(pick: Locator) {
  await expect(pick).toHaveAttribute("data-wiggle", /^(a|b|true)$/);
}

/**
 * The clock opens by teaching its parts: each hand, then the minute dots. This plays those three
 * rounds, using the big pictures of the hands, and leaves the game on its first time to set.
 */
export async function meetClock(frame: Locator) {
  for (const round of [0, 1]) {
    await expect(frame).toHaveAttribute("data-round", String(round));
    await expect(frame).toHaveAttribute("data-task", "hand");
    await expect(frame).toHaveAttribute("data-solved", "false");
    await frame.locator(`.pick[data-hand-pick=${await frame.getAttribute("data-answer")}]`).click();
  }
  await expect(frame).toHaveAttribute("data-round", "2");
  await expect(frame).toHaveAttribute("data-task", "dots");
  for (let step = 0; step < 5; step += 1) await frame.locator(".pick[data-pick=step]").click();
  await expect(frame).toHaveAttribute("data-round", "3");
  await expect(frame).toHaveAttribute("data-task", "set");
}
