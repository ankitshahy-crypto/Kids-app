import { expect, test } from "@playwright/test";
import { solvePrompt } from "./solveGate";

const profile = {
  activeId: "mia",
  profiles: [
    {
      id: "mia",
      name: "Mia",
      ageRange: "4",
      animal: "fox",
      createdAt: "2026-09-01T15:00:00.000Z",
      stars: 1,
      days: {},
    },
  ],
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((saved) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.removeItem("kids-app-silent-hint-v1");
  }, profile);
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
});

test("a math section loads on its own", async ({ page }) => {
  await page.getByRole("button", { name: "LittleNest Numbers" }).click();
  await page.locator("[data-activity='count']").click();
  await expect(page.locator("[data-screen='count']")).toBeVisible();
});

test("turning off Explore leaves the reading lesson", async ({ page }) => {
  await expect(page.locator("[data-explore='sections']")).toBeVisible();
  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const answer = solvePrompt(await dialog.getByRole("heading").innerText());
  await dialog.locator(".gate-choice", { hasText: new RegExp(`^${answer}$`) }).click();
  await page.getByRole("button", { name: /^Settings/ }).click();
  await page.locator("[data-setting='explore']").getByRole("button", { name: "Off", exact: true }).click();
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.locator("[data-step='letter']")).toBeVisible();
  await expect(page.locator("[data-explore='sections']")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "LittleNest Numbers" })).toHaveCount(0);
});
