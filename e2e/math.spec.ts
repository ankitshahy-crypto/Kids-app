import { askedLines, installAudioSpy, spokenLines } from "./audioSpy";
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

const WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
];

async function install(page: Page, options: { quick?: boolean; ageRange?: string; tips?: boolean } = {}) {
  const { quick = true, ageRange = "4", tips = true } = options;
  await installAudioSpy(page);
  await page.addInitScript(
    ({ saved, quick, tips }) => {
      if (sessionStorage.getItem("math-seeded")) return;
      sessionStorage.setItem("math-seeded", "1");
      localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
      localStorage.removeItem("kids-app-silent-hint-v1");
      // A kit game waits for its praise before the next round; the tests that play a whole game skip the wait.
      if (quick) localStorage.setItem("littlenest-quick-rounds", "1");
      if (!tips) localStorage.setItem("littlenest-settings-v1", JSON.stringify({ showTips: false }));
    },
    { saved: { ...profile, profiles: [{ ...profile.profiles[0], ageRange }] }, quick, tips },
  );
  await page.goto("./");
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "LittleNest Numbers" }).click();
  await expect(page.locator("[data-screen=today]")).toHaveAttribute("data-subject", "math");
}

async function spoken(page: Page): Promise<string[]> {
  return spokenLines(page);
}

/** The numbers on the choices, in the order they are shown. */
const numerals = (frame: Locator, attribute: string) =>
  frame.locator(`.pick[${attribute}]`).evaluateAll((picks, name) => picks.map((pick) => Number(pick.getAttribute(name))), attribute);

test("counting: each thing says its number when tapped, and then the number is tapped", async ({ page }, testInfo) => {
  await install(page);
  if (testInfo.project.name === "iphone") {
    await page.locator("[data-screen=today]").screenshot({ path: "test-results/screenshots/numbers-today-iphone.png" });
  }
  await page.getByRole("button", { name: "Count objects" }).click();
  const play = game(page, "count");
  await expect(play).toHaveAttribute("data-rounds", "3");
  // The first group is this week's number.
  await onRound(play, 0);
  await expect(play).toHaveAttribute("data-target", "3");
  const before = (await spoken(page)).length;
  const asked = (await askedLines(page)).length;
  for (let index = 0; index < 3; index += 1) {
    const thing = play.locator(`[data-object='${index}']`);
    await thing.click();
    await expect(thing).toHaveAttribute("data-counted", "true");
    // It keeps the number it was given.
    await expect(thing.locator(".count-badge")).toHaveText(String(index + 1));
  }
  await expect(play).toHaveAttribute("data-counted", "3");
  // A thing counted once is not counted again.
  await play.locator("[data-object='0']").click();
  await expect(play).toHaveAttribute("data-counted", "3");
  // The counts are checked as asked for, the instruction as heard. A tap made over the last count's
  // word stops it for the next one (the newer word takes over), so with taps as quick as a test's,
  // on a busy machine, "one" never starts to play: it failed that way once.
  await expect.poll(async () => (await askedLines(page)).slice(asked)).toEqual(expect.arrayContaining(["one", "two", "three"]));
  await expect.poll(async () => (await spoken(page)).slice(before)).toContain("now tap the number.");
  if (testInfo.project.name === "chromium") await play.screenshot({ path: "test-results/screenshots/numbers_count.png" });
  // A wrong number wiggles and ends nothing.
  const wrong = play.locator(".pick:not([data-number='3'])").first();
  await wrong.click();
  await expectWiggle(wrong);
  await expect(play).toHaveAttribute("data-misses", "1");
  await play.locator(".pick[data-number='3']").click();
  // The other groups are other numbers of other things, and can be answered without counting.
  const seen = new Set(["3"]);
  for (const round of [1, 2]) {
    await onRound(play, round);
    const target = (await play.getAttribute("data-target")) ?? "";
    expect(seen.has(target)).toBe(false);
    seen.add(target);
    await expect(play.locator(".count-thing")).toHaveCount(Number(target));
    expect(await numerals(play, "data-number")).toContain(Number(target));
    await play.locator(`.pick[data-number='${target}']`).click();
  }
  await expectStar(page);
});

