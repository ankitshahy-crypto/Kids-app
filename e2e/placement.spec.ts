import { expect, test, type Page } from "@playwright/test";

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
      createdAt: "2026-09-01T15:00:00.000Z",
      stars: 0,
      days: {},
    },
  ],
};

function solve(prompt: string): number {
  const sum = prompt.match(/(\d+)\s*\+\s*(\d+)/);
  if (sum) return Number(sum[1]) + Number(sum[2]);
  const word = prompt.match(/number ([a-z]+)/i)?.[1]?.toLowerCase() ?? "";
  const value = WORDS[word];
  if (!value) throw new Error(`Could not read the grown-up check: ${prompt}`);
  return value;
}

async function passGate(page: Page) {
  const dialog = page.getByRole("dialog");
  const prompt = await dialog.getByRole("heading").innerText();
  const expected = solve(prompt);
  const buttons = dialog.locator(".gate-choice");
  const count = await buttons.count();
  for (let index = 0; index < count; index += 1) {
    if (Number(await buttons.nth(index).innerText()) === expected) {
      await buttons.nth(index).click();
      return;
    }
  }
  throw new Error("No matching choice");
}

async function openTeacher(page: Page) {
  await page.getByRole("button", { name: "Teacher", exact: true }).click();
  await passGate(page);
  await expect(page.locator("[data-screen=teacher]")).toBeVisible();
}

test("a class place and a child override stay on this device", async ({ page }, testInfo) => {
  await page.addInitScript((saved) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.removeItem("kids-app-silent-hint-v1");
  }, profile);
  await page.goto("./");
  await openTeacher(page);

  const classPlace = page.locator("[data-place=class]");
  await classPlace.getByRole("button", { name: "Blending", exact: true }).click();
  await expect(classPlace).toHaveAttribute("data-stage", "blending");
  await expect(classPlace).toHaveAttribute("data-week", "4");
  await expect(page.locator("[data-place=child][data-child=mia]")).toHaveAttribute("data-source", "class");

  await page.reload();
  const saved = await page.evaluate(() => localStorage.getItem("kids-app-placement-v1"));
  expect(JSON.parse(saved ?? "{}").classDefault).toMatchObject({ stageId: "blending", weekIndex: 4 });
  await openTeacher(page);
  await expect(page.locator("[data-place=class]")).toHaveAttribute("data-stage", "blending");

  const childPlace = page.locator("[data-place=child][data-child=mia]");
  await childPlace.getByRole("button", { name: "Words", exact: true }).click();
  await expect(childPlace).toHaveAttribute("data-stage", "words");
  await expect(childPlace).toHaveAttribute("data-source", "child");
  await expect(childPlace.locator("[data-today]")).toHaveAttribute("data-today", /^f/);
  if (testInfo.project.name === "iphone") {
    await page.locator("[data-card=placement]").screenshot({ path: "/opt/cursor/artifacts/lesson-place-iphone.png" });
  }

  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Mia" }).click();
  const today = page.locator("[data-screen=today]");
  await expect(today).toHaveAttribute("data-source", "child");
  await expect(today).toHaveAttribute("data-stage", "words");
  await expect(today).toHaveAttribute("data-letters", /^f/);
  await expect(today.locator(".trail-letter")).toHaveText("F");

  await page.getByRole("button", { name: "Switch child" }).click();
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await passGate(page);
  const parentPlace = page.locator("[data-screen=parent] [data-section=placement]");
  await expect(parentPlace).toHaveAttribute("data-source", "child");
  await expect(parentPlace).toHaveAttribute("data-stage", "words");
  await expect(parentPlace).toContainText("Set for this child.");

  await page.reload();
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await passGate(page);
  await expect(page.locator("[data-screen=parent] [data-section=placement]")).toHaveAttribute("data-stage", "words");

  await page.getByRole("button", { name: "Back", exact: true }).click();
  await openTeacher(page);
  await page.locator("[data-place=child][data-child=mia]").getByRole("button", { name: "Same as class" }).click();
  await expect(page.locator("[data-place=child][data-child=mia]")).toHaveAttribute("data-source", "class");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Mia" }).click();
  await expect(page.locator("[data-screen=today]")).toHaveAttribute("data-source", "class");
  await expect(page.locator("[data-screen=today]")).toHaveAttribute("data-letters", /^o/);
  await expect(page.locator(".trail-letter")).toHaveText("O");
});

