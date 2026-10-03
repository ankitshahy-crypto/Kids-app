import { expect, test, type Locator, type Page } from "@playwright/test";
import { installAudioSpy, spokenLines } from "./audioSpy";
import { answerGate, openClassPlace } from "./gate";
import { expectStar, expectWiggle, game, onRound, openGame, openTimeMoney } from "./kit";

async function passGate(page: Page) {
  await answerGate(page, true);
}

/** Pay for the thing in the shop round that is open. */
async function payShop(frame: Locator) {
  const task = await frame.getAttribute("data-task");
  const answer = (await frame.getAttribute("data-answer")) ?? "";
  if (task === "pennies") {
    const price = Number(await frame.getAttribute("data-price"));
    for (let index = 0; index < price; index += 1) await frame.locator(`[data-pick=penny-${index}]`).click();
    return;
  }
  if (task === "pay") {
    for (const coin of answer.split(",")) await frame.locator(`.pick[data-coin=${coin}][data-used=false]`).first().click();
    return;
  }
  await frame.locator(`.pick[data-coin=${answer}]`).click();
}

test("the Time & Money page is one page of pictures, under Time and Money", async ({ page }, testInfo) => {
  await openTimeMoney(page);
  await expect(page.locator("[data-time-group] h2")).toHaveText(["Time", "Money"]);
  await expect(page.locator("[data-time-group=time] [data-activity]")).toHaveCount(3);
  // The money games are here, not behind a second menu. Cards wait for the end of the course.
  await expect(page.locator("[data-time-group=money] .time-tile > span:last-child")).toHaveText(["Coins", "Shop", "Three jars", "Lemonade", "What can I buy?", "Need or want"]);
  await expect(page.locator("[data-activity=money-play]")).toHaveCount(0);
  await expect(page.locator("[data-activity=cards]")).toHaveCount(0);
  // Every tile carries a drawing.
  for (const tile of await page.locator(".time-tile").all()) await expect(tile.locator(".math-activity-art svg").first()).toBeVisible();
  if (testInfo.project.name === "chromium") {
    await page.locator("[data-screen=today]").screenshot({ path: "test-results/screenshots/time_money_today.png" });
  }
});

test("the shop says what the thing is, what it costs, and how to pay", async ({ page }, testInfo) => {
  await installAudioSpy(page);
  await openTimeMoney(page, { quick: false });
  const before = (await spokenLines(page)).length;
  const shop = await openGame(page, "shop");
  await expect(shop).toHaveAttribute("data-task", "pennies");
  const good = (await shop.getAttribute("data-good")) ?? "";
  const price = Number(await shop.getAttribute("data-price"));
  const cents = ["", "one cent", "two cents", "three cents", "four cents", "five cents"][price];
  // The name, the price and the instruction, in that order, without a tap.
  await expect.poll(async () => (await spokenLines(page)).slice(before).join(" | "), { timeout: 12_000 }).toContain("tap a penny for each place.");
  // (The blank line that wakes the phone's own voice is not something said.)
  const opening = (await spokenLines(page)).slice(before).filter((line) => line.trim() !== "");
  expect(opening.slice(0, 4)).toEqual([good, "it costs", cents, "tap a penny for each place."]);
  // The price is also a row of places to fill, one for each cent.
  await expect(shop.locator(".price-slot")).toHaveCount(price);
  // The first penny is pointed at.
  await expect(shop.locator("[data-pick=penny-0] .game-hand")).toBeVisible();
  if (testInfo.project.name === "chromium") {
    await shop.screenshot({ path: "test-results/screenshots/time_money_shop.png" });
  }
  // Each penny is counted aloud, and the last one is thanked.
  const heard = (await spokenLines(page)).length;
  await shop.locator("[data-pick=penny-0]").click();
  await expect(shop.locator(".price-slot[data-filled=true]")).toHaveCount(1);
  await expect.poll(async () => (await spokenLines(page)).slice(heard)).toContain("one");
  for (let index = 1; index < price; index += 1) await shop.locator(`[data-pick=penny-${index}]`).click();
  await expect(shop).toHaveAttribute("data-solved", "true");
  await expect.poll(async () => (await spokenLines(page)).slice(heard).join(" | "), { timeout: 8_000 }).toContain(`${cents} | thank you!`);
  // The speaker says the round's question again.
  await onRound(shop, 1);
  const again = (await spokenLines(page)).length;
  await shop.locator("[data-hear=true]").click();
  await expect.poll(async () => (await spokenLines(page)).slice(again).join(" | "), { timeout: 12_000 }).toContain("it costs");
});

