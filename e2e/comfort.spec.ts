import { expect, test, type Locator, type Page } from "@playwright/test";

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
    ladder: { step: 3, successes: 0 },
    ...extra,
  };
}

/** Week 0 of the letter plan: m and a. */
const placement = {
  version: 1,
  origin: "device",
  classId: "device-class",
  updatedAt: "2026-09-26T00:00:00.000Z",
  subjects: {
    reading: { classDefault: { subject: "reading", stageId: "letters", weekIndex: 0 }, byChildId: {} },
  },
};

async function install(page: Page, profile: Record<string, unknown>, settings: Record<string, unknown> = {}) {
  await page.addInitScript(
    ({ saved, placed, prefs }) => {
      localStorage.setItem("littlenest-profiles-v1", JSON.stringify({ activeId: "mia", profiles: [saved] }));
      localStorage.setItem("littlenest-placement-v1", JSON.stringify(placed));
      localStorage.setItem("littlenest-silent-hint-v1", "1");
      if (Object.keys(prefs).length > 0) localStorage.setItem("littlenest-settings-v1", JSON.stringify(prefs));
    },
    { saved: profile, placed: placement, prefs: settings },
  );
  await page.goto("./");
}

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

async function dragAcross(page: Page, track: Locator) {
  const box = await track.boundingBox();
  if (!box) throw new Error("track has no box");
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 8, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 4, y, { steps: 40 });
  await page.mouse.up();
}

async function openSettings(page: Page) {
  await page.getByRole("button", { name: /grown-ups/i }).click();
  await passGate(page);
  await page.getByRole("button", { name: /^Settings/ }).click();
}

/** Save is held for a moment after a tap so a double tap cannot save twice. */
async function saveChild(page: Page) {
  const save = page.getByRole("button", { name: /Save (child|changes)/ });
  await expect(save).not.toHaveAttribute("aria-busy", "true");
  await save.click();
}

test("calm mode and a theme change the lesson, and one lesson still plays through", async ({ page }) => {
  await install(page, child({ themes: ["vehicles"] }), { calm: true });
  await page.getByRole("button", { name: "Mia" }).click();
  const app = page.locator(".app");
  await expect(app).toHaveAttribute("data-calm", "true");
  await expect(page.locator(".chunk-strip")).toHaveText("4 more!");

  await page.getByRole("button", { name: "Letters" }).click();
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  // Step 3 with the vehicles theme leads with the bus card, then van, jet, cab.
  await expect(page.locator(".activity")).toHaveAttribute("data-word", "bus");
  await expect(page.locator(".chunk-strip-word")).toHaveText("Word 1 of 6");
  await page.getByRole("button", { name: "Next word" }).click();
  await expect(page.locator(".activity")).toHaveAttribute("data-word", "van");
  await expect(page.locator(".chunk-strip-word")).toHaveText("Word 2 of 6");
  await page.getByRole("button", { name: "Previous word" }).click();
  await expect(page.locator(".activity")).toHaveAttribute("data-word", "bus");

  // Hear again and Break are in the top bar, big enough for a small finger.
  for (const control of [page.locator("[data-hear-again]"), page.locator("[data-break]")]) {
    const box = await control.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(64);
    expect(box!.height).toBeGreaterThanOrEqual(64);
  }
  await page.locator("[data-hear-again]").click();
  await page.locator("[data-hear-again]").click();

  await dragAcross(page, page.locator(".blend-track"));
  await expect(page.locator(".activity")).toHaveAttribute("data-blended", "true");
  // Calm mode: no star burst.
  await expect(page.locator(".star-flight")).toHaveCount(0);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator(".chunk-strip")).toHaveText("1 of 4 · 3 more!");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("littlenest-profiles-v1") ?? "{}"));
  expect(saved.profiles[0].stickers.some((sticker: { label: string }) => sticker.label === "bus")).toBe(true);
});

test("without a theme the lesson keeps its regular words, and the letter card follows the theme", async ({ page }) => {
  await install(page, child({ ladder: { step: 1, successes: 0 } }));
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "Letters" }).click();
  await expect(page.locator(".activity")).toHaveAttribute("data-word", "letter-m");
  await expect(page.locator(".picture-card")).toHaveAttribute("aria-label", "moon");
  await page.goto("./");

  await install(page, child({ ladder: { step: 1, successes: 0 }, themes: ["space"] }));
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "Letters" }).click();
  await expect(page.locator(".activity")).toHaveAttribute("data-word", "letter-m");
  await expect(page.locator(".picture-card")).toHaveAttribute("aria-label", "moon");
  await page.getByRole("button", { name: "Next word" }).click();
  await expect(page.locator(".activity")).toHaveAttribute("data-word", "letter-a");
  await expect(page.locator(".picture-card")).toHaveAttribute("aria-label", "astronaut");
});

