import { expect, test } from "@playwright/test";

const profile = {
  activeId: "mia",
  profiles: [
    {
      id: "mia",
      name: "Mia",
      ageRange: "4",
      animal: "fox",
      createdAt: "2026-09-01T15:00:00.000Z",
      stars: 2,
      days: {},
    },
  ],
};

test("home shows the reading lesson on phone, tablet, and desktop", async ({ page }, testInfo) => {
  await page.addInitScript((saved) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.removeItem("kids-app-silent-hint-v1");
  }, profile);
  if (testInfo.project.name === "webkit") await page.setViewportSize({ width: 1024, height: 768 });
  if (testInfo.project.name === "chromium") await page.setViewportSize({ width: 1280, height: 800 });
  if (testInfo.project.name === "firefox") await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  await expect(page.locator("[data-step='letter']")).toBeVisible();
  await expect(page.locator("[data-explore='sections']")).toBeVisible();
  const shot = testInfo.project.name === "iphone"
    ? "qa_home_iphone.png"
    : testInfo.project.name === "pixel"
      ? "qa_home_android.png"
      : testInfo.project.name === "webkit"
        ? "qa_home_ipad.png"
        : testInfo.project.name === "firefox"
          ? "qa_home_ipad_portrait.png"
          : "qa_home_desktop.png";
  if (testInfo.project.name !== "webkit" || true) {
    await page.screenshot({ path: `/opt/cursor/artifacts/${shot}`, fullPage: false });
    await page.screenshot({ path: `docs/qa-screenshots/${shot}`, fullPage: false });
  }
});
