import { expect, type Page } from "@playwright/test";

async function signature(page: Page): Promise<string> {
  const root = page.locator("[data-screen=draw]");
  const phase = await root.getAttribute("data-phase");
  const casing = await root.getAttribute("data-casing");
  const stroke = await root.getAttribute("data-stroke");
  const letter = await root.getAttribute("data-letter");
  return `${letter}:${phase}:${casing}:${stroke}`;
}

/** Draw the stations of the stroke that is on the board. */
export async function traceCurrentStroke(page: Page) {
  const root = page.locator("[data-screen=draw]");
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
  const before = await signature(page);
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  for (const point of points) {
    await page.mouse.move(point.x, point.y);
  }
  await page.mouse.up();
  await expect.poll(async () => signature(page)).not.toBe(before);
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
