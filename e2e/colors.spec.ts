import { installAudioSpy, spokenLines } from "./audioSpy";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { answerGate, openClassPlace } from "./gate";
import { createdThisWeek } from "./clock";
import { expectStar, expectWiggle, game, onRound } from "./kit";

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
    },
  ],
};

async function install(page: Page, options: { quick?: boolean; ageRange?: string; tips?: boolean; stickers?: unknown[] } = {}) {
  const { quick = true, ageRange = "4", tips = true, stickers } = options;
  await installAudioSpy(page);
  await page.addInitScript(
    ({ saved, quick, tips }) => {
      if (sessionStorage.getItem("colors-seeded")) return;
      sessionStorage.setItem("colors-seeded", "1");
      localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
      localStorage.removeItem("kids-app-silent-hint-v1");
      // A kit game waits for its praise before the next round; the tests that play a whole game skip the wait.
      if (quick) localStorage.setItem("littlenest-quick-rounds", "1");
      if (!tips) localStorage.setItem("littlenest-settings-v1", JSON.stringify({ showTips: false }));
    },
    { saved: { ...profile, profiles: [{ ...profile.profiles[0], ageRange, ...(stickers ? { stickers } : {}) }] }, quick, tips },
  );
  await page.goto("./");
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "LittleNest Colors" }).click();
  await expect(page.locator("[data-screen=today]")).toHaveAttribute("data-subject", "colors");
}

async function spoken(page: Page): Promise<string[]> {
  return spokenLines(page);
}

async function passGate(page: Page) {
  await answerGate(page, true);
}

/** Tap two paints. */
async function mix(play: Locator, first: string, second: string) {
  await expect(play).toHaveAttribute("data-busy", "false", { timeout: 6000 });
  await play.locator(`.pick[data-blob='${first}']`).click();
  await expect(play).toHaveAttribute("data-first", first);
  await play.locator(`.pick[data-blob='${second}']`).click();
}

/** Tap two paints and see what they make in the bowl. (Not for a quick game: there the bowl is emptied at once for the next round.) */
async function mixAndSee(play: Locator, first: string, second: string, result: string) {
  await mix(play, first, second);
  await expect(play.locator(".mix-bowl")).toHaveAttribute("data-result", result);
}

test("color names: the color is said, and each one found fills a balloon", async ({ page }, testInfo) => {
  await install(page, { quick: false });
  if (testInfo.project.name === "iphone") {
    await page.locator("[data-screen=today]").screenshot({ path: "test-results/screenshots/colors-today-iphone.png" });
  }
  const before = (await spoken(page)).length;
  await page.getByRole("button", { name: "Hear a color" }).click();
  const play = game(page, "name");
  await expect(play).toHaveAttribute("data-rounds", "4");
  // This week's color first.
  await expect(play).toHaveAttribute("data-hear", "red");
  await expect.poll(async () => (await spoken(page)).slice(before), { timeout: 10000 }).toEqual(expect.arrayContaining(["tap the color you hear.", "red"]));
  // One balloon for each color to find, none filled yet.
  await expect(play.locator(".color-balloon")).toHaveCount(4);
  await expect(play.locator(".color-balloon[data-state=done]")).toHaveCount(0);
  // Each paint has its pattern as well as its color, and its name underneath for the grown-up.
  for (const pick of await play.locator(".game-tray .pick").all()) {
    await expect(pick).not.toHaveAttribute("data-pattern", "");
    await expect(pick.locator(".pick-label")).not.toHaveText("");
  }
  await expect(play.locator(".pick[data-color=red]")).toHaveAttribute("data-pattern", "stripes");
  // A wrong paint says its own color.
  const wrong = play.locator(".pick:not([data-color=red])").first();
  const wrongColor = (await wrong.getAttribute("data-color")) ?? "";
  const missed = (await spoken(page)).length;
  await wrong.click();
  await expectWiggle(wrong);
  await expect(play).toHaveAttribute("data-misses", "1");
  await expect.poll(async () => (await spoken(page)).slice(missed), { timeout: 10000 }).toContain(wrongColor);
  await play.locator(".pick[data-color=red]").click();
  await expect(play.locator(".color-balloon[data-state=done]")).toHaveAttribute("data-color", "red");
  if (testInfo.project.name === "chromium") await play.screenshot({ path: "test-results/screenshots/colors_names.png" });
});

