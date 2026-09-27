import { expect, test, type Page } from "@playwright/test";

const profile = {
  activeId: "mia",
  profiles: [
    {
      id: "mia",
      name: "Mia",
      ageRange: "4",
      animal: "fox",
      createdAt: "2026-09-01T15:00:00.000Z",
      stars: 0,
      days: {},
    },
  ],
};

const older = {
  activeId: "mia",
  profiles: [{ ...profile.profiles[0], ageRange: "6-7" }],
};

async function install(page: Page, saved: unknown = profile, settings?: unknown) {
  await page.addInitScript((payload) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(payload.saved));
    localStorage.removeItem("kids-app-silent-hint-v1");
    localStorage.removeItem("littlenest.section.games.build");
    if (payload.settings) localStorage.setItem("littlenest-settings-v1", JSON.stringify(payload.settings));
  }, { saved, settings });
  await page.goto("./");
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: "Mia" }).click();
  await page.locator("[data-dock=games]").click();
  await page.locator("[data-game-tile=build]").click();
  await expect(page.locator("[data-build=menu]")).toBeVisible();
}

test("tapped and dragged blocks play on the animal", async ({ page }, testInfo) => {
  await install(page);
  await page.locator("[data-build-tile=move]").click();
  const board = page.locator("[data-build=move]");
  await expect(board).toHaveAttribute("data-level", "early");
  await expect(board).toHaveAttribute("data-lines", "off");
  await expect(board).toHaveAttribute("data-python", "off");
  await expect(board.locator(".build-line")).toHaveCount(0);
  await expect(board.locator("[data-block=pond]")).toHaveCount(0);
  await expect(page.locator("[data-tip=game-build-start]")).toBeVisible();
  await board.locator("[data-block=walk]").click();
  await board.locator("[data-block=jump]").dragTo(board.locator("[data-drop=script]"));
  await expect(board).toHaveAttribute("data-script", "walk,jump");
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/build_move.png" });
  }
  await board.locator("[data-play=run]").click();
  await expect(board).toHaveAttribute("data-lit", /0/);
  await expect(board).toHaveAttribute("data-ran", "walk,jump");
  await expect(board).toHaveAttribute("data-pose", "jump");
  await board.locator("[data-finish=move]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
  await page.getByRole("button", { name: "All games" }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "LittleNest Words" }).click();
  await expect(page.locator("[data-step=letter]")).not.toHaveClass(/is-done/);
});

test("a repeat block plays the drum three times", async ({ page }, testInfo) => {
  await install(page);
  await page.locator("[data-build-tile=music]").click();
  const board = page.locator("[data-build=music]");
  await board.locator("[data-block=drum]").click();
  await board.locator("[data-block=repeat]").click();
  await board.locator("[data-play=run]").click();
  await expect(board).toHaveAttribute("data-ran", "drum,repeat,drum,drum");
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/build_music.png" });
  }
  await board.locator("[data-finish=music]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
});

test("rain before the flower makes it grow", async ({ page }, testInfo) => {
  await install(page);
  await page.locator("[data-build-tile=scene]").click();
  const board = page.locator("[data-build=scene]");
  await board.locator("[data-block=flower]").click();
  await board.locator("[data-play=run]").click();
  await expect(board).toHaveAttribute("data-flower", "bud");
  await expect(board.locator(".build-again")).toHaveText("Try again.");
  await expect(board.locator("[data-finish=scene]")).toHaveCount(0);
  await board.locator("[data-block=rain]").click();
  await board.locator("[data-index='0']").click();
  await board.locator("[data-block=flower]").click();
  await expect(board).toHaveAttribute("data-script", "rain,flower");
  await board.locator("[data-play=run]").click();
  await expect(board).toHaveAttribute("data-flower", "grown");
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/build_scene.png" });
  }
  await board.locator("[data-finish=scene]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
});

test("a mixed-up sandwich is silly and the right order is ready", async ({ page }, testInfo) => {
  await install(page);
  await page.locator("[data-build-tile=chef]").click();
  const board = page.locator("[data-build=chef]");
  await board.locator("[data-block=filling]").click();
  await board.locator("[data-block=bread]").click();
  await board.locator("[data-block=spread]").click();
  await board.locator("[data-play=run]").click();
  await expect(board).toHaveAttribute("data-result", "silly");
  await expect(board.locator(".build-again")).toHaveText("Try again.");
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "0");
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/build_chef.png" });
  }
  await board.locator("[data-index='0']").click();
  await board.locator("[data-index='0']").click();
  await board.locator("[data-index='0']").click();
  await board.locator("[data-block=bread]").click();
  await board.locator("[data-block=spread]").click();
  await board.locator("[data-block=filling]").click();
  await board.locator("[data-play=run]").click();
  await expect(board).toHaveAttribute("data-result", "sandwich");
  await board.locator("[data-finish=chef]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
});

test("ages 5 to 7 splash at the pond and save on this device", async ({ page }, testInfo) => {
  await install(page, older);
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.locator("[data-build-tile=move]").click();
  const board = page.locator("[data-build=move]");
  await expect(board).toHaveAttribute("data-level", "later");
  await board.locator("[data-block=walk]").click();
  await board.locator("[data-block=repeat]").click();
  await board.locator("[data-block=pond]").click();
  await board.locator("[data-play=run]").click();
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
  await page.getByRole("button", { name: "All games" }).click();
  await page.locator("[data-game-tile=build]").click();
  await page.locator("[data-build-tile=move]").click();
  await expect(page.locator("[data-build=move]")).toHaveAttribute("data-script", "walk,repeat,pond");
  await expect(page.locator("[data-build=move]")).toHaveAttribute("data-loaded", "true");
});

test("the same program shows a spoken line and read-only Python", async ({ page }, testInfo) => {
  await install(page, older, { showCode: true });
  await page.locator("[data-build-tile=move]").click();
  const board = page.locator("[data-build=move]");
  await expect(board).toHaveAttribute("data-lines", "on");
  await expect(board).toHaveAttribute("data-python", "on");
  await board.locator("[data-block=walk]").click();
  await board.locator("[data-block=repeat]").click();
  await board.locator("[data-block=pond]").click();
  await expect(board.locator("[data-index='1']")).toHaveAttribute("data-line", "repeat 3 times: walk");
  await expect(board.locator("[data-index='2']")).toHaveAttribute("data-line", "if at pond: splash");
  const python = await board.locator(".build-python").innerText();
  expect(python).toContain("for i in range(3):\n    bird.walk()");
  expect(python).toContain("if bird.at_pond():\n    bird.splash()");
  await board.locator("[data-index='1']").click();
  await expect(board).toHaveAttribute("data-said", "repeat 3 times: walk");
  await expect(board).toHaveAttribute("data-script", "walk,repeat,pond");
  await board.locator("[data-remove='2']").click();
  await expect(board).toHaveAttribute("data-script", "walk,repeat");
  await board.locator("[data-block=pond]").click();
  await expect(board).toHaveAttribute("data-script", "walk,repeat,pond");
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/build_code.png" });
  }
  await board.locator("[data-play=run]").click();
  await expect(board).toHaveAttribute("data-splash", "true");
  await expect(board).toHaveAttribute("data-steps", "3");
});
