import { expect, test, type Locator, type Page } from "@playwright/test";
import { clipShipped, installAudioSpy, playedClips, spokenLines } from "./audioSpy";
import { createdThisWeek } from "./clock";

const profile = {
  activeId: "mia",
  profiles: [
    {
      id: "mia",
      name: "Mia",
      ageRange: "4",
      animal: "fox",
      createdAt: createdThisWeek(),
      stars: 0,
      days: {},
      ladder: { step: 1, successes: 0 },
    },
  ],
};

/** Week 0 of the letter plan: a, m, t and s. */
const placement = {
  version: 1,
  origin: "device",
  classId: "device-class",
  updatedAt: "2026-09-26T00:00:00.000Z",
  subjects: {
    reading: { classDefault: { subject: "reading", stageId: "letters", weekIndex: 0 }, byChildId: {} },
  },
};

async function install(page: Page) {
  await page.addInitScript(
    ({ saved, placed }) => {
      localStorage.setItem("littlenest-profiles-v1", JSON.stringify(saved));
      localStorage.setItem("littlenest-placement-v1", JSON.stringify(placed));
      localStorage.setItem("littlenest-silent-hint-v1", "1");
    },
    { saved: profile, placed: placement },
  );
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  await expect(page.locator("[data-screen=today]")).toHaveAttribute("data-letters", "amts");
}

async function dragAcross(page: Page, track: Locator) {
  const box = await track.boundingBox();
  if (!box) throw new Error("track has no box");
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 8, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 8, y, { steps: 40 });
  await page.mouse.up();
}

test("the letters of the week are the first cards in Sound it out, then the Nest words, then the words they make", async ({ page }) => {
  await installAudioSpy(page);
  await install(page);
  // The path says what the week is about, in words.
  await expect(page.locator("[data-week-focus]")).toHaveText(/^(This week|Review day): A, M, T and S$/);
  await page.getByRole("button", { name: "Letters" }).click();

  const activity = page.locator(".activity");
  await expect(activity).toHaveAttribute("data-ladder-step", "1");
  await expect(activity).toHaveAttribute("data-word", "letter-a");
  await expect(activity).toHaveAttribute("data-letter-card", "true");
  await expect(page.locator("[data-lesson-focus]")).toHaveText(/A, M, T and S$/);
  const tiles = page.locator(".letters .tile-wrap");
  await expect(tiles).toHaveCount(1);
  await expect(tiles.first().locator("button")).toHaveAttribute("aria-label", "A sound");
  // The tile shows the big and the little letter together.
  await expect(tiles.first().locator("button")).toHaveText("Aa");
  // Every letter card has the drawing of its own word, with the word under it.
  await expect(page.locator(".letter-glyph")).toHaveCount(0);
  await expect(page.locator(".picture-card svg").first()).toBeVisible();
  await expect(page.locator("[data-letter-caption]")).toHaveText("apple");
  await expect(page.locator("[data-letter-caption] b")).toHaveText("a");
  await expect(page.locator(".picture-card")).toHaveAttribute("aria-label", "apple");

  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  // The card's own line is the phrase, once: "a, as in apple". It is not followed by "apple" again.
  await page.getByRole("button", { name: "Play sound" }).click();
  await expect.poll(() => spokenLines(page), { timeout: 20000 }).toContain("a, as in apple");
  if (clipShipped("letters/a.mp3")) expect(await playedClips(page)).toContain("letters/a.mp3");
  expect(await playedClips(page)).not.toContain("words/apple.mp3");

  // Sliding under the letter says its sound, then the picture's word.
  const before = (await playedClips(page)).length;
  await dragAcross(page, page.locator(".blend-track"));
  await expect(activity).toHaveAttribute("data-blended", "true");
  if (clipShipped("sounds/a.mp3")) {
    await expect.poll(async () => (await playedClips(page)).slice(before), { timeout: 20000 }).toEqual(["sounds/a.mp3", "words/apple.mp3"]);
  }
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
  // After a letter card, the grown-up's tip asks about the letter's own word. It waits as a chip,
  // closed, so the lesson does not move; a grown-up opens it.
  await expect(page.locator("[data-tip=letter-a-end]")).toHaveAttribute("data-tip-open", "false");
  await page.getByRole("button", { name: "For grown-ups: show tip" }).click();
  await expect(page.getByText("Ask: what else starts like apple?")).toBeVisible();

  // Then the week's other letters, each with its own drawing: M (moon), T and S.
  await page.getByRole("button", { name: "Next word" }).click();
  await expect(activity).toHaveAttribute("data-word", "letter-m");
  await expect(page.locator(".picture-card")).toHaveAttribute("aria-label", "moon");
  await expect(page.locator("[data-letter-caption] b")).toHaveText("m");
  await page.getByRole("button", { name: "Next word" }).click();
  await expect(activity).toHaveAttribute("data-word", "letter-t");
  await page.getByRole("button", { name: "Next word" }).click();
  await expect(activity).toHaveAttribute("data-word", "letter-s");

  // The Nest words card: I, a and the are read whole, not sounded out.
  await page.getByRole("button", { name: "Next word" }).click();
  await expect(activity).toHaveAttribute("data-nest-card", "true");
  await expect(page.locator("[data-nest-word]")).toHaveCount(3);

  // Then the first word the letters make, to slide under. With four sounds, week one has real words: mat, sat.
  await page.getByRole("button", { name: "Next word" }).click();
  await expect(activity).toHaveAttribute("data-word", "mat");
  await expect(activity).toHaveAttribute("data-letter-card", "false");
  await expect(page.locator(".chunk-strip-word")).toHaveText("Word 6 of 7");
  // The word is in small letters, there to be read before the slide reaches it.
  await expect(tiles).toHaveCount(3);
  await expect(tiles.nth(0).locator("button")).toHaveText("m");
  await expect(tiles.nth(1).locator("button")).toHaveText("a");
  await expect(tiles.nth(2).locator("button")).toHaveText("t");
  await expect(tiles.nth(0)).toHaveAttribute("data-lit", "false");
  const sounded = (await playedClips(page)).length;
  await dragAcross(page, page.locator(".blend-track"));
  await expect(activity).toHaveAttribute("data-blended", "true");
  // Each letter's sound, in order, then the word: none is cut off by the next.
  if (clipShipped("sounds/m.mp3") && clipShipped("words/mat.mp3")) {
    await expect
      .poll(async () => (await playedClips(page)).slice(sounded), { timeout: 20000 })
      .toEqual(["sounds/m.mp3", "sounds/a.mp3", "sounds/t.mp3", "words/mat.mp3"]);
  }
  // After a word, the tip is about reading it again, not about a letter.
  await expect(page.getByText(/read the word once more/)).toBeVisible();

  // A letter card earns the letter sticker, not a pretend word, and does not move the word ladder.
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("littlenest-profiles-v1") ?? "{}"));
  const stickers = (saved.profiles?.[0]?.stickers ?? []) as { kind: string; label: string }[];
  expect(stickers.some((sticker) => sticker.kind === "letter" && sticker.label === "a")).toBe(true);
  expect(stickers.some((sticker) => sticker.kind === "word" && sticker.label === "apple")).toBe(false);
  expect(stickers.some((sticker) => sticker.kind === "word" && sticker.label === "mat")).toBe(true);
  expect(saved.profiles?.[0]?.ladder?.words).toEqual(["mat"]);
  expect(saved.profiles?.[0]?.ladder?.successes).toBe(1);
});
