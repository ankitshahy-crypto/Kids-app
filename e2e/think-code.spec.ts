import { expect, test, type Locator, type Page } from "@playwright/test";
import { installAudioSpy, requestedCues, spokenLines } from "./audioSpy";
import { createdThisWeek } from "./clock";

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

const older = {
  activeId: "mia",
  profiles: [{ ...profile.profiles[0], ageRange: "6-7" }],
};

async function install(page: Page, saved: unknown = profile, options: { quick?: boolean; salt?: number; calm?: boolean } = {}) {
  await page.addInitScript(
    ({ saved, quick, salt, calm }) => {
      localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
      localStorage.removeItem("kids-app-silent-hint-v1");
      // No wait for the praise between rounds (a development-build switch, see e2e/kit.ts).
      if (quick) localStorage.setItem("littlenest-quick-rounds", "1");
      // The boards of one known play (the same kind of switch), when a test is about one of them.
      if (salt !== undefined) localStorage.setItem("littlenest-salt", String(salt));
      if (calm) localStorage.setItem("littlenest-settings-v1", JSON.stringify({ calm: true }));
    },
    { saved, quick: options.quick ?? false, salt: options.salt, calm: options.calm ?? false },
  );
  await page.goto("./");
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: "Mia" }).click();
}

/** Coding has its own tile on the home screen, and its own list. */
async function openCoding(page: Page) {
  await page.locator("[data-course=code]").click();
  await expect(page.locator("[data-screen=games]")).toHaveAttribute("data-lobby", "code");
  await expect(page.locator("[data-game=home]")).toBeVisible();
}

/**
 * Mends a bug round the way a child who read the line would, whatever kind of bug it is: an arrow
 * too many comes off; a wrong one is tapped off and the right one put in its empty place; a
 * missing one is put in. Works from any state of the plan, so a test can first poke at it.
 */
async function mendPlan(board: Locator) {
  const path = ((await board.getAttribute("data-path")) ?? "").split(",");
  // After an arrow comes off, taps on the row are let go for a moment (the row has closed up under
  // the finger): the test waits that moment out, here for a tap just before it and below for its own.
  const settled = () => board.page().waitForTimeout(450);
  await settled();
  for (let edits = 0; edits < 12; edits += 1) {
    const slots = board.locator(".code-queue > .code-chip, .code-queue > .code-place[data-gap=true]");
    const plan = await slots.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-dir")));
    if (plan.join() === path.join()) break;
    if (plan.length > path.length) {
      const extra = plan.findIndex((_, at) => [...plan.slice(0, at), ...plan.slice(at + 1)].join() === path.join());
      await slots.nth(extra >= 0 ? extra : plan.length - 1).click();
      await expect(slots).toHaveCount(plan.length - 1);
      await settled();
      continue;
    }
    const at = plan.findIndex((dir, index) => dir !== path[index]);
    if (plan[at] !== null) {
      await slots.nth(at).click();
      await expect(slots.nth(at)).toHaveAttribute("data-gap", "true");
    }
    await board.locator(`[data-arrow=${path[at]}]`).click();
    await expect(slots.nth(at)).toHaveAttribute("data-dir", path[at]);
  }
  await expect(board).toHaveAttribute("data-fixed", "true");
}

/**
 * Walk or plan the board's own path, and see the animal get home: the next round opens, or the game
 * ends. (Home itself lasts only a moment under the tests' quick setting, so it is not waited for.)
 */
async function runPath(board: Locator) {
  const path = (await board.getAttribute("data-path")) ?? "";
  const mode = await board.getAttribute("data-mode");
  const round = await board.getAttribute("data-round");
  for (const dir of path.split(",").filter(Boolean)) {
    await board.locator(`[data-arrow=${dir}]`).click();
    if (mode === "loop") break;
  }
  if (mode !== "tap") await board.locator("[data-go=run]").click();
  await expect
    .poll(async () => (await board.count()) === 0 || (await board.getAttribute("data-finished")) === "true" || (await board.getAttribute("data-round")) !== round, { timeout: 10_000 })
    .toBe(true);
}

/** Predict: pick the ending that matches the board's own path, then Go. */
async function solvePredict(board: Locator) {
  const path = ((await board.getAttribute("data-path")) ?? "").split(",").filter(Boolean);
  const given = await board.locator(".code-chip[data-given=true]").count();
  const right = path.slice(given).join(",");
  await board.locator(`.pick [data-ending="${right}"]`).click();
  await expect(board.locator(".code-chip")).toHaveCount(path.length);
  const round = await board.getAttribute("data-round");
  await board.locator("[data-go=run]").click();
  await expect
    .poll(async () => (await board.count()) === 0 || (await board.getAttribute("data-finished")) === "true" || (await board.getAttribute("data-round")) !== round, { timeout: 10_000 })
    .toBe(true);
}

/** The round with this number (from 0) is the one being played. */
async function onRound(board: Locator, round: number) {
  await expect(board).toHaveAttribute("data-round", String(round), { timeout: 10_000 });
  await expect(board).toHaveAttribute("data-home", "false");
}

/** The opposite of a step: a way that goes away from the nest, or off the board. */
function wrongWay(first: string): string {
  return { right: "left", left: "right", up: "down", down: "up" }[first] ?? "left";
}

/** The ways that lead off the board from where the animal stands. */
async function offTheBoard(board: Locator): Promise<string[]> {
  const x = Number(await board.getAttribute("data-x"));
  const y = Number(await board.getAttribute("data-y"));
  const width = Number(await board.locator(".code-field").getAttribute("data-width"));
  const height = Number(await board.locator(".code-field").getAttribute("data-height"));
  const ways: string[] = [];
  if (x === 0) ways.push("left");
  if (y === 0) ways.push("up");
  if (x === width - 1) ways.push("right");
  if (y === height - 1) ways.push("down");
  return ways;
}

