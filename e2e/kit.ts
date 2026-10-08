import { expect, type Locator, type Page } from "@playwright/test";
import { createdThisWeek } from "./clock";

/**
 * Helpers for the games built on the game kit (src/game/kit.tsx).
 *
 * A kit game waits for its praise to be said before the next round. `quick`
 * turns that wait off (a development-build switch), so a test can play a
 * whole game through in a second or two. Tests about what is said leave it on.
 */

export const stageOfWeek: Record<number, string> = { 0: "day", 1: "routine", 2: "clock", 3: "coins", 4: "shop", 5: "hours", 6: "minutes", 8: "values", 9: "change", 10: "jars", 15: "cards", 16: "cards" };

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

/** Open the app on a child's Time & Money page. `salt` pins which rounds the games deal (a development-build switch). */
export async function openTimeMoney(page: Page, options: { week?: number; quick?: boolean; ageRange?: string; tips?: boolean; salt?: number } = {}) {
  const { week = 0, quick = true, ageRange = "4", tips = false, salt } = options;
  await page.addInitScript(
    ({ saved, placed, quick, tips, salt }) => {
      if (sessionStorage.getItem("kit-seeded")) return;
      sessionStorage.setItem("kit-seeded", "1");
      localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
      localStorage.setItem("littlenest-placement-v1", JSON.stringify(placed));
      localStorage.removeItem("kids-app-silent-hint-v1");
      if (quick) localStorage.setItem("littlenest-quick-rounds", "1");
      if (!tips) localStorage.setItem("littlenest-settings-v1", JSON.stringify({ showTips: false }));
      if (salt !== undefined) localStorage.setItem("littlenest-salt", String(salt));
    },
    { saved: child(ageRange), placed: timePlacement(week), quick, tips, salt },
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
/**
 * Waits for a scene's painting to be in (src/game/kit.tsx, `data-in`), and when it is not, says what
 * became of the picture. A painting has stayed out twice in WebKit runs of CI, for 5 s and for 15 s,
 * and not once in two more runs of the whole suite and 250 of the painting tests with every
 * picture watched (branch lab/painting-why). Loaded (complete, 1500 wide): the game missed its
 * load. Not loaded: its load never finished, and when it was fetched, if it was, says more.
 */
export async function paintingIn(art: Locator) {
  try {
    await expect(art).toHaveAttribute("data-in", "true");
  } catch (error) {
    const seen = await art
      .evaluate((img: HTMLImageElement) => {
        const fetched = performance
          .getEntriesByName(img.currentSrc || img.src)
          .map((entry) => `from ${Math.round(entry.startTime)} to ${Math.round((entry as PerformanceResourceTiming).responseEnd)} ms`);
        return `complete ${img.complete}, ${img.naturalWidth} wide, ${img.isConnected ? "on" : "off"} the page; fetched ${fetched.join(" and ") || "(not in the page's list)"}; the page at ${Math.round(performance.now())} ms`;
      })
      .catch((problem) => `could not ask the picture: ${String(problem).slice(0, 120)}`);
    throw new Error(`The painting did not come in: ${seen}.\n${String(error)}`);
  }
}

export async function onRound(frame: Locator, round: number) {
  await expect(frame).toHaveAttribute("data-round", String(round));
  await expect(frame).toHaveAttribute("data-solved", "false");
}

let notebooks = 0;

/**
 * Have the page note something about what it shows, every time that changes, and give the notes
 * back when asked.
 *
 * For a moment that is over before a test can ask about it. Under the quick setting a right answer
 * shows for 150 ms before the next round takes its place, and a button is marked busy for under
 * half a second: a question from the test that comes a little late (a busy machine) finds the
 * moment gone, and fails with nothing wrong. Looked at from inside the page, as it happens, the
 * moment is never missed.
 *
 * `look` runs in the page: it sees its two arguments (the element of `target`, and `arg`) and
 * nothing else of this file. What it returns is noted each time it differs from the last note.
 * `target` has to stay on the page; the notes stop when its element is replaced.
 */
export async function noting<T, A = undefined>(target: Locator, look: (element: Element, arg: A) => T, arg?: A): Promise<() => Promise<T[]>> {
  const book = `__notes${(notebooks += 1)}`;
  await target.evaluate(
    (element, { book, look, arg }) => {
      const read = new Function(`return (${look});`)() as (element: Element, arg: unknown) => unknown;
      const notes: unknown[] = [];
      (window as unknown as Record<string, unknown[]>)[book] = notes;
      let last: string | undefined;
      const note = () => {
        const now = JSON.stringify(read(element, arg) ?? null);
        if (now === last) return;
        last = now;
        notes.push(JSON.parse(now));
      };
      new MutationObserver(note).observe(element, { attributes: true, childList: true, characterData: true, subtree: true });
      note();
    },
    { book, look: look.toString(), arg },
  );
  return () => target.page().evaluate((book) => (window as unknown as Record<string, unknown[]>)[book] ?? [], book) as Promise<T[]>;
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

/** Find every pair on a matching board (Rhyme Match, Memory Flip) and tap its two cards. */
export async function matchPairs(root: Locator, cardSelector: string) {
  const cards = await root.locator(cardSelector).evaluateAll((nodes) =>
    nodes.map((node) => ({
      id: node.getAttribute("data-card") ?? node.getAttribute("data-rhyme") ?? "",
      pair: node.getAttribute("data-pair") ?? "",
    })),
  );
  const groups = new Map<string, string[]>();
  for (const card of cards) {
    const list = groups.get(card.pair) ?? [];
    list.push(card.id);
    groups.set(card.pair, list);
  }
  let found = 0;
  for (const ids of groups.values()) {
    await root.locator(`${cardSelector}[data-card="${ids[0]}"], ${cardSelector}[data-rhyme="${ids[0]}"]`).click();
    await root.locator(`${cardSelector}[data-card="${ids[1]}"], ${cardSelector}[data-rhyme="${ids[1]}"]`).click();
    found += 1;
    // The last pair ends the round, and the next round's count starts again.
    if (found < groups.size) await expect(root).toHaveAttribute("data-matched", String(found));
  }
}