test("a wrong coin is named and wiggles, the third miss shows the answer, and four things bought earn a star", async ({ page }) => {
  await openTimeMoney(page);
  const shop = await openGame(page, "shop");
  await expect(shop.locator(".game-pips li")).toHaveCount(4);
  await payShop(shop);
  await onRound(shop, 1);
  await payShop(shop);
  await onRound(shop, 2);
  await expect(shop).toHaveAttribute("data-task", "coin");
  const answer = (await shop.getAttribute("data-answer")) ?? "";
  const wrong = shop.locator(`.pick:not([data-coin=${answer}])`).first();
  await wrong.click();
  await expectWiggle(wrong);
  await expect(shop).toHaveAttribute("data-misses", "1");
  await expect(shop).toHaveAttribute("data-solved", "false");
  await wrong.click();
  await wrong.click();
  // Three misses: the right coin glows and the hand points at it. Nothing has ended.
  await expect(shop).toHaveAttribute("data-reveal", "true");
  await expect(shop.locator(`.pick[data-coin=${answer}]`)).toHaveAttribute("data-reveal", "true");
  await expect(shop.locator(`.pick[data-coin=${answer}] .game-hand`)).toBeVisible();
  await payShop(shop);
  await onRound(shop, 3);
  await expect(shop.locator(".game-pips li[data-pip=done]")).toHaveCount(3);
  await payShop(shop);
  await expect(shop).toHaveAttribute("data-finished", "true");
  await expectStar(page);
  await page.locator("[data-section-back]").click();
  await expect(page.locator("[data-step=letter]")).not.toHaveClass(/is-done/);
});

test("paying with several coins: one that is too much bounces back, and the right ones add up", async ({ page }, testInfo) => {
  await openTimeMoney(page, { week: 8 });
  const shop = await openGame(page, "shop");
  await payShop(shop);
  await onRound(shop, 1);
  await expect(shop).toHaveAttribute("data-task", "pay");
  const price = Number(await shop.getAttribute("data-price"));
  const pays = ((await shop.getAttribute("data-answer")) ?? "").split(",");
  // A coin in the purse that is not part of the payment is worth more than the price.
  const coins = await shop.locator(".game-tray .pick").evaluateAll((picks) => picks.map((pick) => pick.getAttribute("data-coin") ?? ""));
  const extra = coins.find((coin) => !pays.includes(coin)) ?? "";
  expect(extra).not.toBe("");
  await shop.locator(`.pick[data-coin=${extra}]`).first().click();
  await expectWiggle(shop.locator(`.pick[data-coin=${extra}]`).first());
  await expect(shop).toHaveAttribute("data-total", "0");
  await shop.locator(`.pick[data-coin=${pays[0]}][data-used=false]`).first().click();
  await expect(shop.locator(".shop-till .coin-art")).toHaveCount(1);
  if (testInfo.project.name === "chromium") {
    await shop.screenshot({ path: "test-results/screenshots/time_money_pay.png" });
  }
  for (const coin of pays.slice(1)) await shop.locator(`.pick[data-coin=${coin}][data-used=false]`).first().click();
  await expect(shop).toHaveAttribute("data-total", String(price));
  await onRound(shop, 2);
  await payShop(shop);
  await onRound(shop, 3);
  // The last one is paid with a dollar bill and a dime.
  await expect(shop).toHaveAttribute("data-price", "110");
  await payShop(shop);
  await expectStar(page);
});

test("making change: the coin that comes back", async ({ page }) => {
  await openTimeMoney(page, { week: 9 });
  const shop = await openGame(page, "shop");
  await payShop(shop);
  await onRound(shop, 1);
  await payShop(shop);
  await onRound(shop, 2);
  await expect(shop).toHaveAttribute("data-task", "change");
  // The coin that was paid is shown on the counter.
  await expect(shop.locator(".shop-paid .coin-art")).toBeVisible();
  await payShop(shop);
  await onRound(shop, 3);
  await payShop(shop);
  await expectStar(page);
});