test("Coding is on the home screen, and its page goes start, think, build, code", async ({ page }) => {
  await install(page);
  const tile = page.locator("[data-area=explore] [data-course=code]");
  await expect(tile).toBeVisible();
  await expect(tile).toHaveAttribute("aria-label", "LittleNest Coding");
  await openCoding(page);
  await expect(page.getByRole("heading", { name: "Coding" })).toBeVisible();
  // The plan's three parts, after a first program: hello world.
  await expect(page.locator("[data-code-section] h2")).toHaveText(["Start here", "Think", "Build", "Code"]);
  await expect(page.locator("[data-code-section=start] .game-tile > span:not([aria-hidden])")).toHaveText(["Say hello"]);
  await expect(page.locator("[data-code-section=think] .game-tile > span:not([aria-hidden])")).toHaveText([
    "Take me home",
    "What comes next?",
    "First, then",
    "If, then",
  ]);
  await expect(page.locator("[data-code-section=build] .game-tile > span:not([aria-hidden])")).toHaveText(["Make a dance", "Make a song"]);
  await expect(page.locator("[data-code-section=code] .game-tile > span:not([aria-hidden])")).toHaveText(["Read the code"]);
  // The Games list keeps the reading games only.
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.locator("[data-dock=games]").click();
  await expect(page.locator("[data-screen=games]")).toHaveAttribute("data-lobby", "games");
  await expect(page.locator("[data-game-tile=bird]")).toHaveCount(0);
  await expect(page.locator("[data-game-tile=hatch]")).toBeVisible();
});

test("arrows take the animal home, then a plan is laid out and walked step by step", async ({ page }, testInfo) => {
  await install(page, profile, { quick: true });
  await openCoding(page);
  await page.locator("[data-game-tile=bird]").click();
  const board = page.locator(".game-frame[data-screen=bird]");
  await expect(board).toHaveAttribute("data-level", "early");
  await expect(board).toHaveAttribute("data-mode", "tap");
  await expect(board).toHaveAttribute("data-rounds", "5");
  await expect(page.getByRole("heading", { name: "Take me home" })).toBeVisible();
  await expect(page.locator("[data-tip=game-bird-start]")).toBeVisible();
  // The board is a place: the child's animal stands on it, in a drawn scene.
  await expect(board.locator(".game-scene .code-field .code-pet .hero")).toBeVisible();
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/code_bird.png" });
  }
  const first = ((await board.getAttribute("data-path")) ?? "").split(",")[0];
  const startX = await board.getAttribute("data-x");
  const startY = await board.getAttribute("data-y");
  const edges = await offTheBoard(board);
  const back = wrongWay(first);
  if (edges.includes(back)) {
    // A step off the edge: the arrow wiggles and the animal stays where it is.
    await board.locator(`[data-arrow=${back}]`).click();
    await expect(board.locator(`[data-arrow=${back}]`)).toHaveAttribute("data-wiggle", /^(a|b)$/);
    await expect(board).toHaveAttribute("data-x", startX ?? "0");
    await expect(board).toHaveAttribute("data-y", startY ?? "0");
  } else {
    // The board has room behind the start: a step the wrong way is still a step, and one the
    // right way brings the animal back. Every tap does something.
    await board.locator(`[data-arrow=${back}]`).click();
    await expect(board.locator("[data-walked=true]")).toHaveCount(1);
    await board.locator(`[data-arrow=${first}]`).click();
    await expect(board).toHaveAttribute("data-x", startX ?? "0");
    await expect(board).toHaveAttribute("data-y", startY ?? "0");
  }
  await expect(board).toHaveAttribute("data-home", "false");
  await board.locator(`[data-arrow=${first}]`).click();
  // The cells the animal walked through are marked.
  await expect(board.locator("[data-walked=true]").first()).toBeVisible();
  // The rest of the way home, one tap a step. (Not the whole path again: a tap past the nest would
  // land on the next board.)
  for (const dir of ((await board.getAttribute("data-path")) ?? "").split(",").slice(1)) await board.locator(`[data-arrow=${dir}]`).click();

  // The second tap board has a turn in it; the game moves on by itself.
  await onRound(board, 1);
  await expect(board).toHaveAttribute("data-mode", "tap");
  expect(new Set(((await board.getAttribute("data-path")) ?? "").split(",")).size).toBe(2);
  await runPath(board);

  // Then a plan: arrows go into numbered places, one for each step home.
  await onRound(board, 2);
  await expect(board).toHaveAttribute("data-mode", "plan");
  const steps = ((await board.getAttribute("data-path")) ?? "").split(",").filter(Boolean);
  expect(steps).toHaveLength(2);
  await expect(board.locator(".code-place")).toHaveCount(steps.length);
  await board.locator(`[data-arrow=${wrongWay(steps[0])}]`).click();
  await expect(board.locator(".code-place")).toHaveCount(steps.length - 1);
  await board.locator("[data-go=run]").click();
  // The wrong plan is walked, and the arrow it went wrong at is marked.
  await expect(board).toHaveAttribute("data-again", "true", { timeout: 5000 });
  await expect(board).toHaveAttribute("data-wrong-at", "0");
  await expect(board.locator('.code-chip[data-queued="0"]')).toHaveAttribute("data-wrong", "true");
  await expect(board).toHaveAttribute("data-home", "false");
  // Tapping the arrow takes it off the plan.
  await board.locator('[data-queued="0"]').click();
  await expect(board.locator(".code-place")).toHaveCount(steps.length);
  await expect(board).toHaveAttribute("data-again", "false");
  for (const dir of steps) await board.locator(`[data-arrow=${dir}]`).click();
  await board.locator("[data-go=run]").click();
  // The arrow being walked is lit while the animal takes that step.
  await expect(board.locator(".code-chip[data-on=true]")).toHaveCount(1);

  await onRound(board, 3);
  await runPath(board);

  // Last, a plan whose start is given: the child reads the two endings and picks the one that gets
  // home, then watches it run.
  await onRound(board, 4);
  await expect(board).toHaveAttribute("data-mode", "predict");
  await expect(board.locator(".code-chip[data-given=true]")).toHaveCount(1);
  await expect(board.locator(".pick[data-choice]")).toHaveCount(2);
  await expect(board.locator("[data-arrow]")).toHaveCount(0);
  const tail = ((await board.getAttribute("data-path")) ?? "").split(",").slice(1).join(",");
  const wrongEnding = board.locator(`.pick[data-choice]:not(:has([data-ending="${tail}"]))`).first();
  await wrongEnding.click();
  await expect(wrongEnding).toHaveAttribute("data-chosen", "true");
  await expect(board.locator(".code-chip")).toHaveCount(3);
  await board.locator("[data-go=run]").click();
  // The wrong ending is walked to where it goes wrong, like any plan, and the arrow is marked.
  await expect(board).toHaveAttribute("data-again", "true", { timeout: 5000 });
  const wrongAt = Number(await board.getAttribute("data-wrong-at"));
  expect(wrongAt).toBeGreaterThanOrEqual(1);
  await expect(board.locator(`.code-chip[data-queued="${wrongAt}"]`)).toHaveAttribute("data-wrong", "true");
  await solvePredict(board);
  // The last round done, the kit's ending plays and the star is given.
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1", { timeout: 10_000 });
  await expect(page.locator("[data-game=home]")).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator("[data-step=letter]")).not.toHaveClass(/is-done/);
});

