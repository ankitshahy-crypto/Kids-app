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
  const pilot = page.getByRole("button", { name: "Pilot focus" });
  const explore = page.locator("[data-area=explore]");
  await expect(pilot).toBeVisible();
  await expect(page.locator("[data-step=letter]")).toBeVisible();
  await expect(explore.getByRole("heading", { name: "Explore" })).toBeVisible();
  await expect(explore).toContainText("New – try it!");
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
