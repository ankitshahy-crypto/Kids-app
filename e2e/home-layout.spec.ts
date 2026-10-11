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

async function openHome(page: Page) {
  await page.addInitScript((saved) => {
    localStorage.setItem("littlenest-profiles-v1", JSON.stringify(saved));
    localStorage.setItem("littlenest-silent-hint-v1", "1");
  }, profile);
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  await expect(page.locator("[data-screen=today]")).toBeVisible();
}

test("the reading lesson leads, and Explore sits below it", async ({ page }) => {
  await openHome(page);
  // Home says it is Reading, as a name: it was a pill that looked like a button and did nothing.
  const pilot = page.getByRole("heading", { name: "Reading", exact: true });
  await expect(page.getByRole("button", { name: "Reading", exact: true })).toHaveCount(0);
  const explore = page.locator("[data-area=explore]");
  await expect(pilot).toBeVisible();
  await expect(page.locator("[data-step=letter]")).toBeVisible();
  await expect(explore.getByRole("heading", { name: "Explore" })).toBeVisible();
  await expect(explore).not.toContainText("New – try it!");
  await expect(explore.locator("[data-course=reading]")).toHaveCount(0);
  for (const name of ["LittleNest Numbers", "LittleNest Colors", "LittleNest Time & Money", "LittleNest Build", "LittleNest Science"]) {
    await expect(explore.getByRole("button", { name })).toBeVisible();
  }

  const pilotBox = await pilot.boundingBox();
  const trailBox = await page.locator(".trail").boundingBox();
  const exploreBox = await explore.boundingBox();
  expect(pilotBox).toBeTruthy();
  expect(trailBox).toBeTruthy();
  expect(exploreBox).toBeTruthy();
  expect(pilotBox!.y).toBeLessThan(exploreBox!.y);
  expect(trailBox!.y).toBeLessThan(exploreBox!.y);

  await page.setViewportSize({ width: 390, height: 844 });
  for (const course of ["math", "colors", "time", "build", "science"]) {
    const box = await page.locator(`[data-area=explore] [data-course=${course}]`).boundingBox();
    expect(box, course).toBeTruthy();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(391);
  }
});

test("the reading home is one next step: the current stop as the hero with Start, the other stops in a row, and no badge on Explore", async ({ page }) => {
  // The mockup of 2026-10-11: the animal big at the top left, the other stops a thin dashed row of
  // small circles beside it, the current stop pulled out as a large circle with its label and Start,
  // the practice buttons and the dock under it, Explore last with no "New – try it!".
  await page.setViewportSize({ width: 390, height: 763 });
  await openHome(page);
  const today = page.locator("[data-screen=today]");
  const hero = today.locator(".trail-hero");
  await expect(hero).toHaveCount(1);
  await expect(hero).toHaveAttribute("data-step", "letter");
  await expect(hero).toHaveAttribute("data-current", "true");
  await expect(today.locator("[data-hero-label]")).toHaveText("Today's letter");
  const start = today.locator("[data-start]");
  await expect(start).toHaveText("Start");
  await expect(start).toHaveAttribute("data-start", "letter");
  // The hero is the biggest thing on the page, and the other three stops are there, small, in the row.
  const heroBox = await hero.boundingBox();
  expect(heroBox!.width).toBeGreaterThanOrEqual(150);
  for (const step of ["draw", "story", "moment"]) {
    const stop = today.locator(`.trail-row [data-step=${step}]`);
    await expect(stop).toBeVisible();
    await expect(stop).toHaveAttribute("data-current", "false");
    const box = await stop.boundingBox();
    expect(box!.width, step).toBeLessThan(heroBox!.width / 2);
  }
  await expect(today.locator("[data-step]")).toHaveCount(4);
  // The animal is the switch-child control, big, at the top left.
  const animal = page.getByRole("button", { name: "Switch child" });
  const animalBox = await animal.boundingBox();
  expect(animalBox!.width).toBeGreaterThanOrEqual(100);
  expect(animalBox!.x).toBeLessThan(60);
  // Top to bottom: the animal, the hero, Start, the practice buttons, the dock, Explore.
  const y = async (selector: string) => (await page.locator(selector).first().boundingBox())!.y;
  expect(animalBox!.y).toBeLessThan(heroBox!.y);
  expect(heroBox!.y).toBeLessThan(await y("[data-start]"));
  expect(await y("[data-start]")).toBeLessThan(await y("[data-practice]"));
  expect(await y("[data-practice]")).toBeLessThan(await y("[data-dock=closet]"));
  expect(await y("[data-dock=closet]")).toBeLessThan(await y("[data-area=explore]"));
  await expect(page.locator("[data-area=explore]")).not.toContainText("New – try it!");
  await expect(page.locator(".explore-tag")).toHaveCount(0);
  // Start opens the current stop.
  await start.click();
  await expect(page.locator(".blend-track")).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  // A stop in the row still opens, and a finished one is still marked done.
  await today.locator(".trail-row [data-step=draw]").click();
  await expect(page.locator("[data-screen=draw]")).toBeVisible();
});

test("a finished day has no Start: the hero is the last stop, ticked, with All done today! under it", async ({ page }) => {
  const today = new Date().toISOString().slice(0, 10);
  await page.addInitScript(
    ({ saved, today }) => {
      const done = { ...saved, profiles: [{ ...saved.profiles[0], days: { [today]: { reading: { letter: true, draw: true, story: true, moment: true } } } }] };
      localStorage.setItem("littlenest-profiles-v1", JSON.stringify(done));
      localStorage.setItem("littlenest-silent-hint-v1", "1");
    },
    { saved: profile, today },
  );
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  const home = page.locator("[data-screen=today]");
  await expect(home.locator(".trail.is-hero")).toHaveAttribute("data-finished", "true");
  await expect(home.locator("[data-start]")).toHaveCount(0);
  await expect(home.locator("[data-hero-label]")).toHaveText("All done today!");
  const hero = home.locator(".trail-hero");
  await expect(hero).toHaveAttribute("data-step", "moment");
  await expect(hero).toHaveAttribute("aria-label", "Colors, done");
  await expect(hero.locator(".trail-done")).toBeVisible();
  for (const step of ["letter", "draw", "story"]) await expect(home.locator(`.trail-row [data-step=${step}] .trail-done`)).toBeVisible();
  // A finished stop still opens.
  await hero.click();
  await expect(page.locator("[data-screen=moment]")).toBeVisible();
});

test("the lesson path and the dock fit an iPad in landscape without scrolling", async ({ page }) => {
  await openHome(page);
  for (const [width, height] of [
    [1024, 768],
    [1180, 820],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(150);
    const viewport = page.viewportSize()!;
    expect(viewport.height).toBe(height);
    const targets = ["[data-step=letter]", "[data-step=draw]", "[data-step=story]", "[data-step=moment]", "[data-dock=games]", "[data-dock=nest]", "[data-dock=surprise]"];
    for (const selector of targets) {
      const box = await page.locator(selector).boundingBox();
      expect(box, `${selector} at ${width}x${height}`).toBeTruthy();
      expect(box!.y, `${selector} top at ${width}x${height}`).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height, `${selector} bottom at ${width}x${height}`).toBeLessThanOrEqual(height);
      expect(box!.x + box!.width, `${selector} right at ${width}x${height}`).toBeLessThanOrEqual(width);
    }
    const scrolled = await page.evaluate(() => window.scrollY);
    expect(scrolled, `no scroll needed at ${width}x${height}`).toBe(0);
    if (width === 1024) {
      await page.screenshot({ path: "test-results/screenshots/home-ipad-landscape.png", animations: "disabled" });
    }
  }
});
