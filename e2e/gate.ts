import { expect, type Page } from "@playwright/test";

const WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };

/** The answer to the grown-up check on screen: a typed number, from a word or a small sum. */
export function solveGate(prompt: string): number {
  const sum = prompt.match(/(\d+)\s*\+\s*(\d+)/);
  if (sum) return Number(sum[1]) + Number(sum[2]);
  const word = prompt.match(/number ([a-z]+)/i)?.[1]?.toLowerCase() ?? "";
  const value = WORDS[word];
  if (!value) throw new Error(`Could not read the grown-up check: ${prompt}`);
  return value;
}

/** Type an answer into the open grown-up check. `correct: false` types a wrong one. */
export async function answerGate(page: Page, correct = true) {
  // The gate card, even when it sits over another dialog such as the child's lock sheet.
  const dialog = page.locator("[data-gate]");
  const prompt = await dialog.getByRole("heading").innerText();
  const answer = solveGate(prompt);
  const button = dialog.getByRole("button", { name: "Check", exact: true });
  await expect(button).not.toHaveAttribute("data-busy", "true");
  await dialog.getByLabel("Answer").fill(String(correct ? answer : answer + 1));
  await button.click();
}

/** Pass the grown-up check that is open. */
export async function passGate(page: Page) {
  await answerGate(page, true);
}

/** On the Teacher page: open one child's page from the class list. */
export async function openTeacherChild(page: Page, childId: string) {
  await page.locator(`[data-open-child="${childId}"]`).click();
  await expect(page.locator(`[data-child-sheet="${childId}"]`)).toBeVisible();
}

/** On the Teacher page: unfold the whole-class lesson place. */
export async function openClassPlace(page: Page) {
  const fold = page.locator("[data-card=class-place]");
  if (!(await fold.getAttribute("open"))) await fold.locator("summary").click();
  await expect(page.locator("[data-place=class]")).toBeVisible();
}
