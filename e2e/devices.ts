import type { Page } from "@playwright/test";
import { createdThisWeek } from "./clock";

/**
 * The screens the app is installed on, as the installed app lays a page out on them.
 *
 * The app's web view is the whole glass: 100svh runs under the status bar and the home indicator,
 * and the app pads for both (env(safe-area-inset-top) and -bottom). A test screen with no insets
 * has more room than the device does, so a game that fits one may not fit the other. Each device
 * here is its screen in points, and its two insets.
 *
 * Chromium can be told a device's insets and WebKit, as a test browser, cannot, so a test that
 * opens one of these runs in Chromium. What such a test checks is laid out in px and viewport
 * units, which the two engines agree on to the hundredth of a px, zoomed or not: measured in
 * both, at an iPhone's and an iPad's sizes.
 */
export type Device = { width: number; height: number; top: number; bottom: number };

export const DEVICES: Record<string, Device> = {
  "an iPhone SE": { width: 375, height: 667, top: 20, bottom: 0 },
  "an iPhone 13 mini": { width: 375, height: 812, top: 50, bottom: 34 },
  "an iPhone 14": { width: 390, height: 844, top: 47, bottom: 34 },
  "a 9.7-inch iPad": { width: 768, height: 1024, top: 20, bottom: 0 },
  "an iPad Air on its side": { width: 1180, height: 820, top: 24, bottom: 20 },
  "an iPad mini on its side": { width: 1133, height: 744, top: 24, bottom: 20 },
};

/**
 * The page as one of the devices has it, with a child on it and the grown-ups' tips showing (they
 * are, unless a grown-up turns them off). Call before the page is opened.
 *
 * The child is five unless another age is asked for: every section is open at five. Hatch the Egg
 * is at its longest, six letters under the word. `quick` leaves out the wait for the praise
 * between a game's rounds (a development-build switch, see e2e/kit.ts).
 */
export async function openOn(page: Page, device: Device, child: { ageRange?: string; quick?: boolean } = {}) {
  await page.setViewportSize({ width: device.width, height: device.height });
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setSafeAreaInsetsOverride", { insets: { top: device.top, bottom: device.bottom, left: 0, right: 0 } });
  await page.addInitScript(
    ({ created, ageRange, quick }) => {
      if (sessionStorage.getItem("fit-seeded")) return;
      sessionStorage.setItem("fit-seeded", "1");
      const mia = { id: "mia", name: "Mia", ageRange, animal: "fox", createdAt: created, stars: 0, days: {}, ladder: { step: 2, successes: 0 }, games: { hatch: 3, hatches: 0, spins: 0 } };
      localStorage.setItem("littlenest-profiles-v1", JSON.stringify({ activeId: "mia", profiles: [mia] }));
      localStorage.setItem("littlenest-silent-hint-v1", "1");
      localStorage.setItem("littlenest-settings-v1", JSON.stringify({ showTips: true }));
      if (quick) localStorage.setItem("littlenest-quick-rounds", "1");
    },
    { created: createdThisWeek(), ageRange: child.ageRange ?? "5", quick: child.quick ?? false },
  );
}

/**
 * How far the lowest thing to tap in the game is above the bottom of the page, in px (below it is
 * negative), and how many things there are. The page is the screen less the home indicator, and
 * it is looked at from its top, as a child who has not scrolled sees it. A game with nothing in a
 * tray (the balloons, the bird whose parts are tapped) has only its scene to keep on the page.
 */
export async function roomUnder(page: Page, bottomInset: number): Promise<{ room: number; things: number }> {
  return page.evaluate((bottomInset) => {
    const frame = document.querySelector(".game-frame");
    if (!frame) return { room: Number.NaN, things: 0 };
    for (let box: Element | null = frame; box; box = box.parentElement) if (box.scrollTop > 0) box.scrollTop = 0;
    const things = [...frame.querySelectorAll(".game-tray .pick, .game-tray button")].filter((thing) => thing.getBoundingClientRect().width > 0);
    const lowest = Math.max(frame.querySelector(".game-scene")?.getBoundingClientRect().bottom ?? 0, ...things.map((thing) => thing.getBoundingClientRect().bottom));
    return { room: Math.round(window.innerHeight - bottomInset - lowest), things: things.length };
  }, bottomInset);
}
