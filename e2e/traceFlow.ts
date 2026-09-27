import { expect, type Page } from "@playwright/test";

async function signature(page: Page, screen: string): Promise<string> {
  const root = page.locator(`[data-screen=${screen}]`);
  const phase = await root.getAttribute("data-phase");
  const casing = await root.getAttribute("data-casing");
  const stroke = await root.getAttribute("data-stroke");
  const letter = await root.getAttribute("data-letter");
  const glyph = await root.getAttribute("data-glyph");
  return `${letter}:${casing}:${glyph}:${phase}:${stroke}`;
}

/** Draw the stations of the stroke that is on the board. */
export async function traceCurrentStroke(page: Page, screen = "draw") {
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
  const before = await signature(page, screen);
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  for (const point of points) {
    await page.mouse.move(point.x, point.y);
  }
  await page.mouse.up();
  await expect.poll(async () => signature(page, screen)).not.toBe(before);
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
  for (let step = 0; step < 80; step += 1) {
    if ((await root.count()) === 0) return;
    const phase = await root.getAttribute("data-phase");
    if (phase === "demo") {
      await root.getByRole("button", { name: "Your turn" }).click();
      await expect(root).toHaveAttribute("data-phase", "trace");
    } else if (phase === "trace") {
      await traceCurrentStroke(page, screen);
    } else if (phase === "cheer") {
      await expect(root).toHaveAttribute("data-spoken", /.+/);
      await root.getByRole("button", { name: "Done" }).click();
      return;
    } else if (phase === "pick") {
      throw new Error(`Pick a ${screen} before tracing`);
    } else {
      throw new Error(`Unexpected ${screen} phase ${phase}`);
    }
  }
  throw new Error(`${screen} tracing did not finish`);
}

async function pairOne(page: Page) {
  const root = page.locator("[data-screen=draw]");
  const waiting = root.locator("[data-match-upper][data-paired=false]");
  if ((await waiting.count()) === 0) {
    await expect(root).not.toHaveAttribute("data-phase", "match");
    return;
  }
  const tile = waiting.first();
  const letter = (await tile.getAttribute("data-match-upper")) ?? "";
  await tile.click();
  await root.locator(`[data-match-lower="${letter.toLowerCase()}"]`).click();
}

/** Finish big and little tracing, matching, and reversal practice for today's letters. */
export async function finishLetterTracing(page: Page) {
  const root = page.locator("[data-screen=draw]");
  await expect(root).toBeVisible();
  for (let step = 0; step < 80; step += 1) {
    if ((await page.locator("[data-screen=today]").count()) > 0) return;
    const phase = await root.getAttribute("data-phase");
    if (phase === "demo") {
      await root.getByRole("button", { name: "Your turn" }).click();
      await expect(root).toHaveAttribute("data-phase", "trace");
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
