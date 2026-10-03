import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Step through the lesson's cards to the first word with at least this many
 * tiles. A lesson opens on the week's letter cards, so a test about sliding
 * under a word steps past them first.
 */
export async function showWordCard(page: Page, tiles = 2): Promise<Locator> {
  const activity = page.locator(".activity");
  await expect(activity).toBeVisible();
  const total = Number((await page.locator(".chunk-strip-word").getAttribute("data-word-count")) ?? "0");
  for (let step = 0; step <= total; step += 1) {
    const word = await activity.getAttribute("data-letter-card");
    const sentence = await activity.getAttribute("data-sentence");
    const count = await page.locator(".letters .tile-wrap").count();
    if (word === "false" && sentence === "false" && count >= tiles) return activity;
    const before = await activity.getAttribute("data-word");
    await page.getByRole("button", { name: "Next word" }).click();
    await expect(activity).not.toHaveAttribute("data-word", before ?? "");
  }
  throw new Error(`No word card with ${tiles} or more tiles in this lesson`);
}

/** A child's slide along the track: about a second from one end to the other. */
export async function slideAcross(page: Page, track: Locator, steps = 40): Promise<void> {
  const box = await track.boundingBox();
  if (!box) throw new Error("The blend track has no box");
  const y = box.y + box.height / 2;
  const start = box.x + 8;
  const end = box.x + box.width - 4;
  await page.mouse.move(start, y);
  await page.mouse.down();
  for (let step = 1; step <= steps; step += 1) {
    await page.mouse.move(start + ((end - start) * step) / steps, y);
    await page.waitForTimeout(25);
  }
  await page.mouse.up();
}
