import { expect, test, type Locator, type Page } from "@playwright/test";
import { installAudioSpy, spokenLines } from "./audioSpy";
import { createdThisWeek } from "./clock";
import { expectStar, expectWiggle, game, onRound } from "./kit";

function child(ageRange = "4") {
  return {
    activeId: "mia",
    profiles: [{ id: "mia", name: "Mia", ageRange, animal: "fox", createdAt: createdThisWeek(), stars: 0, days: {} }],
  };
}

async function install(page: Page, options: { ageRange?: string; quick?: boolean; tips?: boolean } = {}) {
  const { ageRange = "4", quick = true, tips = false } = options;
  await page.addInitScript(
    ({ saved, quick, tips }) => {
      if (sessionStorage.getItem("science-seeded")) return;
      sessionStorage.setItem("science-seeded", "1");
      localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
      localStorage.removeItem("kids-app-silent-hint-v1");
      if (quick) localStorage.setItem("littlenest-quick-rounds", "1");
      if (!tips) localStorage.setItem("littlenest-settings-v1", JSON.stringify({ showTips: false }));
    },
    { saved: child(ageRange), quick, tips },
  );
  await page.goto("./");
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: "Mia" }).click();
}

async function openScience(page: Page, id: string, options: Parameters<typeof install>[1] = {}): Promise<Locator> {
  await install(page, options);
  await page.locator("[data-course=science]").click();
  await page.locator(`[data-science=menu] [data-activity=${id}]`).click();
  const frame = game(page, id);
  await expect(frame).toBeVisible();
  return frame;
}

/** Give the plant what it asks for, or put the next picture in place, and wait for the game to be ready again. */
async function nextStep(frame: Locator) {
  await expect(frame).toHaveAttribute("data-ready", "true");
  const task = await frame.getAttribute("data-task");
  const need = (await frame.getAttribute("data-need")) ?? "";
  await frame.locator(task === "grow" ? `.pick[data-give=${need}]` : `.pick[data-pick=${need}]`).click();
}

test("Science is on the home screen, and its page is six picture tiles", async ({ page }) => {
  await install(page);
  const science = page.locator("[data-course=science]");
  await expect(science).toBeVisible();
  await expect(science).toHaveAttribute("aria-label", "LittleNest Science");
  await page.locator("[data-course=build]").click();
  await expect(page.locator("[data-engineer=menu] [data-activity=float]")).toHaveCount(0);
  // A section's page holds that section only; the dock and the other tiles are on the home screen.
  await page.locator("[data-section-back]").click();
  await science.click();
  const board = page.locator("[data-science=menu]");
  await expect(board).toHaveAttribute("data-level", "early");
  await expect(board.locator(".time-tile > span:last-child")).toHaveText(["Grow", "Homes", "Body", "Weather", "Senses", "Sink or float"]);
  // The four that are waiting for drawings of their own are not offered.
  for (const id of ["change", "predict", "chain", "water"]) await expect(board.locator(`[data-activity=${id}]`)).toHaveCount(0);
  // Every tile is one of the app's drawings, and none runs off a phone.
  await page.setViewportSize({ width: 390, height: 844 });
  for (const tile of await board.locator("[data-activity]").all()) {
    await expect(tile.locator(".math-activity-art svg")).toHaveCount(1);
    const box = await tile.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(-1);
    expect(box!.x + box!.width).toBeLessThanOrEqual(391);
  }
});

