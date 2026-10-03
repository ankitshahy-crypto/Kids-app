import { expect, test, type Page } from "@playwright/test";
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

/** Open one Build It board from the Coding list. */
async function install(page: Page, board: "move" | "music", saved: unknown = profile, settings?: unknown) {
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
  await page.locator(`[data-game-tile=build-${board}]`).click();
  await expect(page.locator(`[data-build=${board}]`)).toBeVisible();
}

test("tapped and dragged blocks play on the animal, one step at a time", async ({ page }, testInfo) => {
  await install(page, "move");
  const board = page.locator("[data-build=move]");
  await expect(board).toHaveAttribute("data-level", "early");
  await expect(board).toHaveAttribute("data-lines", "off");
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
