import { expect, test, type Locator, type Page } from "@playwright/test";
import { installAudioSpy, playedClips, playedEffects, spokenLines } from "./audioSpy";
import { createdThisWeek } from "./clock";
import { noting } from "./kit";

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

/** Open one Build It board, or Read the code, from the Coding page. */
async function install(page: Page, board: "hello" | "move" | "music" | "code", saved: unknown = profile, settings?: unknown) {
  await page.addInitScript((payload) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(payload.saved));
    localStorage.removeItem("kids-app-silent-hint-v1");
    if (!sessionStorage.getItem("build-test-started")) localStorage.removeItem("littlenest.section.games.build");
    sessionStorage.setItem("build-test-started", "1");
    if (payload.settings) localStorage.setItem("littlenest-settings-v1", JSON.stringify(payload.settings));
  }, { saved, settings });
  await page.goto("./");
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: "Mia" }).click();
  await page.locator("[data-course=code]").click();
  await expect(page.locator("[data-screen=games]")).toHaveAttribute("data-lobby", "code");
  await page.locator(board === "code" ? "[data-game-tile=code]" : `[data-game-tile=build-${board}]`).click();
  await expect(page.locator(`[data-build=${board}]`)).toBeVisible();
}

/** Build the program a Read the code round asks for, one block a line. */
async function buildCode(board: Locator): Promise<string[]> {
  const code = ((await board.getAttribute("data-code")) ?? "").split(",").filter(Boolean);
  for (const block of code) await board.locator(`[data-block=${block}]`).click();
  await expect(board).toHaveAttribute("data-script", code.join(","));
  return code;
}

test("hello world: one block, press play, and the animal says hello", async ({ page }, testInfo) => {
  await install(page, "hello", profile, { showCode: true });
  const board = page.locator("[data-build=hello]");
  await expect(page.getByRole("heading", { name: "Say hello" })).toBeVisible();
  // The first block on offer is hello, and nothing plays until it is there.
  await expect(board.locator(".build-block").first()).toHaveAttribute("data-block", "hello");
  await expect(board.locator("[data-play=run]")).toBeDisabled();
  await board.locator("[data-block=hello]").click();
  await expect(board).toHaveAttribute("data-said", "hello");
  // The program in words, and for a grown-up who turned it on, in Python.
  await expect(board.locator(".build-lines li")).toHaveText(["say hello"]);
  await expect(board.locator(".build-python")).toHaveText('print("Hello, world!")');
  await board.locator("[data-play=run]").click();
  await expect(board.locator(".build-stage")).toHaveAttribute("data-pose", "hello");
  await expect(board.locator("[data-says=hello]")).toHaveText("Hello!");
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/build_hello.png" });
  }
  await expect(board).toHaveAttribute("data-ran", "hello");
  await board.locator("[data-finish=hello]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
});

test("the hello board can be played from a keyboard, with no pointer at all", async ({ page }) => {
  await install(page, "hello");
  const board = page.locator("[data-build=hello]");
  await expect(board.locator("[data-play=run]")).toBeDisabled();
  // Focus and a key are what a hardware keyboard or a switch sends: no pointer-down and no
  // pointer-up, only a click. The blocks listened for the pointer alone, so nothing was added
  // and Play stayed disabled for good.
  await board.locator("[data-block=hello]").focus();
  await page.keyboard.press("Enter");
  await expect(board).toHaveAttribute("data-script", "hello");
  // Space presses a button too.
  await board.locator("[data-block=jump]").focus();
  await page.keyboard.press("Space");
  await expect(board).toHaveAttribute("data-script", "hello,jump");
  // A tap straight after still adds one block, not two.
  await board.locator("[data-block=hello]").click();
  await expect(board).toHaveAttribute("data-script", "hello,jump,hello");
  // Play and Done from the keyboard as well, through to the star.
  await board.locator("[data-play=run]").focus();
  await page.keyboard.press("Enter");
  await expect(board).toHaveAttribute("data-ran", "hello,jump,hello");
  await board.locator("[data-finish=hello]").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
});

