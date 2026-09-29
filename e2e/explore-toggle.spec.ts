import { expect, test, type Page } from "@playwright/test";
import { answerGate } from "./gate";
import { createdThisWeek } from "./clock";

const WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
};

const profile = {
  activeId: "mia",
  profiles: [
    {
      id: "mia",
      name: "Mia",
      ageRange: "4",
      animal: "fox",
      createdAt: createdThisWeek(),
      stars: 1,
      days: {},
    },
  ],
};

function solve(prompt: string): number {
  const sum = prompt.match(/(\d+)\s*\+\s*(\d+)/);
  if (sum) return Number(sum[1]) + Number(sum[2]);
  const word = prompt.match(/number ([a-z]+)/i)?.[1]?.toLowerCase() ?? "";
  const value = WORDS[word];
  if (!value) throw new Error(`Could not read the grown-up check: ${prompt}`);
  return value;
}

async function answer(page: Page) {
  await answerGate(page, true);
}

test("Show Explore off hides Numbers, Colors, and Games and stays off after reload", async ({ page }) => {
  await page.addInitScript((saved) => {
    localStorage.setItem("littlenest-profiles-v1", JSON.stringify(saved));
    localStorage.setItem("littlenest-silent-hint-v1", "1");
  }, profile);
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  await expect(page.locator("[data-screen='today']")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reading", exact: true })).toBeVisible();
  await expect(page.locator("[data-step=letter]")).toBeVisible();
  await expect(page.locator("[data-area=explore] [data-course=reading]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "LittleNest Numbers" })).toBeVisible();
  await expect(page.getByRole("button", { name: "LittleNest Colors" })).toBeVisible();
  await expect(page.locator("[data-dock='games']")).toBeVisible();

  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  await answer(page);
  await expect(page.locator("[data-screen='grownups']")).toBeVisible();
  await page.getByRole("button", { name: /Settings/ }).click();
  const explore = page.locator("[data-setting='explore']");
  await expect(explore.getByRole("button", { name: "On" })).toHaveAttribute("aria-pressed", "true");
  await explore.getByRole("button", { name: "Off" }).click();
  await expect(explore.getByRole("button", { name: "Off" })).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(async () => page.evaluate(() => localStorage.getItem("littlenest-settings-v1")))
    .toContain('"showExplore":false');

  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator("[data-screen='today']")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reading", exact: true })).toBeVisible();
  await expect(page.locator("[data-step=letter]")).toBeVisible();
  await expect(page.locator("[data-area=explore]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "LittleNest Numbers" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "LittleNest Colors" })).toHaveCount(0);
  await expect(page.locator("[data-dock='games']")).toHaveCount(0);
  await expect(page.locator("[data-course='reading']")).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Mia" }).click();
  await expect(page.locator("[data-screen='today']")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reading", exact: true })).toBeVisible();
  await expect(page.locator("[data-step=letter]")).toBeVisible();
  await expect(page.locator("[data-area=explore]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "LittleNest Numbers" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "LittleNest Colors" })).toHaveCount(0);
  await expect(page.locator("[data-dock='games']")).toHaveCount(0);
});
