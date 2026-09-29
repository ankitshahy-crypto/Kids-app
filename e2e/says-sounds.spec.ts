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

/** The finishing chime and other effects are synthesized: count the oscillators they start. */
async function countEffects(page: Page) {
  await page.addInitScript(() => {
    const target = window as Window & { __tones?: number; webkitAudioContext?: typeof AudioContext };
    target.__tones = 0;
    const Ctor = window.AudioContext ?? target.webkitAudioContext;
    if (!Ctor) return;
    const create = Ctor.prototype.createOscillator;
    Ctor.prototype.createOscillator = function (this: AudioContext) {
      target.__tones = (target.__tones ?? 0) + 1;
      return create.apply(this);
    };
  });
}

async function tones(page: Page): Promise<number> {
  return page.evaluate(() => (window as Window & { __tones?: number }).__tones ?? 0);
}

/** What a finished word adds to the saved child: stars, word ladder progress, stickers. */
async function earned(page: Page): Promise<{ stars: number; ladder: unknown; stickers: number }> {
  return page.evaluate((key) => {
    const child = JSON.parse(localStorage.getItem(key) ?? "{}").profiles?.[0] ?? {};
    return { stars: child.stars ?? 0, ladder: child.ladder ?? null, stickers: (child.stickers ?? []).length };
  }, KEY);
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

test("like any slider it stops at the end, where a step says the word again; Home or a step back starts a fresh try that counts up again", async ({ page }) => {
  await countEffects(page);
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
  // What the first finish earned, once it has settled: every replay below must leave it exactly as it is.
  await expect.poll(async () => (await earned(page)).stickers).toBeGreaterThan(0);
  await page.waitForTimeout(300);
  const firstFinish = await earned(page);
  const tonesAfterFirst = await tones(page);
  expect(tonesAfterFirst, "the first finish chimes").toBeGreaterThan(0);

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

  // At the end, another step (and End) says the word again and stays at the end: no jump back, no second star.
  for (const key of ["ArrowRight", "End", "ArrowUp"]) {
    const beforeStep = (await requestedCues(page)).length;
    await page.keyboard.press(key);
    await expect.poll(async () => (await requestedCues(page)).length).toBeGreaterThan(beforeStep);
    await expect(activity).toHaveAttribute("data-blended", "true");
    await expect(blend).toHaveAttribute("data-joined", "true");
    await expect(track).toHaveAttribute("aria-valuenow", String(count + 1));
    await expect(track).toHaveAttribute("aria-valuetext", word);
    // The word, not its letters: the child is still the one saying the sounds.
    expect((await requestedCues(page)).slice(beforeStep).filter((cue) => LETTER_SOUND.test(cue))).toEqual([]);
  }
  await page.waitForTimeout(400);
  expect(await stars(page)).toBe(start + 1);

  // Home: a fresh try. The tiles go dark and separate, and the slider counts from nothing again.
  await page.keyboard.press("Home");
  await expect(activity).toHaveAttribute("data-blended", "false");
  await expect(blend).toHaveAttribute("data-joined", "false");
  await expect(track).toHaveAttribute("aria-valuenow", "0");
  await expect(track).toHaveAttribute("aria-valuetext", `0 of ${count}`);
  for (let index = 0; index < count; index += 1) await expect(tiles.nth(index)).toHaveAttribute("data-lit", "false");
  await page.keyboard.press("ArrowRight");
  await expect(track).toHaveAttribute("aria-valuenow", "1");
  await expect(track).toHaveAttribute("aria-valuetext", `1 of ${count}`);
  await expect(tiles.nth(0)).toHaveAttribute("data-lit", "true");
  await expect(tiles.nth(1)).toHaveAttribute("data-lit", "false");
  for (let step = 1; step <= count; step += 1) await page.keyboard.press("ArrowRight");
  await expect(activity).toHaveAttribute("data-blended", "true");
  await expect(track).toHaveAttribute("aria-valuetext", word);
  await page.waitForTimeout(400);
  expect(await stars(page)).toBe(start + 1);

  // Stepping all the way back (VoiceOver's swipe down) is a fresh try too.
  for (let step = 0; step <= count; step += 1) await page.keyboard.press("ArrowLeft");
  await expect(track).toHaveAttribute("aria-valuenow", "0");
  await expect(track).toHaveAttribute("aria-valuetext", `0 of ${count}`);
  await page.keyboard.press("ArrowRight");
  await expect(track).toHaveAttribute("aria-valuetext", `1 of ${count}`);

  // After all of that: no second chime, and not a star, a ladder try or a sticker more than the first finish.
  await page.waitForTimeout(400);
  expect(await tones(page), "only the first finish chimes").toBe(tonesAfterFirst);
  expect(await earned(page)).toEqual(firstFinish);

  // A new drag after a finished word starts from the beginning too.
  const box = (await page.locator(".blend-track").boundingBox())!;
  await page.mouse.move(box.x + 8, box.y + box.height / 2);
  await page.mouse.down();
  await expect(activity).toHaveAttribute("data-blended", "false");
  await expect(track).toHaveAttribute("aria-valuenow", /^[01]$/);
  await expect(track).not.toHaveAttribute("aria-valuetext", word);
  await page.mouse.up();
});

test("a fresh try right after a finish drops the finishing bounce at once", async ({ page }) => {
  await install(page, mia({ saysSounds: true }));
  await openLetters(page);
  const activity = page.locator(".activity");
  const blend = page.locator(".blend");
  const track = page.getByRole("slider", { name: "Slide across the letters" });

  /** The bounce is for a card's first finish, so each case starts on a card not finished yet. */
  async function finishNewCard() {
    const was = await activity.getAttribute("data-word");
    await page.getByRole("button", { name: "Next word" }).click();
    await expect(activity).not.toHaveAttribute("data-word", was ?? "");
    await expect(activity).toHaveAttribute("data-letter-card", "false");
    await track.focus();
    await page.keyboard.press("End");
    await expect(blend).toHaveClass(/is-celebrating/);
  }

  // Home, straight after the finish.
  await track.focus();
  await page.keyboard.press("End");
  await expect(blend).toHaveClass(/is-celebrating/);
  await page.keyboard.press("Home");
  await expect(blend).not.toHaveClass(/is-celebrating/, { timeout: 200 });

  // A step back from the end, straight after the finish.
  await finishNewCard();
  await page.keyboard.press("ArrowLeft");
  await expect(blend).not.toHaveClass(/is-celebrating/, { timeout: 200 });

  // A new drag, straight after the finish.
  await finishNewCard();
  const box = (await page.locator(".blend-track").boundingBox())!;
  await page.mouse.move(box.x + 8, box.y + box.height / 2);
  await page.mouse.down();
  await expect(blend).not.toHaveClass(/is-celebrating/, { timeout: 200 });
  await page.mouse.up();
});

test("the bounce is for the first finish: finishing the same card again joins the tiles and says the word, with no bounce", async ({ page }) => {
  await install(page, mia({ saysSounds: true }));
  await openLetters(page);
  const blend = page.locator(".blend");
  const track = page.getByRole("slider", { name: "Slide across the letters" });
  await track.focus();
  await page.keyboard.press("End");
  await expect(blend).toHaveClass(/is-celebrating/);
  await expect(blend).not.toHaveClass(/is-celebrating/, { timeout: 2000 });
  // A step back and forward finishes it again: joined, the word, no bounce.
  await page.keyboard.press("ArrowLeft");
  await expect(blend).toHaveAttribute("data-joined", "false");
  const before = (await requestedCues(page)).length;
  await page.keyboard.press("ArrowRight");
  await expect(blend).toHaveAttribute("data-joined", "true");
  await expect.poll(async () => (await requestedCues(page)).length).toBeGreaterThan(before);
  for (let check = 0; check < 5; check += 1) {
    await expect(blend).not.toHaveClass(/is-celebrating/);
    await page.waitForTimeout(100);
  }
  // So does a new drag across the whole track.
  const box = (await page.locator(".blend-track").boundingBox())!;
  await page.mouse.move(box.x + 8, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2, { steps: 48 });
  await page.mouse.up();
  await expect(blend).toHaveAttribute("data-joined", "true");
  for (let check = 0; check < 5; check += 1) {
    await expect(blend).not.toHaveClass(/is-celebrating/);
    await page.waitForTimeout(100);
  }
});

test("Home stops a sound that is still playing, and the pass it was part of", async ({ page }) => {
  await install(page, mia({ saysSounds: true }));
  await openLetters(page);
  const activity = page.locator(".activity");
  const tiles = page.locator(".letters .tile-wrap");
  const count = await tiles.count();
  const track = page.getByRole("slider", { name: "Slide across the letters" });
  // Play sound says every letter, one by one; Home in the middle of it stops it there.
  await page.getByRole("button", { name: "Play sound" }).click();
  // Partway through the letters: the first or second one is sounding (a poll can miss one letter's turn).
  expect(count).toBeGreaterThan(2);
  await expect(activity).toHaveAttribute("data-active", /^[01]$/, { timeout: 8000 });
  await track.focus();
  await page.keyboard.press("Home");
  await expect(activity).toHaveAttribute("data-active", "");
  const heard = (await requestedCues(page)).length;
  const shown = Number(await activity.getAttribute("data-revealed"));
  expect(shown).toBeLessThan(count);
  // Long enough for the rest of the pass to have played, had it gone on.
  await page.waitForTimeout(2500);
  expect((await requestedCues(page)).slice(heard)).toEqual([]);
  await expect(activity).toHaveAttribute("data-revealed", String(shown));
  await expect(activity).toHaveAttribute("data-active", "");
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
  // Its one step is the letter; the step after it is the card's picture word ("m, as in moon", then "moon").
  const example = (await page.locator(".activity .picture-card").getAttribute("aria-label")) ?? "";
  expect(example).toBeTruthy();
  const track = page.getByRole("slider", { name: "Slide across the letters" });
  await track.focus();
  await expect(track).toHaveAttribute("aria-valuetext", "0 of 1");
  await page.keyboard.press("ArrowRight");
  await expect(track).toHaveAttribute("aria-valuetext", `1 of 1. One more for ${example}.`);
  await page.keyboard.press("ArrowRight");
  await expect(track).toHaveAttribute("aria-valuetext", example);
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
