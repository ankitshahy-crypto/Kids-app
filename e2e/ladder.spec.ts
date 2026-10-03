import { expect, test, type Page } from "@playwright/test";
import { answerGate, openTeacherChild } from "./gate";
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
      ladder: { step: 1, successes: 0 },
    },
  ],
};

async function passGate(page: Page) {
  await answerGate(page, true);
}

test("a teacher places the word ladder and the egg uses that step", async ({ page }, testInfo) => {
  await page.addInitScript((saved) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.removeItem("kids-app-silent-hint-v1");
  }, profile);
  await page.goto("./");
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "Switch child" }).click({ delay: 1600 });
  await page.getByRole("button", { name: "Teacher", exact: true }).click();
  await passGate(page);
  await openTeacherChild(page, "mia");
  await page.getByRole("button", { name: "Word ladder step 2" }).click();
  await expect(page.locator("[data-section=ladder]")).toHaveAttribute("data-ladder-step", "2");
  await expect(page.locator("[data-stage=word-ladder]")).toContainText("Two letters");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await passGate(page);
  const parent = page.locator("[data-section=ladder]");
  await expect(parent).toHaveAttribute("data-ladder-step", "2");
  await expect(parent).toHaveAttribute("data-editable", "false");
  await expect(parent).toContainText("at, in, it");
  await expect(page.locator("[data-stage=word-ladder]")).toHaveAttribute("data-ladder-step", "2");
  if (testInfo.project.name === "chromium") {
    await page.locator("[data-section=path]").screenshot({ path: "test-results/screenshots/word_ladder_path.png" });
  }
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Mia" }).click();
  await page.locator("[data-dock=games]").click();
  await page.locator("[data-game-tile=hatch]").click();
  const board = page.locator("[data-game=hatch] .game-frame");
  await expect(board).toHaveAttribute("data-ladder-step", "2");
  // The egg's picture is the question, so its word is one with a drawing. (A two-letter word has none:
  // "at" cannot be drawn.) The first egg asks for the first sound, a letter this child has been taught.
  const word = (await board.getAttribute("data-word")) ?? "";
  expect(["m", "a"]).toContain(word[0]);
  await expect(board.locator(".hatch-picture svg")).toBeVisible();
  await expect(board.locator('[data-letter][data-needed="true"]')).toHaveCount(1);
  await expect(board.locator("[data-letter]")).toHaveCount(3);
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/word_ladder_hatch.png" });
  }
});
