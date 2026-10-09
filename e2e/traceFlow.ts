import { expect, test, type Page } from "@playwright/test";
import { fingerPath, QUICK_STRIDE } from "./fingerPath";
import { noting } from "./kit";

/**
 * How closely the test finger follows a stroke. "quick" is the default, and what the
 * finish-the-lesson helpers below use: most tests only need the tracing done on the way to
 * what they check. "careful" touches every station. fingerPath.ts says why there are two.
 */
export type Finger = "quick" | "careful";

/**
 * Look every 50 ms. Playwright's own steps grow to a second between looks, so a change that
 * lands just after a look is not seen for up to a second. That is paid on every stroke.
 *
 * A new list for every poll, on purpose. Playwright uses up the list it is given (1.56 pops
 * and shifts it), so one shared list works for the first poll and leaves every later poll
 * at a second between looks: measured, it made these tests slower than before.
 */
const lookOften = () => ({ intervals: [50] });

/**
 * What the board is asking for, read in one page call. It was one call per attribute, five
 * to the browser for each look. "gone" once the screen has left: a locator's getAttribute
 * would wait for the screen to come back.
 */
function signature(page: Page, screen: string): Promise<string> {
  return page.evaluate((name) => {
    const root = document.querySelector(`[data-screen=${name}]`);
    if (!root) return "gone";
    return ["letter", "casing", "glyph", "phase", "stroke"].map((key) => root.getAttribute(`data-${key}`)).join(":");
  }, screen);
}

/** Draw the stroke that is on the board, then wait for the board to move on. */
export async function traceCurrentStroke(page: Page, screen = "draw", finger: Finger = "quick") {
  const root = page.locator(`[data-screen=${screen}]`);
  const board = root.locator(".letter-board");
  await board.scrollIntoViewIfNeeded();
  const raw = (await board.getAttribute("data-stations")) ?? "";
  const svg = board.locator("svg");
  const box = await svg.boundingBox();
  if (!box) throw new Error("The tracing board has no box");
  const points = raw
    .split(" ")
    .filter(Boolean)
    .map((pair) => {
      const [x, y] = pair.split(",").map(Number);
      return { x: box.x + (x / 100) * box.width, y: box.y + (y / 100) * box.height };
    });
  if (points.length < 2) throw new Error("The stroke has no stations");
  const path = fingerPath(points, finger === "careful" ? 1 : QUICK_STRIDE);
  const before = await signature(page, screen);
  // Pressing down on the first station inks it, so the moves start from the second.
  await page.mouse.move(path[0].x, path[0].y);
  await page.mouse.down();
  for (const point of path.slice(1)) {
    await page.mouse.move(point.x, point.y);
  }
  await page.mouse.up();
  await expect.poll(() => signature(page, screen), lookOften()).not.toBe(before);
}

/** A short stroke in the corner of the board. It must not count as tracing. */
export async function scribbleCorner(page: Page, screen: string) {
  const root = page.locator(`[data-screen=${screen}]`);
  const board = root.locator(".letter-board");
  await board.scrollIntoViewIfNeeded();
  const box = await board.boundingBox();
  if (!box) throw new Error("The tracing board has no box");
  await page.mouse.move(box.x + 6, box.y + 6);
  await page.mouse.down();
  await page.mouse.move(box.x + 16, box.y + 10, { steps: 4 });
  await page.mouse.up();
  await expect(root).toHaveAttribute("data-covered", "0");
  await expect(root).toHaveAttribute("data-stroke-done", "false");
}

/** Trace every stroke of a shape, word, or name, then leave the cheer. */
export async function finishPathTrace(page: Page, screen: string) {
  const root = page.locator(`[data-screen=${screen}]`);
  await expect(root).toBeVisible();
  // The page notes what the cheer says, as it does: the cheer leaves on its own after a moment,
  // and the screen with it, so asked from here the screen could be gone.
  const said = await noting(root, (el) => `${el.getAttribute("data-phase")} ${el.getAttribute("data-spoken") ?? ""}`);
  for (let step = 0; step < 80; step += 1) {
    const phase = await screenPhase(page, screen);
    if (phase === null) return;
    if (phase === "demo") {
      await root.getByRole("button", { name: "Your turn" }).click({ timeout: 1500 }).catch(() => undefined);
      await expect.poll(() => leftPhase(page, "demo", screen), { timeout: 15000 }).toBe(true);
    } else if (phase === "trace") {
      await traceCurrentStroke(page, screen);
    } else if (phase === "cheer") {
      await expect.poll(async () => (await said()).some((note) => /^cheer .+/.test(note))).toBe(true);
      // The cheer leaves on its own after a moment, so Done may already be gone.
      await root.getByRole("button", { name: "Done" }).click({ timeout: 1500 }).catch(() => undefined);
      await expect(root).toHaveCount(0, { timeout: 5000 }).catch(() => undefined);
      return;
    } else if (phase === "pick") {
      throw new Error(`Pick a ${screen} before tracing`);
    } else {
      throw new Error(`Unexpected ${screen} phase ${phase}`);
    }
  }
  throw new Error(`${screen} tracing did not finish`);
}

/**
 * The draw screen's phase, or null once the screen is gone. Read in one
 * page call: a locator's getAttribute waits for a detached element to come
 * back, which on a slow runner turned the hand-off to Today into a hang.
 */