test("a wrong plan is walked as far as the wrong arrow, and a short one stops short, with a word about each", async ({ page }) => {
  await installAudioSpy(page);
  await install(page, older, { quick: true });
  await openCoding(page);
  await page.locator("[data-game-tile=bird]").click();
  const board = page.locator(".game-frame[data-screen=bird]");
  await expect(board).toHaveAttribute("data-mode", "plan");
  const steps = ((await board.getAttribute("data-path")) ?? "").split(",").filter(Boolean);
  const start = { x: Number(await board.getAttribute("data-x")), y: Number(await board.getAttribute("data-y")) };

  // One right step, then a step the wrong way: the animal takes both, stops on the second cell, and
  // that arrow is the one marked. Then it walks back to the start.
  await board.locator(`[data-arrow=${steps[0]}]`).click();
  const back = wrongWay(steps[0]);
  await board.locator(`[data-arrow=${back}]`).click();
  await board.locator("[data-go=run]").click();
  await expect(board).toHaveAttribute("data-wrong-at", "1", { timeout: 5000 });
  await expect(board).toHaveAttribute("data-wrong-why", "away");
  // Straight back the way it came: it is standing on the start again when it stops.
  await expect(board).toHaveAttribute("data-x", String(start.x));
  await expect(board).toHaveAttribute("data-y", String(start.y));
  await expect(board.locator('.code-chip[data-queued="1"]')).toHaveAttribute("data-wrong", "true");
  await expect(board.locator('.code-chip[data-queued="0"]')).toHaveAttribute("data-wrong", "false");
  await expect.poll(() => spokenLines(page)).toContain("that way goes away from the nest.");

  // Take the wrong arrow off, finish the plan one step short: the next place is pointed out.
  await board.locator('[data-queued="1"]').click();
  for (const dir of steps.slice(1, -1)) await board.locator(`[data-arrow=${dir}]`).click();
  await board.locator("[data-go=run]").click();
  await expect(board).toHaveAttribute("data-wrong-why", "short", { timeout: 5000 });
  await expect(board).toHaveAttribute("data-wrong-at", String(steps.length - 1));
  await expect(board.locator(`.code-place[data-place="${steps.length - 1}"]`)).toHaveAttribute("data-next", "true");
  await expect.poll(() => spokenLines(page)).toContain("not home yet. add one more arrow.");
  // The plan is kept: the last arrow is all it needs.
  await board.locator(`[data-arrow=${steps[steps.length - 1]}]`).click();
  await board.locator("[data-go=run]").click();
  // Asked for, not heard through: under the quick setting the next round opens before the line is done.
  await expect.poll(() => requestedCues(page), { timeout: 10_000 }).toContain("prompts/code-home.mp3");
  await onRound(board, 1);
});

test("picture patterns continue AB, then ABB, then ABC, with real pictures", async ({ page }, testInfo) => {
  await install(page);
  await openCoding(page);
  await page.locator("[data-game-tile=pattern]").click();
  const board = page.locator("[data-game=pattern] .game-board");
  await expect(board).toHaveAttribute("data-rule", "AB");
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/code_pattern.png" });
  }
  // Every picture in the row and in the choices is a drawing with a size a child can see.
  for (const picture of await board.locator(".pattern-choice .art").all()) {
    const box = await picture.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(72);
  }
  const answer = (await board.getAttribute("data-answer")) ?? "";
  const wrong = await board.locator(`.pattern-choice:not([data-choice=${answer}])`).first().getAttribute("data-choice");
  await board.locator(`[data-choice=${wrong}]`).click();
  await expect(board.locator(`[data-choice=${wrong}]`)).toHaveAttribute("data-wiggle", "true");
  await expect(board).toHaveAttribute("data-solved", "0");
  for (const [index, rule] of ["AB", "ABB", "ABC"].entries()) {
    await expect(board).toHaveAttribute("data-rule", rule);
    await expect(board).toHaveAttribute("data-solved", String(index));
    const next = (await board.getAttribute("data-answer")) ?? "";
    await board.locator(`[data-choice=${next}]`).click();
    // The answer drops into the row before the next pattern comes.
    await expect(board.locator(`.pattern-missing [data-art=${next}]`)).toBeVisible();
    await expect(board).toHaveAttribute("data-solved", String(index + 1));
  }
  await board.locator("[data-finish=pattern]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
});

test("pictures go in the order they happen, by tap or by drag, and a wrong one wiggles", async ({ page }, testInfo) => {
  await install(page);
  await openCoding(page);
  await page.locator("[data-game-tile=morning]").click();
  const board = page.locator("[data-game=morning] .game-board");
  await expect(page.getByRole("heading", { name: "First, then" })).toBeVisible();
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/code_order.png" });
  }
  for (let round = 0; round < 2; round += 1) {
    await expect(board).toHaveAttribute("data-rounds", String(round));
    await expect(board).toHaveAttribute("data-sorted", "0");
    const order = ((await board.getAttribute("data-order")) ?? "").split(",");
    expect(order).toHaveLength(3);
    // The cards are dealt out of order.
    const dealt = await board.locator(".order-card").evaluateAll((cards) => cards.map((card) => card.getAttribute("data-card")));
    expect(dealt).not.toEqual(order);
    await board.locator(`[data-card=${order[2]}]`).click();
    await expect(board.locator(`[data-card=${order[2]}]`)).toHaveAttribute("data-wiggle", "true");
    await expect(board).toHaveAttribute("data-sorted", "0");
    await board.locator(`[data-card=${order[0]}]`).click();
    await expect(board).toHaveAttribute("data-placed", order[0]);
    await board.locator(`[data-card=${order[1]}]`).dragTo(board.locator("[data-slot='1']"));
    await expect(board).toHaveAttribute("data-placed", `${order[0]},${order[1]}`);
    await board.locator(`[data-card=${order[2]}]`).click();
  }
  await expect(board).toHaveAttribute("data-rounds", "2");
  await board.locator("[data-finish=morning]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
});

