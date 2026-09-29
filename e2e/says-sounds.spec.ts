import { expect, test, type Locator, type Page } from "@playwright/test";
import { installAudioSpy, requestedCues } from "./audioSpy";
import { createdThisWeek } from "./clock";
import { openTeacherChild, passGate } from "./gate";

/**
 * Sounding out on their own. A grown-up can decide a child says the letter
 * sounds: the drag then lights the tiles without their sounds and the app
 * says only the whole word, for the child to check. Help stays one tap away:
 * a tapped tile and Play sound still play the sounds, but only the child's
 * own slide finishes the word. Off, nothing changes.
 */

const KEY = "littlenest-profiles-v1";

function mia(patch: Record<string, unknown> = {}) {
  return {
    id: "mia",
    name: "Mia",
    ageRange: "4",
    animal: "fox",
    createdAt: createdThisWeek(),
    stars: 1,
    days: {},
    // Step 3 opens the deck on a word, not the week's letter card.
    ladder: { step: 3, successes: 0 },
    ...patch,
  };
}

async function install(page: Page, child: Record<string, unknown>) {
  await installAudioSpy(page);
  await page.addInitScript(
    ({ key, saved }) => {
      localStorage.setItem(key, JSON.stringify({ activeId: saved.id, profiles: [saved] }));
      localStorage.setItem("littlenest-silent-hint-v1", "1");
    },
    { key: KEY, saved: child },
  );
}

async function openLetters(page: Page) {
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "Letters" }).click();
  await expect(page.locator(".blend-track")).toBeVisible();
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
}

async function dragAcross(page: Page, track: Locator) {
  const box = await track.boundingBox();
  if (!box) throw new Error("The blend track has no box");
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 8, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 4, y, { steps: 48 });
  await page.mouse.up();
}

async function stars(page: Page): Promise<number> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").profiles?.[0]?.stars ?? 0, KEY);
}

/** A letter sound: its clip (sounds/m.mp3), or the device voice saying one. */
const LETTER_SOUND = /^sounds\//;

test("off, the drag plays each letter's sound, as it always has", async ({ page }) => {
  await install(page, mia());
  await openLetters(page);
  await expect(page.locator(".activity")).toHaveAttribute("data-says-sounds", "app");
  const before = (await requestedCues(page)).length;
  await dragAcross(page, page.locator(".blend-track"));
  await expect(page.locator(".activity")).toHaveAttribute("data-blended", "true");
  await expect.poll(async () => (await requestedCues(page)).slice(before).filter((cue) => LETTER_SOUND.test(cue)).length).toBeGreaterThan(0);
});

test("when Mia says the sounds, the drag is quiet until the whole word, and a tapped tile still sounds", async ({ page }) => {
  await install(page, mia({ saysSounds: true }));
  await openLetters(page);
  const activity = page.locator(".activity");
  await expect(activity).toHaveAttribute("data-says-sounds", "child");
  // The first word says what to do.
  await expect
    .poll(async () => (await requestedCues(page)).some((cue) => cue === "prompts/blend-say.mp3" || /say each sound as you slide/.test(cue)))
    .toBe(true);

  const tiles = page.locator(".letters .tile-wrap");
  const count = await tiles.count();
  const before = (await requestedCues(page)).length;
  await dragAcross(page, page.locator(".blend-track"));
  await expect(activity).toHaveAttribute("data-blended", "true");
  for (let index = 0; index < count; index += 1) await expect(tiles.nth(index)).toHaveAttribute("data-lit", "true");
  // The whole word plays at the end, for the child to check.
  await expect.poll(async () => (await requestedCues(page)).length, { timeout: 5000 }).toBeGreaterThan(before);
  await page.waitForTimeout(800);
  const duringDrag = (await requestedCues(page)).slice(before);
  expect(duringDrag.filter((cue) => LETTER_SOUND.test(cue)), JSON.stringify(duringDrag)).toEqual([]);

  // Help is one tap away: a lit tile still plays its sound.
  const afterDrag = (await requestedCues(page)).length;
  await tiles.nth(0).locator("button").click();
  await expect.poll(async () => (await requestedCues(page)).slice(afterDrag).length).toBeGreaterThan(0);
});