test("the hello board is not done until the program says hello", async ({ page }) => {
  await install(page, "hello");
  const board = page.locator("[data-build=hello]");
  await board.locator("[data-block=jump]").click();
  await board.locator("[data-play=run]").click();
  await expect(board).toHaveAttribute("data-played", "true");
  await expect(board).toHaveAttribute("data-ran", "jump");
  await expect(board.locator("[data-finish=hello]")).toHaveCount(0);
  await board.locator("[data-block=hello]").click();
  await board.locator("[data-play=run]").click();
  await expect(board).toHaveAttribute("data-ran", "jump,hello");
  await expect(board.locator("[data-finish=hello]")).toBeVisible();
});

test("read the code: hello world first, then two more programs to build from words", async ({ page }, testInfo) => {
  // Three programs played through at a step's pace: within a slower runner's reach of the default.
  test.setTimeout(60_000);
  await install(page, "code");
  const board = page.locator("[data-build=code]");
  await expect(page.getByRole("heading", { name: "Read the code" })).toBeVisible();
  // Round one is always hello world.
  await expect(board).toHaveAttribute("data-round", "0");
  await expect(board).toHaveAttribute("data-code", "hello");
  await expect(board.locator("[data-code-line] .code-line-words")).toHaveText(["say hello"]);
  // Ages 3 to 4 get the block's picture beside its words.
  await expect(board.locator("[data-code-line] .code-line-art")).toHaveCount(1);
  // A wrong program plays, then the line that differs is marked and the child tries again.
  await board.locator("[data-block=jump]").click();
  await board.locator("[data-play=run]").click();
  await expect(board).toHaveAttribute("data-match", "false");
  await expect(board.locator("[data-code-line='0']")).toHaveAttribute("data-miss", "true");
  await expect(board.locator("[data-finish=code]")).toHaveCount(0);
  // The block sits beside the line it is for. One block a line: another tap adds nothing.
  await expect(board.locator("[data-code-line='0'] [data-index='0']")).toHaveAttribute("data-kind", "jump");
  await board.locator("[data-block=spin]").click();
  await expect(board).toHaveAttribute("data-script", "jump");
  await board.locator("[data-index='0']").click();
  await expect(board.locator("[data-code-line='0'] [data-place='0']")).toBeVisible();
  await buildCode(board);
  await expect(board.locator("[data-code-line='0']")).toHaveAttribute("data-ok", "true");
  await board.locator("[data-play=run]").click();
  await expect(board).toHaveAttribute("data-match", "true");
  await board.locator("[data-next=code]").click();
  // Two more, each a real program of two or three lines.
  for (const round of ["1", "2"]) {
    await expect(board).toHaveAttribute("data-round", round);
    const code = await buildCode(board);
    expect(code.length).toBeGreaterThanOrEqual(2);
    await expect(board.locator("[data-code-line]")).toHaveCount(code.length);
    if (round === "1" && testInfo.project.name === "chromium") {
      await board.screenshot({ path: "test-results/screenshots/build_read_code.png" });
    }
    await board.locator("[data-play=run]").click();
    await expect(board).toHaveAttribute("data-match", "true", { timeout: 15_000 });
    await board.locator("[data-finish=code]").click();
  }
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
  await expect(page.locator("[data-game=home]")).toBeVisible();
});

