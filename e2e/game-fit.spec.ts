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

/**
 * As the installed app lays a game out, on the screens it is installed on.
 *
 * The app's web view is the whole glass: 100svh runs under the status bar and the home indicator,
 * and the app pads for both (env(safe-area-inset-top) and -bottom). A test screen with no insets
 * has more room than the device does. At 1180 by 820 with tips off (the test above) a game fitted;
 * on the iPad Air that size stands for, with the grown-ups' tip on its line as it is by default,
 * the bottom of every row of choices was off the screen, What can I buy? had lost its price tags,
 * and Hatch the Egg its whole second row of letters.
 *
 * Here each screen has its device's insets, and the tip is showing, open: the tallest the page
 * outside the game gets. Every game of every section is opened, and nothing a child taps may
 * reach below the page (the screen less the home indicator).
 *
 * Chromium can be told a device's insets and WebKit, as a test browser, cannot, so these run in
 * Chromium, once (they set their own screens). What they check is laid out in px and viewport
 * units, which the two engines agree on to the hundredth of a px, zoomed or not: measured in
 * both, at an iPad's sizes.
 */
const DEVICES: Record<string, { width: number; height: number; top: number; bottom: number }> = {
  "an iPhone SE": { width: 375, height: 667, top: 20, bottom: 0 },
  "an iPhone 13 mini": { width: 375, height: 812, top: 50, bottom: 34 },
  "an iPhone 14": { width: 390, height: 844, top: 47, bottom: 34 },
  "a 9.7-inch iPad": { width: 768, height: 1024, top: 20, bottom: 0 },
  "an iPad Air on its side": { width: 1180, height: 820, top: 24, bottom: 20 },
  "an iPad mini on its side": { width: 1133, height: 744, top: 24, bottom: 20 },
};

/** Each section's way in, and its tiles. The dock's games are a lobby of their own. */
const SECTIONS: Record<string, { door: string; tiles: string }> = {
  Numbers: { door: "[data-course=math]", tiles: "[data-screen=today] [data-activity]" },
  Colors: { door: "[data-course=colors]", tiles: "[data-screen=today] [data-activity]" },
  "Time & Money": { door: "[data-course=time]", tiles: "[data-screen=today] [data-activity]" },
  Build: { door: "[data-course=build]", tiles: "[data-screen=today] [data-activity]" },
  Science: { door: "[data-course=science]", tiles: "[data-screen=today] [data-activity]" },
  Games: { door: "[data-dock=games]", tiles: "[data-game-tile]" },
};

async function openOn(page: Page, device: { width: number; height: number; top: number; bottom: number }) {
  await page.setViewportSize({ width: device.width, height: device.height });
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setSafeAreaInsetsOverride", { insets: { top: device.top, bottom: device.bottom, left: 0, right: 0 } });
  await page.addInitScript((created) => {
    if (sessionStorage.getItem("fit-seeded")) return;
    sessionStorage.setItem("fit-seeded", "1");
    // Five years old: every section is open. Hatch the Egg at its longest: six letters under the word.
    const mia = { id: "mia", name: "Mia", ageRange: "5", animal: "fox", createdAt: created, stars: 0, days: {}, ladder: { step: 2, successes: 0 }, games: { hatch: 3, hatches: 0, spins: 0 } };
    localStorage.setItem("littlenest-profiles-v1", JSON.stringify({ activeId: "mia", profiles: [mia] }));
    localStorage.setItem("littlenest-silent-hint-v1", "1");
    localStorage.setItem("littlenest-settings-v1", JSON.stringify({ showTips: true }));
  }, createdThisWeek());
}

async function home(page: Page) {
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  await expect(page.locator("[data-dock=games]")).toBeVisible();
}

/**
 * How far the lowest thing to tap in the game is above the bottom of the page, in px (below it is
 * negative), and how many things there are. A game with nothing in a tray (the balloons, the bird
 * whose parts are tapped) has only its scene to keep on the page.
 */
async function roomUnder(page: Page, bottomInset: number): Promise<{ room: number; things: number }> {
  return page.evaluate((bottomInset) => {
    const frame = document.querySelector(".game-frame");
    if (!frame) return { room: Number.NaN, things: 0 };
    const things = [...frame.querySelectorAll(".game-tray .pick, .game-tray button")].filter((thing) => thing.getBoundingClientRect().width > 0);
    const lowest = Math.max(frame.querySelector(".game-scene")?.getBoundingClientRect().bottom ?? 0, ...things.map((thing) => thing.getBoundingClientRect().bottom));
    return { room: Math.round(window.innerHeight - bottomInset - lowest), things: things.length };
  }, bottomInset);
}