test("favorites are picked in Grown-ups, up to three, and can be changed later", async ({ page }) => {
  await install(page, child());
  await page.getByRole("button", { name: /grown-ups/i }).click();
  await passGate(page);
  await page.getByRole("button", { name: /Child profiles/ }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).first().click();
  const grid = page.locator(".theme-grid");
  await expect(grid.locator(".theme-pick")).toHaveCount(7);
  for (const theme of ["dinosaurs", "space", "ocean"]) await grid.locator(`[data-theme=${theme}]`).click();
  await grid.locator("[data-theme=bugs]").click();
  await expect(page.locator(".field-error")).toContainText("Up to 3 favorites");
  await expect(grid).toHaveAttribute("data-themes", "dinosaurs,space,ocean");
  await grid.locator("[data-theme=space]").click();
  await expect(grid).toHaveAttribute("data-themes", "dinosaurs,ocean");
  await saveChild(page);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("littlenest-profiles-v1") ?? "{}"));
  expect(saved.profiles[0].themes).toEqual(["dinosaurs", "ocean"]);

  await page.getByRole("button", { name: "Add another child" }).click();
  await page.getByLabel("First name or initial").fill("Sam");
  await page.getByRole("button", { name: "5", exact: true }).click();
  await page.locator(".animal-pick[data-animal=owl]").click();
  await page.locator(".theme-grid [data-theme=castles]").click();
  await saveChild(page);
  const later = await page.evaluate(() => JSON.parse(localStorage.getItem("littlenest-profiles-v1") ?? "{}"));
  expect(later.profiles[1].themes).toEqual(["castles"]);
});

test("the comfort settings save on this device and show on the child's screen", async ({ page }) => {
  await install(page, child());
  await openSettings(page);
  await expect(page.locator("[data-setting=reading-goal] legend")).toHaveText("Lesson length");
  await page.locator("[data-setting=reading-goal]").getByRole("button", { name: "2 min" }).click();
  await page.locator("[data-setting=extra-chunks]").getByRole("button", { name: "None" }).click();
  for (const id of ["calm", "easier-tracing", "readable-font", "letter-spacing", "high-contrast"]) {
    await page.locator(`[data-setting=${id}]`).getByRole("button", { name: "On" }).click();
  }
  await expect(page.locator("[data-mix=music]").getByRole("button", { name: "Off" })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("littlenest-settings-v1") ?? "{}"));
  expect(saved).toMatchObject({ calm: true, easierTracing: true, readableFont: true, letterSpacing: true, highContrast: true, readingGoal: 2, extraChunks: 0 });

  await page.reload();
  await page.getByRole("button", { name: "Mia" }).click();
  const app = page.locator(".app");
  await expect(app).toHaveAttribute("data-calm", "true");
  await expect(app).toHaveAttribute("data-font", "readable");
  await expect(app).toHaveAttribute("data-spacing", "wide");
  await expect(app).toHaveAttribute("data-contrast", "high");
  const family = await page.locator(".chunk-strip").evaluate((element) => getComputedStyle(element).fontFamily);
  expect(family).toContain("Atkinson Hyperlegible");
  const spacing = await page.locator(".chunk-strip").evaluate((element) => getComputedStyle(element).letterSpacing);
  expect(parseFloat(spacing)).toBeGreaterThan(0);
  const fontRule = await page.evaluate(() => document.getElementById("readable-font")?.textContent ?? "");
  expect(fontRule).toContain("fonts/AtkinsonHyperlegible-Regular.woff2");
});

test("Hear it again repeats the last line as often as a child likes", async ({ page }) => {
  await page.addInitScript(() => {
    // Record what the device voice is asked to say, and finish each line at once.
    const spoken: string[] = [];
    (window as unknown as { __spoken: string[] }).__spoken = spoken;
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.speak = (utterance: SpeechSynthesisUtterance) => {
      spoken.push(utterance.text);
      window.setTimeout(() => utterance.onend?.(new Event("end") as SpeechSynthesisEvent), 30);
    };
    synth.cancel = () => undefined;
  });
  await install(page, child({ themes: ["dinosaurs"] }));
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "Story" }).click();
  await page.waitForTimeout(400);
  const spokenBefore = await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.length);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.locator("[data-dock=surprise]").click();
  await expect(page.locator("[data-screen=surprise]")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.length))
    .toBeGreaterThan(spokenBefore);
  const line = await page.locator(".surprise-line").innerText();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Story" }).click();
  await page.waitForTimeout(300);
  const count = await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.length);
  for (let repeat = 0; repeat < 3; repeat += 1) {
    await page.locator("[data-hear-again]").click();
    await page.waitForTimeout(120);
  }
  const spoken = await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken);
  // The replays say the story screen's own line, not the surprise line from the screen before.
  expect(spoken.length).toBeGreaterThanOrEqual(count + 3);
  expect(spoken.slice(count)).not.toContain(line);
  expect(new Set(spoken.slice(count)).size).toBe(1);
});