test("ages 5 to 7 read the code as words alone: hello, two steps, a repeat to work out, then the pond", async ({ page }, testInfo) => {
  // Four programs played through, the repeat and the pond among them: 30 s on WebKit's slowest runner.
  test.setTimeout(60_000);
  await install(page, "code", older);
  const board = page.locator("[data-build=code]");
  await expect(board).toHaveAttribute("data-level", "later");
  await expect(board.locator("[data-code-line] .code-line-art")).toHaveCount(0);
  const lines: string[][] = [];
  for (const round of ["0", "1", "2", "3"]) {
    await expect(board).toHaveAttribute("data-round", round);
    // Five blocks to choose between, the program's own among them.
    await expect(board.locator(".build-block")).toHaveCount(5);
    lines.push(await board.locator("[data-code-line] .code-line-words").allInnerTexts());
    await buildCode(board);
    await board.locator("[data-play=run]").click();
    await expect(board).toHaveAttribute("data-match", "true", { timeout: 15_000 });
    if (round === "3") {
      // The last program walks to the pond: the rule If, then taught, done on the stage.
      await expect(board).toHaveAttribute("data-splash", "true");
      await expect(board).toHaveAttribute("data-steps", "3");
      if (testInfo.project.name === "chromium") await board.screenshot({ path: "test-results/screenshots/build_read_pond.png" });
    }
    await board.locator("[data-finish=code]").click();
  }
  expect(lines[0]).toEqual(["say hello"]);
  // Easy to hard: two plain steps, then a repeat, then the pond.
  expect(lines[1]).toHaveLength(2);
  expect(lines[1].join("\n")).not.toMatch(/repeat|pond/);
  expect(lines[2].join("\n")).toMatch(/repeat 3 times: /);
  expect(lines[3]).toEqual(["walk", "repeat 3 times: walk", "if at pond: splash"]);
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
});

test("a lone repeat has nothing to play: the child hears Try again", async ({ page }) => {
  await install(page, "code", older);
  const board = page.locator("[data-build=code]");
  await buildCode(board);
  await board.locator("[data-play=run]").click();
  await board.locator("[data-next=code]").click();
  // The second program is two plain steps; the repeat comes in the last one.
  await expect(board).toHaveAttribute("data-round", "1");
  await buildCode(board);
  await board.locator("[data-play=run]").click();
  await expect(board).toHaveAttribute("data-match", "true", { timeout: 15_000 });
  await board.locator("[data-finish=code]").click();
  await expect(board).toHaveAttribute("data-round", "2");
  await board.locator("[data-block=repeat]").click();
  await board.locator("[data-play=run]").click();
  await expect(board.locator("[data-code-line='0']")).toHaveAttribute("data-miss", "true");
  await expect(board.locator("[data-finish=code]")).toHaveCount(0);
});

for (const [age, saved] of [["3 to 4", profile], ["5 to 7", older]] as const) {
  test(`reading code fits a phone screen at ages ${age}: the code, the stage and Play are all in view`, async ({ page }) => {
    test.setTimeout(60_000);
    // A phone's screen less its status bar and home bar, with the grown-up tip still showing above the board.
    await page.setViewportSize({ width: 390, height: 763 });
    await install(page, "code", saved);
    const board = page.locator("[data-build=code]");
    for (const round of ["0", "1", "2"]) {
      await expect(board).toHaveAttribute("data-round", round);
      await expect(board.locator("[data-code-card]")).toBeInViewport({ ratio: 1 });
      await expect(board.locator(".build-stage")).toBeInViewport({ ratio: 1 });
      await expect(board.locator("[data-play=run]")).toBeInViewport({ ratio: 1 });
      await buildCode(board);
      await board.locator("[data-play=run]").click();
      await expect(board).toHaveAttribute("data-match", "true", { timeout: 15_000 });
      // Next takes Play's place, so it is in view too.
      await expect(board.locator("[data-finish=code]")).toBeInViewport({ ratio: 1 });
      if (round !== "2") await board.locator("[data-finish=code]").click();
    }
  });
}