test("counting: after three misses the group is counted for the child and the number is pointed at", async ({ page }) => {
  await install(page);
  await page.getByRole("button", { name: "Count objects" }).click();
  const play = game(page, "count");
  await onRound(play, 0);
  const wrong = play.locator(".pick:not([data-number='3'])").first();
  for (let miss = 1; miss <= 3; miss += 1) {
    await wrong.click();
    await expect(play).toHaveAttribute("data-misses", String(miss));
  }
  await expect(play).toHaveAttribute("data-reveal", "true");
  await expect(play.locator(".count-badge")).toHaveText(["1", "2", "3"]);
  await expect(play.locator(".pick[data-number='3']")).toHaveAttribute("data-reveal", "true");
  await expect(play.locator(".pick[data-number='3'] .game-hand")).toBeVisible();
});

test("number recognition says the number, and the one found is shown with that many dots", async ({ page }, testInfo) => {
  await install(page, { quick: false });
  const before = (await spoken(page)).length;
  await page.getByRole("button", { name: "Hear a number" }).click();
  const play = game(page, "know");
  await expect(play).toHaveAttribute("data-rounds", "4");
  // This week's number first. Nothing on screen gives it away: it is heard.
  await expect(play).toHaveAttribute("data-hear", "1");
  await expect(play.locator(".hear-card")).toHaveAttribute("data-shown", "false");
  await expect(play.locator(".ten-frame")).toHaveCount(0);
  await expect.poll(async () => (await spoken(page)).slice(before), { timeout: 10000 }).toEqual(expect.arrayContaining(["tap the number you hear.", "one"]));
  // The speaker in the scene says it again.
  const heard = (await spoken(page)).length;
  await play.locator(".game-hear").click();
  await expect.poll(async () => (await spoken(page)).slice(heard), { timeout: 10000 }).toEqual(expect.arrayContaining(["tap the number you hear.", "one"]));
  // A wrong number says its own name.
  const wrong = play.locator(".pick:not([data-number='1'])").first();
  const wrongNumber = Number(await wrong.getAttribute("data-number"));
  const missed = (await spoken(page)).length;
  await wrong.click();
  await expectWiggle(wrong);
  await expect.poll(async () => (await spoken(page)).slice(missed), { timeout: 10000 }).toContain(WORDS[wrongNumber]);
  await play.locator(".pick[data-number='1']").click();
  await expect(play.locator(".hear-card")).toHaveAttribute("data-shown", "true");
  await expect(play.locator(".hear-numeral")).toHaveText("1");
  await expect(play.locator(".ten-dot")).toHaveCount(1);
  if (testInfo.project.name === "chromium") await play.screenshot({ path: "test-results/screenshots/numbers_know.png" });
});

test("number recognition plays four different numbers through to a star", async ({ page }) => {
  await install(page);
  await page.getByRole("button", { name: "Hear a number" }).click();
  const play = game(page, "know");
  const heard = new Set<string>();
  for (let round = 0; round < 4; round += 1) {
    await onRound(play, round);
    const hear = (await play.getAttribute("data-hear")) ?? "";
    expect(heard.has(hear)).toBe(false);
    heard.add(hear);
    const choices = await numerals(play, "data-number");
    expect(choices).toHaveLength(3);
    // In counting order, so they can be compared.
    expect([...choices].sort((a, b) => a - b)).toEqual(choices);
    await play.locator(`.pick[data-number='${hear}']`).click();
  }
  await expectStar(page);
});

test("number tracing follows the dots in order", async ({ page }, testInfo) => {
  await install(page);
  await page.getByRole("button", { name: "Trace a number" }).click();
  const play = page.locator("[data-screen=trace]");
  const digit = await play.getAttribute("data-digit");
  expect(Number(digit)).toBeGreaterThanOrEqual(0);
  if (testInfo.project.name === "iphone") {
    await play.screenshot({ path: "test-results/screenshots/number-trace-iphone.png" });
  }
  for (let guard = 0; guard < 12; guard += 1) {
    const next = play.locator("[data-trace-dot][data-next=true]");
    if ((await next.count()) === 0) break;
    await next.click();
  }
  await expect(page.locator("[data-screen=today] .star-count")).toHaveAttribute("data-stars", "1");
  // A section's page holds that section only; the dock and the other tiles are on the home screen.
  await page.locator("[data-section-back]").click();
  await page.getByRole("button", { name: "Stickers" }).click();
  await expect(page.locator(`[data-sticker='${digit}'][data-kind=number][data-subject=math]`)).toBeVisible();
});

