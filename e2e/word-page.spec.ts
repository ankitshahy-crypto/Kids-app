import { expect, test, type Locator, type Page } from "@playwright/test";
import { createdThisWeek } from "./clock";
import { noting } from "./kit";

/**
 * The word is the page. On Sound it out and on a letter card, the word or the
 * letter being said is the largest thing on the screen; one yellow bar sits
 * under the part being said, under each letter as its sound plays and under
 * the whole word when the word is said; and the child's animal waits at the
 * edge of the track until then, and comes in after.
 */

function child(ageRange: string) {
  return {
    activeId: "mia",
    profiles: [{ id: "mia", name: "Mia", ageRange, animal: "fox", createdAt: createdThisWeek(), stars: 0, days: {}, ladder: { step: 3, successes: 0 } }],
  };
}

/** Week 5 of the letter plan, o and c: the week that makes "cat". */
const placement = {
  version: 1,
  origin: "device",
  classId: "device-class",
  updatedAt: "2026-09-26T00:00:00.000Z",
  subjects: {
    reading: { classDefault: { subject: "reading", stageId: "letters", weekIndex: 4 }, byChildId: {} },
  },
};

async function install(page: Page, ageRange = "4", calm = false) {
  await page.addInitScript(
    ({ saved, placed, calm }) => {
      localStorage.setItem("littlenest-profiles-v1", JSON.stringify(saved));
      localStorage.setItem("littlenest-placement-v1", JSON.stringify(placed));
      localStorage.setItem("littlenest-silent-hint-v1", "1");
      if (calm) localStorage.setItem("littlenest-settings-v1", JSON.stringify({ calm: true }));
    },
    { saved: child(ageRange), placed: placement, calm },
  );
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "Letters" }).click();
  await expect(page.locator(".blend-track")).toBeVisible();
}

/** Step through the lesson's cards to the word. */
async function showWord(page: Page, id: string): Promise<Locator> {
  const activity = page.locator(".activity");
  const total = Number((await page.locator(".chunk-strip-word").getAttribute("data-word-count")) ?? "0");
  for (let step = 0; step <= total; step += 1) {
    if ((await activity.getAttribute("data-word")) === id) return activity;
    const before = await activity.getAttribute("data-word");
    await page.getByRole("button", { name: "Next word" }).click();
    await expect(activity).not.toHaveAttribute("data-word", before ?? "");
  }
  throw new Error(`No card for ${id} in this lesson`);
}

/** A child's slide along the track, slow enough for each sound to be heard as the finger passes its letter. */
async function slide(page: Page, track: Locator) {
  const box = await track.boundingBox();
  if (!box) throw new Error("track has no box");
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 8, y);
  await page.mouse.down();
  for (let step = 1; step <= 40; step += 1) {
    await page.mouse.move(box.x + 8 + ((box.width - 12) * step) / 40, y);
    await page.waitForTimeout(45);
  }
  await page.mouse.up();
}