test("First, then can be played from a keyboard, with no pointer at all", async ({ page }) => {
  await install(page);
  await openCoding(page);
  await page.locator("[data-game-tile=morning]").click();
  const board = page.locator("[data-game=morning] .game-board");
  for (let round = 0; round < 2; round += 1) {
    await expect(board).toHaveAttribute("data-rounds", String(round));
    await expect(board).toHaveAttribute("data-sorted", "0");
    const order = ((await board.getAttribute("data-order")) ?? "").split(",");
    expect(order).toHaveLength(3);
    // Focus and a key are what a hardware keyboard or a switch sends: only a click, no pointer.
    // The cards listened for the pointer alone, so no card could be placed. The wrong card
    // first: the keyboard gets the same wiggle a finger does, and nothing is placed.
    await board.locator(`[data-card=${order[1]}]`).focus();
    await page.keyboard.press("Enter");
    await expect(board.locator(`[data-card=${order[1]}]`)).toHaveAttribute("data-wiggle", "true");
    await expect(board).toHaveAttribute("data-sorted", "0");
    for (const [place, card] of order.entries()) {
      await board.locator(`[data-card=${card}]`).focus();
      await page.keyboard.press(place === 1 ? "Space" : "Enter");
      await expect(board).toHaveAttribute("data-placed", order.slice(0, place + 1).join(","));
    }
  }
  await expect(board).toHaveAttribute("data-rounds", "2");
  await board.locator("[data-finish=morning]").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
});

test("if it rains, an umbrella: each picture calls for one thing", async ({ page }, testInfo) => {
  await install(page);
  await openCoding(page);
  await page.locator("[data-game-tile=garden]").click();
  const board = page.locator("[data-game=garden] .game-board");
  await expect(page.getByRole("heading", { name: "If, then" })).toBeVisible();
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/code_rule.png" });
  }
  const pairs: Record<string, string> = { rain: "umbrella", sun: "hat", dark: "lamp", plant: "jug", dog: "bone" };
  for (let round = 0; round < 3; round += 1) {
    await expect(board).toHaveAttribute("data-round", String(round));
    const rule = (await board.getAttribute("data-rule")) ?? "";
    const need = (await board.getAttribute("data-need")) ?? "";
    expect(pairs[rule]).toBe(need);
    await expect(board.locator(".pattern-choice")).toHaveCount(3);
    const wrong = await board.locator(`.pattern-choice:not([data-choice=${need}])`).first().getAttribute("data-choice");
    await board.locator(`[data-choice=${wrong}]`).click();
    await expect(board.locator(`[data-choice=${wrong}]`)).toHaveAttribute("data-wiggle", "true");
    await expect(board).toHaveAttribute("data-answered", "false");
    await board.locator(`[data-choice=${need}]`).click();
    await expect(board).toHaveAttribute("data-answered", "true");
    await expect(board.locator(`.rule-then [data-art=${need}]`)).toBeVisible();
    if (round < 2) await board.locator("[data-next=garden]").click();
  }
  await board.locator("[data-finish=garden]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
});

test("a plan can be mended and run again straight away, and the animal does not jump back mid-walk", async ({ page }) => {
  await install(page, older, { quick: true });
  await openCoding(page);
  await page.locator("[data-game-tile=bird]").click();
  const board = page.locator(".game-frame[data-screen=bird]");
  const steps = ((await board.getAttribute("data-path")) ?? "").split(",").filter(Boolean);
  const start = `${await board.getAttribute("data-x")},${await board.getAttribute("data-y")}`;
  // One arrow short, Go, and the moment it stops: the last arrow and Go again, before the animal
  // has walked back. (A rest from the wrong run used to fire into the new one and snap the animal
  // to the start mid-walk.)
  for (const dir of steps.slice(0, -1)) await board.locator(`[data-arrow=${dir}]`).click();
  await board.locator("[data-go=run]").click();
  await expect(board).toHaveAttribute("data-wrong-why", "short", { timeout: 5000 });
  await board.locator(`[data-arrow=${steps[steps.length - 1]}]`).click();
  // Mending the plan brings the animal home to the start at once.
  await expect(board).toHaveAttribute("data-x", start.split(",")[0]);
  await expect(board).toHaveAttribute("data-y", start.split(",")[1]);
  await board.locator("[data-go=run]").click();
  // The tile the animal leaves is marked, the start tile first.
  await expect(board.locator(`[data-cell="${start.replace(",", "-")}"]`)).toHaveAttribute("data-walked", "true");
  // Watch the walk: once the animal has left the start, it does not come back to it before the next round.
  const seen: string[] = [];
  await expect
    .poll(
      async () => {
        if ((await board.getAttribute("data-round")) !== "0") return "next";
        seen.push(`${await board.getAttribute("data-x")},${await board.getAttribute("data-y")}`);
        return "walking";
      },
      { timeout: 10_000, intervals: [40] },
    )
    .toBe("next");
  const left = seen.findIndex((cell) => cell !== start);
  expect(left).toBeGreaterThanOrEqual(0);
  expect(seen.slice(left)).not.toContain(start);
});

