import { expect, test, type Page } from "@playwright/test";
import { createdThisWeek } from "./clock";
import { game, onRound } from "./kit";
import { showWordCard } from "./lesson";

/**
 * Grown-up tips: open in full the first time an activity opens for a child, then a small
 * "For grown-ups" chip. Never a card dropped in after the child acts, and never under the
 * Grown-ups button.
 */

const saved = {
  activeId: "mia",
  profiles: [
    { id: "mia", name: "Mia", ageRange: "4", animal: "fox", createdAt: createdThisWeek(), stars: 0, days: {} },
    { id: "leo", name: "Leo", ageRange: "4", animal: "bunny", createdAt: createdThisWeek(), stars: 0, days: {} },
  ],
};

async function open(page: Page, name = "Mia") {
  await page.addInitScript((profiles) => {
    if (sessionStorage.getItem("tips-seeded")) return;
    sessionStorage.setItem("tips-seeded", "1");
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(profiles));
    localStorage.setItem("kids-app-silent-hint-v1", "1");
    localStorage.setItem("littlenest-quick-rounds", "1");
  }, saved);
  await page.goto("./");
  await page.getByRole("button", { name }).click();
}

/** What is drawn at the middle of a box: the thing a finger aimed there would press. */
async function hitAtCenter(page: Page, selector: string): Promise<string> {
  return page.locator(selector).evaluate((element) => {
    const box = element.getBoundingClientRect();
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return hit && (hit === element || element.contains(hit)) ? "itself" : (hit?.closest("button")?.textContent ?? hit?.tagName ?? "nothing");
  });
}

test("a tip opens in full once per activity per child, then waits as a chip", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Draw" }).click();
  const tip = page.locator("[data-tip=draw-start]");
  await expect(tip).toHaveAttribute("data-tip-open", "true");
  await expect(tip).toContainText("For grown-ups");

  // Hide closes it to the chip, which a grown-up can open again.
  await page.getByRole("button", { name: "Hide tip" }).click();
  await expect(tip).toHaveAttribute("data-tip-open", "false");
  await page.getByRole("button", { name: "For grown-ups: show tip" }).click();
  await expect(tip).toHaveAttribute("data-tip-open", "true");

  // The second visit: a chip, not the card.
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Draw" }).click();
  await expect(tip).toHaveAttribute("data-tip-open", "false");
  const chip = await page.locator(".grownup-tip-chip").boundingBox();
  expect(chip?.height ?? 0).toBeLessThanOrEqual(52);

  // Another child's grown-up has not seen it yet.
  await page.evaluate(() => {
    const store = JSON.parse(localStorage.getItem("kids-app-profiles-v1") ?? "{}");
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify({ ...store, activeId: "leo" }));
  });
  await page.reload();
  const leo = page.getByRole("button", { name: "Leo" });
  if (await leo.count()) await leo.click();
  await page.getByRole("button", { name: "Draw" }).click();
  await expect(tip).toHaveAttribute("data-tip-open", "true");
});

test("after a game, the section page's tip is a chip clear of the Grown-ups button, and Hide can be tapped", async ({ page }) => {
  for (const size of [
    { width: 390, height: 844 },
    { width: 820, height: 1180 },
  ]) {
    await page.setViewportSize(size);
    await open(page);
    await page.getByRole("button", { name: "LittleNest Numbers" }).click();
    await page.getByRole("button", { name: "Count objects" }).click();
    const play = game(page, "count");
    for (const round of [0, 1, 2]) {
      await onRound(play, round);
      const target = (await play.getAttribute("data-target")) ?? "";
      await play.locator(`.pick[data-number='${target}']`).click();
    }
    await expect(page.locator("[data-screen=today]")).toHaveAttribute("data-subject", "math");
    const tip = page.locator("[data-tip=math-count-end]");
    // Arrived after the child finished: a chip only.
    await expect(tip).toHaveAttribute("data-tip-open", "false");
    expect(await hitAtCenter(page, ".grownup-tip-chip")).toBe("itself");
    await page.locator(".grownup-tip-chip").click();
    await expect(tip).toHaveAttribute("data-tip-open", "true");
    // The open card's Hide is not under the Grown-ups button.
    expect(await hitAtCenter(page, ".grownup-tip-hide")).toBe("itself");
    const card = (await tip.boundingBox())!;
    const corner = (await page.locator(".grownups-launch").boundingBox())!;
    expect(card.y).toBeGreaterThanOrEqual(corner.y + corner.height);
    await page.locator(".grownup-tip-hide").click();
    await expect(tip).toHaveAttribute("data-tip-open", "false");
    await page.evaluate(() => sessionStorage.clear());
    await page.evaluate(() => localStorage.clear());
  }
});

test("finishing a word mid-lesson does not drop a tip card in and push the lesson down", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Letters" }).click();
  await showWordCard(page, 2);
  // The letter track's tip is a chip from the start.
  const tip = page.locator("[data-tip]");
  await expect(tip).toHaveAttribute("data-tip-open", "false");
  const track = page.locator(".blend-track");
  const before = (await track.boundingBox())!;
  await track.focus();
  await page.keyboard.press("End");
  await expect(page.locator(".star-count").first()).toHaveAttribute("data-stars", "1");
  // The word's own line took the chip's place, still closed, and nothing moved.
  await expect(tip).toHaveAttribute("data-tip", "letter-end");
  await expect(tip).toHaveAttribute("data-tip-open", "false");
  const after = (await track.boundingBox())!;
  expect(Math.abs(after.y - before.y)).toBeLessThan(1);
});
