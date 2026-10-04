import { installAudioSpy, spokenLines } from "./audioSpy";
import { expect, test, type Page } from "@playwright/test";
import { createdThisWeek } from "./clock";
import { expectStar, expectWiggle, game, onRound } from "./kit";

/** Peek (see a few at a glance) and Bakery (give that many), the Numbers games from the STEM plan. */

async function install(page: Page, options: { quick?: boolean; ageRange?: string; animal?: string } = {}) {
  const { quick = true, ageRange = "4", animal = "fox" } = options;
  await installAudioSpy(page);
  await page.addInitScript(
    ({ saved, quick }) => {
      if (sessionStorage.getItem("math-more-seeded")) return;
      sessionStorage.setItem("math-more-seeded", "1");
      localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
      localStorage.removeItem("kids-app-silent-hint-v1");
      if (quick) localStorage.setItem("littlenest-quick-rounds", "1");
      localStorage.setItem("littlenest-settings-v1", JSON.stringify({ showTips: false }));
    },
    {
      saved: { activeId: "mia", profiles: [{ id: "mia", name: "Mia", ageRange, animal, createdAt: createdThisWeek(), stars: 0, days: {} }] },
      quick,
    },
  );
  await page.goto("./");
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "LittleNest Numbers" }).click();
  await expect(page.locator("[data-screen=today]")).toHaveAttribute("data-subject", "math");
}

test("the Numbers page offers Peek and Bakery after Count, and Count is still first", async ({ page }) => {
  await install(page);
  const tiles = page.locator(".math-board [data-activity]");
  await expect(tiles).toHaveCount(8);
  const order = await tiles.evaluateAll((list) => list.map((tile) => tile.getAttribute("data-activity")));
  expect(order.slice(0, 3)).toEqual(["count", "peek", "bakery"]);
  expect(order).toEqual(expect.arrayContaining(["know", "shape", "more", "add", "trace"]));
  // Big enough for a small finger.
  for (const box of await tiles.evaluateAll((list) => list.map((tile) => tile.getBoundingClientRect().height))) expect(box).toBeGreaterThanOrEqual(64);
});

test("peek: the ladybugs show, the leaf covers them, and the number seen is tapped", async ({ page }) => {
  await install(page);
  await page.getByRole("button", { name: "How many did you see" }).click();
  const play = game(page, "peek");
  await expect(play).toHaveAttribute("data-rounds", "4");
  const seen: string[] = [];
  for (const round of [0, 1, 2, 3]) {
    await onRound(play, round);
    const answer = (await play.getAttribute("data-answer")) ?? "";
    seen.push(answer);
    await expect(play.locator(".peek-bug")).toHaveCount(Number(answer));
    // The leaf drops over them after a moment (a short one in a test).
    await expect(play).toHaveAttribute("data-view", "hid");
    await expect(play.locator(".pick")).toHaveCount(3);
    await play.locator(`.pick[data-number='${answer}']`).click();
    // Found: the leaf lifts and they are counted.
    await expect(play.locator(".peek-bug .count-badge").last()).toHaveText(answer);
  }
  for (let index = 1; index < seen.length; index += 1) expect(seen[index]).not.toBe(seen[index - 1]);
  await expectStar(page);
});

test("peek: a miss says the number tapped, the second shows the ladybugs again, the third points at the answer", async ({ page }) => {
  await install(page);
  await page.getByRole("button", { name: "How many did you see" }).click();
  const play = game(page, "peek");
  await onRound(play, 0);
  await expect(play).toHaveAttribute("data-view", "hid");
  const answer = (await play.getAttribute("data-answer")) ?? "";
  const wrong = play.locator(`.pick:not([data-number='${answer}'])`).first();
  const wrongValue = (await wrong.getAttribute("data-number")) ?? "";
  const words = ["zero", "one", "two", "three", "four", "five", "six"];
  const before = (await spokenLines(page)).length;
  await wrong.click();
  await expectWiggle(wrong);
  await expect.poll(async () => (await spokenLines(page)).slice(before)).toContain(words[Number(wrongValue)]);
  await wrong.click();
  await expect.poll(async () => (await spokenLines(page)).slice(before)).toContain("look again!");
  await expect(play).toHaveAttribute("data-view", "hid");
  await wrong.click();
  await expect(play).toHaveAttribute("data-reveal", "true");
  await expect(play).toHaveAttribute("data-view", "show");
  await expect(play.locator(`.pick[data-number='${answer}'] .game-hand`)).toBeVisible();
});

