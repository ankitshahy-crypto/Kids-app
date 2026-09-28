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

const writing: Record<string, { level: number; successes: number; struggles: number }> = {};
for (const letter of "abcdefghijklmnopqrstuvwxyz") {
  writing[`letter:${letter}:upper`] = { level: 5, successes: 0, struggles: 0 };
  writing[`letter:${letter}:lower`] = { level: 5, successes: 0, struggles: 0 };
}

const memoryProfile = {
  activeId: "mia",
  profiles: [
    {
      id: "mia",
      name: "Mia",
      ageRange: "4",
      animal: "fox",
      createdAt: createdThisWeek(),
      stars: 2,
      days: {},
      writing,
    },
  ],
};

const plainProfile = {
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
  const dialog = page.getByRole("dialog");
  const prompt = await dialog.getByRole("heading").innerText();
  const expected = solve(prompt);
  const buttons = dialog.locator(".gate-choice");
  const count = await buttons.count();
  for (let index = 0; index < count; index += 1) {
    if (Number(await buttons.nth(index).innerText()) === expected) {
      await buttons.nth(index).click();
      return;
    }
  }
  throw new Error("No matching choice");
}

async function dismissHint(page: Page) {
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
}

test("a teacher sets a writing level and a parent can see it", async ({ page }, testInfo) => {
  await page.addInitScript((saved) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.removeItem("kids-app-silent-hint-v1");
  }, plainProfile);
  await page.goto("./");
  await page.getByRole("button", { name: "Teacher", exact: true }).click();
  await passGate(page);
  const circle = page.locator("[data-writing-item='shape:circle']");
  await circle.getByRole("button", { name: "Circle level 4" }).click();
  await expect(circle).toHaveAttribute("data-writing-level", "4");
  if (testInfo.project.name === "chromium") {
    await page.locator("[data-section=writing]").first().screenshot({ path: "test-results/screenshots/writing_levels_teacher.png" });
  }
  await page.reload();
  await page.getByRole("button", { name: "Teacher", exact: true }).click();
  await passGate(page);
  await expect(page.locator("[data-writing-item='shape:circle']")).toHaveAttribute("data-writing-level", "4");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await passGate(page);
  await expect(page.locator("[data-section=writing][data-editable=false] [data-writing-item='shape:circle']")).toHaveAttribute(
    "data-writing-level",
    "4",
  );
});

test("memory writing accepts the letter path, rejects a scribble, and keeps the star", async ({ page }, testInfo) => {
  await page.addInitScript((saved) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.removeItem("kids-app-silent-hint-v1");
  }, memoryProfile);
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  await dismissHint(page);
  await page.getByRole("button", { name: "Draw" }).click();
  const root = page.locator("[data-screen=draw]");
  await expect(root).toHaveAttribute("data-guide", "memory");
  await expect(root).toHaveAttribute("data-level", "5");
  await expect(root.locator(".letter-prompt").first()).toContainText(/Write big/i);
  await expect(root.locator(".stroke-guide")).toHaveCount(0);
  if (testInfo.project.name === "chromium") {
    await page.screenshot({ path: "test-results/screenshots/memory_writing_board.png" });
  }

  const board = root.locator(".letter-board");
  const box = await board.boundingBox();
  if (!box) throw new Error("The writing box has no box");
  await page.mouse.move(box.x + 16, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 16, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await root.getByRole("button", { name: "Done" }).click();
  await expect(root).toHaveAttribute("data-hint", "Almost. Try again.");
  await expect(root).toHaveAttribute("data-level", "5");
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "2");

  const letter = (await root.getAttribute("data-letter")) ?? "a";
  const raw = (await board.getAttribute("data-stations")) ?? "";
  const svg = board.locator("svg");
  const svgBox = await svg.boundingBox();
  if (!svgBox) throw new Error("The writing box has no svg");
  const points = raw
    .split(" ")
    .filter(Boolean)
    .map((pair) => {
      const [x, y] = pair.split(",").map(Number);
      return { x: svgBox.x + (x / 100) * svgBox.width, y: svgBox.y + (y / 100) * svgBox.height };
    });
  await page.mouse.move(points[0]?.x ?? 0, points[0]?.y ?? 0);
  await page.mouse.down();
  for (const point of points) await page.mouse.move(point.x, point.y);
  await page.mouse.up();
  await root.getByRole("button", { name: "Done" }).click();
  await expect(root).toHaveAttribute("data-casing", "lower");
  await expect(root).toHaveAttribute("data-guide", "memory");
  const saved = await page.evaluate(() => localStorage.getItem("littlenest-profiles-v1"));
  const stored = JSON.parse(saved ?? "{}") as { profiles: { stars: number; writing: Record<string, { level: number }> }[] };
  expect(stored.profiles[0]?.stars).toBe(2);
  expect(stored.profiles[0]?.writing[`letter:${letter}:upper`]?.level).toBe(5);
});