test("color names plays four different colors through to a star", async ({ page }) => {
  await install(page);
  await page.getByRole("button", { name: "Hear a color" }).click();
  const play = game(page, "name");
  const heard = new Set<string>();
  for (let round = 0; round < 4; round += 1) {
    await onRound(play, round);
    const hear = (await play.getAttribute("data-hear")) ?? "";
    expect(heard.has(hear)).toBe(false);
    heard.add(hear);
    await expect(play.locator(".game-tray .pick")).toHaveCount(3);
    await play.locator(`.pick[data-color='${hear}']`).click();
  }
  await expectStar(page);
  // The week's color is kept as a sticker.
  await page.locator("[data-section-back]").click();
  await page.getByRole("button", { name: "Stickers" }).click();
  await expect(page.locator("[data-kind=color][data-sticker='red']")).toBeVisible();
});

test("mixing: two paints tapped pour into the bowl and are named, and each new color goes on the shelf", async ({ page }, testInfo) => {
  await install(page, { quick: false });
  const before = (await spoken(page)).length;
  await page.getByRole("button", { name: "Mix paints" }).click();
  const play = game(page, "mix");
  await expect(play).toHaveAttribute("data-rounds", "3");
  await expect(play).toHaveAttribute("data-task", "find");
  await expect.poll(async () => (await spoken(page)).slice(before), { timeout: 10000 }).toContain("tap two paints. what do they make?");
  // Red, yellow and blue: no white at ages 3 and 4.
  await expect(play.locator(".game-tray .pick")).toHaveCount(3);
  await expect(play.locator(".pick[data-blob=white]")).toHaveCount(0);
  // The first paint tapped is seen in the bowl, and says its color.
  const first = (await spoken(page)).length;
  await play.locator(".pick[data-blob=red]").click();
  await expect(play.locator(".pick[data-blob=red]")).toHaveAttribute("data-chosen", "true");
  await expect(play.locator(".mix-bowl")).toHaveAttribute("data-first", "red");
  await expect.poll(async () => (await spoken(page)).slice(first), { timeout: 10000 }).toContain("red");
  // The same pot again puts it back.
  await play.locator(".pick[data-blob=red]").click();
  await expect(play).toHaveAttribute("data-first", "");
  const said = (await spoken(page)).length;
  await mixAndSee(play, "red", "yellow", "orange");
  await expect.poll(async () => (await spoken(page)).slice(said), { timeout: 10000 }).toContain("red and yellow make orange.");
  await expect(play).toHaveAttribute("data-made", "orange");
  await expect(play.locator(".mix-shelf .mix-jar[data-jar=orange]")).toBeVisible();
  if (testInfo.project.name === "chromium" || testInfo.project.name === "iphone") {
    await play.screenshot({ path: `test-results/screenshots/colors-mix-${testInfo.project.name}.png` });
  }
  // The next round: the same two again is not a miss, but it is not a new color either.
  await onRound(play, 1);
  const again = (await spoken(page)).length;
  await mixAndSee(play, "yellow", "red", "orange");
  await expect.poll(async () => (await spoken(page)).slice(again), { timeout: 10000 }).toEqual(expect.arrayContaining(["red and yellow make orange.", "you made that one. try two others."]));
  await expect(play).toHaveAttribute("data-misses", "0");
  await expect(play).toHaveAttribute("data-round", "1");
  await expect(play).toHaveAttribute("data-made", "orange");
});