test("when Mia says the sounds, Play sound helps without finishing the word; her own slide finishes it", async ({ page }) => {
  test.setTimeout(60000);
  await install(page, mia({ saysSounds: true }));
  await openLetters(page);
  const activity = page.locator(".activity");
  const tiles = page.locator(".letters .tile-wrap");
  const count = await tiles.count();
  const start = await stars(page);

  const before = (await requestedCues(page)).length;
  await page.getByRole("button", { name: "Play sound" }).click();
  // The whole pass plays: every tile shows, the sounds are asked for, then the pass ends.
  await expect(activity).toHaveAttribute("data-revealed", String(count), { timeout: 15000 });
  await expect(activity).toHaveAttribute("data-active", "all", { timeout: 15000 });
  await expect(activity).toHaveAttribute("data-active", "", { timeout: 15000 });
  expect((await requestedCues(page)).slice(before).some((cue) => LETTER_SOUND.test(cue))).toBe(true);
  await page.waitForTimeout(500);
  expect(await stars(page)).toBe(start);

  await dragAcross(page, page.locator(".blend-track"));
  await expect(activity).toHaveAttribute("data-blended", "true");
  await expect.poll(async () => stars(page)).toBe(start + 1);
});

test("without a finger: the right arrow lights the next letter, quietly, and the step after the last one finishes the word", async ({ page }) => {
  // A keyboard, or VoiceOver and Switch Control adjusting the slider, which send the same arrow keys.
  await install(page, mia({ saysSounds: true }));
  await openLetters(page);
  const activity = page.locator(".activity");
  const track = page.getByRole("slider", { name: "Slide across the letters" });
  const tiles = page.locator(".letters .tile-wrap");
  const count = await tiles.count();
  const start = await stars(page);
  await track.focus();
  await expect(track).toBeFocused();
  // Named for what it does, not a gesture, and it starts at nothing passed yet.
  await expect(track).toHaveAttribute("aria-valuetext", `0 of ${count}`);
  const before = (await requestedCues(page)).length;
  for (let step = 0; step < count; step += 1) {
    await page.keyboard.press("ArrowRight");
    await expect(tiles.nth(step)).toHaveAttribute("data-lit", "true");
    await expect(track).toHaveAttribute("aria-valuenow", String(step + 1));
    if (step + 1 < count) await expect(tiles.nth(step + 1)).toHaveAttribute("data-lit", "false");
  }
  await expect(activity).toHaveAttribute("data-blended", "false");
  await page.waitForTimeout(400);
  expect((await requestedCues(page)).slice(before).filter((cue) => LETTER_SOUND.test(cue))).toEqual([]);
  expect(await stars(page)).toBe(start);

  // One more step: the end of the track. The whole word plays and the step is done.
  await page.keyboard.press("ArrowRight");
  await expect(activity).toHaveAttribute("data-blended", "true");
  await expect(page.locator(".blend")).toHaveAttribute("data-joined", "true");
  await expect.poll(async () => (await requestedCues(page)).length).toBeGreaterThan(before);
  await expect.poll(async () => stars(page)).toBe(start + 1);
  expect((await requestedCues(page)).slice(before).filter((cue) => LETTER_SOUND.test(cue))).toEqual([]);
});

