import { expect, test, type Page } from "@playwright/test";
import { solvePrompt } from "./solveGate";

const saved = {
  activeId: "mia",
  profiles: [
    {
      id: "mia",
      name: "Mia",
      ageRange: "4",
      animal: "fox",
      createdAt: "2026-09-01T15:00:00.000Z",
      stars: 3,
      days: {},
    },
  ],
};

async function passMath(page: Page) {
  const dialog = page.getByRole("dialog");
  const prompt = await dialog.getByRole("heading").innerText();
  const answer = solvePrompt(prompt);
  await dialog.locator(".gate-choice", { hasText: new RegExp(`^${answer}$`) }).click();
}

test("the start screen has no outbound link, and share stays behind the gate", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("[data-screen='start']")).toBeVisible();
  await expect(page.locator("[data-outbound]")).toHaveCount(0);
  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  await passMath(page);
  await page.getByRole("button", { name: /Tell a friend/ }).click();
  await expect(page.locator("[data-outbound='share']")).toBeVisible();
});

test("PIN recovery replaces the PIN and keeps the child's progress", async ({ page }) => {
  await page.addInitScript((payload) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(payload));
  }, saved);
  await page.goto("./");
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await expect(page.locator("[data-gate='math']")).toBeVisible();
  await passMath(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("New PIN").fill("1234");
  await page.locator("[data-setting='pin']").getByRole("button", { name: "Save PIN" }).click();
  await expect(page.getByText("Saved on this device. Progress stays put.")).toBeVisible();

  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await expect(page.locator("[data-gate='pin']")).toBeVisible();
  await page.getByRole("textbox", { name: "4-digit PIN" }).fill("0000");
  await page.getByRole("button", { name: "Unlock" }).click();
  await expect(page.getByText("Try another one.")).toBeVisible();
  await page.getByRole("button", { name: "Forgot PIN?" }).click();
  await expect(page.locator("[data-gate='recover']")).toBeVisible();
  await passMath(page);
  await expect(page.locator("[data-gate='newpin']")).toBeVisible();
  await page.getByRole("textbox", { name: "4-digit PIN" }).fill("4321");
  await page.getByRole("button", { name: "Save PIN" }).click();
  await expect(page.locator("[data-screen='parent']")).toBeVisible();

  const stored = await page.evaluate(() => ({
    profiles: localStorage.getItem("kids-app-profiles-v1") ?? localStorage.getItem("littlenest-profiles-v1") ?? "",
    pin: localStorage.getItem("littlenest-grownup-pin-v1") ?? "",
  }));
  expect(stored.profiles).toContain("Mia");
  expect(stored.profiles).toContain("fox");
  expect(stored.pin).toMatch(/^[0-9a-f]+$/);
  expect(stored.pin).not.toBe("4321");
});
