import { installAudioSpy, spokenLines } from "./audioSpy";
import { expect, test, type Page } from "@playwright/test";
import { createdThisWeek } from "./clock";
import { expectStar, expectWiggle, game, onRound } from "./kit";

/** Peek (see a few at a glance), a Numbers game from the STEM plan. */

async function install(page: Page, options: { quick?: boolean; ageRange?: string } = {}) {
  const { quick = true, ageRange = "4" } = options;
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
      saved: { activeId: "mia", profiles: [{ id: "mia", name: "Mia", ageRange, animal: "fox", createdAt: createdThisWeek(), stars: 0, days: {} }] },
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

test("the Numbers page offers Peek after Count, and Count is still first", async ({ page }) => {
  await install(page);
  const tiles = page.locator(".math-board [data-activity]");
  await expect(tiles).toHaveCount(7);
  const order = await tiles.evaluateAll((list) => list.map((tile) => tile.getAttribute("data-activity")));
  expect(order.slice(0, 2)).toEqual(["count", "peek"]);
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
    // Found: the game moves on (in a test the praise is not waited for, so the badges are checked in the reveal test).
    if (round < 3) await expect(play).not.toHaveAttribute("data-round", String(round));
  }
  for (let index = 1; index < seen.length; index += 1) expect(seen[index]).not.toBe(seen[index - 1]);
  await expectStar(page);
});

test("peek: a miss says the number tapped, the second asks again and shows the ladybugs again, the third points at the answer", async ({ page }) => {
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
  // A second look: the leaf lifts, then covers them again, and the question is asked once more.
  await expect(play).toHaveAttribute("data-view", "show");
  await expect(play).toHaveAttribute("data-view", "hid");
  await expect.poll(async () => (await spokenLines(page)).slice(before).filter((line) => line === "how many?")).toHaveLength(1);
  await wrong.click();
  await expect(play).toHaveAttribute("data-reveal", "true");
  await expect(play).toHaveAttribute("data-view", "show");
  await expect(play.locator(`.pick[data-number='${answer}'] .game-hand`)).toBeVisible();
  // The ladybugs are counted for the child, top row first and left to right.
  const badges = play.locator(".peek-bug .count-badge");
  await expect(badges).toHaveCount(Number(answer));
  const placed = await play.locator(".peek-bug").evaluateAll((list) =>
    list.map((bug) => ({ text: bug.querySelector(".count-badge")?.textContent, box: bug.getBoundingClientRect() })),
  );
  placed.forEach((bug, index) => {
    expect(bug.text).toBe(String(index + 1));
    if (index === 0) return;
    const prev = placed[index - 1].box;
    const sameRow = Math.abs(prev.top - bug.box.top) < bug.box.height / 2;
    expect(sameRow ? bug.box.left > prev.left : bug.box.top > prev.top).toBe(true);
  });
});

test("ages 5 to 7 peek at up to five, scattered", async ({ page }) => {
  await install(page, { ageRange: "5" });
  await page.getByRole("button", { name: "How many did you see" }).click();
  await expect(game(page, "peek")).toHaveAttribute("data-rounds", "5");
  await expect(game(page, "peek")).toHaveAttribute("data-level", "later");
});

for (const size of [{ width: 390, height: 844 }, { width: 375, height: 667 }, { width: 820, height: 1180 }]) {
  test(`${size.width}x${size.height}: Peek fits on one screen, with big choices and readable numbers`, async ({ page }) => {
    await page.setViewportSize(size);
    await install(page);
    await page.getByRole("button", { name: "How many did you see" }).click();
    const play = game(page, "peek");
    await onRound(play, 0);
    const fit = await page.evaluate(() => {
      const picks = [...document.querySelectorAll(".game-tray .pick")].map((pick) => pick.getBoundingClientRect());
      const numeral = document.querySelector(".game-tray .pick-number")!;
      const pad = document.querySelector(".peek-pad")!.getBoundingClientRect();
      const scene = document.querySelector(".game-scene")!.getBoundingClientRect();
      return {
        picks: picks.map((rect) => ({ top: Math.round(rect.top), bottom: rect.bottom, width: rect.width, height: rect.height })),
        numeral: parseFloat(getComputedStyle(numeral).fontSize),
        pad: { left: pad.left, right: pad.right, top: pad.top, bottom: pad.bottom },
        scene: { left: scene.left, right: scene.right, top: scene.top, bottom: scene.bottom },
        viewport: window.innerHeight,
      };
    });
    // One row of three, each a big target, all on screen.
    expect(new Set(fit.picks.map((pick) => pick.top)).size).toBe(1);
    for (const pick of fit.picks) {
      expect(pick.width).toBeGreaterThanOrEqual(64);
      expect(pick.height).toBeGreaterThanOrEqual(64);
      expect(pick.bottom).toBeLessThanOrEqual(fit.viewport);
    }
    expect(fit.numeral).toBeGreaterThanOrEqual(16);
    // The leaf stays inside the scene.
    expect(fit.pad.left).toBeGreaterThanOrEqual(fit.scene.left);
    expect(fit.pad.right).toBeLessThanOrEqual(fit.scene.right);
    expect(fit.pad.top).toBeGreaterThanOrEqual(fit.scene.top);
    expect(fit.pad.bottom).toBeLessThanOrEqual(fit.scene.bottom);
  });
}