test("a second pass counts up again for a screen reader, the left arrow takes a letter back, and the word earns one star", async ({ page }) => {
  await install(page, mia({ saysSounds: true }));
  await openLetters(page);
  const activity = page.locator(".activity");
  const blend = page.locator(".blend");
  const track = page.getByRole("slider", { name: "Slide across the letters" });
  const tiles = page.locator(".letters .tile-wrap");
  const count = await tiles.count();
  expect(count).toBeGreaterThan(1);
  const word = (await activity.getAttribute("data-word")) ?? "";
  const start = await stars(page);
  await track.focus();
  await expect(track).toHaveAttribute("aria-orientation", "horizontal");

  // Two steps forward, one back: the second tile goes dark again, and the count says so.
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(track).toHaveAttribute("aria-valuenow", "2");
  await page.keyboard.press("ArrowLeft");
  await expect(track).toHaveAttribute("aria-valuenow", "1");
  await expect(track).toHaveAttribute("aria-valuetext", `1 of ${count}`);
  await expect(tiles.nth(0)).toHaveAttribute("data-lit", "true");
  await expect(tiles.nth(1)).toHaveAttribute("data-lit", "false");

  // On to the last tile: the slider has one more step in it, and says so.
  await expect(track).toHaveAttribute("aria-valuemax", String(count + 1));
  for (let step = 1; step < count; step += 1) await page.keyboard.press("ArrowRight");
  await expect(track).toHaveAttribute("aria-valuenow", String(count));
  await expect(track).toHaveAttribute("aria-valuetext", `${count} of ${count}. One more for the word.`);
  await expect(activity).toHaveAttribute("data-blended", "false");
  // The end of the track: the word, at the slider's maximum.
  await page.keyboard.press("ArrowRight");
  await expect(activity).toHaveAttribute("data-blended", "true");
  await expect(track).toHaveAttribute("aria-valuenow", String(count + 1));
  await expect(track).toHaveAttribute("aria-valuetext", word);
  await expect.poll(async () => stars(page)).toBe(start + 1);

  // A swipe down from the end is back to the last tile, still lit; up again is the word again, for the same one star.
  await page.keyboard.press("ArrowLeft");
  await expect(activity).toHaveAttribute("data-blended", "false");
  await expect(blend).toHaveAttribute("data-joined", "false");
  await expect(track).toHaveAttribute("aria-valuenow", String(count));
  await expect(tiles.nth(count - 1)).toHaveAttribute("data-lit", "true");
  const beforeAgain = (await requestedCues(page)).length;
  await page.keyboard.press("ArrowRight");
  await expect(activity).toHaveAttribute("data-blended", "true");
  await expect(track).toHaveAttribute("aria-valuetext", word);
  await expect.poll(async () => (await requestedCues(page)).length).toBeGreaterThan(beforeAgain);
  await page.waitForTimeout(400);
  expect(await stars(page)).toBe(start + 1);

  // A second pass: the tiles go dark and separate, and the slider counts from one again.
  await page.keyboard.press("ArrowRight");
  await expect(activity).toHaveAttribute("data-blended", "false");
  await expect(blend).toHaveAttribute("data-joined", "false");
  await expect(track).toHaveAttribute("aria-valuenow", "1");
  await expect(track).toHaveAttribute("aria-valuetext", `1 of ${count}`);
  await expect(tiles.nth(0)).toHaveAttribute("data-lit", "true");
  await expect(tiles.nth(1)).toHaveAttribute("data-lit", "false");
  for (let step = 1; step <= count; step += 1) await page.keyboard.press("ArrowRight");
  await expect(activity).toHaveAttribute("data-blended", "true");
  await expect(track).toHaveAttribute("aria-valuetext", word);
  await page.waitForTimeout(400);
  expect(await stars(page)).toBe(start + 1);

  // A new drag after a finished word starts from the beginning too.
  const box = (await page.locator(".blend-track").boundingBox())!;
  await page.mouse.move(box.x + 8, box.y + box.height / 2);
  await page.mouse.down();
  await expect(activity).toHaveAttribute("data-blended", "false");
  await expect(track).toHaveAttribute("aria-valuenow", /^[01]$/);
  await expect(track).not.toHaveAttribute("aria-valuetext", word);
  await page.mouse.up();
});

test("without a finger and with the app saying the sounds, each step sounds its letter, and End finishes the word", async ({ page }) => {
  await install(page, mia());
  await openLetters(page);
  const activity = page.locator(".activity");
  const track = page.getByRole("slider", { name: "Slide across the letters" });
  const tiles = page.locator(".letters .tile-wrap");
  await track.focus();
  const before = (await requestedCues(page)).length;
  await page.keyboard.press("ArrowRight");
  await expect(tiles.nth(0)).toHaveAttribute("data-lit", "true");
  await expect.poll(async () => (await requestedCues(page)).slice(before).filter((cue) => LETTER_SOUND.test(cue)).length).toBeGreaterThan(0);
  await page.keyboard.press("End");
  await expect(activity).toHaveAttribute("data-blended", "true");
  await expect(activity).toHaveAttribute("data-revealed", String(await tiles.count()));
});