test("printable letter and blending sheets render", async ({ page }, testInfo) => {
  await page.addInitScript((saved) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.removeItem("kids-app-silent-hint-v1");
    window.print = () => {
      (window as Window & { __printed?: boolean }).__printed = true;
    };
  }, profile);
  await page.goto("./");
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  await passGate(page);
  await page.getByRole("button", { name: /Printables/ }).click();

  const root = page.locator("[data-section=printables]");
  await expect(root.getByRole("heading", { name: "Printables" })).toBeVisible();
  const week = (await root.locator("[data-week-letters]").getAttribute("data-week-letters")) ?? "";
  const letters = week.split(" ").filter(Boolean);
  expect(letters.length).toBeGreaterThan(0);

  for (const letter of letters) {
    const sheet = root.locator(`[data-sheet=letter][data-letter=${letter}]`);
    await expect(sheet).toBeVisible();
    await expect(sheet.locator("[data-case=upper]")).toContainText(letter.toUpperCase());
    await expect(sheet.locator("[data-case=lower]")).toContainText(letter);
    await expect(sheet.getByText("Color the stars")).toBeVisible();
    await expect(sheet.locator("[data-picture]")).toHaveAttribute("data-picture", /.+/);
    await expect(sheet.locator("[data-animal]")).toHaveAttribute("data-animal", "fox");
    await expect(sheet.locator(".trace-guides span")).toHaveCount(3);
  }

  const blend = root.locator("[data-sheet=blend]");
  await expect(blend).toBeVisible();
  await expect(blend.locator("[data-word]").first()).toBeVisible();
  await expect(blend.locator(".blend-box").first()).toBeVisible();

  await root.locator(`.letter-picks [data-letter=${letters[0]}]`).click();
  await expect(root.locator(`[data-sheet=letter][data-letter=${letters[0]}]`)).toHaveCount(0);
  await root.getByRole("button", { name: "Letters from this week" }).click();
  await expect(root.locator(`[data-sheet=letter][data-letter=${letters[0]}]`)).toBeVisible();

  await root.getByRole("button", { name: "US Letter" }).click();
  await expect(root.locator(".print-root")).toHaveAttribute("data-paper", "letter");
  await root.getByRole("button", { name: "A4" }).click();
  await expect(root.locator(".print-root")).toHaveAttribute("data-paper", "a4");

  await root.getByRole("button", { name: "Print", exact: true }).click();
  await expect.poll(async () => page.evaluate(() => (window as Window & { __printed?: boolean }).__printed)).toBe(true);

  if (testInfo.project.name === "iphone") {
    await root.locator("[data-sheet=letter]").first().screenshot({ path: "/opt/cursor/artifacts/printable-letter-iphone.png" });
  }

  await page.emulateMedia({ media: "print" });
  await expect(root.locator(".print-controls")).toBeHidden();
  await expect(root.locator("[data-sheet=letter]").first()).toBeVisible();
  await expect(root.locator("[data-sheet=blend]")).toBeVisible();

  await page.emulateMedia({ media: "screen" });
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await openTeacher(page);
  const teacherSheets = page.locator("[data-card=printables]");
  await expect(teacherSheets.locator("[data-sheet=letter]").first()).toBeVisible();
  await expect(teacherSheets.locator("[data-sheet=blend]")).toBeVisible();
  await expect(teacherSheets.getByText("Color the stars").first()).toBeVisible();
});
