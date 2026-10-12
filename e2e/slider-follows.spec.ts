import { expect, test, type Page } from "@playwright/test";
import { installAudioSpy, requestedCues } from "./audioSpy";
import { createdWeeksAgo } from "./clock";
import { showWordCard } from "./lesson";

// A phone, where the slide was seen to snap: the animal stayed at the start while a letter lit, then
// jumped to the middle with every letter green.
test.use({ viewport: { width: 390, height: 844 } });

const profile = {
  activeId: "mia",
  profiles: [
    {
      id: "mia",
      name: "Mia",
      ageRange: "4",
      animal: "bunny",
      // The week of s and t, when the first three-letter words can be sounded out.
      createdAt: createdWeeksAgo(1),
      stars: 1,
      days: {},
      ladder: { step: 3, successes: 0 },
    },
  ],
};

async function openWord(page: Page) {
  await installAudioSpy(page);
  await page.addInitScript((saved) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.setItem("littlenest-silent-hint-v1", "1");
  }, profile);
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "Letters" }).click();
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await showWordCard(page, 3);
}

const LETTER_SOUND = /^sounds\//;

test("Sound it out: the animal is the slider, under the finger the whole way, and each letter lights as it gets there", async ({ page }) => {
  await openWord(page);
  const track = page.locator(".blend-track");
  const animal = page.locator(".blend-animal");
  const tiles = page.locator(".letters .tile-wrap");
  await expect(tiles.nth(2)).toBeVisible();
  const count = await tiles.count();
  const box = (await track.boundingBox())!;
  const animalBox = (await animal.boundingBox())!;
  const half = animalBox.width / 2;
  const centres: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const tile = (await tiles.nth(index).boundingBox())!;
    centres.push(tile.x + tile.width / 2);
  }
  const y = box.y + box.height / 2;
  const start = box.x + 8;
  const end = box.x + box.width - 4;
  const before = (await requestedCues(page)).length;

  // Where the animal's middle should be for a finger at x: under it, kept whole on the track.
  const expectedAt = (x: number) => Math.min(box.x + box.width - half, Math.max(box.x + half, x));
  const middleOf = async () => {
    const at = (await animal.boundingBox())!;
    return at.x + at.width / 2;
  };

  await page.mouse.move(start, y);
  await page.mouse.down();
  expect(Math.abs((await middleOf()) - expectedAt(start))).toBeLessThanOrEqual(3);
  // Nothing has been reached yet: no letter lights on the touch alone.
  for (let index = 0; index < count; index += 1) await expect(tiles.nth(index)).toHaveAttribute("data-lit", "false");

  const steps = 40;
  let furthest = expectedAt(start);
  for (let step = 1; step <= steps; step += 1) {
    const x = start + ((end - start) * step) / steps;
    await page.mouse.move(x, y);
    await page.waitForTimeout(25);
    // The animal is where the finger is, every step of the way: never behind it, never ahead.
    const middle = await middleOf();
    expect(Math.abs(middle - expectedAt(x)), `step ${step}: animal at ${middle}, finger at ${x}`).toBeLessThanOrEqual(3);
    expect(middle, `step ${step}: the animal went backwards`).toBeGreaterThanOrEqual(furthest - 1);
    furthest = Math.max(furthest, middle);
    // A letter is lit once the animal's middle has reached the letter's, and not before.
    for (let index = 0; index < count; index += 1) {
      if (Math.abs(x - centres[index]) < 2) continue;
      await expect(tiles.nth(index), `step ${step}: tile ${index} with the finger at ${x} and its middle at ${centres[index]}`).toHaveAttribute(
        "data-lit",
        x >= centres[index] ? "true" : "false",
      );
    }
  }
  await page.mouse.up();

  // Lit in reading order, the word said at the end, where the slide ended.
  await expect(page.locator(".blend")).toHaveAttribute("data-lit-order", Array.from({ length: count }, (_, index) => index).join(","));
  await expect(page.locator(".activity")).toHaveAttribute("data-blended", "true");
  await expect(animal).toHaveAttribute("data-word-teller", "said");
  const word = await page.locator(".activity").getAttribute("data-word");
  await expect(page.locator(".blend-said")).toBeVisible();
  const said = (await page.locator(".blend-said").textContent())?.trim();
  expect(said, "the bubble says the word").toBeTruthy();
  expect(word?.startsWith(said ?? "\u0000")).toBe(true);
  // The animal stayed at the end, whole on the track, with the bubble on its free side.
  const ended = (await animal.boundingBox())!;
  expect(Math.abs(ended.x + ended.width / 2 - expectedAt(end))).toBeLessThanOrEqual(3);
  expect(ended.x + ended.width).toBeLessThanOrEqual(box.x + box.width + 1);
  const bubble = (await page.locator(".blend-said").boundingBox())!;
  expect(bubble.x + bubble.width).toBeLessThanOrEqual(ended.x + 1);
  await expect.poll(async () => {
    const cues = (await requestedCues(page)).slice(before);
    const letters = cues.filter((cue) => LETTER_SOUND.test(cue));
    const lastLetter = cues.lastIndexOf(letters[letters.length - 1]);
    return [letters.length >= count, cues.slice(lastLetter + 1).some((cue) => !LETTER_SOUND.test(cue))];
  }).toEqual([true, true]);
});
