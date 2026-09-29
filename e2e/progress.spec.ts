import { expect, test, type Page } from "@playwright/test";
import { answerGate } from "./gate";

/**
 * Progress for grown-ups: completion on the parent's device and the class
 * iPad, the Friday sound game's quiet check-in, and the two codes that carry
 * a little progress between them with no account and no server.
 */

// Friday 2 October 2026, mid-morning in New York. Monday of that week is 28 September.
const FRIDAY = new Date("2026-10-02T14:00:00Z");

const WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };

function solve(prompt: string): number {
  const sum = prompt.match(/(\d+)\s*\+\s*(\d+)/);
  if (sum) return Number(sum[1]) + Number(sum[2]);
  const word = prompt.match(/number ([a-z]+)/i)?.[1]?.toLowerCase() ?? "";
  const value = WORDS[word];
  if (!value) throw new Error(`Could not read the grown-up check: ${prompt}`);
  return value;
}

async function passGate(page: Page) {
  await answerGate(page, true);
}

/** Use code, once the press guard from the last tap has let go. */
async function useCode(scope: ReturnType<Page["locator"]>) {
  const button = scope.getByRole("button", { name: "Use code" });
  await expect(button).not.toHaveAttribute("data-busy", "true");
  await button.click();
}

const lesson = { reading: { letter: true, draw: true, story: true, moment: true } };

const mia = {
  id: "mia",
  name: "Mia",
  ageRange: "4",
  animal: "fox",
  // Three weeks in: week 3 of letters, with m a s t i p already met.
  createdAt: "2026-09-14T12:00:00.000Z",
  stars: 20,
  days: {
    "2026-09-22": lesson,
    "2026-09-28": lesson,
    "2026-09-29": { reading: { letter: true }, math: { count: true } },
    "2026-10-01": { ...lesson, colors: { name: true } },
  },
};

async function openApp(page: Page) {
  // Shift the page's calendar to that Friday but leave its timers alone: the
  // game and the double-tap guard need real setTimeout.
  await page.addInitScript((friday) => {
    const RealDate = Date;
    const offset = friday - RealDate.now();
    class ShiftedDate extends RealDate {
      constructor(...args: unknown[]) {
        if (args.length === 0) super(RealDate.now() + offset);
        else super(...(args as [number]));
      }
      static now() {
        return RealDate.now() + offset;
      }
    }
    (globalThis as { Date: DateConstructor }).Date = ShiftedDate as DateConstructor;
  }, FRIDAY.getTime());
  await page.addInitScript((saved) => {
    if (sessionStorage.getItem("littlenest-test-seeded")) return;
    sessionStorage.setItem("littlenest-test-seeded", "1");
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.removeItem("kids-app-silent-hint-v1");
  }, { activeId: "mia", profiles: [mia] });
  await page.goto("./");
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
}

test("the parent sees lessons finished this week, never a score", async ({ page }) => {
  await openApp(page);
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await passGate(page);
  await expect(page.locator("[data-section=lessons] .dash-stat")).toHaveText("2 of 5");
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  const card = page.locator("[data-screen=parent] [data-completion=mia]");
  await expect(card).toHaveAttribute("data-lessons-week", "2");
  await expect(card).toHaveAttribute("data-lessons-total", "3");
  await expect(card.locator(".day-dot[data-on=true]")).toHaveCount(3);
  await expect(card.locator("[data-area=math]")).toHaveText("Numbers");
  await expect(card.locator("[data-area=colors]")).toHaveText("Colors");
  await expect(card).toContainText("Yesterday");
  await expect(card).not.toContainText(/score|grade|behind|below/i);
});