test("a plan has exactly one place for each step home, on one line, on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await install(page, older, { quick: true });
  await openCoding(page);
  await page.locator("[data-game-tile=bird]").click();
  const board = page.locator(".game-frame[data-screen=bird]");
  // The second plan of ages 5 to 7 has five steps.
  await runPath(board);
  await onRound(board, 1);
  const steps = ((await board.getAttribute("data-path")) ?? "").split(",").filter(Boolean);
  expect(steps).toHaveLength(5);
  for (const dir of steps) await board.locator(`[data-arrow=${dir}]`).click();
  // A sixth arrow has nowhere to go: Go wiggles (it is what is left to press) and the plan is unchanged.
  await board.locator(`[data-arrow=${steps[0]}]`).click();
  await expect(board.locator("[data-go=run]")).toHaveAttribute("data-wiggle", /^(a|b)$/);
  await expect(board.locator(".code-chip")).toHaveCount(5);
  const tops = await board.locator(".code-chip").evaluateAll((chips) => chips.map((chip) => Math.round(chip.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1);
  // Go is on the screen with the plan and the arrows, not below them.
  const go = await board.locator("[data-go=run]").boundingBox();
  expect(go).not.toBeNull();
  expect(go!.y + go!.height).toBeLessThanOrEqual(667 + 24);
  const scene = await board.locator(".game-scene").boundingBox();
  expect(scene!.y).toBeGreaterThanOrEqual(0);
});

test("with reduced motion the animal still walks a step at a time", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await install(page, older, { quick: true });
  await openCoding(page);
  await page.locator("[data-game-tile=bird]").click();
  const board = page.locator(".game-frame[data-screen=bird]");
  const steps = ((await board.getAttribute("data-path")) ?? "").split(",").filter(Boolean);
  for (const dir of steps) await board.locator(`[data-arrow=${dir}]`).click();
  await board.locator("[data-go=run]").click();
  // The lit arrow is there to be seen: the walk is not over in an instant.
  await expect(board.locator(".code-chip[data-on=true]")).toHaveCount(1);
  await expect(board).toHaveAttribute("data-running", "true");
});

test("Go with nothing planned says the instruction, and in the bug round the other arrows are misses", async ({ page }) => {
  test.slow();
  await installAudioSpy(page);
  await install(page, older, { quick: true });
  await openCoding(page);
  await page.locator("[data-game-tile=bird]").click();
  const board = page.locator(".game-frame[data-screen=bird]");
  await board.locator("[data-go=run]").click();
  await expect(board.locator("[data-go=run]")).toHaveAttribute("data-wiggle", /^(a|b)$/);
  await expect.poll(() => spokenLines(page)).toContain("line up the arrows, then press go.");
  await expect(board).toHaveAttribute("data-misses", "1");
  // On to the bug round.
  for (let round = 0; round < 5; round += 1) {
    if ((await board.getAttribute("data-mode")) === "predict") await solvePredict(board);
    else await runPath(board);
    await onRound(board, round + 1);
  }
  await expect(board).toHaveAttribute("data-mode", "bug");
  // The wrong arrow is not named as wrong before a run has found it.
  await expect(board.locator(".code-chip[aria-label*=wrong]")).toHaveCount(0);
  const kind = await board.getAttribute("data-bug-kind");
  if (kind === "missing") {
    // An empty place in the plan: Go does not run a plan with a hole in it, it points at the hole.
    await expect(board.locator(".code-place[data-gap=true]")).toHaveCount(1);
    await board.locator("[data-go=run]").click();
    await expect(board.locator("[data-go=run]")).toHaveAttribute("data-wiggle", /^(a|b)$/);
    await expect(board.locator(".code-place[data-gap=true]")).toHaveAttribute("data-next", "true");
    await expect.poll(() => spokenLines(page)).toContain("one arrow is missing. fill the empty place, then press go.");
    await expect(board).toHaveAttribute("data-misses", "1");
  } else {
    // Every place has an arrow: an arrow key wiggles Go, and a tapped arrow comes off (one too many)
    // or leaves an empty place (one wrong), with no miss counted for trying.
    await board.locator("[data-arrow=up]").click();
    await expect(board.locator("[data-go=run]")).toHaveAttribute("data-wiggle", /^(a|b)$/);
    const chips = await board.locator(".code-chip").count();
    await board.locator(".code-chip").first().click();
    if (kind === "extra") await expect(board.locator(".code-chip")).toHaveCount(chips - 1);
    else await expect(board.locator(".code-place[data-gap=true]")).toHaveCount(1);
    await expect(board).toHaveAttribute("data-misses", "0");
  }
  // Whatever was poked at, the plan can be mended from there.
  await mendPlan(board);
  await expect(board.locator(".code-place[data-gap=true]")).toHaveCount(0);
});

test("ages 5 to 7 plan longer paths, repeat a move, and fix one wrong arrow", async ({ page }, testInfo) => {
  test.slow();
  await install(page, older, { quick: true });
  await openCoding(page);
  await page.locator("[data-game-tile=bird]").click();
  const board = page.locator(".game-frame[data-screen=bird]");
  await expect(board).toHaveAttribute("data-level", "later");
  await expect(board).toHaveAttribute("data-rounds", "6");
  for (const length of [4, 5, 6]) {
    await expect(board).toHaveAttribute("data-mode", "plan");
    const steps = ((await board.getAttribute("data-path")) ?? "").split(",").filter(Boolean);
    expect(steps).toHaveLength(length);
    // Every place on one line, six included.
    const tops = await board.locator(".code-place").evaluateAll((places) => places.map((place) => Math.round(place.getBoundingClientRect().top)));
    expect(tops).toHaveLength(length);
    expect(new Set(tops).size).toBe(1);
    // Big enough for a finger: 64px, or as near as six of them fit on a phone.
    const box = await board.locator(".code-place").first().boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(length === 6 ? 50 : 64);
    await runPath(board);
    await onRound(board, length - 3);
  }
  // Three endings to read, for a five-step plan with two given.
  await expect(board).toHaveAttribute("data-mode", "predict");
  await expect(board.locator(".code-chip[data-given=true]")).toHaveCount(2);
  await expect(board.locator(".pick[data-choice]")).toHaveCount(3);
  await solvePredict(board);
  await onRound(board, 4);
  await expect(board).toHaveAttribute("data-mode", "loop");
  await expect(board).toHaveAttribute("data-repeat", "3");
  await expect(board.locator(".code-loop")).toHaveText("× 3");
  await runPath(board);
  await onRound(board, 5);
  await expect(board).toHaveAttribute("data-mode", "bug");
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/code_bug.png" });
  }
  await board.locator("[data-go=run]").click();
  await expect(board).toHaveAttribute("data-again", "true", { timeout: 5000 });
  await expect(board).toHaveAttribute("data-home", "false");
  if ((await board.getAttribute("data-bug-kind")) === "missing") {
    // The empty place is pointed at: a plan with a hole is not run.
    await expect(board.locator(".code-place[data-gap=true]")).toHaveAttribute("data-next", "true");
  } else {
    // The plan is walked up to the wrong (or extra) arrow, which is the one that is marked.
    await expect(board.locator("[data-bug=true]")).toHaveAttribute("data-wrong", "true");
  }
  await mendPlan(board);
  await expect(board).toHaveAttribute("data-again", "false");
  await board.locator("[data-go=run]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1", { timeout: 10_000 });
});