test("the garden: a seed, then water, sun and water again grow a flower, and then a life is put in order", async ({ page }, testInfo) => {
  const grow = await openScience(page, "life");
  await expect(grow).toHaveAttribute("data-task", "grow");
  await expect(grow).toHaveAttribute("data-rounds", "2");
  await expect(grow.locator(".garden-bed")).toHaveAttribute("data-grown", "0");
  // What the plant needs is shown beside it, as the same picture as the thing to tap.
  await expect(grow.locator(".garden-need")).toHaveAttribute("data-need", "seed");
  await expect(grow.locator(".pick[data-give=seed] .game-hand")).toBeVisible();
  // The sun before there is a seed: it wiggles, and nothing grows.
  await grow.locator(".pick[data-give=sun]").click();
  await expectWiggle(grow.locator(".pick[data-give=sun]"));
  await expect(grow).toHaveAttribute("data-step", "0");
  for (const [step, need] of ["seed", "water", "sun", "water"].entries()) {
    await expect(grow).toHaveAttribute("data-need", need);
    if (step > 0) await expect(grow.locator(".garden-need")).toHaveAttribute("data-need", need);
    await nextStep(grow);
    if (step < 3) {
      // It grows at once: a seed in the soil, a sprout, a plant.
      await expect(grow.locator(".garden-bed")).toHaveAttribute("data-grown", String(step + 1));
      await expect(grow.locator(".garden-bed")).toHaveAttribute("data-effect", need);
    }
    if (step === 1 && testInfo.project.name === "chromium") {
      await grow.screenshot({ path: "test-results/screenshots/science_grow.png" });
    }
  }
  // Then three pictures of a life, out of order, to put in order.
  await expect(grow).toHaveAttribute("data-round", "1");
  await expect(grow).toHaveAttribute("data-task", "order");
  const order = ((await grow.getAttribute("data-order")) ?? "").split(",");
  expect(order).toHaveLength(3);
  const dealt = await grow.locator(".game-tray .pick").evaluateAll((picks) => picks.map((pick) => pick.getAttribute("data-pick")));
  expect(dealt).not.toEqual(order);
  // The last one first: it wiggles, and nothing is placed.
  await expect(grow).toHaveAttribute("data-ready", "true");
  await grow.locator(`.pick[data-pick=${order[2]}]`).click();
  await expectWiggle(grow.locator(`.pick[data-pick=${order[2]}]`));
  await expect(grow).toHaveAttribute("data-step", "0");
  for (const _ of order) await nextStep(grow);
  await expectStar(page);
  await page.locator("[data-section-back]").click();
  await expect(page.locator("[data-step=letter]")).not.toHaveClass(/is-done/);
});

test("the garden says what the plant needs at each step", async ({ page }) => {
  await installAudioSpy(page);
  const before = (await spokenLines(page)).length;
  const grow = await openScience(page, "life", { quick: false });
  await expect.poll(async () => (await spokenLines(page)).slice(before), { timeout: 8_000 }).toContain("plant the seed.");
  await grow.locator(".pick[data-give=seed]").click();
  await expect.poll(async () => (await spokenLines(page)).slice(before), { timeout: 8_000 }).toContain("the seed is thirsty. give it water.");
  // The wrong thing says its own name.
  await expect(grow).toHaveAttribute("data-ready", "true");
  const heard = (await spokenLines(page)).length;
  await grow.locator(".pick[data-give=sun]").click();
  await expect.poll(async () => (await spokenLines(page)).slice(heard), { timeout: 8_000 }).toContain("sun");
  await grow.locator(".pick[data-give=water]").click();
  await expect.poll(async () => (await spokenLines(page)).slice(heard), { timeout: 8_000 }).toContain("now it needs light. tap the sun.");
});

for (const [id, rounds] of [
  ["homes", 3],
  ["weather", 3],
  ["senses", 3],
] as const) {
  test(`${id}: a question said aloud, three pictures to choose from, and a wrong one ends nothing`, async ({ page }, testInfo) => {
    const frame = await openScience(page, id);
    await expect(frame).toHaveAttribute("data-rounds", String(rounds));
    for (let round = 0; round < rounds; round += 1) {
      await onRound(frame, round);
      await expect(frame.locator(".game-tray .pick")).toHaveCount(3);
      await expect(frame.locator(".game-tray .pick .art")).toHaveCount(3);
      const answer = (await frame.getAttribute("data-answer")) ?? "";
      if (round === 0) {
        if (testInfo.project.name === "chromium") await frame.screenshot({ path: `test-results/screenshots/science_${id}.png` });
        const wrong = frame.locator(`.pick:not([data-pick=${answer}])`).first();
        await wrong.click();
        await expectWiggle(wrong);
        await expect(frame).toHaveAttribute("data-solved", "false");
      }
      await frame.locator(`.pick[data-pick=${answer}]`).click();
    }
    await expectStar(page);
  });
}

test("the weather is the scene itself", async ({ page }) => {
  const weather = await openScience(page, "weather");
  const scenes: Record<string, string> = { rain: "rainy", sun: "afternoon", snow: "snowy", wind: "windy", cold: "snowy", hot: "afternoon", windy: "windy", chilly: "snowy" };
  for (let round = 0; round < 3; round += 1) {
    await onRound(weather, round);
    const kind = (await weather.getAttribute("data-item")) ?? "";
    await expect(weather.locator(".game-scene")).toHaveAttribute("data-scene", scenes[kind]);
    await weather.locator(`.pick[data-pick=${await weather.getAttribute("data-answer")}]`).click();
  }
});

