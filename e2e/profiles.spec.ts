import { expect, test, type Page } from "@playwright/test";

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

function solve(prompt: string): number {
  const sum = prompt.match(/(\d+)\s*\+\s*(\d+)/);
  if (sum) return Number(sum[1]) + Number(sum[2]);
  const word = prompt.match(/number ([a-z]+)/i)?.[1]?.toLowerCase() ?? "";
  const value = WORDS[word];
  if (!value) throw new Error(`Could not read the grown-up check: ${prompt}`);
  return value;
}

async function passGate(page: Page) {
  const dialog = page.getByRole("dialog");
  const prompt = await dialog.getByRole("heading").innerText();
  const answer = solve(prompt);
  const buttons = dialog.locator(".gate-choice");
  const count = await buttons.count();
  for (let i = 0; i < count; i += 1) {
    const value = Number(await buttons.nth(i).innerText());
    if (value === answer) {
      await buttons.nth(i).click();
      return;
    }
  }
  throw new Error("No matching choice");
}

/** The first child is added from the welcome button and lands on their Today screen. */
async function addSam(page: Page) {
  await page.getByRole("button", { name: "Add a child", exact: true }).click();
  await passGate(page);
  await expect(page.locator("[data-screen=parent]")).toBeVisible();
  await page.getByLabel("First name or initial").fill("Sam");
  await page.getByRole("button", { name: "4", exact: true }).click();
  await page.getByRole("button", { name: "Fox", exact: true }).click();
  await page.getByRole("button", { name: "Save child" }).click();
  await expect(page.locator("[data-screen=today]")).toBeVisible();
}

test("a first run adds a child and starts their day", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("[data-first-run=true]")).toContainText("Add your child to begin");
  await addSam(page);
  await expect(page.locator(".chunk-strip")).toHaveText("4 more!");
  await page.getByRole("button", { name: "Switch child" }).click();
  await expect(page.locator("[data-screen=start]")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sam", exact: true })).toBeVisible();
  const saved = await page.evaluate(() => localStorage.getItem("littlenest-profiles-v1"));
  expect(saved).toContain("Sam");
});

test("removing a child clears them from the start screen", async ({ page }) => {
  await page.goto("./");
  await addSam(page);
  await page.getByRole("button", { name: "Switch child" }).click();
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await passGate(page);
  await expect(page.getByText("Sam · age 4")).toBeVisible();
  await page.getByRole("button", { name: "Children", exact: true }).click();
  await page.locator("[data-confirm=ask]").click();
  await page.locator("[data-confirm=ready]").click();
  await expect(page.getByRole("button", { name: "Add a child", exact: true })).toBeVisible();
  await expect(page.locator(".child-name", { hasText: "Sam" })).toHaveCount(0);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator("[data-first-run=true]")).toBeVisible();
  const saved = await page.evaluate(() => localStorage.getItem("littlenest-profiles-v1") ?? "");
  expect(saved).not.toContain("Sam");
});
