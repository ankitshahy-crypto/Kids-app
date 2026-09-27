import { expect, test, type Locator, type Page } from "@playwright/test";

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

async function install(page: Page, saved: unknown = profile) {
  await page.addInitScript((saved) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.removeItem("kids-app-silent-hint-v1");
  }, saved);
  await page.goto("./");
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: "Mia" }).click();
  await page.locator("[data-dock=games]").click();
  await expect(page.locator("[data-game=home]")).toBeVisible();
}

async function runPath(board: Locator) {
  const path = (await board.getAttribute("data-path")) ?? "";
  const mode = await board.getAttribute("data-mode");
  for (const dir of path.split(",").filter(Boolean)) {
    await board.locator(`[data-arrow=${dir}]`).click();
  }
  if (mode !== "tap") await board.locator("[data-go=run]").click();
  await expect(board).toHaveAttribute("data-home", "true");
}

test("arrows take the animal home, then a plan can be tried again", async ({ page }, testInfo) => {
  await install(page);
  await page.locator("[data-game-tile=bird]").click();
  const board = page.locator("[data-game=bird] .game-board");
  await expect(board).toHaveAttribute("data-level", "early");
  await expect(board).toHaveAttribute("data-mode", "tap");
  await expect(page.locator("[data-tip=game-bird-start]")).toBeVisible();
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/code_bird.png" });
  }
  await board.locator("[data-arrow=left]").click();
  await expect(board.locator("[data-arrow=left]")).toHaveAttribute("data-wiggle", "true");
  await expect(board).toHaveAttribute("data-x", "0");
  await expect(board).toHaveAttribute("data-home", "false");
  await runPath(board);
  await board.locator("[data-next=round]").click();
  await expect(board).toHaveAttribute("data-mode", "plan");
  const steps = ((await board.getAttribute("data-path")) ?? "").split(",").filter(Boolean);
  expect(steps.length).toBeGreaterThanOrEqual(4);
  expect(steps.length).toBeLessThanOrEqual(5);
  await board.locator("[data-arrow=down]").click();
  await board.locator("[data-go=run]").click();
  await expect(board).toHaveAttribute("data-again", "true");
  await expect(board).toHaveAttribute("data-home", "false");
  await board.locator('[data-queued="0"]').click();
  await runPath(board);
  await board.locator("[data-finish=bird]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "LittleNest Words" }).click();
  await expect(page.locator("[data-step=letter]")).not.toHaveClass(/is-done/);
});

test("picture patterns continue AB, then ABB, then ABC", async ({ page }, testInfo) => {
  await install(page);
  await page.locator("[data-game-tile=pattern]").click();
  const board = page.locator("[data-game=pattern] .game-board");
  await expect(board).toHaveAttribute("data-rule", "AB");
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/code_pattern.png" });
  }
  await board.locator("[data-choice=yellow]").click();
  await expect(board.locator("[data-choice=yellow]")).toHaveAttribute("data-wiggle", "true");
  await expect(board).toHaveAttribute("data-solved", "0");
  for (const rule of ["AB", "ABB", "ABC"]) {
    await expect(board).toHaveAttribute("data-rule", rule);
    const answer = (await board.getAttribute("data-answer")) ?? "";
    await board.locator(`[data-choice=${answer}]`).click();
  }
  await board.locator("[data-finish=pattern]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
});

test("morning pictures accept a tap and a drag, and a wrong one wiggles", async ({ page }, testInfo) => {
  await install(page);
  await page.locator("[data-game-tile=morning]").click();
  const board = page.locator("[data-game=morning] .game-board");
  await expect(board).toHaveAttribute("data-order", "wake,brush,eat");
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/code_morning.png" });
  }
  await board.locator("[data-card=eat]").click();
  await expect(board.locator("[data-card=eat]")).toHaveAttribute("data-wiggle", "true");
  await expect(board).toHaveAttribute("data-sorted", "0");
  await board.locator("[data-card=wake]").click();
  await expect(board).toHaveAttribute("data-placed", "wake");
  await board.locator("[data-card=brush]").dragTo(board.locator("[data-slot='1']"));
  await expect(board).toHaveAttribute("data-placed", "wake,brush");
  await board.locator("[data-card=eat]").click();
  await expect(board).toHaveAttribute("data-sorted", "3");
  await board.locator("[data-finish=morning]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
});

test("rain grows the flower and sun melts the ice", async ({ page }, testInfo) => {
  await install(page);
  await page.locator("[data-game-tile=garden]").click();
  const board = page.locator("[data-game=garden] .game-board");
  await expect(board).toHaveAttribute("data-cause", "rain");
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/code_garden.png" });
  }
  await board.locator("[data-cause=sun]").click();
  await expect(board.locator("[data-cause=sun]")).toHaveAttribute("data-wiggle", "true");
  await expect(board).toHaveAttribute("data-effect", "wait");
  await board.locator("[data-cause=rain]").click();
  await expect(board).toHaveAttribute("data-effect", "flower");
  await board.locator("[data-next=garden]").click();
  await expect(board).toHaveAttribute("data-cause", "sun");
  await board.locator("[data-cause=sun]").click();
  await expect(board).toHaveAttribute("data-effect", "melt");
  await board.locator("[data-finish=garden]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
});

test("ages 5 to 7 repeat a move and fix one wrong arrow", async ({ page }, testInfo) => {
  await install(page, older);
  await page.locator("[data-game-tile=bird]").click();
  const board = page.locator("[data-game=bird] .game-board");
  await expect(board).toHaveAttribute("data-level", "later");
  await expect(board).toHaveAttribute("data-mode", "plan");
  const steps = ((await board.getAttribute("data-path")) ?? "").split(",").filter(Boolean);
  expect(steps.length).toBeGreaterThanOrEqual(6);
  await runPath(board);
  await board.locator("[data-next=round]").click();
  await expect(board).toHaveAttribute("data-mode", "loop");
  await expect(board).toHaveAttribute("data-repeat", "3");
  await runPath(board);
  await board.locator("[data-next=round]").click();
  await expect(board).toHaveAttribute("data-mode", "bug");
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/code_bug.png" });
  }
  await board.locator("[data-go=run]").click();
  await expect(board).toHaveAttribute("data-again", "true");
  await expect(board).toHaveAttribute("data-home", "false");
  await board.locator("[data-bug=true]").click();
  await expect(board).toHaveAttribute("data-fixed", "true");
  await board.locator("[data-go=run]").click();
  await expect(board).toHaveAttribute("data-home", "true");
  await board.locator("[data-finish=bird]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
});
