import { expect, test, type Page } from "@playwright/test";
import { answerGate, openClassPlace } from "./gate";
import { expectStar, expectWiggle, onRound, openGame, openTimeMoney } from "./kit";

async function passGate(page: Page) {
  await answerGate(page, true);
}

test("three jars: jobs as pictures earn coins, and two in the save jar reach the crown", async ({ page }, testInfo) => {
  await openTimeMoney(page);
  const jars = await openGame(page, "jars");
  // Three jobs, each a drawing. The first is pointed at.
  await expect(jars.locator("[data-chore] .art")).toHaveCount(3);
  await expect(jars.locator("[data-chore=tidy] .game-hand")).toBeVisible();
  if (testInfo.project.name === "chromium") {
    await jars.screenshot({ path: "test-results/screenshots/money_jars.png" });
  }
  for (const chore of ["tidy", "feed", "help"]) await jars.locator(`[data-chore=${chore}]`).click();
  await expect(jars).toHaveAttribute("data-earned", "3");
  // The jars take the place of the jobs. What the save jar is for is shown with two places to fill.
  await expect(jars.locator("[data-jar]")).toHaveCount(3);
  await expect(jars.locator(".jars-goal .price-slot")).toHaveCount(2);
  await jars.locator("[data-jar=save]").click();
  await jars.locator("[data-jar=save]").click();
  await expect(jars.locator(".jars-goal .price-slot[data-filled=true]")).toHaveCount(2);
  await jars.locator("[data-jar=share]").click();
  await expect(jars).toHaveAttribute("data-save", "2");
  await expect(jars).toHaveAttribute("data-share", "1");
  await expect(jars).toHaveAttribute("data-goal", "met");
  await expectStar(page);
  await expect.poll(async () => page.evaluate(() => localStorage.getItem("kids-app-profiles-v1") ?? "")).toContain("hat-crown");
  await page.locator("[data-section-back]").click();
  await expect(page.locator("[data-step=letter]")).not.toHaveClass(/is-done/);
});

test("three jars: spending it all still ends the game, and the crown waits", async ({ page }) => {
  await openTimeMoney(page);
  const jars = await openGame(page, "jars");
  for (const chore of ["tidy", "feed", "help"]) await jars.locator(`[data-chore=${chore}]`).click();
  for (const jar of ["spend", "spend", "share"]) await jars.locator(`[data-jar=${jar}]`).click();
  await expect(jars).toHaveAttribute("data-goal", "later");
  await expectStar(page);
  expect(await page.evaluate(() => localStorage.getItem("kids-app-profiles-v1") ?? "")).not.toContain("hat-crown");
});

test("the lemonade stand: three customers, and a coin for each cup", async ({ page }, testInfo) => {
  await openTimeMoney(page);
  const stand = await openGame(page, "lemonade");
  let earned = 0;
  for (let round = 0; round < 3; round += 1) {
    await onRound(stand, round);
    const cups = Number(await stand.getAttribute("data-answer"));
    // What the customer wants is a picture of that many cups.
    await expect(stand.locator(".stand-bubble .art")).toHaveCount(cups);
    if (round === 0) {
      if (testInfo.project.name === "chromium") await stand.screenshot({ path: "test-results/screenshots/money_lemonade.png" });
      const wrong = stand.locator(`.pick:not([data-cups="${cups}"])`).first();
      await wrong.click();
      await expectWiggle(wrong);
      await expect(stand).toHaveAttribute("data-earned", "0");
    }
    await stand.locator(`.pick[data-cups="${cups}"]`).click();
    earned += cups;
    await expect(stand).toHaveAttribute("data-earned", String(earned));
  }
  expect(earned).toBe(6);
  await expectStar(page);
});

test("what can I buy: a price the coin does not cover waits, and one it covers is bought", async ({ page }) => {
  await openTimeMoney(page);
  const choose = await openGame(page, "choose");
  for (let round = 0; round < 3; round += 1) {
    await onRound(choose, round);
    // Every price is on a tag with its coin drawn beside it.
    await expect(choose.locator(".game-tray .pick .price-tag .coin-art")).toHaveCount(3);
    if (round === 0) {
      const dear = choose.locator(".pick[data-afford=false]").first();
      await dear.click();
      await expectWiggle(dear);
      await expect(choose).toHaveAttribute("data-solved", "false");
    }
    await choose.locator(".pick[data-afford=true]").first().click();
  }
  await expectStar(page);
});

test("need or want: six pictures, one at a time, and a wrong basket ends nothing", async ({ page }, testInfo) => {
  await openTimeMoney(page);
  const needs = await openGame(page, "needs");
  await expect(needs).toHaveAttribute("data-rounds", "6");
  for (let round = 0; round < 6; round += 1) {
    await onRound(needs, round);
    const answer = (await needs.getAttribute("data-answer")) ?? "";
    await expect(needs.locator(".need-item .art")).toBeVisible();
    if (round === 0) {
      if (testInfo.project.name === "chromium") await needs.screenshot({ path: "test-results/screenshots/money_needs.png" });
      const wrong = needs.locator(`.pick:not([data-bin=${answer}])`);
      await wrong.click();
      await expectWiggle(wrong);
      await expect(needs).toHaveAttribute("data-round", "0");
    }
    await needs.locator(`.pick[data-bin=${answer}]`).click();
  }
  await expectStar(page);
});

test("cards wait for the end of the course, then a debit card takes from the save jar and a credit card is paid back", async ({ page }, testInfo) => {
  await openTimeMoney(page);
  await expect(page.locator("[data-activity=cards]")).toHaveCount(0);
  // A section page has Back where the child's animal is on the reading path, so step back to the path first.
  await page.locator("[data-section-back]").click();
  await page.getByRole("button", { name: "Switch child" }).click({ delay: 1600 });
  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  await passGate(page);
  await page.getByRole("button", { name: /Printables/ }).click();
  await page.getByRole("button", { name: "Time sheets" }).click();
  await expect(page.locator("[data-sheet=jars] [data-jar=save]")).toBeVisible();
  await expect(page.locator("[data-sheet=jars] [data-jar=spend]")).toBeVisible();
  await expect(page.locator("[data-sheet=jars] [data-jar=share]")).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Teacher", exact: true }).click();
  await passGate(page);
  await openClassPlace(page);
  const classTime = page.locator("[data-place=class-time]");
  await classTime.getByRole("button", { name: "Cards", exact: true }).click();
  await expect(classTime).toHaveAttribute("data-stage", "cards");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "LittleNest Time & Money" }).click();
  const cards = await openGame(page, "cards");
  await expect(cards).toHaveAttribute("data-cards", "open");
  await expect(cards).toHaveAttribute("data-card", "debit");
  await expect(cards).toHaveAttribute("data-save", "4");
  if (testInfo.project.name === "chromium") {
    await cards.screenshot({ path: "test-results/screenshots/money_cards.png" });
  }
  // Debit: the coin leaves the save jar at once.
  await cards.locator(".pick[data-card=debit]").click();
  await expect(cards).toHaveAttribute("data-save", "3");
  // Credit: bought now, and the jar is the same until the coin is paid back.
  await expect(cards).toHaveAttribute("data-card", "credit");
  await cards.locator(".pick[data-card=credit]").click();
  await expect(cards).toHaveAttribute("data-owing", "true");
  await expect(cards).toHaveAttribute("data-save", "3");
  await cards.locator(".pick[data-jar=save]").click();
  await expect(cards).toHaveAttribute("data-save", "2");
  await expectStar(page);
});