test("body: the voice asks for a part, and it is tapped on the bird itself", async ({ page }, testInfo) => {
  const body = await openScience(page, "body");
  await expect(body).toHaveAttribute("data-rounds", "3");
  // One bird, and nothing in the tray: the bird is the thing to tap.
  await expect(body.locator(".bird-art")).toBeVisible();
  await expect(body.locator(".game-tray .pick")).toHaveCount(0);
  const first = (await body.getAttribute("data-answer")) ?? "";
  const other = ["beak", "wing", "tail"].find((part) => part !== first) ?? "tail";
  await body.locator(`.body-part[data-part=${other}]`).click();
  await expect(body.locator(`.body-part[data-part=${other}]`)).toHaveAttribute("data-wiggle", "true");
  await body.locator(`.body-part[data-part=${other}]`).click();
  await body.locator(`.body-part[data-part=${other}]`).click();
  // Three misses: the part lights up and the hand points at it.
  await expect(body).toHaveAttribute("data-reveal", "true");
  await expect(body.locator(`.body-part[data-part=${first}]`)).toHaveAttribute("data-reveal", "true");
  await expect(body.locator(".bird-hint .game-hand")).toBeVisible();
  if (testInfo.project.name === "chromium") {
    await body.screenshot({ path: "test-results/screenshots/science_body.png" });
  }
  for (let round = 0; round < 3; round += 1) {
    await onRound(body, round);
    await body.locator(`.body-part[data-part=${await body.getAttribute("data-answer")}]`).click();
  }
  await expectStar(page);
});

test("sink or float: a guess, then the thing is dropped, and a wrong guess is not a miss", async ({ page }, testInfo) => {
  const float = await openScience(page, "float");
  await expect(float).toHaveAttribute("data-rounds", "4");
  let floats = 0;
  for (let round = 0; round < 4; round += 1) {
    await expect(float).toHaveAttribute("data-round", String(round));
    await expect(float).toHaveAttribute("data-dropped", "false");
    await expect(float.locator(".float-thing")).toHaveAttribute("data-result", "held");
    const answer = (await float.getAttribute("data-answer")) ?? "";
    if (answer === "float") floats += 1;
    // The first guess is the wrong one on purpose.
    const guess = round === 0 ? (answer === "float" ? "sink" : "float") : answer;
    await float.locator(`.pick[data-guess=${guess}]`).click();
    await expect(float).toHaveAttribute("data-dropped", "true");
    // Whatever was guessed, the thing does what it really does.
    await expect(float.locator(".float-thing")).toHaveAttribute("data-result", answer);
    await expect(float).toHaveAttribute("data-misses", "0");
    if (round === 0 && testInfo.project.name === "chromium") {
      await float.screenshot({ path: "test-results/screenshots/science_float.png" });
    }
  }
  // As many float as sink.
  expect(floats).toBe(2);
  await expectStar(page);
});

test("ages 5 to 7 play more rounds, each game ending with a harder step", async ({ page }) => {
  await install(page, { ageRange: "6-7" });
  await page.locator("[data-course=science]").click();
  await expect(page.locator("[data-science=menu]")).toHaveAttribute("data-level", "later");
  for (const [id, rounds] of [
    ["life", "4"],
    ["homes", "5"],
    ["body", "5"],
    ["weather", "5"],
    ["senses", "5"],
    ["float", "6"],
  ]) {
    await page.locator(`[data-science=menu] [data-activity=${id}]`).click();
    await expect(game(page, id)).toHaveAttribute("data-rounds", rounds);
    await expect(game(page, id)).toHaveAttribute("data-level", "later");
    await page.getByRole("button", { name: "Back", exact: true }).click();
  }
});

test("ages 3 to 4 stay on the short games: no harder step anywhere", async ({ page }) => {
  await install(page);
  await page.locator("[data-course=science]").click();
  // Homes: every round asks where one animal lives, and never for the empty place.
  await page.locator("[data-science=menu] [data-activity=homes]").click();
  const homes = game(page, "homes");
  for (let round = 0; round < 3; round += 1) {
    await onRound(homes, round);
    await expect(homes).not.toHaveAttribute("data-item", "empty");
    await expect(homes.locator(".science-at")).toHaveCount(0);
    await expect(homes.locator(".game-tray .pick")).toHaveCount(3);
    await homes.locator(`.pick[data-pick=${await homes.getAttribute("data-answer")}]`).click();
  }
  await expectStar(page);
  // The pond: one thing at a time, never a pair.
  await page.locator("[data-science=menu] [data-activity=float]").click();
  const float = game(page, "float");
  await expect(float).toHaveAttribute("data-rounds", "4");
  for (let round = 0; round < 4; round += 1) {
    await expect(float).toHaveAttribute("data-round", String(round));
    await expect(float).toHaveAttribute("data-task", "one");
    await expect(float.locator(".float-thing")).toHaveCount(1);
    await float.locator(`.pick[data-guess=${await float.getAttribute("data-answer")}]`).click();
    await expect(float).toHaveAttribute("data-dropped", "true");
  }
  await expectStar(page, 2);
});

