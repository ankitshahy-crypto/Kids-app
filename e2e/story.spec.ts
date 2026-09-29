import { expect, test, type Page } from "@playwright/test";
import { answerGate } from "./gate";
import { clipShipped, installAudioSpy, playedClips, spokenLines } from "./audioSpy";
import { createdThisWeek } from "./clock";

const today = new Date().toLocaleDateString("en-CA");

function child(extra: Record<string, unknown> = {}) {
  return {
    id: "mia",
    name: "Mia",
    ageRange: "4",
    animal: "fox",
    createdAt: createdThisWeek(),
    stars: 0,
    days: {},
    ladder: { step: 1, successes: 0 },
    ...extra,
  };
}

function placement(weekIndex: number) {
  return {
    version: 1,
    origin: "device",
    classId: "device-class",
    updatedAt: "2026-09-26T00:00:00.000Z",
    subjects: {
      reading: { classDefault: { subject: "reading", stageId: "letters", weekIndex }, byChildId: {} },
    },
  };
}

async function install(page: Page, profile: Record<string, unknown>, weekIndex: number, settings: Record<string, unknown> = {}) {
  await installAudioSpy(page);
  await page.addInitScript(
    ({ saved, placed, prefs }) => {
      localStorage.setItem("littlenest-profiles-v1", JSON.stringify({ activeId: "mia", profiles: [saved] }));
      localStorage.setItem("littlenest-placement-v1", JSON.stringify(placed));
      localStorage.setItem("littlenest-silent-hint-v1", "1");
      if (Object.keys(prefs).length > 0) localStorage.setItem("littlenest-settings-v1", JSON.stringify(prefs));
    },
    { saved: profile, placed: placement(weekIndex), prefs: settings },
  );
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
}

/** Open the Story stop, then the named reader: today's if it is the one, else from the cover's shelf. */
async function openReader(page: Page, id: string) {
  await page.getByRole("button", { name: "Story" }).click();
  const story = page.locator("[data-screen=story]");
  await expect(story).toHaveAttribute("data-story", /.+/);
  if ((await story.getAttribute("data-story")) !== id) {
    await page.locator(`[data-story-pick="${id}"]`).click();
  }
  await expect(story).toHaveAttribute("data-story", id);
  return story;
}

test("week one's reader stars the child's animal, blends the words it can, and earns the story star", async ({ page }) => {
  await install(page, child(), 0);
  const story = await openReader(page, "w01-i-am");
  // The cover offers the week's other readers.
  await expect(page.locator(".story-shelf-book")).toHaveCount(2);
  await expect(page.getByRole("heading", { name: "I Am Fox" })).toBeVisible();
  await expect(page.locator(".story-parent")).toContainText("who is this");
  await page.getByRole("button", { name: "Read", exact: true }).click();

  await expect(story).toHaveAttribute("data-page", "1");
  await expect(page.locator(".story-line")).toHaveAttribute("data-page-text", "Hi! I am Fox.");
  await expect(page.locator(".story-line")).toHaveText("Hi! I am Fox.");
  await expect(page.locator(".story-word[data-role=target]")).toHaveText(["am"]);
  await expect(page.locator(".story-word[data-role=hero]")).toHaveText("Fox");
  for (const word of await page.locator(".story-word").all()) {
    const box = await word.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(64);
  }

  // Sounding out "am" plays a, then m, then the word.
  const heard = (await playedClips(page)).length;
  await page.locator(".story-word[data-word=am]").click();
  await expect(page.locator(".story-word[data-word=am]")).toHaveClass(/is-speaking/);
  // Two letter sounds and the word, each a recorded clip with a short gap between.
  await expect.poll(() => spokenLines(page), { timeout: 20000 }).toEqual(expect.arrayContaining(["m, as in moon", "a, as in apple", "am"]));
  if (clipShipped("sounds/a.mp3")) {
    // With bare sound clips on the device, a word is sounded out as "a", "m", not "a, as in apple".
    const clips = (await playedClips(page)).slice(heard);
    expect(clips).toEqual(expect.arrayContaining(["sounds/a.mp3", "sounds/m.mp3", "words/am.mp3"]));
    expect(clips.filter((clip) => clip.startsWith("letters/"))).toEqual([]);
  }

  for (let turn = 0; turn < 4; turn += 1) await page.getByRole("button", { name: "Next page" }).click();
  await expect(story).toHaveAttribute("data-page", "5");
  await expect(page.locator(".chunk-strip-word")).toHaveText("Page 5 of 5");
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByRole("heading", { name: "The end" })).toBeVisible();
  await page.getByRole("button", { name: "All done" }).click();

  await expect(page.locator("[data-screen=today]")).toBeVisible();
  await expect(page.locator(".star-count").first()).toHaveAttribute("data-stars", "1");
  await expect(page.locator(".chunk-strip")).toHaveText("1 of 4 · 3 more!");
  await expect(page.locator(".grownup-tip")).toContainText("what did Fox say");
});

