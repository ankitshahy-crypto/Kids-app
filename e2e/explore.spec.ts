import { expect, test } from "@playwright/test";

const profile = {
  activeId: "mia",
  profiles: [
    {
      id: "mia",
      name: "Mia",
      ageRange: "4",
      animal: "fox",
      createdAt: "2026-09-01T15:00:00.000Z",
      stars: 2,
      days: {},
    },
  ],
};

test("a crashed Explore section leaves the reading lesson in place", async ({ page }) => {
  await page.addInitScript((saved) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.setItem("littlenest-explore-crash", "math");
    localStorage.removeItem("kids-app-silent-hint-v1");
  }, profile);
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  await expect(page.locator("[data-step='letter']")).toBeVisible();
  await page.getByRole("button", { name: "LittleNest Numbers" }).click();
  await page.locator("[data-activity='count']").click();
  await expect(page.locator("[data-explore-error='math']")).toBeVisible();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "2");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.locator("[data-course='reading']").click();
  await expect(page.locator("[data-step='letter']")).toBeVisible();
  await expect(page.locator("[data-explore-error]")).toHaveCount(0);
  const stored = await page.evaluate(() => localStorage.getItem("littlenest.section.math.child"));
  expect(stored === "mia" || stored === null).toBe(true);
});
