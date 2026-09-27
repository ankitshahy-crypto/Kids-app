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
      stars: 0,
      days: {},
    },
  ],
};

test("the reading path defaults to the letter of the week", async ({ page }) => {
  await page.addInitScript((saved) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.setItem("kids-app-silent-hint-v1", "1");
  }, profile);
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  const today = page.locator("[data-screen=today]");
  await expect(today).toHaveAttribute("data-source", "week");
  await expect(today.getByText(/Letter of the week/)).toBeVisible();
});

test("the teacher view hides class totals under five linked families", async ({ page }) => {
  await page.addInitScript((saved) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.setItem("kids-app-silent-hint-v1", "1");
  }, profile);
  await page.goto("./");
  await page.getByRole("button", { name: "Teacher", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const prompt = await dialog.getByRole("heading").innerText();
  const expected = solvePrompt(prompt);
  const choices = dialog.locator(".gate-choice");
  const count = await choices.count();
  for (let index = 0; index < count; index += 1) {
    if (Number(await choices.nth(index).innerText()) === expected) {
      await choices.nth(index).click();
      break;
    }
  }
  await expect(page.locator("[data-metrics=hidden]")).toContainText("Not enough families linked yet");
  await expect(page.locator("[data-metrics=ready]")).toHaveCount(0);
});
