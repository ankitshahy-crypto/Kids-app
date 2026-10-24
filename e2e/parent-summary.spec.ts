import { expect, test } from "@playwright/test";
import { answerGate } from "./gate";
import { createdThisWeek } from "./clock";

const store = {
  activeId: "mia",
  profiles: [
    {
      id: "mia", name: "Mia", ageRange: "4", animal: "fox", createdAt: createdThisWeek(), stars: 9, days: {},
      nest: ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"].map((date) => ({ date, piece: "twig" })),
    },
  ],
};

test("the progress summary sits behind the grown-up check and shares the initial by default", async ({ page }) => {
  await page.addInitScript((value) => {
    localStorage.setItem("littlenest-profiles-v1", value);
    localStorage.setItem("littlenest-silent-hint-v1", "1");
    (navigator as unknown as { share: unknown }).share = undefined;
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async (text: string) => { (window as unknown as { shared: string }).shared = text; } }, configurable: true });
  }, JSON.stringify(store));
  await page.goto("./");
  await expect(page.locator("[data-section='summary']")).toHaveCount(0);
  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  await answerGate(page, true);
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: /Progress summary/ }).click();
  const card = page.locator("[data-summary='mia']");
  await expect(card.locator("[data-summary-label]")).toHaveText("M.");
  await expect(card.locator("[data-stat='weeks'] strong")).toHaveText("1");
  await card.getByRole("button", { name: "Share summary" }).click();
  await expect(card.getByRole("status")).toHaveText("Summary copied");
  const shared = await page.evaluate(() => (window as unknown as { shared: string }).shared);
  expect(shared).toContain("M.'s");
  expect(shared).not.toContain("Mia");
  await card.locator("[data-action='summary-name']").check();
  await expect(card.locator("[data-summary-label]")).toHaveText("Mia");
});
