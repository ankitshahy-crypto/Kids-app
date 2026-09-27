import { expect, test, type Page } from "@playwright/test";
import { solvePrompt } from "./solveGate";

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
  return solvePrompt(prompt);
}

async function openGate(page: Page, which: "Parent" | "Teacher") {
  await page.getByRole("button", { name: which, exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

async function choose(page: Page, correct: boolean) {
  const dialog = page.getByRole("dialog");
  const prompt = await dialog.getByRole("heading").innerText();
  const answer = solve(prompt);
  const buttons = dialog.locator(".gate-choice");
  const count = await buttons.count();
  for (let i = 0; i < count; i += 1) {
    const value = Number(await buttons.nth(i).innerText());
    if (correct ? value === answer : value !== answer) {
      await buttons.nth(i).click();
      return;
    }
  }
  throw new Error("No matching choice");
}

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("button", { name: "Parent", exact: true })).toBeVisible();
});

test("one tap opens the grown-up check and Cancel stays on the start screen", async ({ page }) => {
  await openGate(page, "Parent");
  await expect(page.locator("[data-screen='start']")).toBeVisible();
  await expect(page.locator("[data-screen='parent']")).toHaveCount(0);
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("[data-screen='start']")).toBeVisible();
});

test("a wrong number does not open Parent", async ({ page }) => {
  await openGate(page, "Parent");
  await choose(page, false);
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Try another one.")).toBeVisible();
  await expect(page.locator("[data-screen='parent']")).toHaveCount(0);
});

test("the right answer opens Parent and Teacher", async ({ page }) => {
  await openGate(page, "Parent");
  await choose(page, true);
  await expect(page.locator("[data-screen='parent']")).toBeVisible();

  await page.getByRole("button", { name: "Back" }).click();
  await openGate(page, "Teacher");
  await choose(page, true);
  await expect(page.locator("[data-screen='teacher']")).toBeVisible();
});

test("Enter on Parent opens the check", async ({ page }) => {
  await page.getByRole("button", { name: "Parent", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("[data-screen='parent']")).toHaveCount(0);
});