test("a sentence is still read by the app, even when the child says the sounds", async ({ page }) => {
  // Step 5, placed at a phonics week: the deck ends with short sentences.
  await install(page, mia({ saysSounds: true, ageRange: "5", ladder: { step: 5, successes: 0 } }));
  await page.addInitScript(() => {
    localStorage.setItem(
      "littlenest-placement-v1",
      JSON.stringify({
        version: 1,
        origin: "device",
        classId: "device-class",
        updatedAt: "2026-09-26T00:00:00.000Z",
        subjects: { reading: { classDefault: { subject: "reading", stageId: "phonics", weekIndex: 20 }, byChildId: {} } },
      }),
    );
  });
  await openLetters(page);
  const activity = page.locator(".activity");
  for (let tries = 0; tries < 12; tries += 1) {
    if ((await activity.getAttribute("data-sentence")) === "true") break;
    await page.getByRole("button", { name: "Next word" }).click();
  }
  await expect(activity).toHaveAttribute("data-sentence", "true");
  await expect(activity).toHaveAttribute("data-says-sounds", "app");
  // And a word on the same deck is the child's to sound out.
  await page.getByRole("button", { name: "Previous word" }).click();
  await expect(activity).toHaveAttribute("data-sentence", "false");
  await expect(activity).toHaveAttribute("data-letter-card", "false");
  await expect(activity).toHaveAttribute("data-says-sounds", "child");
});

test("a new letter is still said by the app, even when the child says the sounds", async ({ page }) => {
  // Step 1 opens on the week's letter card.
  await install(page, mia({ saysSounds: true, ladder: { step: 1, successes: 0 } }));
  await openLetters(page);
  await expect(page.locator(".activity")).toHaveAttribute("data-letter-card", "true");
  await expect(page.locator(".activity")).toHaveAttribute("data-says-sounds", "app");
});

test("a parent turns it on for one child, and the last sound game suggests when", async ({ page }) => {
  const friday = "2026-09-25";
  await install(
    page,
    mia({
      soundChecks: {
        m: { firstTry: true, date: friday, got: 1, asked: 1 },
        s: { firstTry: true, date: friday, got: 1, asked: 1 },
        t: { firstTry: true, date: friday, got: 1, asked: 1 },
      },
    }),
  );
  await page.goto("./");
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await passGate(page);
  const card = page.locator("[data-section=says-sounds][data-child=mia]");
  await expect(card).toHaveAttribute("data-says-sounds", "app");
  await expect(card.locator("[data-says-hint=ready]")).toContainText("M S T");
  await card.getByRole("button", { name: "Mia" }).click();
  await expect(card).toHaveAttribute("data-says-sounds", "child");
  await expect(card.getByRole("button", { name: "Mia" })).toHaveAttribute("aria-pressed", "true");
  await expect(card.locator("[data-says-hint]")).toHaveCount(0);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").profiles?.[0]?.saysSounds, KEY)).toBe(true);

  await card.getByRole("button", { name: "The app" }).click();
  await expect(card).toHaveAttribute("data-says-sounds", "app");
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").profiles?.[0]?.saysSounds, KEY)).toBeUndefined();
});

test("the Where to start check does not make a new child 'ready' on day one", async ({ page }) => {
  const today = "2026-09-28";
  await install(
    page,
    mia({
      soundChecks: {
        m: { firstTry: true, date: today, got: 1, asked: 1, start: { firstTry: true, date: today } },
        s: { firstTry: true, date: today, got: 1, asked: 1, start: { firstTry: true, date: today } },
        t: { firstTry: true, date: today, got: 1, asked: 1, start: { firstTry: true, date: today } },
        p: { firstTry: true, date: today, got: 1, asked: 1, start: { firstTry: true, date: today } },
      },
    }),
  );
  await page.goto("./");
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await passGate(page);
  const card = page.locator("[data-section=says-sounds][data-child=mia]");
  await expect(card).toHaveAttribute("data-hint", "none");
  await expect(card.locator("[data-says-hint]")).toHaveCount(0);
});

test("a teacher can set it on the child's page", async ({ page }) => {
  await install(page, mia());
  await page.goto("./");
  await page.getByRole("button", { name: "Teacher", exact: true }).click();
  await passGate(page);
  await openTeacherChild(page, "mia");
  const card = page.locator("[data-child-sheet=mia] [data-section=says-sounds]");
  await expect(card).toHaveAttribute("data-says-sounds", "app");
  await card.getByRole("button", { name: "Mia" }).click();
  await expect(card).toHaveAttribute("data-says-sounds", "child");
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").profiles?.[0]?.saysSounds, KEY)).toBe(true);
});
