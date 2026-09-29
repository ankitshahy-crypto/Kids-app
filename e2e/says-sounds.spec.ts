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