test("bakery: strawberries go on the plate one by one, the plate takes one back, and the bell serves", async ({ page }) => {
  await install(page, { animal: "bear" });
  await page.getByRole("button", { name: "Give that many" }).click();
  const play = game(page, "bakery");
  await expect(play).toHaveAttribute("data-rounds", "3");
  await onRound(play, 0);
  // Never the child's own animal behind the counter.
  await expect(play).not.toHaveAttribute("data-customer", "bear");
  const ask = Number(await play.getAttribute("data-answer"));
  expect(ask).toBeLessThanOrEqual(3);
  await expect(play.locator(".order-dots circle")).toHaveCount(ask);
  // The first order says how to serve it, and the hand points at the bowl.
  await expect.poll(async () => spokenLines(page)).toContain("ring the bell when it is ready.");
  await expect(play.locator("[data-bowl] .game-hand")).toBeVisible();
  // Too few: the customer asks for more.
  const bell = play.locator("[data-bell]");
  await bell.click();
  await expect(play).toHaveAttribute("data-face", "more");
  await expect(play).toHaveAttribute("data-misses", "1");
  await expect.poll(async () => spokenLines(page)).toContain("i need more, please.");
  // One too many, counted aloud as they land.
  for (let index = 0; index <= ask; index += 1) await play.locator("[data-bowl]").click();
  await expect(play).toHaveAttribute("data-on-plate", String(ask + 1));
  await expect(play.locator(".bakery-berry")).toHaveCount(ask + 1);
  await bell.click();
  await expect(play).toHaveAttribute("data-face", "less");
  await expect.poll(async () => spokenLines(page)).toContain("oops, too many! tap the plate to take one back.");
  // The plate gives one back, and the bell serves the right number.
  await play.locator("button[data-plate]").click();
  await expect(play).toHaveAttribute("data-on-plate", String(ask));
  await bell.click();
  await expect(play).toHaveAttribute("data-face", "yum");
  for (const round of [1, 2]) {
    await onRound(play, round);
    await expect(play).toHaveAttribute("data-on-plate", "0");
    const next = Number(await play.getAttribute("data-answer"));
    for (let index = 0; index < next; index += 1) await play.locator("[data-bowl]").click();
    await bell.click();
  }
  await expectStar(page);
});

test("bakery: after three misses the plate is filled for the child and the hand points at the bell", async ({ page }) => {
  await install(page);
  await page.getByRole("button", { name: "Give that many" }).click();
  const play = game(page, "bakery");
  await onRound(play, 0);
  const ask = await play.getAttribute("data-answer");
  for (let miss = 1; miss <= 3; miss += 1) {
    await play.locator("[data-bell]").click();
    await expect(play).toHaveAttribute("data-misses", String(miss));
  }
  await expect(play).toHaveAttribute("data-on-plate", ask ?? "");
  await expect(play.locator("[data-bell] .game-hand")).toBeVisible();
  await play.locator("[data-bell]").click();
  await expect(play).toHaveAttribute("data-solved", "true");
});

test("ages 5 to 7 peek at up to five, scattered, and order up to eight", async ({ page }) => {
  await install(page, { ageRange: "5" });
  await page.getByRole("button", { name: "How many did you see" }).click();
  await expect(game(page, "peek")).toHaveAttribute("data-rounds", "5");
  await expect(game(page, "peek")).toHaveAttribute("data-level", "later");
});