test("mixing three colors ends in a star, and every one of them is a paint for the animal", async ({ page }, testInfo) => {
  await install(page);
  await page.getByRole("button", { name: "Mix paints" }).click();
  const play = game(page, "mix");
  for (const [round, first, second, result] of [
    [0, "red", "yellow", "orange"],
    [1, "blue", "yellow", "green"],
    [2, "red", "blue", "purple"],
  ] as const) {
    await onRound(play, round);
    await mix(play, first, second);
    // It is on the shelf, and stays there.
    await expect(play).toHaveAttribute("data-made", new RegExp(`(^|,)${result}$`));
  }
  await expectStar(page);
  await page.getByRole("button", { name: "Paint your animal" }).click();
  const paint = game(page, "paint");
  // The newest first.
  await expect(paint.locator(".pick[data-color]")).toHaveCount(3);
  expect(await paint.locator(".pick[data-color]").evaluateAll((picks) => picks.map((pick) => pick.getAttribute("data-color")))).toEqual(["purple", "green", "orange"]);
  // The check waits for a paint.
  await expect(paint.locator(".pick[data-keep]")).toBeDisabled();
  await paint.locator(".pick[data-color=orange]").click();
  await expect(paint).toHaveAttribute("data-tint", "orange");
  await expect(paint.locator(".painted-hero")).toHaveAttribute("data-tint", "orange");
  // The paint in use is shown with its pattern, for a child who cannot tell it by color.
  await expect(paint.locator(".painted-badge .paint-pot")).toHaveAttribute("data-pattern", "diagonal");
  // Another paint can be tried before it is kept.
  await paint.locator(".pick[data-color=green]").click();
  await expect(paint).toHaveAttribute("data-tint", "green");
  await paint.locator(".pick[data-color=orange]").click();
  if (testInfo.project.name === "chromium" || testInfo.project.name === "iphone") {
    await paint.screenshot({ path: `test-results/screenshots/colors-paint-${testInfo.project.name}.png` });
  }
  await paint.locator(".pick[data-keep]").click();
  await expectStar(page, 2);
  await page.locator("[data-section-back]").click();
  await page.getByRole("button", { name: "Stickers" }).click();
  await expect(page.locator("[data-kind=color][data-sticker='orange fox']")).toBeVisible();
  for (const made of ["orange", "green", "purple"]) await expect(page.locator(`[data-kind=color][data-sticker='${made}']`)).toBeVisible();
});

test("painting before any mixing still has paints: red, yellow and blue", async ({ page }) => {
  await install(page, { quick: false });
  const before = (await spoken(page)).length;
  await page.getByRole("button", { name: "Paint your animal" }).click();
  const paint = game(page, "paint");
  await expect.poll(async () => (await spoken(page)).slice(before), { timeout: 10000 }).toContain("color your animal. tap a paint.");
  expect(await paint.locator(".pick[data-color]").evaluateAll((picks) => picks.map((pick) => pick.getAttribute("data-color")))).toEqual(["red", "yellow", "blue"]);
  const said = (await spoken(page)).length;
  await paint.locator(".pick[data-color=blue]").click();
  await expect(paint).toHaveAttribute("data-tint", "blue");
  // The color is named, and then the check is asked for.
  await expect.poll(async () => (await spoken(page)).slice(said), { timeout: 10000 }).toEqual(expect.arrayContaining(["blue", "tap the check to keep it."]));
  await expect(paint.locator(".pick[data-keep]")).toBeEnabled();
});

test("the paint colors the animal itself", async ({ page }) => {
  await install(page);
  await page.getByRole("button", { name: "Paint your animal" }).click();
  const paint = game(page, "paint");
  const face = paint.locator(".painted-hero .avatar-art");
  // A small square in the middle of the animal's face, clear of the pot shown beside it.
  const box = (await face.boundingBox())!;
  const clip = { x: box.x + box.width / 2 - 8, y: box.y + box.height * 0.62, width: 16, height: 16 };
  const plain = await page.screenshot({ clip });
  await paint.locator(".pick[data-color=blue]").click();
  await expect(paint).toHaveAttribute("data-tint", "blue");
  await expect.poll(async () => Buffer.compare(plain, await page.screenshot({ clip }))).not.toBe(0);
  const blue = await page.screenshot({ clip });
  await paint.locator(".pick[data-color=red]").click();
  await expect.poll(async () => Buffer.compare(blue, await page.screenshot({ clip }))).not.toBe(0);
});