test("the move board asks for jump, then spin: a wrong block wiggles, the right ones go on by tap or drag, and the animal does them", async ({ page }, testInfo) => {
  await installAudioSpy(page);
  await install(page, "move");
  const board = page.locator("[data-build=move]");
  await expect(board).toHaveAttribute("data-level", "early");
  await expect(board).toHaveAttribute("data-goal", "jump,spin");
  await expect(board).toHaveAttribute("data-round", "0");
  // The goal is said aloud, and shown as the two blocks to build.
  await expect.poll(() => spokenLines(page)).toContain("make your animal jump, then spin. then press play.");
  await expect(board.locator(".build-goal [data-goal-block]")).toHaveCount(2);
  await expect(board.locator(".build-goal [data-done=true]")).toHaveCount(0);
  // The program in words is there at every age, once there is a program.
  await expect(board).toHaveAttribute("data-lines", "on");
  await expect(board).toHaveAttribute("data-python", "off");
  await expect(board.locator(".build-lines")).toHaveCount(0);
  await expect(board.locator("[data-block=pond]")).toHaveCount(0);
  await expect(page.locator("[data-tip=game-build-start]")).toBeVisible();
  // Five numbered places wait for steps, and Play waits for the first one.
  await expect(board.locator(".build-place")).toHaveCount(5);
  await expect(board.locator("[data-play=run]")).toBeDisabled();
  // Every block has a picture and a name a child can hear.
  for (const block of ["walk", "jump", "spin", "dance", "sing"]) {
    await expect(board.locator(`[data-block=${block}] .build-name`)).toHaveText(block);
  }
  // Walk is not the goal: it wiggles, says its name, and stays where it is.
  await board.locator("[data-block=walk]").click();
  await expect(board.locator("[data-block=walk]")).toHaveAttribute("data-wiggle", /^(a|b)$/);
  await expect(board).toHaveAttribute("data-said", "walk");
  await expect(board).toHaveAttribute("data-script", "");
  await expect(board).toHaveAttribute("data-misses", "1");
  await board.locator("[data-block=jump]").click();
  await expect(board).toHaveAttribute("data-script", "jump");
  await expect(board.locator(".build-goal [data-done=true]")).toHaveCount(1);
  await board.locator("[data-block=spin]").dragTo(board.locator("[data-drop=script]"));
  await expect(board).toHaveAttribute("data-script", "jump,spin");
  await expect(board.locator(".build-goal [data-done=true]")).toHaveCount(2);
  await expect(board.locator(".build-lines li")).toHaveText(["jump", "spin"]);
  await expect(board.locator(".build-place")).toHaveCount(3);
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/build_move.png" });
  }
  await board.locator("[data-play=run]").click();
  // The step that is running is lit, and the stage shows that move.
  await expect(board.locator("[data-index='0']")).toHaveAttribute("data-on", "true");
  await expect(board.locator(".build-stage")).toHaveAttribute("data-pose", "jump");
  await expect(board).toHaveAttribute("data-ran", "jump,spin");
  await expect(board).toHaveAttribute("data-pose", "spin");
  await expect(board).toHaveAttribute("data-match", "true");
  // Ages 3 to 4 have the one goal: done.
  await expect(board.locator("[data-next=move]")).toHaveCount(0);
  await board.locator("[data-finish=move]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator("[data-step=letter]")).not.toHaveClass(/is-done/);
});

test("after three wrong blocks the right one is pointed at", async ({ page }) => {
  await install(page, "move");
  const board = page.locator("[data-build=move]");
  await expect(board).toHaveAttribute("data-goal", "jump,spin");
  for (const block of ["walk", "dance", "sing"]) await board.locator(`[data-block=${block}]`).click();
  await expect(board).toHaveAttribute("data-misses", "3");
  await expect(board).toHaveAttribute("data-hint", "jump");
  await expect(board.locator("[data-block=jump]")).toHaveAttribute("data-hint", "true");
  await expect(board.locator("[data-block=jump] .game-hand")).toBeVisible();
  await board.locator("[data-block=jump]").click();
  await expect(board).toHaveAttribute("data-misses", "0");
  await expect(board.locator(".game-hand")).toHaveCount(0);
  // A step taken out takes the ones after it with it, so the steps stay in the goal's order.
  await board.locator("[data-block=spin]").click();
  await expect(board).toHaveAttribute("data-script", "jump,spin");
  await board.locator("[data-index='0']").click();
  await expect(board).toHaveAttribute("data-script", "");
});

