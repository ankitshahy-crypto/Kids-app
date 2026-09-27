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

const tiles = ["Life", "Homes", "Body", "Mix", "Weather", "Senses", "Float"];

async function openScience(page: Page) {
  await page.addInitScript((saved) => {
    localStorage.setItem("littlenest-profiles-v1", JSON.stringify(saved));
    localStorage.setItem("littlenest-silent-hint-v1", "1");
  }, profile);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  await page.locator("[data-course=science]").click();
  await expect(page.locator("[data-science=menu]")).toBeVisible();
}

test("science tiles use icons and stay inside a phone screen", async ({ page }) => {
  await openScience(page);
  const board = page.locator("[data-science=menu]");
  for (const name of tiles) {
    const tile = board.getByRole("button", { name });
    await expect(tile).toBeVisible();
    await expect(tile.locator(".math-activity-art svg")).toHaveCount(1);
    await expect(tile.locator(".sci-mark")).toHaveCount(0);
    const box = await tile.boundingBox();
    expect(box, name).toBeTruthy();
    expect(box!.width).toBeGreaterThan(40);
    expect(box!.x).toBeGreaterThanOrEqual(-1);
    expect(box!.x + box!.width).toBeLessThanOrEqual(391);
  }
});
