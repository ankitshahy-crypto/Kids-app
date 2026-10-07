import { expect, test, type Locator, type Page } from "@playwright/test";
import { installAudioSpy, spokenLines } from "./audioSpy";
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

test("ages 5 to 7 read the code as words alone, with a repeat line to work out", async ({ page }) => {
  await install(page, "code", older);
  const board = page.locator("[data-build=code]");
  await expect(board).toHaveAttribute("data-level", "later");
  await expect(board.locator("[data-code-line] .code-line-art")).toHaveCount(0);
  const lines: string[] = [];
  for (const round of ["0", "1", "2"]) {
    await expect(board).toHaveAttribute("data-round", round);
    // Five blocks to choose between, the program's own among them.
    await expect(board.locator(".build-block")).toHaveCount(5);
    lines.push(...(await board.locator("[data-code-line] .code-line-words").allInnerTexts()));
    await buildCode(board);
    await board.locator("[data-play=run]").click();
    await expect(board).toHaveAttribute("data-match", "true", { timeout: 15_000 });
    await board.locator("[data-finish=code]").click();
  }
  expect(lines[0]).toBe("say hello");
  // Every program for this age repeats a step.
  expect(lines.join("\n")).toMatch(/repeat 3 times: /);
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
});

test("a lone repeat has nothing to play: the child hears Try again", async ({ page }) => {
  await install(page, "code", older);
  const board = page.locator("[data-build=code]");
  await buildCode(board);
  await board.locator("[data-play=run]").click();
  await board.locator("[data-next=code]").click();
  await expect(board).toHaveAttribute("data-round", "1");
  await board.locator("[data-block=repeat]").click();
  await board.locator("[data-play=run]").click();
  await expect(board.locator("[data-code-line='0']")).toHaveAttribute("data-miss", "true");
  await expect(board.locator("[data-finish=code]")).toHaveCount(0);
});