for (const [age, calm] of [
  ["4", false],
  ["6-7", false],
  ["6-7", true],
] as const) {
  test(`a blend of cat at ages ${age}${calm ? ", in calm mode" : ""}: the word largest, the bar under c, a, t, then under cat, and the animal after that`, async ({ page }, testInfo) => {
    await install(page, age, calm);
    const activity = await showWord(page, "cat");
    const tiles = activity.locator(".letters .tile-wrap");
    await expect(tiles).toHaveCount(3);
    // The word is the largest thing on the page: each tile is bigger than its picture is tall, and
    // the row of three is wider than anything above it.
    const card = await activity.locator(".picture-card").boundingBox();
    const first = await tiles.first().boundingBox();
    const row = await activity.locator(".letters").boundingBox();
    expect(first!.width).toBeGreaterThanOrEqual(96);
    expect(first!.height).toBeGreaterThanOrEqual(card!.height * 0.6);
    expect(row!.width).toBeGreaterThan(card!.width);
    if (testInfo.project.name === "chromium" && age === "4") await page.screenshot({ path: "test-results/screenshots/word_page_cat.png" });
    // One bar, under the first tile, before anything is said; the animal waits at the edge of the track.
    const bar = activity.locator("[data-blend-token]");
    await expect(bar).toHaveCount(1);
    await expect(bar).toHaveAttribute("data-under", "none");
    await expect(bar).toBeVisible();
    const track = activity.locator(".blend-track");
    const trackBox = await track.boundingBox();
    const animal = activity.locator(".blend-animal");
    await expect(animal).toHaveAttribute("data-word-teller", "waiting");
    const waiting = await animal.boundingBox();
    expect(waiting!.x).toBeLessThan(trackBox!.x + trackBox!.width / 4);
    // The slide: the bar goes under c, then a, then t as each sound plays, then under the whole word.
    const under = await noting(bar, (element) => element.getAttribute("data-under"));
    await slide(page, track);
    await expect(activity).toHaveAttribute("data-blended", "true");
    await expect(bar).toHaveAttribute("data-under", "word");
    const seen = (await under()).filter((note) => note !== "finger" && note !== "none");
    expect(seen).toEqual(["0", "1", "2", "word"]);
    // Under the whole word: from the first tile's edge to the last one's.
    await expect.poll(async () => {
      const box = await bar.boundingBox();
      const left = await tiles.first().boundingBox();
      const right = await tiles.last().boundingBox();
      return Math.abs(box!.x - left!.x) <= 4 && Math.abs(box!.x + box!.width - (right!.x + right!.width)) <= 4;
    }).toBe(true);
    // And the animal after that: it comes in under the word and says it.
    await expect(animal).toHaveAttribute("data-word-teller", "said");
    await expect(animal.locator(".word-bubble")).toHaveText("cat");
    await expect.poll(async () => (await animal.boundingBox())!.x).toBeGreaterThan(waiting!.x + 40);
    if (testInfo.project.name === "chromium" && age === "4") await page.screenshot({ path: "test-results/screenshots/word_page_cat_said.png" });
    // The bar stayed visible throughout, and in calm mode it did not flash.
    await expect(bar).toBeVisible();
    if (calm) expect(await bar.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  });
}

test("a letter card: the letter is the largest thing, the bar under it as it is said", async ({ page }) => {
  await install(page);
  const activity = page.locator(".activity");
  await expect(activity).toHaveAttribute("data-letter-card", "true");
  const tile = activity.locator(".letters .tile-wrap").first();
  const tileBox = await tile.boundingBox();
  const card = await activity.locator(".picture-card").boundingBox();
  expect(tileBox!.height).toBeGreaterThan(card!.height * 0.8);
  expect(tileBox!.width).toBeGreaterThanOrEqual(140);
  const bar = activity.locator("[data-blend-token]");
  // The card's line is said as it opens: the bar sits under the letter while it does.
  await expect(bar).toHaveAttribute("data-under", "0", { timeout: 5000 });
  const barBox = await bar.boundingBox();
  expect(Math.abs(barBox!.x - tileBox!.x)).toBeLessThanOrEqual(3);
  await expect(activity.locator(".blend-animal")).toHaveAttribute("data-word-teller", "waiting");
  // No script for the child to read: the voice says the sound, then the word.
  await expect(activity.getByText(/now you say/i)).toHaveCount(0);
});

test("a word with no drawing has nothing above it: the word alone, and the animal at the edge", async ({ page }) => {
  await install(page);
  const activity = page.locator(".activity");
  const total = Number((await page.locator(".chunk-strip-word").getAttribute("data-word-count")) ?? "0");
  let found = false;
  for (let step = 0; step <= total && !found; step += 1) {
    const letterCard = await activity.getAttribute("data-letter-card");
    if (letterCard === "false" && (await activity.locator(".picture-card").count()) === 0) {
      found = true;
      break;
    }
    const before = await activity.getAttribute("data-word");
    await page.getByRole("button", { name: "Next word" }).click();
    await expect(activity).not.toHaveAttribute("data-word", before ?? "");
  }
  test.skip(!found, "every word in this lesson has a drawing");
  await expect(activity.locator(".word-bubble")).toHaveCount(0);
  await expect(activity.locator(".blend-animal")).toHaveAttribute("data-word-teller", "waiting");
  const row = await activity.locator(".letters").boundingBox();
  const bar = await activity.locator("[data-blend-token]").boundingBox();
  // The bar is right under the word.
  expect(bar!.y).toBeGreaterThanOrEqual(row!.y + row!.height - 2);
  expect(bar!.y).toBeLessThan(row!.y + row!.height + 24);
});