test("later weeks read harder words, and the reader is read aloud page by page", async ({ page }) => {
  await install(page, child(), 6);
  await openReader(page, "w07-the-hat");
  await page.getByRole("button", { name: "Read", exact: true }).click();
  await expect(page.locator(".story-word[data-role=target]")).toHaveText(["has", "a", "big", "hat"]);
  await expect.poll(() => spokenLines(page)).toContain("fox has a big hat.");
  await page.getByRole("button", { name: "Next page" }).click();
  await expect.poll(() => spokenLines(page)).toContain("a bug got in the hat.");
  await page.getByRole("button", { name: "Read it" }).click();
  await expect.poll(async () => (await spokenLines(page)).filter((line) => line === "a bug got in the hat.").length).toBeGreaterThanOrEqual(2);
});

test("a picked theme brings its own reader once its letters are taught, and tips can hide the grown-up lines", async ({ page }) => {
  await install(page, child({ themes: ["space"] }), 9, { showTips: false });
  await page.getByRole("button", { name: "Story" }).click();
  const id = await page.locator("[data-screen=story]").getAttribute("data-story");
  expect(["w10-milk", "w10-the-mask", "w10-the-sink", "t-space-rocket"]).toContain(id);
  // The themed reader is on the shelf (or open), now that its letters are taught.
  if (id !== "t-space-rocket") await expect(page.locator('[data-story-pick="t-space-rocket"]')).toBeVisible();
  await expect(page.locator(".story-parent")).toHaveCount(0);
  await page.getByRole("button", { name: "Read", exact: true }).click();
  await expect(page.locator(".story-parent")).toHaveCount(0);
  await expect(page.locator(".story-word[data-role=target]").first()).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("littlenest-profiles-v1") ?? "{}"));
  expect(saved.profiles[0].days[today]?.reading?.story).toBeFalsy();
});

test("the Colors stop is a short color moment that earns the reading star", async ({ page }) => {
  await install(page, child(), 0);
  await page.getByRole("button", { name: "Colors", exact: true }).click();
  const moment = page.locator("[data-screen=moment]");
  await expect(moment).toBeVisible();
  const hear = await moment.locator("[data-screen=name]").getAttribute("data-hear");
  expect(hear).toBeTruthy();
  await moment.locator(`[data-color='${hear}']`).click();
  await expect(page.locator("[data-screen=today]")).toBeVisible();
  await expect(page.locator(".star-count").first()).toHaveAttribute("data-stars", "1");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("littlenest-profiles-v1") ?? "{}"));
  expect(saved.profiles[0].days[today].reading.moment).toBe(true);
  expect(saved.profiles[0].stickers.some((sticker: { kind: string; label: string }) => sticker.kind === "color" && sticker.label === hear)).toBe(true);
});

async function passGate(page: Page) {
  await answerGate(page, true);
}

