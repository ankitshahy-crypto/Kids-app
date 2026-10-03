import { expect, test, type Page } from "@playwright/test";
import { answerGate, openClassPlace } from "./gate";
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
    },
  ],
};

const placement = {
  version: 1,
  origin: "device",
  classId: "device-class",
  updatedAt: "2026-09-26T00:00:00.000Z",
  subjects: {
    time: {
      classDefault: { subject: "time", stageId: "day", weekIndex: 0 },
      byChildId: {},
    },
  },
};

async function install(page: Page) {
  await page.addInitScript(
    ({ saved, placed }) => {
      localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
      localStorage.setItem("littlenest-placement-v1", JSON.stringify(placed));
      localStorage.removeItem("kids-app-silent-hint-v1");
    },
    { saved: profile, placed: placement },
  );
  await page.goto("./");
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "LittleNest Time & Money" }).click();
  await expect(page.locator("[data-screen=today]")).toHaveAttribute("data-subject", "time");
  await expect(page.locator("[data-screen=today]")).toHaveAttribute("data-stage", "day");
}

async function passGate(page: Page) {
  await answerGate(page, true);
}

test("morning is the week 0 day task and a wrong part only wiggles", async ({ page }, testInfo) => {
  await install(page);
  if (testInfo.project.name === "chromium") {
    await page.locator("[data-screen=today]").screenshot({ path: "test-results/screenshots/time_money_today.png" });
  }
  await page.getByRole("button", { name: "Parts of the day" }).click();
  const play = page.locator("[data-screen=day]");
  await expect(play).toHaveAttribute("data-task", "parts");
  await expect(play).toHaveAttribute("data-target", "morning");
  await play.locator("[data-part=afternoon]").click();
  await expect(play.locator("[data-part=afternoon]")).toHaveAttribute("data-wiggle", "true");
  await play.locator("[data-part=morning]").click();
  await expect(page.locator("[data-screen=today] .star-count")).toHaveAttribute("data-stars", "1");
  await page.locator("[data-section-back]").click();
  await expect(page.locator("[data-step=letter]")).not.toHaveClass(/is-done/);
});

test("next hour sets the clock and does not finish the reading lesson", async ({ page }, testInfo) => {
  await install(page);
  await page.getByRole("button", { name: "Set the clock" }).click();
  const clock = page.locator("[data-screen=clock]");
  await expect(clock).toHaveAttribute("data-mode", "hour");
  await expect(clock).toHaveAttribute("data-hour", "12");
  await expect(clock).toHaveAttribute("data-target-hour", "1");
  await expect(clock).toHaveAttribute("data-target-minute", "0");
  if (testInfo.project.name === "chromium") {
    await clock.screenshot({ path: "test-results/screenshots/time_money_clock.png" });
  }
  await clock.getByRole("button", { name: "Next hour" }).click();
  await expect(clock).toHaveAttribute("data-matched", "true");
  await expect(page.locator("[data-screen=today] .star-count")).toHaveAttribute("data-stars", "1");
  await page.locator("[data-section-back]").click();
  await expect(page.locator("[data-step=letter]")).not.toHaveClass(/is-done/);
});

test("the pretend shop takes the matching coin", async ({ page }, testInfo) => {
  await install(page);
  await page.getByRole("button", { name: "Pretend shop" }).click();
  const shop = page.locator("[data-screen=shop]");
  await expect(shop).toHaveAttribute("data-task", "one");
  await expect(shop).toHaveAttribute("data-snack", "apple");
  await expect(shop).toHaveAttribute("data-coin", "dime");
  if (testInfo.project.name === "chromium") {
    await shop.screenshot({ path: "test-results/screenshots/time_money_shop.png" });
  }
  await shop.locator("[data-coin=penny]").click();
  await expect(shop.locator("[data-coin=penny]")).toHaveAttribute("data-wiggle", "true");
  await shop.locator("[data-coin=dime]").click();
  await expect(page.locator("[data-screen=today] .star-count")).toHaveAttribute("data-stars", "1");
});

test("teacher placement and printables cover the clock and coins", async ({ page }) => {
  await install(page);
  // A section page has Back where the child's animal is on the reading path, so step back to the path first.
  await page.locator("[data-section-back]").click();
  await page.getByRole("button", { name: "Switch child" }).click({ delay: 1600 });
  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  await passGate(page);
  await page.getByRole("button", { name: /Printables/ }).click();
  await page.getByRole("button", { name: "Time sheets" }).click();
  await expect(page.locator("[data-subject=time]")).toBeVisible();
  await expect(page.locator("[data-sheet=clock]")).toBeVisible();
  await expect(page.locator("[data-sheet=clock] [data-clock='3:00']")).toBeVisible();
  await expect(page.locator("[data-sheet=clock] [data-clock=empty]").first()).toBeVisible();
  await expect(page.locator("[data-sheet=coins]")).toBeVisible();
  await expect(page.locator("[data-sheet=coins] [data-cents='7']")).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Teacher", exact: true }).click();
  await passGate(page);
  await openClassPlace(page);
  const classTime = page.locator("[data-place=class-time]");
  await classTime.getByRole("button", { name: "Hours and half hours", exact: true }).click();
  await expect(classTime).toHaveAttribute("data-stage", "hours");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await passGate(page);
  await expect(page.locator("[data-section=path-time]")).toContainText("O'clock");
  await expect(page.locator("[data-section=path-time]")).toContainText("Hours and half hours");
  await expect(page.locator("[data-time-stage]")).toHaveAttribute("data-time-stage", "hours");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "LittleNest Time & Money" }).click();
  await page.getByRole("button", { name: "Set the clock" }).click();
  await expect(page.locator("[data-screen=clock]")).toHaveAttribute("data-mode", "half");
  await expect(page.locator("[data-screen=clock]")).toHaveAttribute("data-target-minute", "30");
});