test("shapes: the block that fits the hole drops in, three times, and then the week's shape is traced", async ({ page }, testInfo) => {
  await install(page);
  await page.getByRole("button", { name: "Match a shape" }).click();
  const play = page.locator("[data-screen=shape]");
  await expect(play).toHaveAttribute("data-phase", "match");
  await expect(play).toHaveAttribute("data-rounds", "3");
  // This week's shape first.
  await onRound(play, 0);
  await expect(play).toHaveAttribute("data-prompt", "circle");
  await expect(play.locator(".sorter-art")).toHaveAttribute("data-fitted", "false");
  // A wrong block wiggles and says what it is.
  const before = (await spoken(page)).length;
  const wrong = play.locator(".pick:not([data-shape=circle])").first();
  const wrongShape = (await wrong.getAttribute("data-shape")) ?? "";
  await wrong.click();
  await expectWiggle(wrong);
  await expect(play).toHaveAttribute("data-tries", "1");
  await expect.poll(async () => (await spoken(page)).slice(before)).toContain(wrongShape);
  if (testInfo.project.name === "chromium") await play.screenshot({ path: "test-results/screenshots/numbers_shapes.png" });
  await play.locator(".pick[data-shape=circle]").click();
  const shapes = new Set(["circle"]);
  for (const round of [1, 2]) {
    await onRound(play, round);
    const prompt = (await play.getAttribute("data-prompt")) ?? "";
    expect(shapes.has(prompt)).toBe(false);
    shapes.add(prompt);
    await expect(play.locator(".game-tray .pick")).toHaveCount(3);
    await play.locator(`.pick[data-shape=${prompt}]`).click();
  }
  // The blocks are found; the week's shape is traced, as before.
  await expect(play).toHaveAttribute("data-phase", "demo");
  await expect(play).toHaveAttribute("data-prompt", "circle");
  const { finishPathTrace, scribbleCorner } = await import("./traceFlow");
  await play.getByRole("button", { name: "Your turn" }).click();
  await scribbleCorner(page, "shape");
  if (testInfo.project.name === "chromium") {
    await page.screenshot({ path: "test-results/screenshots/shape_trace_board.png" });
  }
  await finishPathTrace(page, "shape");
  await expect(page.locator("[data-screen=today] .star-count")).toHaveAttribute("data-stars", "1");
  // A section's page holds that section only; the dock and the other tiles are on the home screen.
  await page.locator("[data-section-back]").click();
  await page.getByRole("button", { name: "Stickers" }).click();
  await expect(page.locator("[data-sticker='circle'][data-kind=shape][data-subject=math]")).toBeVisible();
});

test("more: the plate with more is set down in front of the animal with its number", async ({ page }, testInfo) => {
  await install(page, { quick: false });
  const before = (await spoken(page)).length;
  await page.getByRole("button", { name: "Which has more" }).click();
  const play = game(page, "more");
  await expect(play).toHaveAttribute("data-rounds", "3");
  await expect(play).toHaveAttribute("data-ask", "more");
  await expect.poll(async () => (await spoken(page)).slice(before), { timeout: 10000 }).toContain("which has more?");
  const answer = (await play.getAttribute("data-answer")) ?? "";
  const other = answer === "left" ? "right" : "left";
  const big = Number(await play.locator(`.pick[data-side=${answer}]`).getAttribute("data-count"));
  const small = Number(await play.locator(`.pick[data-side=${other}]`).getAttribute("data-count"));
  expect(big).toBeGreaterThan(small);
  // Each plate holds as many things as its number.
  await expect(play.locator(`.pick[data-side=${answer}] .plate-thing`)).toHaveCount(big);
  await expect(play.locator(`.pick[data-side=${other}] .plate-thing`)).toHaveCount(small);
  // The smaller plate is named for what it is.
  const missed = (await spoken(page)).length;
  await play.locator(`.pick[data-side=${other}]`).click();
  await expectWiggle(play.locator(`.pick[data-side=${other}]`));
  await expect.poll(async () => (await spoken(page)).slice(missed), { timeout: 10000 }).toEqual(expect.arrayContaining([WORDS[small], "that is fewer."]));
  await expect(play.locator(".more-won")).toHaveAttribute("data-shown", "false");
  const picked = (await spoken(page)).length;
  await play.locator(`.pick[data-side=${answer}]`).click();
  await expect(play.locator(".more-won")).toHaveAttribute("data-shown", "true");
  await expect(play.locator(".more-won .plate-thing")).toHaveCount(big);
  await expect(play.locator(".more-won .hear-numeral")).toHaveText(String(big));
  await expect.poll(async () => (await spoken(page)).slice(picked), { timeout: 10000 }).toEqual(expect.arrayContaining([WORDS[big], "that is more."]));
  if (testInfo.project.name === "chromium") await play.screenshot({ path: "test-results/screenshots/numbers_more.png" });
});