test("the where-to-start check places a reader further along, and a grown-up accepts it", async ({ page }) => {
  await install(page, child({ ageRange: "5" }), 0);
  await page.getByRole("button", { name: /grown-ups/i }).click();
  await passGate(page);
  await page.getByRole("button", { name: /Child profiles/ }).click();
  await page.getByRole("button", { name: "Where to start" }).click();
  const check = page.locator("[data-screen=check]");
  await expect(check).toHaveAttribute("data-part", "sound");
  await expect(page.locator(".check-choice")).toHaveCount(3);
  for (const choice of await page.locator(".check-choice").all()) {
    const box = await choice.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(64);
  }
  await expect(page.getByText(/wrong|incorrect|oops/i)).toHaveCount(0);

  // Each sound round plays the bare sound from the sound clips, never the letter phrase that names it.
  const firstAnswer = (await check.getAttribute("data-answer")) ?? "";
  if (clipShipped(`sounds/${firstAnswer}.mp3`)) {
    await expect.poll(() => playedClips(page), { timeout: 8000 }).toContain(`sounds/${firstAnswer}.mp3`);
    expect(await playedClips(page)).not.toContain(`letters/${firstAnswer}.mp3`);
  }
  await expect.poll(() => spokenLines(page)).toContain("tap the letter that makes this sound.");

  let answered = 0;
  for (let turn = 0; turn < 10; turn += 1) {
    if ((await check.getAttribute("data-check")) === "done") break;
    const answer = await check.getAttribute("data-answer");
    await check.locator(`[data-choice='${answer}']`).click();
    answered += 1;
    await expect(check).not.toHaveAttribute("data-answer", answer!, { timeout: 5000 }).catch(() => undefined);
  }
  await expect(check).toHaveAttribute("data-check", "done");
  // Three right in each part settles it: 3 sounds, 3 words, 1 long word.
  expect(answered).toBe(7);
  await expect(check).toHaveAttribute("data-answers", "7");
  await expect(check).toContainText("Based on 7 answers");
  await expect(check).toHaveAttribute("data-week", "9");
  await expect(check).toContainText("Week 10 · letter k · Four letters");
  // A start this far along is confirmed by a grown-up, not by the child's taps alone.
  await expect(check).toHaveAttribute("data-confirm", "grownup");
  await page.getByRole("button", { name: "Use this start" }).click();
  await expect(page.locator("[data-gate]")).toBeVisible();
  await passGate(page);
  await expect(page.locator("[data-screen=grownups]")).toBeVisible();
  const placed = await page.evaluate(() => JSON.parse(localStorage.getItem("littlenest-placement-v1") ?? "{}"));
  expect(placed.subjects.reading.byChildId.mia).toMatchObject({ subject: "reading", weekIndex: 9 });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("littlenest-profiles-v1") ?? "{}"));
  expect(saved.profiles[0].ladder.step).toBe(4);
});

test("the check stops early when the sounds are new, and keeping things as they are changes nothing", async ({ page }) => {
  await install(page, child(), 0);
  await page.getByRole("button", { name: /grown-ups/i }).click();
  await passGate(page);
  await page.getByRole("button", { name: /Child profiles/ }).click();
  await page.getByRole("button", { name: "Where to start" }).click();
  const check = page.locator("[data-screen=check]");
  for (let turn = 0; turn < 2; turn += 1) {
    const answer = await check.getAttribute("data-answer");
    const wrong = page.locator(`.check-choice:not([data-choice='${answer}'])`).first();
    await wrong.click();
    await page.waitForTimeout(1000);
  }
  await expect(check).toHaveAttribute("data-check", "done");
  await expect(check).toHaveAttribute("data-week", "0");
  await expect(check).toContainText("Great start!");
  await expect(check).toContainText("Based on 2 answers");
  // The first weeks need no grown-up confirm; Use this start would apply at once.
  await expect(check).toHaveAttribute("data-confirm", "none");
  await page.getByRole("button", { name: "Keep it as it is" }).click();
  const placed = await page.evaluate(() => JSON.parse(localStorage.getItem("littlenest-placement-v1") ?? "{}"));
  expect(placed.subjects?.reading?.byChildId?.mia).toBeUndefined();
});