test("a break keeps everything and comes back to Today", async ({ page }) => {
  await install(page, child({ days: { [today]: { reading: { letter: true, draw: false, story: false, moment: false } } } }));
  await page.getByRole("button", { name: "Mia" }).click();
  await expect(page.locator(".chunk-strip")).toHaveText("1 of 4 · 3 more!");
  await page.getByRole("button", { name: "Draw" }).click();
  await page.locator("[data-break]").click();
  await expect(page.locator("[data-screen=break]")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Break time" })).toBeVisible();
  await page.getByRole("button", { name: "I'm ready" }).click();
  await expect(page.locator("[data-screen=today]")).toBeVisible();
  await expect(page.locator(".chunk-strip")).toHaveText("1 of 4 · 3 more!");
  await page.getByRole("button", { name: "Story" }).click();
  await page.locator("[data-break]").click();
  await page.getByRole("button", { name: "Switch child" }).click();
  await expect(page.locator("[data-screen=start]")).toBeVisible();
});

test("finishing the lesson offers One more? up to the parent's limit, then All done", async ({ page }) => {
  await install(
    page,
    child({ days: { [today]: { reading: { letter: true, draw: true, story: false, moment: true } } } }),
    { extraChunks: 1 },
  );
  await page.getByRole("button", { name: "Mia" }).click();
  await expect(page.locator(".chunk-strip")).toHaveText("3 of 4 · 1 more!");
  await page.getByRole("button", { name: "Story" }).click();
  await page.getByRole("button", { name: "All done" }).click();
  const sheet = page.locator("[data-wrap-up]");
  await expect(sheet).toHaveAttribute("data-wrap-up", "lesson");
  await expect(sheet).toContainText("That's today's lesson, Mia!");
  await expect(sheet).toContainText("One more?");
  await expect(page.locator(".chunk-strip")).toHaveText("All done today!");
  await page.getByRole("button", { name: "One more" }).click();
  await expect(sheet).toHaveCount(0);
  const extras = await page.evaluate(() => JSON.parse(localStorage.getItem("littlenest-extras-v1") ?? "{}"));
  expect(extras.mia).toMatchObject({ day: today, count: 1 });

  // The extra chunk. Leaving it brings the wrap-up back with no extras left.
  await page.getByRole("button", { name: "Story" }).click();
  await page.getByRole("button", { name: "All done" }).click();
  await expect(sheet).toHaveAttribute("data-more", "false");
  await expect(sheet).toContainText("All done for now");
  await expect(page.getByRole("button", { name: "One more" })).toHaveCount(0);
  await page.locator(".wrap-up-done").click();
  await expect(page.locator("[data-screen=start]")).toBeVisible();
});

test("the lesson length ends with a friendly wrap-up and no clock", async ({ page }) => {
  await install(page, child({ readingMs: { [today]: 118_500 } }), { readingGoal: 2, extraChunks: 0 });
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "Story" }).click();
  // Active time counts while the child is tapping. Two seconds cross the two-minute mark.
  for (let tick = 0; tick < 4; tick += 1) {
    await page.mouse.click(10, 300);
    await page.waitForTimeout(700);
  }
  await page.getByRole("button", { name: "All done" }).click();
  const sheet = page.locator("[data-wrap-up]");
  await expect(sheet).toHaveAttribute("data-wrap-up", "time");
  await expect(sheet).toContainText("Nice work, Mia!");
  await expect(sheet).not.toContainText(/\d+:\d\d|minute|second/i);
  await expect(page.locator(".goal-ring")).toBeVisible();
  await page.locator(".wrap-up-done").click();
  await expect(page.locator("[data-screen=start]")).toBeVisible();
});

test("the daily surprise is the same visitor all day and brings the theme object", async ({ page }) => {
  await install(page, child({ themes: ["space"] }));
  await page.getByRole("button", { name: "Mia" }).click();
  await page.locator("[data-dock=surprise]").click();
  const view = page.locator("[data-screen=surprise]");
  await expect(view).toBeVisible();
  const visitor = await view.getAttribute("data-visitor");
  expect(visitor).not.toBe("fox");
  await expect(view).toHaveAttribute("data-gift", "rocket");
  await expect(page.locator(".surprise-line")).toContainText("brought a rocket");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.locator("[data-dock=surprise]").click();
  await expect(view).toHaveAttribute("data-visitor", visitor!);
});

test("themed counting uses the day's theme object in Numbers", async ({ page }) => {
  await install(page, child({ themes: ["dinosaurs"] }));
  await page.getByRole("button", { name: "Mia" }).click();
  await page.locator("[data-course=math]").click();
  await page.locator("[data-activity=count]").click();
  await expect(page.locator("[data-screen=count]")).toHaveAttribute("data-theme", "dinosaurs");
  await expect(page.locator(".math-prompt")).toHaveText("Tap each dinosaur, or drag it.");
  await expect(page.locator(".math-theme-object").first()).toBeVisible();
});