for (const [age, saved] of [["3 to 4", profile], ["5 to 7", older]] as const) {
  test(`reading code fits a phone screen at ages ${age}: the code, the stage and Play are all in view`, async ({ page }) => {
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

test("tapped and dragged blocks play on the animal, one step at a time", async ({ page }, testInfo) => {
  await install(page, "move");
  const board = page.locator("[data-build=move]");
  await expect(board).toHaveAttribute("data-level", "early");
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
  await board.locator("[data-block=walk]").click();
  await expect(board).toHaveAttribute("data-said", "walk");
  await board.locator("[data-block=jump]").dragTo(board.locator("[data-drop=script]"));
  await expect(board).toHaveAttribute("data-script", "walk,jump");
  await expect(board.locator(".build-lines li")).toHaveText(["walk", "jump"]);
  await expect(board.locator(".build-place")).toHaveCount(3);
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/build_move.png" });
  }
  await board.locator("[data-play=run]").click();
  // The step that is running is lit, and the stage shows that move.
  await expect(board.locator("[data-index='0']")).toHaveAttribute("data-on", "true");
  await expect(board.locator(".build-stage")).toHaveAttribute("data-pose", "walk");
  await expect(board).toHaveAttribute("data-ran", "walk,jump");
  await expect(board).toHaveAttribute("data-pose", "jump");
  await board.locator("[data-finish=move]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator("[data-step=letter]")).not.toHaveClass(/is-done/);
});

test("leaving while the program plays stops it: nothing more is said over the lobby", async ({ page }) => {
  // Five steps at 700 ms each run for 3.5 s; Back after the first leaves nothing playing.
  await installAudioSpy(page);
  await install(page, "move");
  const board = page.locator("[data-build=move]");
  for (const block of ["walk", "jump", "spin", "dance", "sing"]) await board.locator(`[data-block=${block}]`).click();
  await expect(board).toHaveAttribute("data-script", "walk,jump,spin,dance,sing");
  await board.locator("[data-play=run]").click();
  await expect(board.locator("[data-index='0']")).toHaveAttribute("data-on", "true");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(board).toHaveCount(0);
  const said = (await spokenLines(page)).length;
  await page.waitForTimeout(2_500);
  expect((await spokenLines(page)).slice(said)).toEqual([]);
});

test("the whole board fits a phone screen: the stage and Play are both in view", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await install(page, "move");
  const board = page.locator("[data-build=move]");
  await expect(board.locator(".build-stage")).toBeInViewport({ ratio: 1 });
  await expect(board.locator("[data-play=run]")).toBeInViewport({ ratio: 1 });
  // Five blocks in one row.
  const tops = await board.locator(".build-block").evaluateAll((blocks) => blocks.map((block) => Math.round(block.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1);
});

test("a step tapped in Your steps comes out", async ({ page }) => {
  await install(page, "move");
  const board = page.locator("[data-build=move]");
  for (const block of ["walk", "spin", "jump"]) await board.locator(`[data-block=${block}]`).click();
  await board.locator("[data-index='1']").click();
  await expect(board).toHaveAttribute("data-script", "walk,jump");
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

test("ages 5 to 7 splash at the pond and save on this device", async ({ page }, testInfo) => {
  await install(page, "move", older);
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  const board = page.locator("[data-build=move]");
  await expect(board).toHaveAttribute("data-level", "later");
  await board.locator("[data-block=walk]").click();
  await board.locator("[data-block=repeat]").click();
  await board.locator("[data-block=pond]").click();
  await board.locator("[data-play=run]").click();
  // The stage is on screen while the program runs.
  await expect(board.locator(".build-stage")).toBeInViewport({ ratio: 0.9 });
  await expect(board).toHaveAttribute("data-splash", "true");
  await expect(board).toHaveAttribute("data-steps", "3");
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/build_splash.png" });
  }
  const before = requests.length;
  await board.locator("[data-save=device]").click();
  await expect(board).toHaveAttribute("data-saved", "true");
  const saved = await page.evaluate(() => localStorage.getItem("littlenest.section.games.build") ?? "");
  expect(saved).toContain("walk");
  expect(saved).not.toContain("Mia");
  expect(requests.slice(before).every((url) => url.startsWith("http://127.0.0.1") || url.startsWith("data:"))).toBe(true);
  await page.getByRole("button", { name: "All coding" }).click();
  await page.locator("[data-game-tile=build-move]").click();
  await expect(page.locator("[data-build=move]")).toHaveAttribute("data-script", "walk,repeat,pond");
  await expect(page.locator("[data-build=move]")).toHaveAttribute("data-loaded", "true");
});

test("the same program shows as blocks, as words, and as read-only Python", async ({ page }, testInfo) => {
  await install(page, "move", older, { showCode: true });
  const board = page.locator("[data-build=move]");
  await expect(board).toHaveAttribute("data-lines", "on");
  await expect(board).toHaveAttribute("data-python", "on");
  await board.locator("[data-block=walk]").click();
  await board.locator("[data-block=repeat]").click();
  await board.locator("[data-block=pond]").click();
  await expect(board.locator("[data-index='1']")).toHaveAttribute("data-line", "repeat 3 times: walk");
  await expect(board.locator("[data-index='2']")).toHaveAttribute("data-line", "if at pond: splash");
  await expect(board.locator(".build-lines li")).toHaveText(["walk", "repeat 3 times: walk", "if at pond: splash"]);
  const python = await board.locator(".build-python").innerText();
  expect(python).toContain("for i in range(3):\n    bird.walk()");
  expect(python).toContain("if bird.at_pond():\n    bird.splash()");
  await board.locator("[data-index='2']").click();
  await expect(board).toHaveAttribute("data-script", "walk,repeat");
  await board.locator("[data-block=pond]").click();
  await expect(board).toHaveAttribute("data-script", "walk,repeat,pond");
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/build_code.png" });
  }
  await board.locator("[data-play=run]").click();
  // The line that is running lights with its block.
  await expect(board.locator(".build-lines li[data-on=true]")).toHaveCount(1);
  await expect(board).toHaveAttribute("data-splash", "true");
  await expect(board).toHaveAttribute("data-steps", "3");
});
