import { expect, test, type Page } from "@playwright/test";
import { answerGate } from "./gate";
import { createdThisWeek } from "./clock";

const WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
};

const profile = {
  activeId: "mia",
  profiles: [
    {
      id: "mia",
      name: "Mia",
      ageRange: "4",
      animal: "fox",
      createdAt: createdThisWeek(),
      stars: 1,
      days: {},
    },
  ],
};

const sections = ["Settings", "Child profiles", "Account", "Help", "Privacy", "About LittleNest Learning"] as const;

function solve(prompt: string): number {
  const sum = prompt.match(/(\d+)\s*\+\s*(\d+)/);
  if (sum) return Number(sum[1]) + Number(sum[2]);
  const word = prompt.match(/number ([a-z]+)/i)?.[1]?.toLowerCase() ?? "";
  const value = WORDS[word];
  if (!value) throw new Error(`Could not read the grown-up check: ${prompt}`);
  return value;
}

async function dismissHint(page: Page) {
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
}

async function openCheck(page: Page) {
  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

async function answer(page: Page, correct: boolean) {
  await answerGate(page, correct);
}

async function openMenu(page: Page) {
  await openCheck(page);
  await answer(page, true);
  await expect(page.locator("[data-screen='grownups']")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Grown-ups", exact: true })).toBeVisible();
  await dismissHint(page);
}

test("the check opens the Grown-ups menu and each section has a Back button", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("button", { name: "Grown-ups", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Parent", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Teacher", exact: true })).toBeVisible();

  await openCheck(page);
  await expect(page.locator("[data-screen='grownups']")).toHaveCount(0);
  // Check is a full-size button here too. Its size was set only inside the grown-up pages, so on
  // the check itself, which opens over a child's screen, it was a strip a few pixels tall.
  const checkButton = page.getByRole("dialog").getByRole("button", { name: "Check", exact: true });
  const checkBox = await checkButton.boundingBox();
  expect(checkBox?.height).toBeGreaterThanOrEqual(56);
  await expect(checkButton).toHaveCSS("border-top-left-radius", "18px");
  await expect(checkButton).toHaveCSS("font-size", "18px");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.locator("[data-screen='start']")).toBeVisible();

  await openCheck(page);
  await answer(page, false);
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Try another one.")).toBeVisible();
  // A wrong answer is announced, for someone who cannot see it.
  await expect(page.getByRole("alert")).toHaveText("Try another one.");
  await answer(page, true);
  await expect(page.locator("[data-screen='grownups'][data-page='menu']")).toBeVisible();
  await dismissHint(page);

  await page.getByRole("button", { name: /Settings/ }).click();
  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
  await expect(page.locator("#volume-voice")).toBeVisible();
  await expect(page.locator("#volume-effects")).toBeVisible();
  await expect(page.locator("#volume-music")).toBeVisible();
  await expect(page.getByText("Tap sounds & buzz")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Speaking voice" })).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator("[data-page='menu']")).toBeVisible();

  await page.getByRole("button", { name: /Child profiles/ }).click();
  await expect(page.getByRole("heading", { name: "Child profiles" })).toBeVisible();
  await expect(page.getByText("this device only")).toBeVisible();
  await expect(page.getByLabel("First name or initial")).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();

  await page.getByRole("button", { name: /Account/ }).click();
  await expect(page.getByRole("heading", { name: "Account", exact: true })).toBeVisible();
  await expect(page.getByText("No account needed")).toBeVisible();
  await expect(page.getByText("works without an account")).toBeVisible();
  await expect(page.getByText("nothing asks for an email or a card")).toBeVisible();
  await expect(page.getByText(/\$|pricing|subscribe/i)).toHaveCount(0);
  await page.getByRole("button", { name: "Back", exact: true }).click();

  await page.getByRole("button", { name: /Help/ }).click();
  await expect(page.getByRole("heading", { name: "Help", exact: true })).toBeVisible();
  // Refunds are Apple's: Help says where to ask, and promises nothing it cannot keep.
  await expect(page.locator("[data-faq=refund] + dd")).toContainText("reportaproblem.apple.com");
  await expect(page.getByRole("heading", { name: "How the daily lesson works" })).toBeVisible();
  // That paragraph is written from the sections in this build (src/content/about.ts): every tile on
  // the home screen is named, Coding's too, and nothing that has left the app is described.
  const help = page.locator("[data-section='help']");
  await expect(help).toContainText("Explore adds LittleNest Numbers, LittleNest Colors, LittleNest Time & Money, LittleNest Build, LittleNest Science, and LittleNest Coding.");
  await expect(help).not.toContainText(/fizz/i);
  await expect(page.getByRole("heading", { name: "Drag to blend" })).toBeVisible();
  await expect(page.locator("[data-section='help']").getByText("switch on the side")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Contact us" })).toHaveCount(0);
  // Feedback opens the grown-up's own mail app, addressed to the real help mailbox.
  await expect(page.locator("[data-action=feedback]")).toHaveAttribute("href", /^mailto:hello@littlenestlearning\.app\?subject=/);
  await page.getByRole("button", { name: "Back", exact: true }).click();

  await page.getByRole("button", { name: /Privacy/ }).click();
  await expect(page.getByRole("heading", { name: "Privacy", exact: true })).toBeVisible();
  await expect(page.getByText("on this device")).toBeVisible();
  await expect(page.getByText("first name or one initial")).toBeVisible();
  await expect(page.getByText("Photos are not uploaded")).toBeVisible();
  await expect(page.getByText("no health data")).toBeVisible();
  await expect(page.getByText("no ads and no tracking")).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();

  await page.getByRole("button", { name: /About LittleNest Learning/ }).click();
  const about = page.locator("[data-section='about']");
  await expect(about.getByRole("heading", { name: "About LittleNest Learning" })).toBeVisible();
  await expect(about.getByText("LittleNest: Early Learning")).toBeVisible();
  await expect(about.getByText("Read, math, science & coding")).toBeVisible();
  await expect(about.getByRole("heading", { name: "Your child is the hero" })).toBeVisible();
  await expect(about.getByRole("heading", { name: "Drag to blend" })).toBeVisible();
  await expect(about.getByText("by TriageDesk")).toBeVisible();
  await expect(about.getByText("Version 0.1.0")).toBeVisible();
  await expect(about.getByText("not a medical product")).toBeVisible();
  await expect(about.getByRole("heading", { name: "Calm by design" })).toBeVisible();
  // Nothing is held back in this build, so About counts and lists every section.
  await expect(about).toContainText("LittleNest Learning has seven sections.");
  await expect(about.locator("[data-teach-subject]")).toHaveCount(5);
  await expect(about.locator(".about-modules .module-mark")).toHaveCount(6);
  await expect(about).not.toContainText(/therap|diagnos|ADHD|autis|dyslex|delay/i);
  await expect(about.getByText(/\$\d|per month/)).toHaveCount(0);
  await page.getByRole("button", { name: "Back", exact: true }).click();

  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator("[data-screen='start']")).toBeVisible();
  await expect(page.getByRole("button", { name: "Parent", exact: true })).toBeVisible();
});

