import { expect, test, type Page } from "@playwright/test";
import { solvePrompt } from "./solveGate";

const profile = {
  activeId: "mia",
  profiles: [
    {
      id: "mia",
      name: "Mia",
      ageRange: "4",
      animal: "fox",
      createdAt: "2026-09-27T15:00:00.000Z",
      stars: 1,
      outfit: { hat: "hat-leaf" },
      days: {},
    },
  ],
};

async function install(page: Page) {
  await page.addInitScript((saved) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.setItem("kids-app-silent-hint-v1", "1");
  }, profile);
  await page.goto("./");
}

async function openChild(page: Page) {
  await install(page);
  await page.getByRole("button", { name: "Mia" }).click();
  await expect(page.locator("[data-screen=today]")).toBeVisible();
}

async function passGate(page: Page) {
  const dialog = page.getByRole("dialog");
  const prompt = await dialog.getByRole("heading").innerText();
  const expected = solvePrompt(prompt);
  const choices = dialog.locator(".gate-choice");
  const count = await choices.count();
  for (let index = 0; index < count; index += 1) {
    if (Number(await choices.nth(index).innerText()) === expected) {
      await choices.nth(index).click();
      return;
    }
  }
  throw new Error(`No matching grown-up choice for: ${prompt}`);
}

function shot(project: string, iphone: string, ipad: string): string | null {
  if (project === "iphone") return iphone;
  if (project === "chromium") return ipad;
  return null;
}

test("start screen credits TriageDesk AI LLC and the parent tagline", async ({ page }, testInfo) => {
  await install(page);
  const start = page.locator("[data-screen=start]");
  await expect(start.getByText("Made by a parent, for parents")).toBeVisible();
  await expect(start.getByText("LittleNest Learning by TriageDesk AI LLC")).toBeVisible();
  await expect(start.getByText("© 2026 TriageDesk AI LLC")).toBeVisible();
  await expect(start).not.toContainText("Soon");
  const file = shot(testInfo.project.name, "/opt/cursor/artifacts/brand_start_iphone.png", "/opt/cursor/artifacts/brand_start_ipad.png");
  if (file && testInfo.project.name === "chromium") await page.setViewportSize({ width: 1024, height: 768 });
  if (file) await start.screenshot({ path: file });
});

test("home leads with the reading lesson and hides unfinished Soon tiles", async ({ page }, testInfo) => {
  if (testInfo.project.name === "chromium") await page.setViewportSize({ width: 1024, height: 768 });
  await openChild(page);
  const today = page.locator("[data-screen=today]");
  await expect(today.getByText("Pilot focus")).toBeVisible();
  await expect(today.locator("[data-explore=sections]")).toBeVisible();
  await expect(today.getByText("New - try it!").first()).toBeVisible();
  await expect(today).not.toContainText("Soon");
  await expect(page.getByRole("button", { name: "Play library" })).toHaveCount(0);
  const file = shot(testInfo.project.name, "/opt/cursor/artifacts/brand_today_iphone.png", "/opt/cursor/artifacts/brand_today_ipad.png");
  if (file) await today.screenshot({ path: file });
});

test("iPad landscape keeps the path and number tiles on screen", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "iPad size is checked on desktop Chromium");
  await page.setViewportSize({ width: 1024, height: 768 });
  await openChild(page);
  const trail = page.locator(".trail");
  const trailBox = await trail.boundingBox();
  expect(trailBox).toBeTruthy();
  expect(trailBox!.y).toBeGreaterThanOrEqual(0);
  expect(trailBox!.y + trailBox!.height).toBeLessThanOrEqual(768);
  await page.getByRole("button", { name: "LittleNest Numbers" }).click();
  const tile = page.locator(".math-board .math-activity").first();
  await expect(tile).toBeVisible();
  const tileBox = await tile.boundingBox();
  expect(tileBox).toBeTruthy();
  expect(tileBox!.y + 24).toBeLessThanOrEqual(768);
  await page.locator("[data-screen=today]").screenshot({ path: "/opt/cursor/artifacts/brand_numbers_ipad.png" });
});