test("homes at 5 to 7: four animals, then two animals at home and the empty place to find", async ({ page }, testInfo) => {
  const homes = await openScience(page, "homes", { ageRange: "6-7" });
  await expect(homes).toHaveAttribute("data-rounds", "5");
  for (let round = 0; round < 4; round += 1) {
    await onRound(homes, round);
    await expect(homes.locator(".science-subject")).toHaveCount(1);
    await homes.locator(`.pick[data-pick=${await homes.getAttribute("data-answer")}]`).click();
  }
  // The harder step: two animals, each on its home, and three places to choose from.
  await onRound(homes, 4);
  await expect(homes).toHaveAttribute("data-item", "empty");
  await expect(homes.locator(".science-at")).toHaveCount(2);
  await expect(homes.locator(".game-tray .pick")).toHaveCount(3);
  const taken = await homes.locator(".science-at").evaluateAll((spots) => spots.map((spot) => spot.getAttribute("data-home")));
  const answer = (await homes.getAttribute("data-answer")) ?? "";
  expect(taken).not.toContain(answer);
  const picks = await homes.locator(".game-tray .pick").evaluateAll((picks) => picks.map((pick) => pick.getAttribute("data-pick")));
  expect([...picks].sort()).toEqual([...taken, answer].sort());
  if (testInfo.project.name === "chromium") await homes.screenshot({ path: "test-results/screenshots/science_homes_empty.png" });
  // A place with an animal in it wiggles; the empty one is the answer.
  await homes.locator(`.pick[data-pick=${taken[0]}]`).click();
  await expectWiggle(homes.locator(`.pick[data-pick=${taken[0]}]`));
  await expect(homes).toHaveAttribute("data-solved", "false");
  await homes.locator(`.pick[data-pick=${answer}]`).click();
  await expect(homes).toHaveAttribute("data-solved", "true");
  await expectStar(page);
});

test("weather at 5 to 7: the last two rounds have one more wrong thing among the choices", async ({ page }, testInfo) => {
  const weather = await openScience(page, "weather", { ageRange: "6-7" });
  await expect(weather).toHaveAttribute("data-rounds", "5");
  for (let round = 0; round < 5; round += 1) {
    await onRound(weather, round);
    await expect(weather.locator(".game-tray .pick")).toHaveCount(round < 3 ? 3 : 4);
    const answer = (await weather.getAttribute("data-answer")) ?? "";
    if (round === 3) {
      if (testInfo.project.name === "chromium") await weather.screenshot({ path: "test-results/screenshots/science_weather_four.png" });
      // Four choices still fit a phone, each big enough for a finger.
      for (const pick of await weather.locator(".game-tray .pick").all()) {
        const box = await pick.boundingBox();
        expect(box?.width ?? 0).toBeGreaterThanOrEqual(60);
      }
      const wrong = weather.locator(`.pick:not([data-pick=${answer}])`).first();
      await wrong.click();
      await expectWiggle(wrong);
    }
    await weather.locator(`.pick[data-pick=${answer}]`).click();
  }
  await expectStar(page);
});

test("growing at 5 to 7: the garden, two lives of three pictures, then a life of four", async ({ page }, testInfo) => {
  const grow = await openScience(page, "life", { ageRange: "6-7" });
  await expect(grow).toHaveAttribute("data-rounds", "4");
  for (let step = 0; step < 4; step += 1) await nextStep(grow);
  for (const round of [1, 2, 3]) {
    await expect(grow).toHaveAttribute("data-round", String(round));
    await expect(grow).toHaveAttribute("data-task", "order");
    const order = ((await grow.getAttribute("data-order")) ?? "").split(",");
    expect(order).toHaveLength(round === 3 ? 4 : 3);
    await expect(grow.locator(".order-line li")).toHaveCount(order.length);
    await expect(grow.locator(".game-tray .pick")).toHaveCount(order.length);
    if (round === 3) {
      expect(order).toEqual(["seed", "sprout", "plant", "flower"]);
      if (testInfo.project.name === "chromium") await grow.screenshot({ path: "test-results/screenshots/science_life_four.png" });
      // The third picture before the second: it wiggles.
      await expect(grow).toHaveAttribute("data-ready", "true");
      await nextStep(grow);
      await grow.locator(`.pick[data-pick=${order[2]}]`).click();
      await expectWiggle(grow.locator(`.pick[data-pick=${order[2]}]`));
      await expect(grow).toHaveAttribute("data-step", "1");
      for (let step = 1; step < 4; step += 1) await nextStep(grow);
    } else {
      for (const _ of order) await nextStep(grow);
    }
  }
  await expectStar(page);
});

