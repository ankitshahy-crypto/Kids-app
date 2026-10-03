import { expect, test, type Page } from "@playwright/test";
import { answerGate, openTeacherChild } from "./gate";
import { createdThisWeek } from "./clock";
import { finishPathTrace } from "./traceFlow";

const profile = {
  activeId: "mia",
  profiles: [
    {
      id: "mia",
      name: "Mia",
      ageRange: "4",
      animal: "fox",
      createdAt: createdThisWeek(),
      stars: 0,
      days: {},
      ladder: { step: 1, successes: 0 },
    },
  ],
};

async function passGate(page: Page) {
  await answerGate(page, true);
}

test("a teacher places the word ladder and the egg uses that step", async ({ page }, testInfo) => {
  await page.addInitScript((saved) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.removeItem("kids-app-silent-hint-v1");
  }, profile);
  await page.goto("./");
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "Switch child" }).click({ delay: 1600 });
  await page.getByRole("button", { name: "Teacher", exact: true }).click();
  await passGate(page);
  await openTeacherChild(page, "mia");
  await page.getByRole("button", { name: "Word ladder step 2" }).click();
  await expect(page.locator("[data-section=ladder]")).toHaveAttribute("data-ladder-step", "2");
  await expect(page.locator("[data-stage=word-ladder]")).toContainText("Two letters");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await passGate(page);
  const parent = page.locator("[data-section=ladder]");
  await expect(parent).toHaveAttribute("data-ladder-step", "2");
  await expect(parent).toHaveAttribute("data-editable", "false");
  await expect(parent).toContainText("at, in, it");
  await expect(page.locator("[data-stage=word-ladder]")).toHaveAttribute("data-ladder-step", "2");
  if (testInfo.project.name === "chromium") {
    await page.locator("[data-section=path]").screenshot({ path: "test-results/screenshots/word_ladder_path.png" });
  }
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Mia" }).click();
  await page.locator("[data-dock=games]").click();
  await page.locator("[data-game-tile=hatch]").click();
  const board = page.locator("[data-game=hatch] .game-board");
  await expect(board).toHaveAttribute("data-ladder-step", "2");
  // The egg's picture is the question, so its word is one with a drawing. (A two-letter word has none:
  // "at" cannot be drawn.) The first egg asks for the first sound, a letter this child has been taught.
  const word = (await board.getAttribute("data-word")) ?? "";
  expect(["m", "a"]).toContain(word[0]);
  await expect(board.locator(".hatch-picture svg")).toBeVisible();
  await expect(board.locator('[data-letter][data-needed="true"]')).toHaveCount(1);
  await expect(board.locator("[data-letter]")).toHaveCount(3);
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/word_ladder_hatch.png" });
  }
});

/** Week 0 of the letter plan: m and a. The longest word they spell has two letters, so the ladder stops at step 2. */
const weekOne = {
  version: 1,
  origin: "device",
  classId: "device-class",
  updatedAt: "2026-09-26T00:00:00.000Z",
  subjects: {
    reading: { classDefault: { subject: "reading", stageId: "letters", weekIndex: 0 }, byChildId: {} },
  },
};

async function savedLadder(page: Page): Promise<{ step: number; successes: number }> {
  return page.evaluate(() => JSON.parse(localStorage.getItem("littlenest-profiles-v1") ?? "{}").profiles[0].ladder);
}

test("a week-one child does not climb the ladder by playing games", async ({ page }) => {
  // One success short of moving up, on the last step m and a can support. The lesson held the child
  // here; a hatched egg or a rhyme match did not, and moved them on to words they cannot sound out.
  const child = { ...profile, profiles: [{ ...profile.profiles[0], ladder: { step: 2, successes: 2 } }] };
  await page.addInitScript(
    ({ saved, placed }) => {
      if (sessionStorage.getItem("ladder-test-seeded")) return;
      sessionStorage.setItem("ladder-test-seeded", "1");
      localStorage.setItem("littlenest-profiles-v1", JSON.stringify(saved));
      localStorage.setItem("littlenest-placement-v1", JSON.stringify(placed));
      localStorage.setItem("littlenest-silent-hint-v1", "1");
    },
    { saved: child, placed: weekOne },
  );
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  await expect(page.locator("[data-screen=today]")).toHaveAttribute("data-letters", "ma");

  // Hatch the Egg counts toward the ladder.
  await page.locator("[data-dock=games]").click();
  await page.locator("[data-game-tile=hatch]").click();
  const hatch = page.locator("[data-game=hatch] .game-board");
  while ((await hatch.locator('[data-letter][data-needed="true"]').count()) > 0) {
    await hatch.locator('[data-letter][data-needed="true"]').first().click();
  }
  await expect(hatch).toHaveAttribute("data-phase", "hatched");
  await hatch.getByRole("button", { name: "Done" }).click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
  expect((await savedLadder(page)).step).toBe(2);

  // So does Rhyme Match.
  await page.locator("[data-game-tile=rhyme]").click();
  const rhyme = page.locator("[data-game=rhyme] .game-board");
  const cards = await rhyme.locator("[data-rhyme]").evaluateAll((nodes) =>
    nodes.map((node) => ({ id: node.getAttribute("data-rhyme") ?? "", pair: node.getAttribute("data-pair") ?? "" })),
  );
  for (const pair of new Set(cards.map((card) => card.pair))) {
    for (const card of cards.filter((entry) => entry.pair === pair)) await rhyme.locator(`[data-rhyme="${card.id}"]`).click();
  }
  await expect(rhyme).toHaveAttribute("data-phase", "done");
  await rhyme.getByRole("button", { name: "Done" }).click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "2");
  const ladder = await savedLadder(page);
  expect(ladder.step).toBe(2);
  // The tries are counted, so the child moves up as soon as the letters allow it.
  expect(ladder.successes).toBe(3);
});

test("a week-one child does not climb the ladder by tracing a word", async ({ page }) => {
  const child = {
    ...profile,
    profiles: [{ ...profile.profiles[0], ladder: { step: 2, successes: 2 }, stickers: [{ subject: "reading", kind: "word", label: "am" }] }],
  };
  await page.addInitScript(
    ({ saved, placed }) => {
      if (sessionStorage.getItem("ladder-test-seeded")) return;
      sessionStorage.setItem("ladder-test-seeded", "1");
      localStorage.setItem("littlenest-profiles-v1", JSON.stringify(saved));
      localStorage.setItem("littlenest-placement-v1", JSON.stringify(placed));
      localStorage.setItem("littlenest-silent-hint-v1", "1");
    },
    { saved: child, placed: weekOne },
  );
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "Trace a word" }).click();
  const word = page.locator("[data-screen=word]");
  await expect(word).toHaveAttribute("data-word", "am");
  await word.getByRole("button", { name: "Your turn" }).click();
  await finishPathTrace(page, "word");
  await expect(page.locator("[data-screen=today] .star-count")).toHaveAttribute("data-stars", "1");
  const ladder = await savedLadder(page);
  expect(ladder.step).toBe(2);
  expect(ladder.successes).toBe(3);
});
