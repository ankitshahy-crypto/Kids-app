import { expect, test } from "@playwright/test";
import { openTeacherChild, passGate } from "./gate";

/**
 * A class iPad with a whole class on it: the Teacher page stays a short list,
 * one child's page has everything about that child, and the Parent screen
 * says which child it is showing.
 */

const ANIMALS = ["fox", "bunny", "owl", "bear", "frog", "cat", "duck", "dog", "pig", "penguin", "lion", "koala"];
const NAMES = ["Ava", "Ben", "Cleo", "Dev", "Ella", "Finn", "Gia", "Hugo", "Ivy", "Jun", "Kai", "Lila", "Mo", "Nia", "Oli", "Pia", "Quin", "Rae", "Sam", "Tia", "Uma", "Vik", "Wen", "Xia", "Yui"];

function classProfiles(count: number) {
  const created = new Date(Date.now() - 21 * 86400000).toISOString();
  return NAMES.slice(0, count).map((name, index) => ({
    id: name.toLowerCase(),
    name,
    ageRange: index % 2 ? "4" : "5",
    animal: ANIMALS[index % ANIMALS.length],
    createdAt: created,
    stars: index,
    days: index % 3 === 0 ? {} : { [new Date().toISOString().slice(0, 10)]: { reading: { letter: true } } },
  }));
}

test.use({ viewport: { width: 810, height: 1080 } });

test("the Teacher page with 25 children stays a short list, and one child's page holds the controls", async ({ page }) => {
  await page.addInitScript((saved) => {
    localStorage.setItem("littlenest-profiles-v1", JSON.stringify({ activeId: saved[0].id, profiles: saved }));
    localStorage.setItem("littlenest-silent-hint-v1", "1");
  }, classProfiles(25));
  await page.goto("./");
  await page.getByRole("button", { name: "Teacher", exact: true }).click();
  await passGate(page);
  await expect(page.locator("[data-card=class-progress] li")).toHaveCount(25);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  expect(height, "under three screens tall").toBeLessThan(1080 * 3);
  const buttons = await page.locator("[data-screen=teacher] button:visible").count();
  expect(buttons).toBeLessThan(60);
  // Whole-class placement and printables are folded away until needed.
  await expect(page.locator("[data-place=class]")).toBeHidden();
  await expect(page.locator("[data-sheet=letter]").first()).toBeHidden();

  await openTeacherChild(page, "ben");
  const sheet = page.locator("[data-child-sheet=ben]");
  await expect(sheet).toContainText("Ben");
  await expect(sheet.locator("[data-place=child][data-child=ben]")).toBeVisible();
  await expect(sheet.locator("[data-note-for=ben]")).toBeVisible();
  await expect(sheet.locator("[data-section=family-code-out] [data-code]")).toBeVisible();
  await expect(page.locator("[data-card=class-progress]")).toHaveCount(0);
  await page.locator("[data-action=all-children]").click();
  await expect(page.locator("[data-card=class-progress] li")).toHaveCount(25);
});

test("the Parent screen names the child and can switch between children", async ({ page }) => {
  await page.addInitScript((saved) => {
    localStorage.setItem("littlenest-profiles-v1", JSON.stringify({ activeId: saved[0].id, profiles: saved }));
    localStorage.setItem("littlenest-silent-hint-v1", "1");
  }, classProfiles(3));
  await page.goto("./");
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await passGate(page);
  const head = page.locator("[data-section=child-head]");
  await expect(head).toHaveAttribute("data-child", "ava");
  await expect(head).toContainText("Ava");
  await page.getByLabel("Which child").selectOption("cleo");
  await expect(head).toHaveAttribute("data-child", "cleo");
  await expect(head).toContainText("Cleo");
  await page.getByRole("button", { name: "From Teacher" }).click();
  await expect(page.locator("[data-section=child-head]")).toContainText("Cleo");
});

test("using the Teacher screen turns Shared class iPad on once, and a grown-up's Off stays off", async ({ page }) => {
  await page.addInitScript((saved) => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem("littlenest-profiles-v1", JSON.stringify({ activeId: saved[0].id, profiles: saved }));
    localStorage.setItem("littlenest-silent-hint-v1", "1");
  }, classProfiles(3));
  await page.goto("./");
  await page.getByRole("button", { name: "Teacher", exact: true }).click();
  await passGate(page);
  await expect(page.locator("[data-shared-note=on]")).toContainText("Shared class iPad is on");
  await page.getByRole("button", { name: "Back", exact: true }).click();

  // Settings shows it on; the grown-up turns it off.
  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  await passGate(page);
  await page.getByRole("button", { name: /Settings/ }).click();
  const shared = page.locator("[data-setting=shared]");
  await expect(shared.getByRole("button", { name: "On", exact: true })).toHaveAttribute("aria-pressed", "true");
  await shared.getByRole("button", { name: "Off", exact: true }).click();
  await expect(shared.getByRole("button", { name: "Off", exact: true })).toHaveAttribute("aria-pressed", "true");

  // Back in Teacher, after a reload: it stays off.
  await page.reload();
  await page.getByRole("button", { name: "Teacher", exact: true }).click();
  await passGate(page);
  await expect(page.locator("[data-screen=teacher]")).toBeVisible();
  await expect(page.locator("[data-shared-note]")).toHaveCount(0);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("littlenest-settings-v1") ?? "{}"));
  expect(saved.sharedDevice).toBe(false);
});
