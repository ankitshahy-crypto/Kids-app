import { expect, test, type Page } from "@playwright/test";
import { createdThisWeek } from "./clock";
import { game, onRound } from "./kit";
import { showWordCard } from "./lesson";
import { pairOne, traceCurrentStroke } from "./traceFlow";

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

test("the grown-up line follows the Draw card: tracing copy while tracing, then the tap on the look-alike card", async ({ page }) => {
  // The phone pass of build 4: "Trace the big letter, then the little one" stayed up over the card
  // that asks for a tap on little m, with w beside it. Each card says what it does now.
  test.setTimeout(90_000);
  await open(page);
  await page.getByRole("button", { name: "Draw" }).click();
  const root = page.locator("[data-screen=draw]");
  const tip = page.locator(".grownup-tip");
  const text = page.locator(".grownup-tip-text");
  await expect(tip).toHaveAttribute("data-tip", "draw-start");
  await expect(text).toContainText("Trace the big letter, then the little one.");
  // Mia's letters are m and a: m has a look-alike (w), so its tracing ends on that card.
  for (let step = 0; step < 80; step += 1) {
    const phase = await root.getAttribute("data-phase");
    if (phase === "reversal") break;
    if (phase === null) throw new Error("Draw ended before a look-alike card");
    if (phase === "demo") {
      await root.getByRole("button", { name: "Your turn" }).click({ timeout: 1500 }).catch(() => undefined);
      await expect(root).not.toHaveAttribute("data-phase", "demo", { timeout: 15_000 });
    } else if (phase === "trace") {
      await expect(tip).toHaveAttribute("data-tip", "draw-start");
      await traceCurrentStroke(page);
    } else if (phase === "cheer") {
      await root.getByRole("button", { name: "Match" }).click();
      await expect(root).toHaveAttribute("data-phase", "match");
      await expect(tip).toHaveAttribute("data-tip", "draw-match");
      await expect(text).toContainText("match");
      await expect(text).not.toContainText(/trace/i);
    } else if (phase === "match") {
      await pairOne(page);
    } else {
      throw new Error(`Unexpected tracing phase ${phase}`);
    }
  }
  const letter = await root.getAttribute("data-reversal");
  expect(letter).toBe("m");
  await expect(tip).toHaveAttribute("data-tip", "draw-reversal");
  await expect(tip).toHaveAttribute("data-tip-open", "true");
  await expect(text).toHaveText("Tap the little letter, m. Little w looks alike and is there to pass over.");
  // The decoy is still there to pass over, and the right tap moves on to the next letter's tracing copy.
  await expect(root.locator("[data-reversal-choice=w]")).toBeVisible();
  await root.locator("[data-reversal-choice=m]").click();
  await expect(root).toHaveAttribute("data-letter", "a");
  await expect(tip).toHaveAttribute("data-tip", "draw-start");
  await expect(text).toContainText("Trace the big letter");
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
