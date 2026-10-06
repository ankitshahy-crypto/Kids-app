import { expect, test, type Locator, type Page } from "@playwright/test";
import { createdThisWeek } from "./clock";
import { noting } from "./kit";

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

function solve(prompt: string): number {
  const sum = prompt.match(/(\d+)\s*\+\s*(\d+)/);
  if (sum) return Number(sum[1]) + Number(sum[2]);
  const word = prompt.match(/number ([a-z]+)/i)?.[1]?.toLowerCase() ?? "";
  const value = WORDS[word];
  if (!value) throw new Error(`Could not read the grown-up check: ${prompt}`);
  return value;
}

async function press(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Nothing to press");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await expect(locator).toHaveClass(/is-pressed/);
  await expect(locator).toHaveAttribute("data-pressed", "true");
  const scale = await locator.evaluate((element) => getComputedStyle(element).scale);
  expect(scale === "0.95" || scale.startsWith("0.95")).toBe(true);
  await page.mouse.up();
  if ((await locator.count()) > 0) {
    await expect(locator).not.toHaveClass(/is-pressed/);
    await expect(locator).not.toHaveAttribute("data-pressed", "true");
  }
}

test("a press shows immediately on buttons and clears when the pointer lifts", async ({ page }) => {
  await page.goto("./");
  const parent = page.getByRole("button", { name: "Parent", exact: true });
  await expect(parent).toBeVisible();
  // After the tap the button is held for a moment, so a second tap cannot repeat it, and marked
  // busy. The mark is gone again in under half a second, so the page notes it as it comes: a look
  // from here, after the press has been checked, can be too late.
  const busy = await noting(parent, (button) => `busy ${button.getAttribute("data-busy") === "true"}, marked ${button.classList.contains("is-busy")}`);
  await press(page, parent);
  await expect.poll(busy).toContain("busy true, marked true");

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const prompt = await dialog.getByRole("heading").innerText();
  const answer = solve(prompt);
  await dialog.getByLabel("Answer").fill(String(answer + 1));
  const wrong = dialog.getByRole("button", { name: "Check", exact: true });
  await press(page, wrong);
  await expect(dialog).toBeVisible();

  await press(page, page.getByRole("button", { name: "Cancel" }));
  await expect(dialog).toHaveCount(0);

  await expect(parent).not.toHaveAttribute("data-busy", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const box = await parent.boundingBox();
  if (!box) throw new Error("Parent button has no box");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(parent).toHaveAttribute("data-pressed", "true");
  const style = await parent.evaluate((element) => {
    const computed = getComputedStyle(element);
    return { scale: computed.scale, filter: computed.filter };
  });
  expect(style.scale === "none" || style.scale === "1").toBe(true);
  expect(style.filter).toContain("brightness");
  await page.mouse.up();
});

test("child, lesson, and letter controls press, and the blend track stays still", async ({ page }) => {
  await page.addInitScript((saved) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.removeItem("kids-app-silent-hint-v1");
  }, profile);
  await page.goto("./");

  await press(page, page.getByRole("button", { name: "Mia" }));
  await press(page, page.getByRole("button", { name: "Letters" }));

  const tile = page.locator(".letters .tile-wrap").first().locator("button");
  await expect(tile).toBeDisabled();
  const tileBox = await tile.boundingBox();
  if (!tileBox) throw new Error("Letter tile has no box");
  await page.mouse.move(tileBox.x + tileBox.width / 2, tileBox.y + tileBox.height / 2);
  await page.mouse.down();
  await expect(tile).not.toHaveClass(/is-pressed/);
  await expect(tile).not.toHaveAttribute("data-pressed", "true");
  await page.mouse.up();

  const track = page.locator(".blend-track");
  const trackBox = await track.boundingBox();
  if (!trackBox) throw new Error("Blend track has no box");
  await page.mouse.move(trackBox.x + 12, trackBox.y + trackBox.height / 2);
  await page.mouse.down();
  await expect(track).not.toHaveAttribute("data-pressed", "true");
  await expect(track.locator(".is-pressed")).toHaveCount(0);
  await page.mouse.up();

  await press(page, page.getByRole("button", { name: "Play sound" }));
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await expect(tile).toBeEnabled();
  await press(page, tile);
  await press(page, page.getByRole("button", { name: "Next word" }));
});
