import { expect, test, type Page } from "@playwright/test";
import { createdThisWeek } from "./clock";
import { finishLetterTracing } from "./traceFlow";

/**
 * Today on an upright iPad with a grown-up tip on it. On a 1024-tall iPad (the mini, the 9.7") the
 * tip pushed the Explore row past the bottom edge, and the fit screen hid it with nothing to scroll
 * (the Today redesign took away Today's own scroller there). Now Today scrolls, as it does on a
 * phone, and nothing else does. On the taller iPad everything fits and nothing scrolls.
 */
const three = {
  activeId: "mia",
  profiles: [
    { id: "mia", name: "Mia", ageRange: "4", animal: "fox", createdAt: createdThisWeek(), stars: 0, days: {} },
    { id: "leo", name: "Leo", ageRange: "5", animal: "bear", createdAt: createdThisWeek(), stars: 2, days: {} },
    { id: "ava", name: "Ava", ageRange: "3", animal: "cat", createdAt: createdThisWeek(), stars: 1, days: {} },
  ],
};

async function openTodayWithTipCard(page: Page) {
  await page.addInitScript((saved) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.removeItem("kids-app-silent-hint-v1");
    localStorage.setItem("littlenest-settings-v1", JSON.stringify({ showTips: true }));
  }, three);
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await expect(page.locator("[data-screen=today]")).toBeVisible();
  // A finished Draw step brings its tip back to Today as a chip; a grown-up opens it to the card.
  await page.getByRole("button", { name: "Draw" }).click();
  await finishLetterTracing(page);
  await expect(page.locator("[data-screen=today]")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "For grown-ups: show tip" }).click();
  await expect(page.locator(".grownup-tip")).toHaveAttribute("data-tip-open", "true");
}

/** Where the last Explore door ends, and how far each box that could scroll has scrolled. */
async function layout(page: Page) {
  return page.evaluate(() => {
    const q = (selector: string) => document.querySelector(selector) as HTMLElement | null;
    const doors = Array.from(document.querySelectorAll(".course-button"));
    const last = doors[doors.length - 1];
    const tip = q(".grownup-tip");
    return {
      height: innerHeight,
      tipTop: tip ? Math.round(tip.getBoundingClientRect().top) : Number.NaN,
      lastDoorBottom: last ? Math.round(last.getBoundingClientRect().bottom) : Number.NaN,
      scrolled: { page: document.scrollingElement?.scrollTop ?? 0, stage: q(".stage")?.scrollTop ?? 0, screenBody: q(".screen-body")?.scrollTop ?? 0, today: q(".today")?.scrollTop ?? 0, todayBody: q(".today-body")?.scrollTop ?? 0 },
    };
  });
}

/** The boxes a finger could scroll: those that let their content overflow and have more inside than out. */
async function scrollers(page: Page) {
  return page.evaluate(() =>
    Object.entries({ page: document.scrollingElement, stage: document.querySelector(".stage"), screenBody: document.querySelector(".screen-body"), today: document.querySelector(".today"), todayBody: document.querySelector(".today-body") })
      .filter(([, element]) => element && /auto|scroll/.test(getComputedStyle(element).overflowY) && element.scrollHeight > element.clientHeight + 1)
      .map(([name]) => name),
  );
}

test.describe("Today on an upright iPad", () => {
  test.describe.configure({ mode: "parallel" });

  test("a 1024-tall iPad with the tip card: the Explore row is reached by one scroller, Today itself", async ({ page, isMobile }) => {
    test.slow();
    await page.setViewportSize({ width: 768, height: 1024 });
    await openTodayWithTipCard(page);
    const before = await layout(page);
    expect(before.lastDoorBottom).toBeGreaterThan(before.height);
    // Today is the box that can be scrolled by a finger: it alone lets its content overflow, and it
    // alone is taller inside than out. (The mouse wheel below does not exist in mobile WebKit; there
    // the scroll is made by hand, after this check that it is Today's to make.)
    expect(await scrollers(page)).toEqual(["today"]);
    if (isMobile) await page.locator(".today").evaluate((today) => today.scrollBy(0, 1500));
    else {
      await page.mouse.move(384, 600);
      await page.mouse.wheel(0, 1500);
    }
    await expect.poll(async () => (await layout(page)).lastDoorBottom).toBeLessThanOrEqual(before.height);
    const after = await layout(page);
    expect(after.scrolled.today).toBeGreaterThan(0);
    // One scroller: the page, the stage and the screen body stay where they were, and the tip with them.
    expect(after.scrolled.page).toBe(0);
    expect(after.scrolled.stage).toBe(0);
    expect(after.scrolled.screenBody).toBe(0);
    expect(after.scrolled.todayBody).toBe(0);
    expect(await page.locator(".grownup-tip").evaluate((tip) => Math.round(tip.getBoundingClientRect().top))).toBe(before.tipTop);
  });

  test("a 1180-tall iPad with the tip card: everything fits, and nothing scrolls", async ({ page, isMobile }) => {
    test.slow();
    await page.setViewportSize({ width: 820, height: 1180 });
    await openTodayWithTipCard(page);
    const before = await layout(page);
    expect(before.lastDoorBottom).toBeLessThanOrEqual(before.height);
    expect(await scrollers(page)).toEqual([]);
    if (isMobile) await page.locator(".today").evaluate((today) => today.scrollBy(0, 1500));
    else {
      await page.mouse.move(410, 600);
      await page.mouse.wheel(0, 1500);
    }
    await page.waitForTimeout(300);
    const after = await layout(page);
    expect(after.lastDoorBottom).toBe(before.lastDoorBottom);
    expect(Object.values(after.scrolled).every((value) => value === 0)).toBe(true);
  });
});
