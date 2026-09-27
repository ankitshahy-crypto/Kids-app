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

async function openMenu(page: Page) {
  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const prompt = await dialog.getByRole("heading").innerText();
  const expected = solve(prompt);
  const buttons = dialog.locator(".gate-choice");
  const count = await buttons.count();
  for (let i = 0; i < count; i += 1) {
    if (Number(await buttons.nth(i).innerText()) === expected) {
      await buttons.nth(i).click();
      break;
    }
  }
  await expect(page.locator("[data-screen='grownups']")).toBeVisible();
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
}

test("a child never sees sign-in", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("[data-screen='start']")).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in/i })).toHaveCount(0);
  await expect(page.getByLabel("Email")).toHaveCount(0);
});

test("a signed-in grown-up can choose backup, a teacher flag, and deletion", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem("littlenest-auth-preview", "signed-in");
  });
  await page.goto("./");
  await expect(page.getByRole("button", { name: /sign in/i })).toHaveCount(0);
  await openMenu(page);
  await page.getByRole("button", { name: /Account/ }).click();
  const account = page.locator("[data-section='account']");
  await expect(account).toHaveAttribute("data-auth", "on");
  await expect(account).toHaveAttribute("data-signed-in", "true");
  await expect(page.getByText("Signed in")).toBeVisible();
  await expect(page.getByText("grownup@example.com")).toBeVisible();
  await expect(page.getByRole("button", { name: "Back up & sync progress" })).toHaveCount(0);
  await expect(page.getByText("Back up & sync progress")).toBeVisible();
  await expect(page.getByRole("button", { name: "Teacher", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Teacher", exact: true }).click();
  await expect(account).toHaveAttribute("data-role", "teacher");
  await expect(page.getByText("Clever")).toBeVisible();
  await page.getByRole("button", { name: "On", exact: true }).click();
  await expect(account).toHaveAttribute("data-sync", "on");
  await page.getByRole("button", { name: "Delete all data", exact: true }).click();
  await expect(page.getByRole("button", { name: "Yes, delete all data" })).toBeVisible();
  await page.getByRole("button", { name: "Delete account", exact: true }).click();
  await expect(page.getByRole("button", { name: "Yes, delete the account" })).toBeVisible();

  if (testInfo.project.name === "iphone") {
    await page.screenshot({ path: "/opt/cursor/artifacts/account_signed_in_iphone.png", fullPage: true });
  }
  if (testInfo.project.name === "pixel") {
    await page.screenshot({ path: "/opt/cursor/artifacts/account_signed_in_pixel.png", fullPage: true });
  }
  if (testInfo.project.name === "chromium") {
    await page.screenshot({ path: "/opt/cursor/artifacts/account_signed_in_desktop.png", fullPage: true });
  }
});

test("the demo account page stays quiet when sign-in is not set up", async ({ page }, testInfo) => {
  await page.goto("./");
  await openMenu(page);
  await page.getByRole("button", { name: /Privacy/ }).click();
  await expect(page.getByText("Back up & sync progress")).toBeVisible();
  await expect(page.getByText("Photos are not uploaded")).toBeVisible();
  if (testInfo.project.name === "iphone") {
    await page.screenshot({ path: "/opt/cursor/artifacts/account_privacy_iphone.png", fullPage: true });
  }
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: /Account/ }).click();
  await expect(page.locator("[data-auth='off']")).toBeVisible();
  await expect(page.getByText("Not signed in")).toBeVisible();
  if (testInfo.project.name === "iphone") {
    await page.screenshot({ path: "/opt/cursor/artifacts/account_off_iphone.png", fullPage: true });
  }
});