test("more plays through to a star, and ages 5 to 7 are also asked which has fewer", async ({ page }) => {
  await install(page, { ageRange: "6-7" });
  await page.getByRole("button", { name: "Which has more" }).click();
  const play = game(page, "more");
  await expect(play).toHaveAttribute("data-rounds", "4");
  const asks: string[] = [];
  for (let round = 0; round < 4; round += 1) {
    await onRound(play, round);
    const ask = (await play.getAttribute("data-ask")) ?? "";
    asks.push(ask);
    const answer = (await play.getAttribute("data-answer")) ?? "";
    const other = answer === "left" ? "right" : "left";
    const picked = Number(await play.locator(`.pick[data-side=${answer}]`).getAttribute("data-count"));
    const left = Number(await play.locator(`.pick[data-side=${other}]`).getAttribute("data-count"));
    if (ask === "more") expect(picked).toBeGreaterThan(left);
    else expect(picked).toBeLessThan(left);
    await play.locator(`.pick[data-side=${answer}]`).click();
  }
  expect(asks).toEqual(["more", "fewer", "more", "fewer"]);
  await expectStar(page);
});

test("adding: the things count aloud across both groups, and the sum brings them together", async ({ page }, testInfo) => {
  await install(page, { quick: false });
  await page.getByRole("button", { name: "Add the groups" }).click();
  const play = game(page, "add");
  await expect(play).toHaveAttribute("data-rounds", "3");
  // This week's sum first: two and one.
  await expect(play).toHaveAttribute("data-left", "2");
  await expect(play).toHaveAttribute("data-right", "1");
  await expect(play).toHaveAttribute("data-answer", "3");
  await expect(play.locator(".add-row .count-group")).toHaveCount(2);
  await expect(play.locator(".add-row")).toHaveAttribute("data-joined", "false");
  if (testInfo.project.name === "iphone") {
    await play.screenshot({ path: "test-results/screenshots/number-add-iphone.png" });
  }
  // The second group goes on counting from the first.
  const asked = (await askedLines(page)).length;
  await play.locator("[data-object='2']").click();
  await play.locator("[data-object='0']").click();
  await expect(play.locator("[data-object='2'] .count-badge")).toHaveText("1");
  await expect(play.locator("[data-object='0'] .count-badge")).toHaveText("2");
  // As asked for, not as heard: the second tap can stop the first one's word (see the counting test).
  await expect.poll(async () => (await askedLines(page)).slice(asked)).toEqual(expect.arrayContaining(["one", "two"]));
  const said = (await spoken(page)).length;
  await play.locator(".pick[data-sum='3']").click();
  await expect(play.locator(".add-row")).toHaveAttribute("data-joined", "true");
  // Every one carries its number now.
  await expect(play.locator(".count-badge")).toHaveCount(3);
  await expect.poll(async () => (await spoken(page)).slice(said), { timeout: 10000 }).toContain("two and one make three.");
  if (testInfo.project.name === "chromium") await play.screenshot({ path: "test-results/screenshots/numbers_add.png" });
});