test("the story stars the animal and the color moment is playable", async ({ page }, testInfo) => {
  await openChild(page);
  await page.getByRole("button", { name: "Story" }).click();
  const story = page.locator("[data-screen=story]");
  await expect(story).toBeVisible();
  await expect(story).not.toContainText("Soon");
  await expect(story).toContainText("fox");
  await expect(story).not.toContainText("Mia");
  await expect(story.locator(".hero")).toBeVisible();
  if (testInfo.project.name === "iphone") await story.screenshot({ path: "/opt/cursor/artifacts/brand_story_iphone.png" });
  await story.getByRole("button", { name: "Next page" }).click();
  await story.getByRole("button", { name: "Next page" }).click();
  await story.getByRole("button", { name: "All done" }).click();
  await expect(page.locator("[data-screen=today]")).toBeVisible();

  await page.getByRole("button", { name: "Colors", exact: true }).click();
  const moment = page.locator("[data-screen=moment]");
  await expect(moment).toContainText("Tap Pink");
  await expect(moment).not.toContainText("Soon");
  if (testInfo.project.name === "iphone") await moment.screenshot({ path: "/opt/cursor/artifacts/brand_moment_iphone.png" });
  await moment.locator("[data-color=pink]").click();
  await expect(page.locator("[data-screen=today]")).toBeVisible();
});

test("color tiles keep Orange and diagonal inside the tile", async ({ page }, testInfo) => {
  await openChild(page);
  await page.getByRole("button", { name: "LittleNest Colors" }).click();
  const tile = page.locator("[data-activity=mix]");
  await expect(tile.locator(".color-word")).toHaveText("Orange");
  await expect(tile.locator(".color-pattern")).toHaveText("diagonal");
  const tileBox = await tile.boundingBox();
  const wordBox = await tile.locator(".color-word").boundingBox();
  const patternBox = await tile.locator(".color-pattern").boundingBox();
  expect(tileBox && wordBox && patternBox).toBeTruthy();
  expect(wordBox!.x).toBeGreaterThanOrEqual(tileBox!.x - 1);
  expect(wordBox!.x + wordBox!.width).toBeLessThanOrEqual(tileBox!.x + tileBox!.width + 1);
  expect(patternBox!.x).toBeGreaterThanOrEqual(tileBox!.x - 1);
  expect(patternBox!.x + patternBox!.width).toBeLessThanOrEqual(tileBox!.x + tileBox!.width + 1);
  if (testInfo.project.name === "iphone") await page.locator(".color-board").screenshot({ path: "/opt/cursor/artifacts/brand_colors_iphone.png" });
  if (testInfo.project.name === "chromium") {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.locator(".color-board").screenshot({ path: "/opt/cursor/artifacts/brand_colors_ipad.png" });
  }
});

test("money tiles have pictures and lemonade and clock controls fit", async ({ page }, testInfo) => {
  await openChild(page);
  await page.getByRole("button", { name: "LittleNest Time & Money" }).click();
  await page.getByRole("button", { name: "Money play" }).click();
  const menu = page.locator("[data-money-play=true]");
  await expect(menu.locator("svg")).toHaveCount(5);
  if (testInfo.project.name === "iphone") await menu.screenshot({ path: "/opt/cursor/artifacts/brand_money_iphone.png" });
  await page.getByRole("button", { name: "Lemonade stand" }).click();
  const stand = page.locator("[data-screen=lemonade]");
  await expect(stand.locator(".lemonade-art")).toBeVisible();
  const hear = await stand.getByRole("button", { name: "Hear it" }).boundingBox();
  const serve = await stand.getByRole("button", { name: "Serve" }).boundingBox();
  expect(hear!.height).toBeLessThanOrEqual(52);
  expect(serve!.height).toBeGreaterThanOrEqual(48);
  expect(serve!.height).toBeLessThanOrEqual(72);
  const viewport = page.viewportSize();
  expect(serve!.y + serve!.height).toBeLessThanOrEqual((viewport?.height ?? 800) + 1);
  if (testInfo.project.name === "iphone") await stand.screenshot({ path: "/opt/cursor/artifacts/brand_lemonade_iphone.png" });
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Set the clock" }).click();
  const hour = await page.getByRole("button", { name: "Hour hand" }).boundingBox();
  expect(hour!.height).toBeLessThanOrEqual(64);
  if (testInfo.project.name === "iphone") {
    await page.locator("[data-screen=clock]").screenshot({ path: "/opt/cursor/artifacts/brand_clock_iphone.png" });
  }
  if (testInfo.project.name === "chromium") {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.locator("[data-screen=clock]").screenshot({ path: "/opt/cursor/artifacts/brand_clock_ipad.png" });
  }
});