test("leaving while the program plays stops it: nothing more is said over the lobby", async ({ page }) => {
  // Two steps at 700 ms each; Back after the first leaves nothing playing.
  await installAudioSpy(page);
  await install(page, "move");
  const board = page.locator("[data-build=move]");
  for (const block of ["jump", "spin"]) await board.locator(`[data-block=${block}]`).click();
  await expect(board).toHaveAttribute("data-script", "jump,spin");
  await board.locator("[data-play=run]").click();
  await expect(board.locator("[data-index='0']")).toHaveAttribute("data-on", "true");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(board).toHaveCount(0);
  const said = (await spokenLines(page)).length;
  await page.waitForTimeout(2_500);
  expect((await spokenLines(page)).slice(said)).toEqual([]);
});

for (const [age, saved] of [["3 to 4", profile], ["5 to 7", older]] as const) {
  test(`the move board fits a phone screen at ages ${age}: the goal, the stage, the steps and Play are in view, and Play runs the steps`, async ({ page }) => {
    test.setTimeout(60_000);
    // A phone's screen less its status bar and home bar, with the grown-up tip still showing above the board.
    // The playtest of build 4: jump and spin sat ticked in Your steps and nothing played them. Play was
    // the big button under the palette, below the bottom of the screen; it is in the steps card now.
    await page.setViewportSize({ width: 390, height: 763 });
    await install(page, "move", saved);
    const board = page.locator("[data-build=move]");
    await expect(page.locator("[data-tip=game-build-start]")).toHaveAttribute("data-tip-open", "true");
    for (let round = 0; ; round += 1) {
      await expect(board).toHaveAttribute("data-round", String(round));
      await expect(board.locator(".build-goal")).toBeInViewport({ ratio: 1 });
      await expect(board.locator(".build-stage")).toBeInViewport({ ratio: 1 });
      await expect(board.locator(".build-steps")).toBeInViewport({ ratio: 1 });
      await expect(board.locator("[data-play=run]")).toBeInViewport({ ratio: 1 });
      await expect(board.locator("[data-play=run]")).toBeDisabled();
      // Five blocks in one row, in view.
      const tops = await board.locator(".build-block").evaluateAll((blocks) => blocks.map((block) => Math.round(block.getBoundingClientRect().top)));
      expect(new Set(tops).size).toBe(1);
      await expect(board.locator(".build-palette")).toBeInViewport({ ratio: 1 });
      const goal = ((await board.getAttribute("data-goal")) ?? "").split(",").filter(Boolean);
      for (const block of goal) await board.locator(`[data-block=${block}]`).click();
      await expect(board).toHaveAttribute("data-script", goal.join(","));
      await expect(board.locator(".build-goal [data-done=true]")).toHaveCount(goal.length);
      // The places after the steps stay empty, and Play is beside the steps, in view and ready.
      await expect(board.locator(".build-place")).toHaveText(Array.from({ length: 5 - goal.length }, (_, index) => String(goal.length + index + 1)));
      await expect(board.locator("[data-play=run]")).toBeEnabled();
      await expect(board.locator("[data-play=run]")).toBeInViewport({ ratio: 1 });
      await board.locator("[data-play=run]").click();
      // The steps run in order and the animal does each one.
      await expect(board.locator("[data-index='0']")).toHaveAttribute("data-on", "true");
      await expect(board.locator(".build-stage")).toHaveAttribute("data-pose", goal[0]);
      await expect(board).toHaveAttribute("data-match", "true", { timeout: 15_000 });
      const moves = goal.filter((block) => block !== "repeat");
      await expect(board).toHaveAttribute("data-pose", moves.at(-1) ?? "");
      // Next (or Done) takes Play's place in the steps card, in view.
      await expect(board.locator("[data-play=run]")).toHaveCount(0);
      const finish = board.locator("[data-finish=move]");
      await expect(finish).toBeInViewport({ ratio: 1 });
      expect(await finish.evaluate((button) => Boolean(button.closest(".build-steps")))).toBe(true);
      const next = await finish.getAttribute("data-next");
      await finish.click();
      if (!next) break;
    }
    await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
  });
}