function screenPhase(page: Page, screen = "draw"): Promise<string | null> {
  return page.evaluate((name) => document.querySelector(`[data-screen=${name}]`)?.getAttribute("data-phase") ?? null, screen);
}

/** True once the screen has moved on from this phase, or has gone altogether. */
async function leftPhase(page: Page, phase: string, screen = "draw"): Promise<boolean> {
  return (await screenPhase(page, screen)) !== phase;
}

export async function pairOne(page: Page) {
  const root = page.locator("[data-screen=draw]");
  const waiting = root.locator("[data-match-upper][data-paired=false]");
  if ((await waiting.count()) === 0) {
    // The last pair ends the letter a moment later, and the last letter ends the screen.
    // CI's dev server can take a few seconds over that last hand-off, so this waits longer.
    await expect.poll(() => leftPhase(page, "match"), { timeout: 15000, ...lookOften() }).toBe(true);
    return;
  }
  const tile = waiting.first();
  const letter = (await tile.getAttribute("data-match-upper")) ?? "";
  await tile.click();
  await root.locator(`[data-match-lower="${letter.toLowerCase()}"]`).click();
}

/**
 * A whole letter lesson is long by nature: twelve strokes for two letters, the app's own
 * pause after each one, then matching. Even with the quick finger, a test built around a
 * lesson takes 14 to 20 s in CI, depending on the runner, and a test gets 30 s unless it
 * says otherwise. That is too little room: a runner one and a half times slower again
 * would fail a test that is doing nothing wrong. So any test that runs a lesson gets a minute.
 */
const LESSON_TEST_LIMIT = 60000;

/** Finish big and little tracing, matching, and reversal practice for today's letters. */
export async function finishLetterTracing(page: Page) {
  // Only ever a longer limit: a test that already asked for more keeps it, and so does a
  // debugging run, where the limit is 0 for "none".
  const limit = test.info().timeout;
  if (limit > 0 && limit < LESSON_TEST_LIMIT) test.setTimeout(LESSON_TEST_LIMIT);
  // Page errors and the screen's state ride along on a failure, since CI keeps its logs elsewhere.
  const errors: string[] = [];
  const onError = (error: Error) => errors.push(`pageerror: ${error.message}`);
  const onConsole = (message: { type: () => string; text: () => string }) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  };
  page.on("pageerror", onError);
  page.on("console", onConsole);
  // A timeline of screen and phase changes, for the same reason.
  await page.evaluate(() => {
    const target = window as Window & { __phaseLog?: string[] };
    if (target.__phaseLog) return;
    target.__phaseLog = [];
    const note = () => {
      const screens = [...document.querySelectorAll("[data-screen]")].map((el) => `${el.getAttribute("data-screen")}${el.getAttribute("data-phase") ? `:${el.getAttribute("data-phase")}` : ""}`);
      const line = screens.join(" ");
      const log = target.__phaseLog ?? [];
      if (log.length === 0 || !log[log.length - 1].endsWith(line)) log.push(`${Math.round(performance.now())}ms ${line}`);
    };
    new MutationObserver(note).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["data-screen", "data-phase"], childList: true });
    note();
  });
  try {
    await finishLetterTracingSteps(page);
  } catch (error) {
    const root = page.locator("[data-screen=draw]");
    const where = (await root.count()) > 0 ? await root.evaluate((el) => JSON.stringify({ ...el.dataset })) : `screen ${await page.locator("[data-screen]").first().getAttribute("data-screen")}`;
    const timeline = await page.evaluate(() => ((window as Window & { __phaseLog?: string[] }).__phaseLog ?? []).slice(-12).join(" | ")).catch(() => "");
    throw new Error(`${error instanceof Error ? error.message : String(error)}\nstate: ${where}\ntimeline: ${timeline}\n${errors.slice(0, 6).join("\n")}`);
  } finally {
    page.off("pageerror", onError);
    page.off("console", onConsole);
  }
}

async function finishLetterTracingSteps(page: Page) {
  const root = page.locator("[data-screen=draw]");
  await expect(root).toBeVisible();
  for (let step = 0; step < 80; step += 1) {
    if ((await page.locator("[data-screen=today]").count()) > 0) return;
    const phase = await screenPhase(page);
    if (phase === null) {
      await expect(page.locator("[data-screen=today]")).toBeVisible();
      return;
    }
    if (phase === "demo") {
      // The demo moves on by itself after each stroke, so the button can be gone by the click.
      await root.getByRole("button", { name: "Your turn" }).click({ timeout: 1500 }).catch(() => undefined);
      await expect.poll(() => leftPhase(page, "demo"), { timeout: 15000 }).toBe(true);
    } else if (phase === "trace") {
      await traceCurrentStroke(page);
    } else if (phase === "cheer") {
      await root.getByRole("button", { name: "Match" }).click();
      await expect(root).toHaveAttribute("data-phase", "match");
    } else if (phase === "match") {
      await pairOne(page);
    } else if (phase === "reversal") {
      const want = await root.getAttribute("data-reversal");
      await root.locator(`[data-reversal-choice="${want}"]`).click();
    } else {
      throw new Error(`Unexpected tracing phase ${phase}`);
    }
  }
  throw new Error("Tracing did not finish");
}
