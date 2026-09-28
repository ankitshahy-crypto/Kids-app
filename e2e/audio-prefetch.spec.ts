import { expect, test, type Page } from "@playwright/test";
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
      stars: 0,
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
  const dialog = page.getByRole("dialog");
  const prompt = await dialog.getByRole("heading").innerText();
  const expected = solve(prompt);
  const buttons = dialog.locator(".gate-choice");
  const count = await buttons.count();
  for (let i = 0; i < count; i += 1) {
    const button = buttons.nth(i);
    await expect(button).not.toHaveAttribute("data-busy", "true");
    const value = Number(await button.innerText());
    if (value === expected) {
      await button.click();
      return;
    }
  }
  throw new Error("No matching choice");
}

test("opening Grown-ups settings does not request missing audio files", async ({ page }) => {
  const missing: string[] = [];
  page.on("response", (response) => {
    const url = response.url();
    if (url.includes("/audio/") && response.status() === 404) missing.push(url);
  });
  await page.addInitScript((saved) => {
    localStorage.setItem("littlenest-profiles-v1", JSON.stringify(saved));
    localStorage.setItem("littlenest-silent-hint-v1", "1");
  }, profile);
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  await answer(page);
  await page.getByRole("button", { name: /Settings/ }).click();
  await expect(page.locator("[data-setting=explore]")).toBeVisible();
  await expect
    .poll(async () => page.evaluate(() => document.documentElement.dataset.offline ?? ""), { timeout: 20000 })
    .toBe("ready");
  expect(missing).toEqual([]);
});
