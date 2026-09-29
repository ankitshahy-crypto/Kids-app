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

async function install(page: Page) {
  await page.addInitScript((created) => {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const saved = {
      activeId: "mia",
      profiles: [
        {
          id: "mia",
          name: "Mia",
          ageRange: "4",
          animal: "fox",
          createdAt: created,
          stars: 1,
          days: {},
          readingMs: { [key]: 4 * 60_000 },
          readingAwarded: [],
        },
      ],
    };
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.removeItem("kids-app-silent-hint-v1");
  }, createdThisWeek());
  await page.goto("./");
}

test("the kid progress ring does not show clock numbers", async ({ page }) => {
  await install(page);
  await page.getByRole("button", { name: "Mia" }).click();
  const ring = page.locator(".goal-ring");
  await expect(ring).toBeVisible();
  await expect(ring).toHaveAttribute("aria-label", "Today's practice");
  await expect(ring).not.toContainText(/\d|min/i);
});

test("parent time reading tabs show day, week, and month", async ({ page }) => {
  await install(page);
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await passGate(page);
  const chart = page.locator("[data-section=reading]");
  await expect(chart.getByRole("heading", { name: "Time reading" })).toBeVisible();
  await expect(chart).toHaveAttribute("data-range", "day");
  await expect(chart.locator("[data-day]")).toHaveCount(1);
  await expect(chart.locator("[data-minutes='4']")).toBeVisible();
  await expect(chart.locator("[data-total]")).toHaveAttribute("data-total", "4");
  await expect(chart).toContainText("does not add stars");

  await chart.getByRole("tab", { name: "Week" }).click();
  await expect(chart).toHaveAttribute("data-range", "week");
  await expect(chart.locator("[data-day]")).toHaveCount(7);
  await expect(chart.locator("[data-total]")).toHaveAttribute("data-total", "4");
  await expect(chart.locator("[data-average]")).toBeVisible();

  await chart.getByRole("tab", { name: "Month" }).click();
  await expect(chart).toHaveAttribute("data-range", "month");
  expect(await chart.locator("[data-day]").count()).toBeGreaterThanOrEqual(28);
  await expect(chart.locator("[data-total]")).toHaveAttribute("data-total", "4");
  await expect(chart.getByRole("tab", { name: "Day" })).toHaveAttribute("aria-selected", "false");
  await expect(chart.getByRole("tab", { name: "Month" })).toHaveAttribute("aria-selected", "true");
});
