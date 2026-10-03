import { expect, test, type Page } from "@playwright/test";
import { answerGate } from "./gate";
import { createdThisWeek } from "./clock";

/**
 * Every screen has a way back, in the same place. The first phone test found
 * screens with none: an Explore section's page (only a small "READING" pill
 * led out of it) and the long grown-up pages once Back had scrolled away.
 */
const profile = {
  activeId: "mia",
  profiles: [
    { id: "mia", name: "Mia", ageRange: "5", animal: "fox", createdAt: createdThisWeek(), stars: 0, days: {}, ladder: { step: 1, successes: 0 } },
  ],
};

async function install(page: Page) {
  await page.addInitScript((saved) => {
    localStorage.setItem("littlenest-profiles-v1", JSON.stringify(saved));
    localStorage.setItem("littlenest-silent-hint-v1", "1");
  }, profile);
  await page.goto("./");
}

/** The control is on screen now, not only somewhere on a scrolled page. */
async function expectInView(page: Page, selector: string) {
  const box = await page.locator(selector).boundingBox();
  const size = page.viewportSize();
  expect(box, `${selector} has a box`).toBeTruthy();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(size!.height);
}

test("each Explore section opens as a page with its name and a Back button", async ({ page }) => {
  await install(page);
  await page.getByRole("button", { name: "Mia" }).click();
  const sections: [string, string][] = [
    ["math", "Numbers"],
    ["colors", "Colors"],
    ["time", "Time & Money"],
    ["build", "Build"],
    ["science", "Science"],
  ];
  for (const [course, title] of sections) {
    await page.locator(`[data-area=explore] [data-course=${course}]`).click();
    await expect(page.locator("[data-section-title]")).toHaveText(title);
    // The page holds that section only: the home screen's dock and Explore tiles are not on it.
    await expect(page.locator(".today-dock")).toHaveCount(0);
    await expect(page.locator("[data-area=explore]")).toHaveCount(0);
    const back = page.getByRole("button", { name: "Back", exact: true });
    await expect(back).toBeVisible();
    // Top-left, where Back is on every lesson and game, and big enough for a small finger.
    const box = await back.boundingBox();
    // The first thing in the page's top row (a wide screen centers the row).
    const row = await page.locator(".today-top").boundingBox();
    expect(box!.x - row!.x).toBeLessThan(8);
    expect(box!.y).toBeLessThan(80);
    expect(box!.width).toBeGreaterThanOrEqual(64);
    await back.click();
    await expect(page.locator("[data-step=letter]")).toBeVisible();
    await expect(page.locator("[data-section-title]")).toHaveCount(0);
  }
});

test("Back stays on screen while a long grown-up page scrolls", async ({ page }) => {
  await install(page);
  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  await answerGate(page, true);
  await page.getByRole("button", { name: /^Settings/ }).click();
  await expect(page.locator("[data-screen=grownups]")).toHaveAttribute("data-page", "settings");
  await page.locator(".screen-body").evaluate((body) => body.scrollTo(0, body.scrollHeight));
  await expectInView(page, ".grownups-back");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator("[data-screen=grownups]")).toHaveAttribute("data-page", "menu");
});

for (const who of ["Parent", "Teacher"] as const) {
  test(`the ${who} page has the same Back button, and it stays on screen`, async ({ page }) => {
    await install(page);
    await page.getByRole("button", { name: who, exact: true }).click();
    await answerGate(page, true);
    await expect(page.locator(`[data-screen=${who.toLowerCase()}]`)).toBeVisible();
    await expect(page.locator(".grownups-back .icon")).toBeVisible();
    await page.evaluate(() => {
      for (const body of document.querySelectorAll(".screen-body, .teacher-scroll")) body.scrollTo(0, body.scrollHeight);
    });
    await expectInView(page, ".grownups-back");
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page.locator("[data-screen=start]")).toBeVisible();
  });
}
