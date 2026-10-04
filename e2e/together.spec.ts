import { expect, test, type Page } from "@playwright/test";
import { answerGate, openTeacherChild } from "./gate";
import { shareUrl } from "../src/config";
import { finishLetterTracing } from "./traceFlow";
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

async function passGate(page: Page) {
  await answerGate(page, true);
}

async function openChild(page: Page) {
  await page.addInitScript((saved) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.removeItem("kids-app-silent-hint-v1");
  }, profile);
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
}

test("read-together tips can be dismissed and turned off", async ({ page }) => {
  await openChild(page);
  await page.getByRole("button", { name: "Draw" }).click();
  const tip = page.locator(".grownup-tip");
  await expect(tip).toBeVisible();
  await expect(tip).toContainText("For grown-ups");
  await expect(page.locator("[data-screen=draw]")).toBeVisible();
  // Hide closes it to a small chip, so nothing below it jumps up.
  await page.getByRole("button", { name: "Hide tip" }).click();
  await expect(tip).toHaveAttribute("data-tip-open", "false");
  await expect(page.locator(".grownup-tip-text")).toHaveCount(0);

  await finishLetterTracing(page);
  await expect(page.locator("[data-screen=today]")).toBeVisible();
  await expect(page.locator(".grownup-tip")).toBeVisible();

  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  await passGate(page);
  await page.getByRole("button", { name: /Settings/ }).click();
  await page.locator("[data-setting=tips]").getByRole("button", { name: "Off" }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator(".grownup-tip")).toHaveCount(0);

  await page.getByRole("button", { name: "Story" }).click();
  await expect(page.locator(".grownup-tip")).toHaveCount(0);
  await expect(page.locator(".story-parent")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Read", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  await passGate(page);
  await page.getByRole("button", { name: /Settings/ }).click();
  await page.locator("[data-setting=tips]").getByRole("button", { name: "On", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Colors", exact: true }).click();
  await expect(page.locator(".grownup-tip")).toBeVisible();
});

test("parent and teacher show each subject's path, up to what the child's age reaches", async ({ page }) => {
  await page.addInitScript((saved) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.removeItem("kids-app-silent-hint-v1");
  }, profile);
  await page.goto("./");
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await passGate(page);
  // Four paths, each named for its subject.
  const parent = page.locator("[data-screen=parent]");
  await expect(parent.locator("[data-section=path] .module-heading")).toHaveText("Reading path");
  await expect(parent.locator("[data-section=path-math] .module-heading")).toHaveText("Numbers path");
  await expect(parent.locator("[data-section=path-colors] .module-heading")).toHaveText("Colors path");
  await expect(parent.locator("[data-section=path-time] .module-heading")).toHaveText("Time and money path");
  const path = parent.locator("[data-section=path]");
  for (const title of ["Letters", "Blending", "Words", "Stories"]) {
    await expect(path.getByText(title, { exact: true })).toBeVisible();
  }
  // Mia is four: the 5–7 and 6–7 stages wait, with a line saying so.
  await expect(path.getByText("Phonics 5–7")).toHaveCount(0);
  await expect(path.getByText("Longer stories 6–7")).toHaveCount(0);
  await expect(path.locator("[data-path-more]")).toContainText("as your child grows");
  await expect(parent.locator("[data-section=path-time]").getByText("Hours and half hours")).toHaveCount(0);
  await expect(path.locator("[data-state=current]")).toHaveCount(1);
  const stage = await path.getAttribute("data-current-stage");
  expect(["letters", "blending", "words", "stories"]).toContain(stage);

  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Teacher", exact: true }).click();
  await passGate(page);
  await openTeacherChild(page, "mia");
  const childPath = page.locator("[data-card=device] [data-section=path]");
  await expect(childPath.locator(".module-heading")).toHaveText("Reading path · Mia");
  await expect(childPath.locator("[data-state=current]")).toHaveCount(1);
  await expect(childPath.locator("[data-later=true]")).toHaveCount(0);
});

test("a six- or seven-year-old's path shows every stage, longer stories included", async ({ page }) => {
  await page.addInitScript((saved) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.removeItem("kids-app-silent-hint-v1");
  }, { ...profile, profiles: [{ ...profile.profiles[0], ageRange: "6-7" }] });
  await page.goto("./");
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await passGate(page);
  const path = page.locator("[data-screen=parent] [data-section=path]");
  await expect(path.getByText("Phonics 5–7")).toBeVisible();
  await expect(path.locator("[data-later=true]")).toBeVisible();
  await expect(path.locator("[data-path-more]")).toHaveCount(0);
  await expect(page.locator("[data-screen=parent] [data-section=path-time]").getByText("Hours and half hours")).toBeVisible();
});

test("sharing falls back to copying the link", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
  });
  await page.goto("./");
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  await passGate(page);
  await page.getByRole("button", { name: /Tell a friend or your school/ }).click();
  const share = page.locator("[data-section=share]");
  await expect(share.locator("[data-share-url]")).toHaveAttribute("data-share-url", shareUrl);
  await expect(share.getByText("No codes and no tracking")).toBeVisible();
  await share.getByRole("button", { name: "Share", exact: true }).click();
  await expect(share.getByRole("status")).toHaveText("Link copied");
});

test("sharing uses the device share sheet when it is available", async ({ page }) => {
  await page.addInitScript((url) => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: { url?: string }) => {
        (window as Window & { __sharedUrl?: string }).__sharedUrl = data.url;
      },
    });
    void url;
  }, shareUrl);
  await page.goto("./");
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  await passGate(page);
  await page.getByRole("button", { name: /Tell a friend or your school/ }).click();
  const share = page.locator("[data-section=share]");
  await share.getByRole("button", { name: "Share", exact: true }).click();
  await expect(share.getByRole("status")).toHaveText("Shared");
  await expect(share.getByText("Link copied")).toHaveCount(0);
  const shared = await page.evaluate(() => (window as Window & { __sharedUrl?: string }).__sharedUrl);
  expect(shared).toBe(shareUrl);
});