test("with Reduce Motion a program still plays one step at a time, each move held still", async ({ page }) => {
  // Reduce Motion stills the moves, not the program. Played all at once, the stage never moved and
  // only the last block's name was heard (each name stops the one before).
  await page.emulateMedia({ reducedMotion: "reduce" });
  await install(page, "move");
  const board = page.locator("[data-build=move]");
  for (const block of ["jump", "spin"]) await board.locator(`[data-block=${block}]`).click();
  await expect(board).toHaveAttribute("data-script", "jump,spin");
  const stage = board.locator(".build-stage");
  const poses = await noting(stage, (element) => element.getAttribute("data-pose"));
  await board.locator("[data-play=run]").click();
  await expect(stage).toHaveAttribute("data-pose", "jump");
  expect(await stage.locator(".build-pose").evaluate((pose) => getComputedStyle(pose).animationName)).toBe("none");
  await expect(board).toHaveAttribute("data-played", "true");
  expect(await poses()).toEqual(["rest", "jump", "spin", "rest"]);
});

test("a step tapped in Your steps comes out", async ({ page }) => {
  await install(page, "move");
  const board = page.locator("[data-build=move]");
  for (const block of ["jump", "spin"]) await board.locator(`[data-block=${block}]`).click();
  await board.locator("[data-index='1']").click();
  await expect(board).toHaveAttribute("data-script", "jump");
  await expect(board.locator(".build-goal [data-done=true]")).toHaveCount(1);
});

