import { expect, test, type Page } from "@playwright/test";
import { answerGate } from "./gate";
import { finishPathTrace, scribbleCorner } from "./traceFlow";
import { createdThisWeek } from "./clock";

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
      stickers: [{ subject: "reading", kind: "word", label: "cat" }],
      ladder: { step: 3, successes: 0 },
    },
  ],
};

async function openToday(page: Page) {
  await page.addInitScript((saved) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.removeItem("kids-app-silent-hint-v1");
  }, profile);
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
}

test("tracing a blended word plays the word and keeps the name on this device", async ({ page }, testInfo) => {
  const requested: string[] = [];
  page.on("request", (request) => requested.push(request.url()));
  await openToday(page);
  await page.getByRole("button", { name: "Trace a word" }).click();
  const word = page.locator("[data-screen=word]");
  await expect(word).toHaveAttribute("data-word", "cat");
  await word.getByRole("button", { name: "Your turn" }).click();
  await scribbleCorner(page, "word");
  if (testInfo.project.name === "chromium") {
    await page.screenshot({ path: "test-results/screenshots/word_trace_board.png" });
  }
  await finishPathTrace(page, "word");
  await expect(page.locator("[data-screen=today] .star-count")).toHaveAttribute("data-stars", "1");
  expect(requested.join(" ")).not.toMatch(/mia/i);
});

test("tracing the child's name uses the profile and does not send the name", async ({ page }, testInfo) => {
  const requested: string[] = [];
  page.on("request", (request) => requested.push(request.url()));
  await openToday(page);
  await page.getByRole("button", { name: "Trace my name" }).click();
  const name = page.locator("[data-screen=my-name]");
  await expect(name).toHaveAttribute("data-name", "Mia");
  await expect(name.locator("[data-glyph-label=M]")).toHaveAttribute("data-current", "true");
  await name.getByRole("button", { name: "Your turn" }).click();
  await scribbleCorner(page, "my-name");
  if (testInfo.project.name === "chromium") {
    await page.screenshot({ path: "test-results/screenshots/name_trace_board.png" });
  }
  await finishPathTrace(page, "my-name");
  await expect(page.locator("[data-screen=today] .star-count")).toHaveAttribute("data-stars", "1");
  await page.getByRole("button", { name: "Stickers" }).click();
  await expect(page.locator("[data-sticker=mia][data-kind=word]")).toBeVisible();
  expect(requested.join(" ")).not.toMatch(/mia/i);
});

test("printables include shape, word, and name stroke sheets", async ({ page }) => {
  await page.addInitScript((saved) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.removeItem("kids-app-silent-hint-v1");
  }, profile);
  await page.goto("./");
  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  await answerGate(page, true);
  await page.getByRole("button", { name: /Printables/ }).click();
  const root = page.locator("[data-section=printables]");
  await expect(root.locator("[data-sheet=name]")).toHaveAttribute("data-name", "Mia");
  await expect(root.locator("[data-sheet=name]")).toContainText("M");
  await expect(root.locator("[data-sheet=name]")).toContainText("a");
  await page.getByRole("button", { name: "Number sheets" }).click();
  await expect(root.locator("[data-sheet=shape][data-shape=circle]")).toBeVisible();
  await expect(root.locator("[data-sheet=shape][data-shape=heart] .stroke-arrow").first()).toBeVisible();
  await expect(root.locator("[data-sheet=shape][data-shape=star] .stroke-start").first()).toBeVisible();
});