/**
 * Plays a known later-level game through to its bug round (the sixth), quick. Six rounds take a
 * while even so: a test that starts here is marked slow (three times the usual limit).
 */
async function toBugRound(page: Page, salt: number) {
  await install(page, older, { quick: true, salt });
  await openCoding(page);
  await page.locator("[data-game-tile=bird]").click();
  const board = page.locator(".game-frame[data-screen=bird]");
  for (let round = 0; round < 5; round += 1) {
    if ((await board.getAttribute("data-mode")) === "predict") await solvePredict(board);
    else await runPath(board);
    await onRound(board, round + 1);
  }
  await expect(board).toHaveAttribute("data-mode", "bug");
  return board;
}

// Three kinds of bug, each a known board (the salt pins the play). The child reads the line, runs
// the plan to see where it goes wrong, and mends it with one change.
test("fix it: one arrow too many comes off when tapped", async ({ page }) => {
  test.slow();
  await installAudioSpy(page);
  const board = await toBugRound(page, 1);
  await expect(board).toHaveAttribute("data-bug-kind", "extra");
  // up,left,down,left,up for a path of up,left,left,up: five arrows in five places, no hole.
  await expect(board.locator(".code-chip")).toHaveCount(5);
  await expect(board.locator(".code-place")).toHaveCount(0);
  await board.locator("[data-go=run]").click();
  await expect(board).toHaveAttribute("data-again", "true", { timeout: 5000 });
  // Walked as far as the extra arrow (down, after up and left: a step away from the nest).
  await expect(board).toHaveAttribute("data-wrong-at", "2");
  await expect(board.locator(".code-chip").nth(2)).toHaveAttribute("aria-label", "down, wrong");
  // A double tap: the first takes the arrow off, the row closes up, and the arrow that was next to
  // it is under the finger for the second, which is let go, so the mended plan stays mended.
  await board.locator(".code-chip").nth(2).dblclick();
  await expect(board.locator(".code-chip")).toHaveCount(4);
  await expect(board.locator(".code-place[data-gap=true]")).toHaveCount(0);
  await expect(board).toHaveAttribute("data-fixed", "true");
  await expect(board).toHaveAttribute("data-again", "false");
  // The line follows the plan: mended, the speaker says to press go, not to tap an arrow off.
  await board.locator("[data-hear=true]").click();
  await expect.poll(() => spokenLines(page)).toContain("now press go.");
  await board.locator("[data-go=run]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1", { timeout: 10_000 });
});

test("fix it: a missing arrow has an empty place, which Go points at and an arrow fills", async ({ page }) => {
  test.slow();
  await installAudioSpy(page);
  const board = await toBugRound(page, 3);
  await expect(board).toHaveAttribute("data-bug-kind", "missing");
  // up,_,right,right for a path of up,up,right,right: the hole is the second place, and the arrow
  // keys are there to fill it.
  const gap = board.locator(".code-place[data-gap=true]");
  await expect(gap).toHaveCount(1);
  await expect(gap).toHaveAttribute("data-place", "1");
  await expect(board.locator("[data-arrow]")).toHaveCount(4);
  // A tap on the hole: a miss, with the line that says what goes there. Then Go, twice: it does not
  // run a plan with a hole, the hole breathes (anew each time) and the line is said, once each time
  // (the instruction from the second miss is the same line, so not twice over). Three misses, and
  // the hand comes to the arrow that goes there.
  const missing = "one arrow is missing. fill the empty place, then press go.";
  await gap.click();
  await expect(gap).toHaveAttribute("data-wiggle", /^(a|b)$/);
  await expect(board).toHaveAttribute("data-misses", "1");
  await board.locator("[data-go=run]").click();
  await expect(board).toHaveAttribute("data-misses", "2");
  await expect(gap).toHaveAttribute("data-next", "true");
  const pulse = await gap.getAttribute("data-pulse");
  await board.locator("[data-go=run]").click();
  await expect(board).toHaveAttribute("data-misses", "3");
  await expect(gap).not.toHaveAttribute("data-pulse", pulse ?? "");
  // Four: the round opened with it, then the three misses (six, were the instruction said twice over).
  await expect.poll(async () => (await spokenLines(page)).filter((said) => said === missing)).toHaveLength(4);
  await expect(board.locator("[data-arrow=up] .game-hand")).toBeVisible();
  // The wrong arrow in the hole: the plan runs and goes wrong there; tapped, the hole is back.
  await board.locator("[data-arrow=left]").click();
  await expect(board.locator(".code-chip")).toHaveCount(4);
  await board.locator("[data-go=run]").click();
  await expect(board).toHaveAttribute("data-again", "true", { timeout: 5000 });
  await expect(board).toHaveAttribute("data-wrong-at", "1");
  await board.locator(".code-chip").nth(1).click();
  await expect(gap).toHaveCount(1);
  await board.locator("[data-arrow=up]").click();
  await expect(board).toHaveAttribute("data-fixed", "true");
  await board.locator("[data-go=run]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1", { timeout: 10_000 });
});