test("Save child is a primary button and the form is centered", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium" && testInfo.project.name !== "iphone");
  if (testInfo.project.name === "chromium") await page.setViewportSize({ width: 1024, height: 768 });
  await install(page);
  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  await passGate(page);
  await page.getByRole("button", { name: /Child profiles/ }).click();
  await page.getByRole("button", { name: "Add another child" }).click();
  const save = page.getByRole("button", { name: "Save child" });
  await expect(save).toBeVisible();
  const box = await save.boundingBox();
  const form = await page.locator(".add-form").boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.height).toBeGreaterThanOrEqual(52);
  expect(form!.width).toBeLessThanOrEqual(460);
  expect(Math.abs(form!.x + form!.width / 2 - viewport.width / 2)).toBeLessThan(80);
  const file = testInfo.project.name === "iphone" ? "/opt/cursor/artifacts/brand_add_child_iphone.png" : "/opt/cursor/artifacts/brand_add_child_ipad.png";
  await page.locator(".add-form").screenshot({ path: file });
});

test("grown-ups rows have icons", async ({ page }, testInfo) => {
  await install(page);
  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  await passGate(page);
  const rows = page.locator(".grownups-row");
  await expect(rows).toHaveCount(9);
  await expect(rows.first().locator("svg")).toHaveCount(2);
  if (testInfo.project.name === "iphone") {
    await page.locator("[data-screen=grownups]").screenshot({ path: "/opt/cursor/artifacts/brand_grownups_iphone.png" });
  }
  if (testInfo.project.name === "chromium") {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.locator(".grownups-rows").screenshot({ path: "/opt/cursor/artifacts/brand_grownups_ipad.png" });
  }
});

test("letter stroke numbers do not overlap", async ({ page }, testInfo) => {
  await openChild(page);
  await page.getByRole("button", { name: "Draw" }).click();
  const numbers = page.locator(".letter-board .stroke-number");
  await expect(numbers.first()).toBeVisible();
  const spots = await numbers.evaluateAll((nodes) =>
    nodes.map((node) => ({ x: Number(node.getAttribute("x")), y: Number(node.getAttribute("y")) })),
  );
  expect(spots.length).toBeGreaterThan(1);
  for (let left = 0; left < spots.length; left += 1) {
    for (let right = left + 1; right < spots.length; right += 1) {
      const gap = Math.hypot(spots[left].x - spots[right].x, spots[left].y - spots[right].y);
      expect(gap).toBeGreaterThanOrEqual(12);
    }
  }
  if (testInfo.project.name === "iphone") {
    await page.locator("[data-screen=draw]").screenshot({ path: "/opt/cursor/artifacts/brand_trace_iphone.png" });
  }
});

test("Build It Play stays inside the iPhone screen", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "iphone");
  await openChild(page);
  await page.locator("[data-dock=games]").click();
  await page.locator("[data-game-tile=build]").click();
  await page.locator("[data-build-tile=move]").click();
  const play = page.locator("[data-play=run]");
  await expect(play).toBeVisible();
  const box = await play.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box).toBeTruthy();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
  await page.screenshot({ path: "/opt/cursor/artifacts/brand_build_iphone.png" });
});