test("ages 5 to 7 go on to do it again: the repeat block, and a move done three times in a row is heard three times", async ({ page }, testInfo) => {
  // The playtest of build 3: sing, sing, sing played one sound and then silence, while the steps
  // lit one by one. Sing was a 70 ms pop; every move is named now, each time it happens.
  await installAudioSpy(page);
  await install(page, "move", older);
  const board = page.locator("[data-build=move]");
  await expect(board).toHaveAttribute("data-level", "later");
  await expect(board).toHaveAttribute("data-goal", "jump,spin");
  // No saving a goal: the steps are the goal's.
  await expect(board.locator("[data-save=device]")).toHaveCount(0);
  for (const block of ["jump", "spin"]) await board.locator(`[data-block=${block}]`).click();
  await board.locator("[data-play=run]").click();
  await expect(board).toHaveAttribute("data-match", "true", { timeout: 10_000 });
  await board.locator("[data-next=move]").click();
  // The second goal: the same again, with the repeat block.
  await expect(board).toHaveAttribute("data-round", "1");
  await expect(board).toHaveAttribute("data-goal", "jump,spin,repeat");
  await expect.poll(() => spokenLines(page)).toContain("now do that again. add the again block, then press play.");
  await expect(board.locator(".build-block")).toHaveCount(5);
  await expect(board.locator("[data-block=repeat]")).toBeVisible();
  for (const block of ["jump", "spin", "repeat"]) await board.locator(`[data-block=${block}]`).click();
  await expect(board).toHaveAttribute("data-script", "jump,spin,repeat");
  await expect(board.locator("[data-index='2']")).toHaveAttribute("data-line", "repeat 3 times: spin");
  if (testInfo.project.name === "chromium") await board.screenshot({ path: "test-results/screenshots/build_move_again.png" });
  const before = (await playedClips(page)).length;
  await board.locator("[data-play=run]").click();
  await expect(board).toHaveAttribute("data-played", "true", { timeout: 10_000 });
  await expect(board).toHaveAttribute("data-ran", "jump,spin,repeat,spin,spin");
  expect((await playedClips(page)).slice(before).filter((clip) => clip === "words/spin.mp3")).toHaveLength(3);
  await board.locator("[data-finish=move]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
});

test("a drum played three times in a row is heard three times", async ({ page }) => {
  await installAudioSpy(page);
  await install(page, "music");
  const board = page.locator("[data-build=music]");
  for (let step = 0; step < 3; step += 1) await board.locator("[data-block=drum]").click();
  await expect(board).toHaveAttribute("data-script", "drum,drum,drum");
  const before = (await playedEffects(page)).length;
  await board.locator("[data-play=run]").click();
  await expect(board).toHaveAttribute("data-played", "true", { timeout: 10_000 });
  expect((await playedEffects(page)).slice(before).filter((effect) => effect === "thud")).toHaveLength(3);
});

test("a repeat block plays the drum three times", async ({ page }, testInfo) => {
  await install(page, "music");
  const board = page.locator("[data-build=music]");
  await board.locator("[data-block=drum]").click();
  await board.locator("[data-block=repeat]").click();
  await board.locator("[data-play=run]").click();
  await expect(board.locator(".build-stage")).toHaveAttribute("data-sound", "drum");
  await expect(board).toHaveAttribute("data-ran", "drum,repeat,drum,drum");
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/build_music.png" });
  }
  await board.locator("[data-finish=music]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
});

test("ages 5 to 7 save a song on this device, and nothing leaves it", async ({ page }) => {
  await install(page, "music", older);
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  const board = page.locator("[data-build=music]");
  await expect(board).toHaveAttribute("data-level", "later");
  await board.locator("[data-block=drum]").click();
  await board.locator("[data-block=repeat]").click();
  await board.locator("[data-block=bell]").click();
  await board.locator("[data-play=run]").click();
  await expect(board).toHaveAttribute("data-ran", "drum,repeat,drum,drum,bell");
  const before = requests.length;
  await board.locator("[data-save=device]").click();
  await expect(board).toHaveAttribute("data-saved", "true");
  const saved = await page.evaluate(() => localStorage.getItem("littlenest.section.games.build") ?? "");
  expect(saved).toContain("drum");
  expect(saved).not.toContain("Mia");
  expect(requests.slice(before).every((url) => url.startsWith("http://127.0.0.1") || url.startsWith("data:"))).toBe(true);
  await page.getByRole("button", { name: "All coding" }).click();
  await page.locator("[data-game-tile=build-music]").click();
  await expect(page.locator("[data-build=music]")).toHaveAttribute("data-script", "drum,repeat,bell");
  await expect(page.locator("[data-build=music]")).toHaveAttribute("data-loaded", "true");
});

test("the same program shows as blocks, as words, and as read-only Python", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await install(page, "move", older, { showCode: true });
  const board = page.locator("[data-build=move]");
  await expect(board).toHaveAttribute("data-lines", "on");
  await expect(board).toHaveAttribute("data-python", "on");
  for (const block of ["jump", "spin"]) await board.locator(`[data-block=${block}]`).click();
  await expect(board.locator(".build-lines li")).toHaveText(["jump", "spin"]);
  expect(await board.locator(".build-python").innerText()).toBe("bird.jump()\nbird.spin()");
  await board.locator("[data-play=run]").click();
  await expect(board).toHaveAttribute("data-match", "true", { timeout: 10_000 });
  await board.locator("[data-next=move]").click();
  for (const block of ["jump", "spin", "repeat"]) await board.locator(`[data-block=${block}]`).click();
  await expect(board.locator("[data-index='2']")).toHaveAttribute("data-line", "repeat 3 times: spin");
  await expect(board.locator(".build-lines li")).toHaveText(["jump", "spin", "repeat 3 times: spin"]);
  const python = await board.locator(".build-python").innerText();
  expect(python).toContain("for i in range(3):\n    bird.spin()");
  // The Python is read only: there is nothing to type into.
  await expect(board.locator(".build-python")).toHaveAttribute("aria-readonly", "true");
  await expect(board.locator(".build-python textarea, .build-python input, .build-python[contenteditable=true]")).toHaveCount(0);
  await board.locator("[data-index='2']").click();
  await expect(board).toHaveAttribute("data-script", "jump,spin");
  await board.locator("[data-block=repeat]").click();
  await expect(board).toHaveAttribute("data-script", "jump,spin,repeat");
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/build_code.png" });
  }
  await board.locator("[data-play=run]").click();
  // The line that is running lights with its block.
  await expect(board.locator(".build-lines li[data-on=true]")).toHaveCount(1);
  await expect(board).toHaveAttribute("data-match", "true", { timeout: 10_000 });
});