test("fix it: a wrong arrow is tapped off, leaving its place for the right one", async ({ page }) => {
  test.slow();
  const board = await toBugRound(page, 5);
  await expect(board).toHaveAttribute("data-bug-kind", "turn");
  // left,right,left,left for a path of left,up,left,left.
  await expect(board.locator(".code-chip")).toHaveCount(4);
  await expect(board.locator(".code-chip[data-bug=true]")).toHaveAttribute("data-dir", "right");
  // An arrow key with every place full: Go wiggles, nothing is added.
  await board.locator("[data-arrow=up]").click();
  await expect(board.locator("[data-go=run]")).toHaveAttribute("data-wiggle", /^(a|b)$/);
  await expect(board.locator(".code-chip")).toHaveCount(4);
  await board.locator("[data-go=run]").click();
  await expect(board).toHaveAttribute("data-again", "true", { timeout: 5000 });
  await expect(board).toHaveAttribute("data-wrong-at", "1");
  await expect(board.locator(".code-chip").nth(1)).toHaveAttribute("data-wrong", "true");
  await board.locator(".code-chip").nth(1).click();
  const gap = board.locator(".code-place[data-gap=true]");
  await expect(gap).toHaveAttribute("data-place", "1");
  await expect(gap).toHaveAttribute("aria-label", "place 2, empty");
  await expect(board.locator(".code-chip")).toHaveCount(3);
  // Still four places on the row: the hole holds its place.
  await expect(board.locator(".code-queue > *")).toHaveCount(4);
  // A second hole (the last arrow tapped off too): the one just made is the one an arrow key fills,
  // and is marked so. A tap on the other chooses it instead (no miss).
  await board.locator(".code-chip").last().click();
  await expect(gap).toHaveCount(2);
  await expect(board.locator(".code-place[data-target=true]")).toHaveAttribute("data-place", "3");
  await gap.first().click();
  await expect(board.locator(".code-place[data-target=true]")).toHaveAttribute("data-place", "1");
  await expect(gap.first()).toHaveAttribute("aria-label", "place 2, empty, the arrow goes here");
  await expect(board).toHaveAttribute("data-misses", "1");
  // Go three times (the wrong run was the first miss): the chosen hole is the one pointed at, and
  // the hand sits in it, on the arrow that goes there.
  for (let miss = 2; miss <= 4; miss += 1) {
    await board.locator("[data-go=run]").click();
    await expect(board).toHaveAttribute("data-misses", String(miss));
  }
  await expect(gap.first()).toHaveAttribute("data-next", "true");
  await expect(board.locator(".code-place .game-hand")).toHaveCount(1);
  await expect(gap.first().locator(".game-hand")).toBeVisible();
  await expect(board.locator("[data-arrow=up] .game-hand")).toBeVisible();
  await board.locator("[data-arrow=up]").click();
  await expect(gap).toHaveCount(1);
  await expect(board.locator(".code-place[data-target=true]")).toHaveCount(0);
  await expect(board.locator("[data-arrow=left] .game-hand")).toBeVisible();
  await board.locator("[data-arrow=left]").click();
  await expect(gap).toHaveCount(0);
  await expect(board).toHaveAttribute("data-fixed", "true");
  await board.locator("[data-go=run]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1", { timeout: 10_000 });
});

/**
 * Watches the board for the order of things as a plan runs: an arrow lighting (`on:<place>@<x>,<y>`,
 * with where the animal stands as it lights), the animal moving (`at:<x>,<y>`), and its movement
 * (`move:<hop|bump>`), as they happen on the page. (The page is read when it changes, not the
 * change records, so the cell noted with a lit arrow is the one the animal is on in that very
 * frame: an arrow that lit in the same frame as its move would be noted on the next cell.)
 */
async function watchWalk(board: Locator) {
  await board.evaluate((frame) => {
    const log: string[] = [];
    (window as Window & { __walk?: string[] }).__walk = log;
    const seen = { on: "", at: "", move: "", face: "" };
    const round = frame.getAttribute("data-round");
    const note = () => {
      // This round's walk only: the next round opens with its own animal, facing its own way.
      if (frame.getAttribute("data-round") !== round) return;
      const on = frame.querySelector(".code-chip[data-on=true]")?.getAttribute("data-queued") ?? "";
      const at = `${frame.getAttribute("data-x")},${frame.getAttribute("data-y")}`;
      const move = frame.getAttribute("data-move") ?? "none";
      const face = frame.getAttribute("data-facing") ?? "";
      if (on !== seen.on && on !== "") log.push(`on:${on}@${at}`);
      if (at !== seen.at) log.push(`at:${at}`);
      // (A hop after a hop has the other name, a/b, so it counts.)
      if (move !== seen.move && move !== "none") log.push(`move:${move.split("-")[0]}`);
      if (face !== seen.face) log.push(`face:${face}`);
      Object.assign(seen, { on, at, move, face });
    };
    note();
    new MutationObserver(note).observe(frame, { attributes: true, subtree: true });
  });
}

async function walkLog(board: Locator): Promise<string[]> {
  return board.evaluate(() => (window as Window & { __walk?: string[] }).__walk ?? []);
}

test("the walk is one hop per step: the arrow lights first, then the animal hops; it faces the way it goes, and bumps at an edge", async ({ page }) => {
  // A known play: its third board is walked right then down (so the animal turns to face right),
  // and its fourth starts in a corner, so one arrow is a step off the board.
  await install(page, profile, { quick: true, salt: 4 });
  await openCoding(page);
  await page.locator("[data-game-tile=bird]").click();
  const board = page.locator(".game-frame[data-screen=bird]");
  // Round 3 is the first plan round at ages 3–4.
  for (let round = 0; round < 2; round += 1) {
    await runPath(board);
    await onRound(board, round + 1);
  }
  await expect(board).toHaveAttribute("data-mode", "plan");
  // Not the last round, not a mended plan: the ordinary cheer.
  await expect(board).toHaveAttribute("data-cheer", "small");
  const path = ((await board.getAttribute("data-path")) ?? "").split(",");
  for (const dir of path) await board.locator(`[data-arrow=${dir}]`).click();
  await watchWalk(board);
  const start = `${await board.getAttribute("data-x")},${await board.getAttribute("data-y")}`;
  await board.locator("[data-go=run]").click();
  await expect.poll(() => walkLog(board).then((log) => log.filter((it) => it.startsWith("at:")).length), { timeout: 10_000 }).toBe(path.length + 1);
  const log = await walkLog(board);
  // Each arrow lights while the animal still stands on the cell before the step it makes, and the
  // move comes after; every move is a hop; the moves are the path's steps.
  const moves = log.filter((it) => it.startsWith("at:"));
  expect(moves[0]).toBe(`at:${start}`);
  for (let step = 0; step < path.length; step += 1) {
    const lit = log.indexOf(`on:${step}@${moves[step].slice(3)}`);
    const moved = log.indexOf(moves[step + 1]);
    expect(lit, `arrow ${step} lights on the cell before its step: ${log.join(" ")}`).toBeGreaterThanOrEqual(0);
    expect(lit).toBeLessThan(moved);
  }
  expect(log.filter((it) => it === "move:hop")).toHaveLength(path.length);
  expect(log).not.toContain("move:bump");
  // It faces the way it last went sideways (if it did), by the end of the walk (the next round may
  // have opened by now, with its own animal, so the log has it).
  const sideways = path.filter((dir) => dir === "left" || dir === "right");
  const faces = log.filter((it) => it.startsWith("face:"));
  if (sideways.length > 0) expect(faces[faces.length - 1]).toBe(`face:${sideways[sideways.length - 1]}`);
  await onRound(board, 3);
  // From the corner, one arrow off the board: the animal bumps (its own movement, not a hop) and
  // stays where it is, and that arrow is the wrong one.
  await expect(board).toHaveAttribute("data-mode", "plan");
  await expect(board).toHaveAttribute("data-x", "0");
  await expect(board).toHaveAttribute("data-y", "0");
  await board.locator("[data-arrow=left]").click();
  await watchWalk(board);
  await board.locator("[data-go=run]").click();
  await expect(board).toHaveAttribute("data-wrong-why", "off", { timeout: 5000 });
  await expect(board).toHaveAttribute("data-wrong-at", "0");
  await expect(board).toHaveAttribute("data-x", "0");
  await expect(board).toHaveAttribute("data-y", "0");
  // (The bump lasts a moment, so the page's own note of it is what is checked.)
  const bumped = await walkLog(board);
  expect(bumped).toContain("move:bump");
  expect(bumped).not.toContain("move:hop");
  expect(bumped.filter((it) => it.startsWith("at:"))).toEqual(["at:0,0"]);
});