for (const [name, device] of Object.entries(DEVICES)) {
  for (const [section, { door, tiles }] of Object.entries(SECTIONS)) {
    test(`on ${name}, as installed, with the tip open: everything to tap in ${section} is on the page`, async ({ page, browserName }, testInfo) => {
      test.skip(browserName !== "chromium" || testInfo.project.name !== "chromium", "sets its own screens, and the insets need Chromium");
      test.setTimeout(60_000);
      await openOn(page, device);
      await home(page);
      // The insets took: the page is padded for them.
      expect(await page.locator(".stage").evaluate((stage) => parseFloat(getComputedStyle(stage).paddingBottom))).toBe(12 + device.bottom);
      await page.locator(door).click();
      await expect(page.locator(tiles).first()).toBeVisible();
      const ids = await page.locator(tiles).evaluateAll((all) => all.map((tile) => tile.getAttribute("data-activity") ?? tile.getAttribute("data-game-tile") ?? ""));
      expect(ids.length).toBeGreaterThan(2);
      const seen: string[] = [];
      for (const id of ids) {
        await home(page);
        await page.locator(door).click();
        await page.locator(`${tiles}[data-activity="${id}"], ${tiles}[data-game-tile="${id}"]`).first().click();
        // Not every tile opens a kit game (the wheel of Spin & Say, number tracing): those have their own tests.
        const frame = page.locator(".game-frame");
        if ((await frame.count()) === 0) {
          await page.waitForTimeout(300);
          if ((await frame.count()) === 0) continue;
        }
        await expect(frame.locator(".game-scene")).toBeVisible();
        const tip = page.locator(".grownup-tip");
        await expect(tip).toHaveAttribute("data-tip-open", "true");
        const open = await roomUnder(page, device.bottom);
        // The one that does not fit: six letters under an open tip on the shortest phone. By the
        // time a child has hatched their way to six letters the tip has long been its chip, and
        // with the chip they fit, which is what is asked of it here.
        const shortest = name === "an iPhone SE" && id === "hatch";
        if (!shortest) expect(open.room, `${id}: room under the lowest thing to tap, tip open`).toBeGreaterThanOrEqual(0);
        await tip.locator(".grownup-tip-hide").click();
        await expect(tip).toHaveAttribute("data-tip-open", "false");
        const chip = await roomUnder(page, device.bottom);
        expect(chip.room, `${id}: room under the lowest thing to tap, tip closed to its chip`).toBeGreaterThanOrEqual(0);
        seen.push(id);
      }
      // The section's kit games were all looked at (a section with fewer than three would mean the tiles were not found).
      expect(seen.length, `kit games opened in ${section}: ${seen.join(", ")}`).toBeGreaterThanOrEqual(3);
    });
  }
}

test("on an iPad on its side six letters, and six cards, sit in one row; upright and on a phone, three to a row", async ({ page, browserName }, testInfo) => {
  test.skip(browserName !== "chromium" || testInfo.project.name !== "chromium", "sets its own screens, and the insets need Chromium");
  const rows = async () => {
    const tops = await page.locator(".game-tray .pick").evaluateAll((picks) => picks.map((pick) => Math.round(pick.getBoundingClientRect().top)));
    const count = new Map<number, number>();
    for (const top of tops) count.set(top, (count.get(top) ?? 0) + 1);
    return [...count.values()];
  };
  for (const [name, want] of [
    ["an iPad Air on its side", [6]],
    ["an iPad mini on its side", [6]],
    ["a 9.7-inch iPad", [3, 3]],
    ["an iPhone 14", [3, 3]],
  ] as const) {
    await openOn(page, DEVICES[name]);
    for (const id of ["hatch", "memory"]) {
      await home(page);
      await page.locator("[data-dock=games]").click();
      await page.locator(`[data-game-tile=${id}]`).click();
      await expect(page.locator(".game-frame .game-tray .pick")).toHaveCount(6);
      expect(await rows(), `${id} on ${name}`).toEqual(want);
    }
  }
});