test("Grown-ups on the child screen returns to the lesson path", async ({ page }) => {
  await page.addInitScript((saved) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.setItem("kids-app-silent-hint-v1", "1");
  }, profile);
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  await expect(page.locator("[data-screen='today']")).toBeVisible();
  await expect(page.getByRole("button", { name: "Grown-ups", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Letters" }).click();
  await expect(page.getByRole("button", { name: "Grown-ups", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();

  await openMenu(page);
  await page.getByRole("button", { name: /Child profiles/ }).click();
  await expect(page.getByRole("button", { name: "Add another child" })).toBeVisible();
  await expect(page.locator(".child-name", { hasText: "Mia" })).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator("[data-screen='today']")).toBeVisible();
});

test("menu rows stay large on a phone and on iPad", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await openMenu(page);
  for (const size of [
    { width: 390, height: 844 },
    { width: 1024, height: 1366 },
    { width: 1366, height: 1024 },
  ]) {
    await page.setViewportSize(size);
    for (const name of sections) {
      const row = page.getByRole("button", { name: new RegExp(name) });
      await expect(row).toBeVisible();
      const box = await row.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.width).toBeGreaterThan(140);
      expect(box!.height).toBeGreaterThanOrEqual(72);
    }
    const back = await page.getByRole("button", { name: "Back", exact: true }).boundingBox();
    expect(back!.height).toBeGreaterThanOrEqual(52);
  }
});
