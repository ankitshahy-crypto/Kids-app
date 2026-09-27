import { expect, test, type Page } from "@playwright/test";

/** Created long ago, so the calendar has walked every week of every course. */
const CREATED = "2025-01-06T15:00:00.000Z";

function profileFor(ageRange: string) {
  return {
    activeId: "mia",
    profiles: [{ id: "mia", name: "Mia", ageRange, animal: "fox", createdAt: CREATED, stars: 0, days: {} }],
  };
}

async function open(page: Page, ageRange: string, course: string) {
  await page.addInitScript(
    (saved) => {
      localStorage.setItem("littlenest-profiles-v1", JSON.stringify(saved));
      localStorage.removeItem("littlenest-placement-v1");
      localStorage.removeItem("kids-app-placement-v1");
      localStorage.removeItem("kids-app-silent-hint-v1");
    },
    profileFor(ageRange),
  );
  await page.goto("./");
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: course }).click();
}

test("a 4-year-old never gets half hours on the clock, however long they have used the app", async ({ page }) => {
  await open(page, "4", "LittleNest Time & Money");
  const today = page.locator("[data-screen=today]");
  await expect(today).toHaveAttribute("data-subject", "time");
  await expect(today).toHaveAttribute("data-stage", "shop");
  await page.locator("[data-activity=clock]").click();
  const clock = page.locator("[data-screen=clock]");
  await expect(clock).toHaveAttribute("data-mode", "hour");
  await expect(clock).toHaveAttribute("data-target-minute", "0");
  await expect(clock.locator(".math-prompt")).not.toContainText(/half past|quarter|minutes/i);
});

test("a 5-year-old with the same history moves on past o'clock", async ({ page }) => {
  await open(page, "5", "LittleNest Time & Money");
  const today = page.locator("[data-screen=today]");
  await expect(today).toHaveAttribute("data-subject", "time");
  await expect(today).not.toHaveAttribute("data-stage", "shop");
  await expect(page.locator("[data-course=time]")).toBeVisible();
});

test("a 3-year-old stays on shapes in Numbers while a 4-year-old reaches adding", async ({ page }) => {
  await open(page, "3", "LittleNest Numbers");
  await expect(page.locator("[data-screen=today]")).toHaveAttribute("data-stage", "shapes");
  await page.goto("./");
  await page.addInitScript((saved) => localStorage.setItem("littlenest-profiles-v1", JSON.stringify(saved)), profileFor("4"));
  await page.reload();
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "LittleNest Numbers" }).click();
  await expect(page.locator("[data-screen=today]")).toHaveAttribute("data-stage", "adding");
});

test("a grown-up placement moves a 4-year-old past the age cap", async ({ page }) => {
  await page.addInitScript(
    ({ saved, placed }) => {
      localStorage.setItem("littlenest-profiles-v1", JSON.stringify(saved));
      localStorage.setItem("littlenest-placement-v1", JSON.stringify(placed));
      localStorage.removeItem("kids-app-silent-hint-v1");
    },
    {
      saved: profileFor("4"),
      placed: {
        version: 1,
        origin: "device",
        classId: "device-class",
        updatedAt: "2026-09-26T00:00:00.000Z",
        subjects: { time: { classDefault: null, byChildId: { mia: { subject: "time", stageId: "hours", weekIndex: 5 } } } },
      },
    },
  );
  await page.goto("./");
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "LittleNest Time & Money" }).click();
  const today = page.locator("[data-screen=today]");
  await expect(today).toHaveAttribute("data-stage", "hours");
  await page.locator("[data-activity=clock]").click();
  await expect(page.locator("[data-screen=clock]")).toHaveAttribute("data-mode", "half");
});