test("sink or float at 5 to 7: then two things at once, and the one tapped goes in first", async ({ page }, testInfo) => {
  const float = await openScience(page, "float", { ageRange: "6-7" });
  await expect(float).toHaveAttribute("data-rounds", "6");
  for (let round = 0; round < 4; round += 1) {
    await expect(float).toHaveAttribute("data-round", String(round));
    await expect(float).toHaveAttribute("data-task", "one");
    await float.locator(`.pick[data-guess=${await float.getAttribute("data-answer")}]`).click();
    await expect(float).toHaveAttribute("data-dropped", "true");
  }
  for (const round of [4, 5]) {
    await expect(float).toHaveAttribute("data-round", String(round));
    await expect(float).toHaveAttribute("data-task", "pair");
    await expect(float).toHaveAttribute("data-dropped", "false");
    // Two things held up, and the two of them to choose between.
    await expect(float.locator(".float-thing")).toHaveCount(2);
    await expect(float.locator(".float-thing[data-result=held]")).toHaveCount(2);
    await expect(float.locator(".game-tray .pick")).toHaveCount(2);
    const answer = (await float.getAttribute("data-answer")) ?? "";
    const things = ((await float.getAttribute("data-item")) ?? "").split(",");
    expect(things).toContain(answer);
    const other = things.find((thing) => thing !== answer) ?? "";
    if (round === 4 && testInfo.project.name === "chromium") await float.screenshot({ path: "test-results/screenshots/science_float_pair.png" });
    // The first time, the one that sinks: no miss, both go in, and each does what it really does.
    await float.locator(`.pick[data-guess=${round === 4 ? other : answer}]`).click();
    await expect(float).toHaveAttribute("data-dropped", "true");
    await expect(float.locator(`.float-thing[data-thing=${answer}]`)).toHaveAttribute("data-result", "float");
    await expect(float.locator(`.float-thing[data-thing=${other}]`)).toHaveAttribute("data-result", "sink");
    await expect(float).toHaveAttribute("data-misses", "0");
  }
  await expectStar(page);
});

for (const id of ["life", "homes", "body", "weather", "senses", "float"]) {
  test(`${id} fits a phone with the tip showing: the scene and every choice are in view`, async ({ page }) => {
    // A phone's screen less its status bar and home bar.
    await page.setViewportSize({ width: 390, height: 763 });
    const frame = await openScience(page, id, { tips: true });
    await expect(page.locator("[data-tip]")).toBeVisible();
    await expect(frame.locator(".game-scene")).toBeInViewport({ ratio: 1 });
    for (const pick of await frame.locator(".game-tray .pick").all()) {
      await expect(pick).toBeInViewport({ ratio: 1 });
      const box = await pick.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(60);
    }
  });
}

test("the home dock stays on screen, and each section's page shows all of its activities", async ({ page }) => {
  // A phone's screen less its status bar and home bar, whatever the project's own size: the test
  // is about that screen. (It used to skip everywhere but two projects CI did not run, and in a
  // third, an iPhone in Safari with its bars up, the screen is shorter than the app's own.)
  await page.setViewportSize({ width: 390, height: 763 });
  await install(page);
  const height = page.viewportSize()?.height ?? 0;
  const dockBottom = () => page.locator("[data-dock=nest]").evaluate((el) => el.getBoundingClientRect().bottom);
  expect(await dockBottom(), "home").toBeLessThanOrEqual(height - 2);
  // A section's page holds that section only, so its tiles have the whole screen: none is cut off.
  for (const course of ["math", "colors", "time", "build", "science"]) {
    await page.locator(`[data-course=${course}]`).click();
    const tiles = page.locator("[data-screen=today] [data-activity]");
    for (let index = 0; index < (await tiles.count()); index += 1) {
      await expect(tiles.nth(index), `${course} tile ${index}`).toBeInViewport({ ratio: 1 });
    }
    await page.locator("[data-section-back]").click();
    expect(await dockBottom(), `home after ${course}`).toBeLessThanOrEqual(height - 2);
  }
});
