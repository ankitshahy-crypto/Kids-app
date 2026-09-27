import { expect, test, type Page } from "@playwright/test";
import { pinDigest } from "../src/data/grownupPin";

async function unlock(page: Page, pin: string) {
  const button = page.getByRole("button", { name: "Unlock", exact: true });
  await expect(button).not.toHaveAttribute("data-busy", "true");
  await page.getByLabel("4-digit PIN").fill(pin);
  await button.click();
}

test("the correct PIN opens Parent", async ({ page }) => {
  const digest = pinDigest("1234");
  await page.addInitScript((saved) => {
    localStorage.setItem("littlenest-grownup-pin-v1", saved);
  }, digest);
  await page.goto("./");
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await expect(page.locator("[data-gate=pin]")).toBeVisible();
  await unlock(page, "1234");
  await expect(page.locator("[data-screen=parent]")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("five wrong forgot-PIN answers lock, and a reload keeps the lock", async ({ page }) => {
  const digest = pinDigest("1234");
  await page.addInitScript((saved) => {
    localStorage.setItem("littlenest-grownup-pin-v1", saved);
  }, digest);
  await page.goto("./");
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await page.getByRole("button", { name: "Forgot PIN?" }).click();
  await expect(page.locator("[data-gate=recover]")).toBeVisible();
  await expect(page.locator(".gate-choice")).toHaveCount(0);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const button = page.getByRole("button", { name: "Check", exact: true });
    await expect(button).not.toHaveAttribute("data-busy", "true");
    await page.getByLabel("Answer").fill("0");
    await button.click();
  }
  await expect(page.getByText("Wait a moment, then try again.")).toBeVisible();
  await expect(page.locator("[data-locked=true]")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await expect(page.locator("[data-locked=true]")).toBeVisible();
  await expect(page.locator("[data-screen=parent]")).toHaveCount(0);
});

test("five wrong PINs start a cooldown that blocks the right PIN", async ({ page }) => {
  const digest = pinDigest("1234");
  await page.addInitScript((saved) => {
    localStorage.setItem("littlenest-grownup-pin-v1", saved);
  }, digest);
  await page.goto("./");
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await unlock(page, "0000");
  }
  await expect(page.getByText("Wait a moment, then try again.")).toBeVisible();
  await expect(page.locator("[data-locked=true]")).toBeVisible();
  await expect(page.getByRole("button", { name: "Unlock", exact: true })).toBeDisabled();
  await expect(page.getByLabel("4-digit PIN")).toBeDisabled();
  await expect(page.locator("[data-screen=parent]")).toHaveCount(0);
});