test("ages 5 to 7 get white, and are then asked to make a color by name", async ({ page }) => {
  await install(page, { ageRange: "6-7" });
  await page.getByRole("button", { name: "Mix paints" }).click();
  const play = game(page, "mix");
  await expect(play).toHaveAttribute("data-rounds", "5");
  await expect(play.locator(".game-tray .pick")).toHaveCount(4);
  for (const [round, first, second, result] of [
    [0, "red", "white", "light red"],
    [1, "red", "yellow", "orange"],
    [2, "blue", "yellow", "green"],
  ] as const) {
    await onRound(play, round);
    await mix(play, first, second);
    await expect(play).toHaveAttribute("data-made", new RegExp(`(^|,)${result}$`));
  }
  const pairs: Record<string, [string, string]> = { orange: ["red", "yellow"], green: ["blue", "yellow"], purple: ["red", "blue"] };
  for (const round of [3, 4]) {
    await onRound(play, round);
    await expect(play).toHaveAttribute("data-task", "make");
    const want = (await play.getAttribute("data-want")) ?? "";
    // The color asked for is shown, for a child who does not know its name yet.
    await expect(play.locator(`.mix-jar[data-want=true][data-jar='${want}']`)).toBeVisible();
    if (round === 3) {
      // Two paints that make something else: a miss, and what they did make is said.
      const other = Object.keys(pairs).find((color) => color !== want)!;
      await mixAndSee(play, pairs[other][0], pairs[other][1], other);
      await expect(play).toHaveAttribute("data-misses", "1");
      await expect(play).toHaveAttribute("data-solved", "false");
      // The bowl is emptied for another try.
      await expect(play).toHaveAttribute("data-busy", "false", { timeout: 6000 });
    }
    await mix(play, pairs[want][0], pairs[want][1]);
  }
  await expectStar(page);
});

for (const [id, name] of [
  ["name", "Hear a color"],
  ["mix", "Mix paints"],
  ["paint", "Paint your animal"],
] as const) {
  test(`${id} fits a phone with the tip showing: the scene and every choice are in view`, async ({ page }) => {
    // A phone's screen less its status bar and home bar.
    await page.setViewportSize({ width: 390, height: 763 });
    await install(page, {
      ageRange: "6-7",
      // Four paints mixed already, so Paint shows its fullest tray: four pots and the check.
      stickers: ["orange", "green", "purple", "light red"].map((label, index) => ({ id: `s${index}`, subject: "colors", kind: "color", label, earnedOn: "2026-09-01" })),
    });
    await page.getByRole("button", { name }).click();
    const frame = game(page, id);
    await expect(page.locator("[data-tip]")).toBeVisible();
    await expect(frame.locator(".game-scene")).toBeInViewport({ ratio: 1 });
    await expect(frame.locator(".game-tray .pick")).toHaveCount(id === "paint" ? 5 : 4);
    for (const pick of await frame.locator(".game-tray .pick").all()) {
      await expect(pick).toBeInViewport({ ratio: 1 });
      const box = await pick.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(60);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(60);
    }
  });
}

test("coloring page and the color path are on the grown-up screens", async ({ page }) => {
  await install(page);
  // A section page has Back where the child's animal is on the reading path, so step back to the path first.
  await page.locator("[data-section-back]").click();
  await page.getByRole("button", { name: "Switch child" }).click({ delay: 1600 });
  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  await passGate(page);
  await page.getByRole("button", { name: /Printables/ }).click();
  await page.getByRole("button", { name: "Coloring page" }).click();
  await expect(page.locator("[data-sheet=coloring]")).toBeVisible();
  await expect(page.locator("[data-sheet=coloring] [data-color=red]")).toContainText("Red");
  await expect(page.locator("[data-sheet=coloring] [data-color=red]")).toContainText("stripes");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Teacher", exact: true }).click();
  await passGate(page);
  await openClassPlace(page);
  const classColors = page.locator("[data-place=class-colors]");
  await classColors.getByRole("button", { name: "Mixing", exact: true }).click();
  await expect(classColors).toHaveAttribute("data-stage", "mixing");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await passGate(page);
  await expect(page.locator("[data-section=path-colors]")).toContainText("Color names");
  await expect(page.locator("[data-section=path-colors]")).toContainText("Mixing");
  await expect(page.locator("[data-color-stage]")).toHaveAttribute("data-color-stage", "mixing");
});