test("coins: find the one that is named, as a picture", async ({ page }, testInfo) => {
  await installAudioSpy(page);
  await openTimeMoney(page);
  const before = (await spokenLines(page)).length;
  const coins = await openGame(page, "coins");
  await expect(coins).toHaveAttribute("data-task", "name");
  const answer = (await coins.getAttribute("data-answer")) ?? "";
  await expect.poll(async () => (await spokenLines(page)).slice(before).join(" | "), { timeout: 8_000 }).toContain(`find the | ${answer}`);
  // Three coins to tap, each a drawing with no word to read.
  await expect(coins.locator(".game-tray .pick")).toHaveCount(3);
  await expect(coins.locator(".game-tray .pick .coin-art")).toHaveCount(3);
  await expect(coins.locator(".game-tray .pick-label")).toHaveCount(0);
  if (testInfo.project.name === "chromium") {
    await coins.screenshot({ path: "test-results/screenshots/time_money_coins.png" });
  }
  // A wrong coin says its own name and what it is worth.
  const heard = (await spokenLines(page)).length;
  const wrong = coins.locator(`.pick:not([data-coin=${answer}])`).first();
  const name = (await wrong.getAttribute("data-coin")) ?? "";
  await wrong.click();
  await expectWiggle(wrong);
  await expect.poll(async () => (await spokenLines(page)).slice(heard)).toContain(name);
  for (let round = 0; round < 4; round += 1) {
    await onRound(coins, round);
    await coins.locator(`.pick[data-coin=${await coins.getAttribute("data-answer")}]`).click();
  }
  await expectStar(page);
});

for (const [week, task, rounds] of [
  [4, "sort", 6],
  [8, "count", 3],
  [9, "compare", 3],
] as const) {
  test(`coins in week ${week + 1}: ${task}`, async ({ page }) => {
    await openTimeMoney(page, { week });
    const coins = await openGame(page, "coins");
    await expect(coins).toHaveAttribute("data-task", task);
    await expect(coins).toHaveAttribute("data-rounds", String(rounds));
    for (let round = 0; round < rounds; round += 1) {
      await onRound(coins, round);
      const answer = (await coins.getAttribute("data-answer")) ?? "";
      if (round === 0) {
        const wrong = coins.locator(`.pick:not([data-pick="${answer}"])`).first();
        await wrong.click();
        await expectWiggle(wrong);
        await expect(coins).toHaveAttribute("data-solved", "false");
      }
      await coins.locator(`.pick[data-pick="${answer}"]`).click();
    }
    await expectStar(page);
  });
}

test("day and night: the voice says what is happening, and the sky is picked", async ({ page }, testInfo) => {
  await openTimeMoney(page);
  const day = await openGame(page, "day");
  await expect(day).toHaveAttribute("data-task", "parts");
  // Three skies, as pictures, in the order of a day.
  await expect(day.locator(".game-tray .pick")).toHaveCount(3);
  expect(await day.locator(".game-tray .pick").evaluateAll((picks) => picks.map((pick) => pick.getAttribute("data-part")))).toEqual(["morning", "afternoon", "night"]);
  await expect(day.locator(".game-tray .sky-art svg")).toHaveCount(3);
  if (testInfo.project.name === "chromium") {
    await day.screenshot({ path: "test-results/screenshots/time_money_day.png" });
  }
  for (let round = 0; round < 4; round += 1) {
    await onRound(day, round);
    const answer = (await day.getAttribute("data-answer")) ?? "";
    if (round === 0) {
      const wrong = day.locator(`.pick:not([data-part=${answer}])`).first();
      await wrong.click();
      await expectWiggle(wrong);
    }
    await day.locator(`.pick[data-part=${answer}]`).click();
  }
  await expectStar(page);
  await page.locator("[data-section-back]").click();
  await expect(page.locator("[data-step=letter]")).not.toHaveClass(/is-done/);
});

test("my day: the parts of a day are put in order, three and then five", async ({ page }, testInfo) => {
  await openTimeMoney(page);
  const routine = await openGame(page, "routine");
  for (const count of [3, 5]) {
    await expect(routine.locator(".routine-line li")).toHaveCount(count);
    await expect(routine.locator(".game-tray .pick")).toHaveCount(count);
    const order = ((await routine.getAttribute("data-order")) ?? "").split(",");
    // The last one first: it wiggles, and nothing is placed.
    const last = routine.locator(`.pick[data-routine=${order[order.length - 1]}]`);
    await last.click();
    await expectWiggle(last);
    await expect(routine).toHaveAttribute("data-placed", "0");
    for (const [index, id] of order.entries()) {
      await expect(routine).toHaveAttribute("data-next", id);
      await routine.locator(`.pick[data-routine=${id}]`).click();
      if (index < order.length - 1) await expect(routine).toHaveAttribute("data-placed", String(index + 1));
      if (count === 3 && index === 0 && testInfo.project.name === "chromium") {
        await routine.screenshot({ path: "test-results/screenshots/time_money_routine.png" });
      }
    }
  }
  await expectStar(page);
});

