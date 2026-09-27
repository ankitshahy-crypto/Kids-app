import { expect, test, type Page } from "@playwright/test";
import { installAudioSpy, spokenLines } from "./audioSpy";

const today = new Date().toLocaleDateString("en-CA");

function child(extra: Record<string, unknown> = {}) {
  return {
    id: "mia",
    name: "Mia",
    ageRange: "4",
    animal: "fox",
    createdAt: "2026-09-01T15:00:00.000Z",
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

test("week one's reader stars the child's animal, blends the words it can, and earns the story star", async ({ page }) => {
  await install(page, child(), 0);
  await page.getByRole("button", { name: "Story" }).click();
  const story = page.locator("[data-screen=story]");
  await expect(story).toHaveAttribute("data-story", "w01-i-am");
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

  // Sounding out "am" plays m, then a, then the word.
  await page.locator(".story-word[data-word=am]").click();
  await expect(page.locator(".story-word[data-word=am]")).toHaveClass(/is-speaking/);
  await expect.poll(() => spokenLines(page)).toEqual(expect.arrayContaining(["m, as in moon", "a, as in apple", "am"]));

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
  await page.getByRole("button", { name: "Story" }).click();
  await expect(page.locator("[data-screen=story]")).toHaveAttribute("data-story", "w07-the-hat");
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
  expect(["w10-milk", "t-space-rocket"]).toContain(id);
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
  const dialog = page.getByRole("dialog");
  const prompt = await dialog.getByRole("heading").innerText();
  const sum = prompt.match(/(\d+)\s*\+\s*(\d+)/);
  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
  const expected = sum ? Number(sum[1]) + Number(sum[2]) : (words[prompt.match(/number ([a-z]+)/i)?.[1]?.toLowerCase() ?? ""] ?? 0);
  const choices = dialog.locator(".gate-choice");
  const count = await choices.count();
  for (let index = 0; index < count; index += 1) {
    if (Number(await choices.nth(index).innerText()) === expected) {
      await choices.nth(index).click();
      return;
    }
  }
  throw new Error(`No choice matched ${prompt}`);
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

  for (let turn = 0; turn < 8; turn += 1) {
    if ((await check.getAttribute("data-check")) === "done") break;
    const answer = await check.getAttribute("data-answer");
    await check.locator(`[data-choice='${answer}']`).click();
    await expect(check).not.toHaveAttribute("data-answer", answer!, { timeout: 5000 }).catch(() => undefined);
  }
  await expect(check).toHaveAttribute("data-check", "done");
  await expect(check).toHaveAttribute("data-week", "9");
  await expect(check).toContainText("Week 10 · letter k · Four letters");
  await page.getByRole("button", { name: "Use this start" }).click();
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
  await page.getByRole("button", { name: "Keep it as it is" }).click();
  const placed = await page.evaluate(() => JSON.parse(localStorage.getItem("littlenest-placement-v1") ?? "{}"));
  expect(placed.subjects?.reading?.byChildId?.mia).toBeUndefined();
});