test("adding plays three sums, none past five, through to a star", async ({ page }) => {
  await install(page);
  await page.getByRole("button", { name: "Add the groups" }).click();
  const play = game(page, "add");
  const pairs = new Set<string>();
  for (let round = 0; round < 3; round += 1) {
    await onRound(play, round);
    const left = Number(await play.getAttribute("data-left"));
    const right = Number(await play.getAttribute("data-right"));
    const sum = Number(await play.getAttribute("data-answer"));
    expect(left + right).toBe(sum);
    expect(sum).toBeLessThanOrEqual(5);
    expect(pairs.has(`${left}+${right}`)).toBe(false);
    pairs.add(`${left}+${right}`);
    if (round === 0) {
      const wrong = play.locator(`.pick:not([data-sum='${sum}'])`).first();
      await wrong.click();
      await expectWiggle(wrong);
    }
    await play.locator(`.pick[data-sum='${sum}']`).click();
  }
  await expectStar(page);
});

for (const [id, name] of [
  ["count", "Count objects"],
  ["know", "Hear a number"],
  ["shape", "Match a shape"],
  ["more", "Which has more"],
  ["add", "Add the groups"],
] as const) {
  test(`${id} fits a phone with the tip showing: the scene and every choice are in view`, async ({ page }) => {
    // A phone's screen less its status bar and home bar.
    await page.setViewportSize({ width: 390, height: 763 });
    await install(page, { ageRange: "6-7" });
    await page.getByRole("button", { name }).click();
    const frame = game(page, id);
    await expect(page.locator("[data-tip]")).toBeVisible();
    await expect(frame.locator(".game-scene")).toBeInViewport({ ratio: 1 });
    for (const pick of await frame.locator(".game-tray .pick").all()) {
      await expect(pick).toBeInViewport({ ratio: 1 });
      const box = await pick.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(60);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(60);
    }
    // Nothing in the scene runs out of it: ten things to count, or two groups and a plus.
    const scene = await frame.locator(".game-scene").boundingBox();
    for (const thing of await frame.locator(".count-thing").all()) {
      const box = await thing.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(scene!.x);
      expect(box!.x + box!.width).toBeLessThanOrEqual(scene!.x + scene!.width + 1);
      // Big enough for a small finger.
      expect(box!.width).toBeGreaterThanOrEqual(36);
    }
  });
}

async function passGate(page: Page) {
  await answerGate(page, true);
}

test("number sheets and the class numbers place are on the grown-up screens", async ({ page }) => {
  await install(page);
  // A section page has Back where the child's animal is on the reading path, so step back to the path first.
  await page.locator("[data-section-back]").click();
  await page.getByRole("button", { name: "Switch child" }).click({ delay: 2000 });
  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  await passGate(page);
  await page.getByRole("button", { name: /Printables/ }).click();
  await page.getByRole("button", { name: "Number sheets" }).click();
  await expect(page.locator("[data-sheet=number]").first()).toBeVisible();
  await expect(page.locator("[data-sheet=counting]")).toBeVisible();
  await expect(page.locator("[data-sheet=counting] [data-count='2']")).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Teacher", exact: true }).click();
  await passGate(page);
  await openClassPlace(page);
  const classMath = page.locator("[data-place=class-math]");
  await classMath.getByRole("button", { name: "Adding", exact: true }).click();
  await expect(classMath).toHaveAttribute("data-stage", "adding");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await passGate(page);
  await expect(page.locator("[data-section=path-math]")).toContainText("Counting");
  await expect(page.locator("[data-section=path-math]")).toContainText("Adding");
  await expect(page.locator("[data-math-stage]")).toHaveAttribute("data-math-stage", "adding");
});

test("letters and numbers stay large on iPad", async ({ page }) => {
  await install(page);
  // The Numbers tile and the reading trail are both on the home screen.
  await page.locator("[data-section-back]").click();
  for (const size of [
    { width: 1024, height: 1366 },
    { width: 1366, height: 1024 },
  ]) {
    await page.setViewportSize(size);
    const numbers = await page.getByRole("button", { name: "LittleNest Numbers" }).boundingBox();
    expect(numbers).toBeTruthy();
    expect(numbers!.height).toBeGreaterThanOrEqual(100);
    expect(numbers!.width).toBeGreaterThan(140);
    const trail = await page.locator(".trail").boundingBox();
    expect(trail).toBeTruthy();
    expect(trail!.height).toBeGreaterThanOrEqual(100);
    expect(trail!.width).toBeGreaterThan(140);
  }
});
