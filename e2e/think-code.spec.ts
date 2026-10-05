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

async function install(page: Page, saved: unknown = profile, options: { quick?: boolean } = {}) {
  await page.addInitScript(
    ({ saved, quick }) => {
      localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
      localStorage.removeItem("kids-app-silent-hint-v1");
      // No wait for the praise between rounds (a development-build switch, see e2e/kit.ts).
      if (quick) localStorage.setItem("littlenest-quick-rounds", "1");
    },
    { saved, quick: options.quick ?? false },
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
  await expect(board).toHaveAttribute("data-rounds", "4");
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
  await runPath(board);

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
  await expect(board.locator("[data-go=run]")).toHaveAttribute("data-wiggle", "true");
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
  await installAudioSpy(page);
  await install(page, older, { quick: true });
  await openCoding(page);
  await page.locator("[data-game-tile=bird]").click();
  const board = page.locator(".game-frame[data-screen=bird]");
  await board.locator("[data-go=run]").click();
  await expect(board.locator("[data-go=run]")).toHaveAttribute("data-wiggle", "true");
  await expect.poll(() => spokenLines(page)).toContain("line up the arrows, then press go.");
  await expect(board).toHaveAttribute("data-misses", "1");
  // On to the bug round.
  for (let round = 0; round < 4; round += 1) {
    await runPath(board);
    await onRound(board, round + 1);
  }
  await expect(board).toHaveAttribute("data-mode", "bug");
  // The wrong arrow is not named as wrong before it has been found.
  await expect(board.locator("[data-bug=true]")).not.toHaveAttribute("aria-label", /wrong/i);
  const other = board.locator(".code-chip[data-bug=false]").first();
  await other.click();
  await expect(other).toHaveAttribute("data-wiggle", /^(a|b)$/);
  await expect(board).toHaveAttribute("data-misses", "1");
  await board.locator("[data-bug=true]").click();
  await expect(board).toHaveAttribute("data-fixed", "true");
  await expect(board.locator("[data-bug=true]")).toHaveAttribute("aria-label", /mended/);
});

test("ages 5 to 7 plan longer paths, repeat a move, and fix one wrong arrow", async ({ page }, testInfo) => {
  await install(page, older, { quick: true });
  await openCoding(page);
  await page.locator("[data-game-tile=bird]").click();
  const board = page.locator(".game-frame[data-screen=bird]");
  await expect(board).toHaveAttribute("data-level", "later");
  await expect(board).toHaveAttribute("data-rounds", "5");
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
  await expect(board).toHaveAttribute("data-mode", "loop");
  await expect(board).toHaveAttribute("data-repeat", "3");
  await expect(board.locator(".code-loop")).toHaveText("× 3");
  await runPath(board);
  await onRound(board, 4);
  await expect(board).toHaveAttribute("data-mode", "bug");
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/code_bug.png" });
  }
  await board.locator("[data-go=run]").click();
  // The plan is walked up to the wrong arrow, which is the one that is marked.
  await expect(board).toHaveAttribute("data-again", "true", { timeout: 5000 });
  await expect(board).toHaveAttribute("data-home", "false");
  await expect(board.locator("[data-bug=true]")).toHaveAttribute("data-wrong", "true");
  await board.locator("[data-bug=true]").click();
  await expect(board).toHaveAttribute("data-fixed", "true");
  await expect(board).toHaveAttribute("data-again", "false");
  await board.locator("[data-go=run]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1", { timeout: 10_000 });
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