test("the clock: a tap on a number moves the short hand there", async ({ page }, testInfo) => {
  await openTimeMoney(page);
  const clock = await openGame(page, "clock");
  await expect(clock).toHaveAttribute("data-mode", "hour");
  await expect(clock).toHaveAttribute("data-hour", "12");
  await expect(clock).toHaveAttribute("data-target-hour", "1");
  if (testInfo.project.name === "chromium") {
    await clock.screenshot({ path: "test-results/screenshots/time_money_clock.png" });
  }
  // A wrong number does not move the hand.
  await clock.locator(".clock-number[data-number='7']").click();
  await expect(clock.locator(".clock-number[data-number='7']")).toHaveAttribute("data-wiggle", "true");
  await expect(clock).toHaveAttribute("data-hour", "12");
  await clock.locator(".clock-number[data-number='1']").click();
  await expect(clock).toHaveAttribute("data-hour", "1");
  for (const round of [1, 2]) {
    await expect(clock).toHaveAttribute("data-round", String(round));
    await expect(clock).toHaveAttribute("data-matched", "false");
    await clock.locator(`.clock-number[data-number='${await clock.getAttribute("data-want")}']`).click();
  }
  await expectStar(page);
  await page.locator("[data-section-back]").click();
  await expect(page.locator("[data-step=letter]")).not.toHaveClass(/is-done/);
});

test("half past: the short hand first, then the long hand", async ({ page }) => {
  await openTimeMoney(page, { week: 5, ageRange: "6-7" });
  const clock = await openGame(page, "clock");
  await expect(clock).toHaveAttribute("data-mode", "half");
  await expect(clock).toHaveAttribute("data-target-minute", "30");
  await expect(clock).toHaveAttribute("data-hand", "hour");
  const hour = (await clock.getAttribute("data-target-hour")) ?? "";
  await clock.locator(`.clock-number[data-number='${hour}']`).click();
  await expect(clock).toHaveAttribute("data-hour", hour);
  // Now the long hand, and half past is the 6.
  await expect(clock).toHaveAttribute("data-hand", "minute");
  await expect(clock).toHaveAttribute("data-want", "6");
  await clock.locator(".clock-number[data-number='6']").click();
  await expect(clock).toHaveAttribute("data-round", "1");
});

test("a child who waits hears the question again, and the choices stir", async ({ page }) => {
  await installAudioSpy(page);
  await openTimeMoney(page, { quick: false });
  const day = await openGame(page, "day");
  await expect.poll(async () => (await spokenLines(page)).filter((line) => line === "is it morning, afternoon, or night?").length, { timeout: 8_000 }).toBe(1);
  await expect(day).toHaveAttribute("data-nudge", "false");
  // Eight seconds with no tap.
  await expect(day).toHaveAttribute("data-nudge", "true", { timeout: 12_000 });
  await expect.poll(async () => (await spokenLines(page)).filter((line) => line === "is it morning, afternoon, or night?").length, { timeout: 8_000 }).toBe(2);
});

for (const id of ["day", "routine", "clock", "coins", "shop", "jars", "lemonade", "choose", "needs"]) {
  test(`${id} fits a phone with the tip showing: the scene and every choice are in view`, async ({ page }) => {
    // A phone's screen less its status bar and home bar.
    await page.setViewportSize({ width: 390, height: 763 });
    await openTimeMoney(page, { tips: true });
    const frame = await openGame(page, id);
    await expect(page.locator("[data-tip]")).toBeVisible();
    await expect(frame.locator(".game-scene")).toBeInViewport({ ratio: 1 });
    for (const pick of await frame.locator(".game-tray .pick").all()) await expect(pick).toBeInViewport({ ratio: 1 });
    // Nothing a child taps is smaller than a small fingertip.
    for (const pick of await frame.locator(".game-tray .pick").all()) {
      const box = await pick.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(60);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(60);
    }
  });
}

test("teacher placement and printables cover the clock and coins", async ({ page }) => {
  await openTimeMoney(page);
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
  const clock = await openGame(page, "clock");
  await expect(clock).toHaveAttribute("data-mode", "half");
  await expect(clock).toHaveAttribute("data-target-minute", "30");
});