test("home is a cheer on the face, a bigger one for a mended plan and the last round", async ({ page }) => {
  test.slow();
  const board = await toBugRound(page, 1);
  await expect(board).toHaveAttribute("data-cheer", "big");
  await mendPlan(board);
  // Home lasts only a moment under the quick setting, so the page itself notes the cheer as it happens.
  await board.evaluate((frame) => {
    const seen: string[] = [];
    (window as Window & { __cheer?: string[] }).__cheer = seen;
    new MutationObserver(() => {
      // The painted face shows its cheer frame when it has one, its idle frame otherwise (data-frame); the mood is on both.
      if (frame.querySelector(".code-pet[data-mood=cheer] .avatar-art[data-mood=cheer]")) seen.push("cheer");
    }).observe(frame, { attributes: true, subtree: true });
  });
  await board.locator("[data-go=run]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1", { timeout: 10_000 });
  // (The game has closed by now: the note is read from the window, not the board.)
  expect(await page.evaluate(() => (window as Window & { __cheer?: string[] }).__cheer ?? [])).toContain("cheer");
});

/**
 * What moves on the page right now: the tag and classes of each element with a running animation
 * or transition, marked "pet" when it is part of the coding animal.
 */
async function moving(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter((animation) => animation.playState === "running")
      .map((animation) => {
        const target = (animation.effect as KeyframeEffect | null)?.target as Element | null;
        if (!target) return "?";
        return `${target.closest(".code-pet") ? "pet " : ""}${target.tagName.toLowerCase()}.${[...target.classList].join(".")}`;
      }),
  );
}

for (const [name, setup] of [
  ["reduced motion", { reduced: true, calm: false }],
  ["calm mode", { reduced: false, calm: true }],
] as const) {
  test(`with ${name} the scene is still and the animal glides tile to tile, no hop, no blink, no glow`, async ({ page }) => {
    if (setup.reduced) await page.emulateMedia({ reducedMotion: "reduce" });
    await install(page, profile, { quick: true, salt: 4, calm: setup.calm });
    await openCoding(page);
    await page.locator("[data-game-tile=bird]").click();
    const board = page.locator(".game-frame[data-screen=bird]");
    if (setup.calm) await expect(page.locator(".app")).toHaveAttribute("data-calm", "true");
    // Nothing runs on its own: no scene drift, no blink, no breath.
    await page.waitForTimeout(300);
    expect(await moving(page)).toEqual([]);
    // The glide between tiles keeps a step's time (the quick setting's 160 ms step, less the 20 ms
    // the arrow has first), not the near-nothing every other transition gets; it is the one
    // movement left, and it is seen to happen: the page notes how long the glide took.
    const pet = board.locator(".code-pet");
    expect(await pet.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0.14s");
    await pet.evaluate((el) => {
      el.addEventListener("transitionend", (event) => {
        // (Its own glide: a face fading inside it ends a transition too, and that one bubbles.)
        if (event.target !== el || (event as TransitionEvent).propertyName !== "transform") return;
        (window as Window & { __glide?: number }).__glide = (event as TransitionEvent).elapsedTime;
      });
    });
    await board.locator(`[data-arrow=${((await board.getAttribute("data-path")) ?? "").split(",")[0]}]`).click();
    await expect.poll(() => page.evaluate(() => (window as Window & { __glide?: number }).__glide ?? null)).toBeCloseTo(0.14, 2);
  });
}

test("the scene moves a little on its own, and the animal breathes and blinks", async ({ page }) => {
  await install(page, profile, { quick: true, salt: 4 });
  await openCoding(page);
  await page.locator("[data-game-tile=bird]").click();
  const board = page.locator(".game-frame[data-screen=bird]");
  await expect(board).toHaveAttribute("data-mode", "tap");
  const now = await moving(page);
  expect(now.some((it) => it.startsWith("g.scene-") || it.startsWith("circle.scene-") || it.startsWith("path.scene-"))).toBe(true);
  expect(now).toContain("pet span.game-host-body");
  // The painted animal blinks by showing its closed eyes for a moment.
  expect(now).toContain("pet img.avatar-blink");
});

test("no two plays are alike: the boards turn and the pictures change", async ({ page }) => {
  await install(page);
  await openCoding(page);
  const seen = new Set<string>();
  for (let play = 0; play < 6; play += 1) {
    await page.locator("[data-game-tile=pattern]").click();
    const board = page.locator("[data-game=pattern] .game-board");
    const row = await board.locator(".pattern-token [data-art]").evaluateAll((pictures) => pictures.map((picture) => picture.getAttribute("data-art")).join(","));
    seen.add(row);
    await page.getByRole("button", { name: "All coding" }).click();
  }
  expect(seen.size).toBeGreaterThan(2);
});