test("the Friday sound game notes first tries quietly and shows grown-ups what they know", async ({ page }) => {
  await openApp(page);
  await page.getByRole("button", { name: "Mia" }).click();
  await page.locator("[data-practice=sounds]").click();
  const game = page.locator("[data-screen=sound-check]");
  await expect(game).toBeVisible();
  const rounds = Number((await game.locator(".chunk-strip").innerText()).match(/of (\d+)/)?.[1] ?? 0);
  expect(rounds).toBeGreaterThanOrEqual(2);
  let missed = "";
  for (let round = 0; round < rounds; round += 1) {
    await expect(game).toHaveAttribute("data-round", String(round));
    const answer = (await game.getAttribute("data-answer")) ?? "";
    if (round === 0) {
      // A miss just means try again: the letter dims, the round stays.
      const wrong = game.locator(`.check-choice:not([data-choice="${answer}"])`).first();
      await wrong.click();
      await expect(wrong).toBeDisabled();
      missed = answer;
    }
    await expect(game).toHaveAttribute("data-answer", answer);
    await game.locator(`[data-choice="${answer}"]`).click();
  }
  await expect(game).toHaveAttribute("data-check", "done");
  await expect(game).not.toContainText(/wrong|score/i);
  const before = Number(await page.locator(".star-count").first().getAttribute("data-stars"));
  await page.getByRole("button", { name: "Get my star" }).click();
  await expect(page.locator("[data-screen=today] .star-count")).toHaveAttribute("data-stars", String(before + 1));

  await page.getByRole("button", { name: "Switch child" }).click({ delay: 1600 });
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await passGate(page);
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  const card = page.locator("[data-screen=parent] [data-completion=mia]");
  await expect(card).toHaveAttribute("data-practicing", missed);
  const knows = ((await card.getAttribute("data-knows")) ?? "").split(" ").filter(Boolean);
  expect(knows).toHaveLength(rounds - 1);
  expect(knows).not.toContain(missed);
});

test("a family code and a progress code carry notes and completion both ways", async ({ page }) => {
  await openApp(page);
  // Class iPad: pick a note for home and read the family code.
  await page.getByRole("button", { name: "Teacher", exact: true }).click();
  await passGate(page);
  const row = page.locator("[data-card=class-progress] li[data-child=mia]");
  await expect(row.locator(".class-row-week")).toHaveText("2 of 5");
  await row.locator("[data-open-child=mia]").click();
  const sheet = page.locator("[data-child-sheet=mia]");
  await sheet.locator("[data-note-for=mia]").selectOption({ label: "Wonderful blending this week!" });
  const familyCode = (await sheet.locator("[data-section=family-code-out] [data-code]").getAttribute("data-code")) ?? "";
  expect(familyCode).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  await page.getByRole("button", { name: "Back", exact: true }).click();

  // Home: type the teacher's code, then read the progress code back.
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await passGate(page);
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  const child = page.locator("[data-screen=parent] .progress-child[data-child=mia]");
  await child.locator("[data-section=family-code] summary").click();
  await child.getByLabel("Teacher's code").fill("not a code");
  await useCode(child);
  await expect(child.getByRole("alert")).toContainText("did not work");
  await child.getByLabel("Teacher's code").fill(familyCode.toLowerCase());
  await useCode(child);
  await expect(child.locator("[data-section=teacher-note]")).toContainText("Wonderful blending this week!");
  await child.locator("[data-section=share-code] summary").click();
  const progress = (await child.locator("[data-section=share-code] [data-code]").getAttribute("data-code")) ?? "";
  expect(progress).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();

  // Class iPad: the progress code from home shows next to the class numbers.
  await page.getByRole("button", { name: "Teacher", exact: true }).click();
  await passGate(page);
  await row.locator("[data-open-child=mia]").click();
  await sheet.getByLabel("Progress code from home").fill(familyCode);
  await useCode(sheet);
  await expect(sheet.getByRole("alert")).toContainText("family code");
  await sheet.getByLabel("Progress code from home").fill(progress);
  await useCode(sheet);
  const home = sheet.locator("[data-section=from-home]");
  await expect(home).toHaveAttribute("data-lessons-week", "2");
  await expect(home).toContainText("This week");
});
