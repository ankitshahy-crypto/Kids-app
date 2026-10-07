import { expect, test, type Page } from "@playwright/test";
import { answerGate } from "./gate";

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

/** The first child is added from the welcome button and lands on their Today screen. */
async function addSam(page: Page) {
  await page.getByRole("button", { name: "Add a child", exact: true }).click();
  await passGate(page);
  await expect(page.locator("[data-screen=parent]")).toBeVisible();
  await page.getByLabel("First name or initial").fill("Sam");
  await page.getByRole("button", { name: "4", exact: true }).click();
  await page.getByRole("button", { name: "Fox", exact: true }).click();
  await page.getByRole("button", { name: "Save child" }).click();
  await expect(page.locator("[data-screen=today]")).toBeVisible();
  // The first child brings a one-time offer to set a grown-up PIN.
  await expect(page.locator("[data-pin-prompt=true]")).toBeVisible();
  await page.locator("[data-pin-skip=true]").click();
  await expect(page.locator("[data-pin-prompt=true]")).toHaveCount(0);
}

test("a first run adds a child and starts their day", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("[data-first-run=true]")).toContainText("Add your child to begin");
  await addSam(page);
  await expect(page.locator(".chunk-strip")).toHaveText("4 more!");
  await page.getByRole("button", { name: "Switch child" }).click({ delay: 2000 });
  await expect(page.locator("[data-screen=start]")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sam", exact: true })).toBeVisible();
  const saved = await page.evaluate(() => localStorage.getItem("littlenest-profiles-v1"));
  expect(saved).toContain("Sam");
});

test("removing a child clears them from the start screen", async ({ page }) => {
  await page.goto("./");
  await addSam(page);
  await page.getByRole("button", { name: "Switch child" }).click({ delay: 2000 });
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await passGate(page);
  await expect(page.getByText("Sam · age 4")).toBeVisible();
  await page.getByRole("button", { name: "Children", exact: true }).click();
  await page.locator("[data-confirm=ask]").click();
  // A sheet names the child and warns; Cancel keeps them.
  const sheet = page.getByRole("dialog");
  await expect(sheet).toContainText("Remove Sam and all their progress?");
  await page.locator("[data-confirm=cancel]").click();
  await expect(sheet).toHaveCount(0);
  await expect(page.locator(".child-name", { hasText: "Sam" })).toBeVisible();
  await page.locator("[data-confirm=ask]").click();
  // Cancel and Remove sit in different places, so a repeated tap cannot land on Remove.
  const cancelBox = await page.locator("[data-confirm=cancel]").boundingBox();
  const removeBox = await page.locator("[data-confirm=ready]").boundingBox();
  expect(cancelBox && removeBox).toBeTruthy();
  expect(Math.abs((removeBox?.x ?? 0) - (cancelBox?.x ?? 0))).toBeGreaterThan(60);
  await page.locator("[data-confirm=ready]").click();
  await expect(page.getByRole("button", { name: "Add a child", exact: true })).toBeVisible();
  await expect(page.locator(".child-name", { hasText: "Sam" })).toHaveCount(0);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator("[data-first-run=true]")).toBeVisible();
  const saved = await page.evaluate(() => localStorage.getItem("littlenest-profiles-v1") ?? "");
  expect(saved).not.toContain("Sam");
});

test("removing the child who is on screen goes back to the first screen, never a blank one", async ({ page }) => {
  await page.goto("./");
  await addSam(page);
  // Sam is on Today. Open Grown-ups from there and remove Sam.
  await page.getByRole("button", { name: "Grown-ups" }).click();
  await passGate(page);
  await page.getByRole("button", { name: /Child profiles/ }).click();
  await page.locator("[data-confirm=ask]").click();
  await page.locator("[data-confirm=ready]").click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator("[data-screen=start]")).toBeVisible();
  await expect(page.locator("[data-first-run=true]")).toBeVisible();
  await expect(page.locator("[data-screen=today]")).toHaveCount(0);
});

test("the first child offers a PIN once, and a saved PIN guards the next grown-up check", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Add a child", exact: true }).click();
  await passGate(page);
  await page.getByLabel("First name or initial").fill("Sam");
  await page.getByRole("button", { name: "4", exact: true }).click();
  await page.getByRole("button", { name: "Fox", exact: true }).click();
  await page.getByRole("button", { name: "Save child" }).click();
  const prompt = page.locator("[data-pin-prompt=true]");
  await expect(prompt).toBeVisible();
  await expect(prompt).toContainText("Recommended for classrooms");
  await prompt.getByLabel("New PIN").fill("2468");
  await prompt.getByLabel("PIN again").fill("2460");
  await prompt.getByRole("button", { name: "Save PIN" }).click();
  await expect(prompt.getByRole("alert")).toContainText("do not match");
  await prompt.getByLabel("PIN again").fill("2468");
  const save = prompt.getByRole("button", { name: "Save PIN" });
  await expect(save).not.toHaveAttribute("data-busy", "true");
  await save.click();
  await expect(prompt).toHaveCount(0);

  await page.getByRole("button", { name: "Switch child" }).click({ delay: 2000 });
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await expect(page.locator("[data-gate=pin]")).toBeVisible();
  await expect(page.getByLabel("Answer")).toHaveCount(0);
  await page.getByRole("button", { name: "Cancel" }).click();
  // The offer does not come back.
  await page.reload();
  await expect(page.locator("[data-pin-prompt=true]")).toHaveCount(0);
});

test("a shared class iPad asks the grown-up check before switching child", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "littlenest-profiles-v1",
      JSON.stringify({ activeId: "mia", profiles: [{ id: "mia", name: "Mia", ageRange: "4", animal: "fox", createdAt: new Date().toISOString(), stars: 0, days: {} }] }),
    );
    localStorage.setItem("littlenest-settings-v1", JSON.stringify({ sharedDevice: true }));
    localStorage.setItem("littlenest-silent-hint-v1", "1");
  });
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "Switch child" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("[data-screen=start]")).toHaveCount(0);
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.locator("[data-screen=today]")).toBeVisible();
  await page.getByRole("button", { name: "Switch child" }).click();
  await passGate(page);
  await expect(page.locator("[data-screen=start]")).toBeVisible();
});

test("at home, a quick tap on the animal stays in the lesson and a hold switches child", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "littlenest-profiles-v1",
      JSON.stringify({ activeId: "mia", profiles: [{ id: "mia", name: "Mia", ageRange: "4", animal: "fox", createdAt: new Date().toISOString(), stars: 0, days: {} }] }),
    );
    localStorage.setItem("littlenest-silent-hint-v1", "1");
  });
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  const avatar = page.getByRole("button", { name: "Switch child" });
  await avatar.click();
  await page.waitForTimeout(400);
  await expect(page.locator("[data-screen=today]")).toBeVisible();
  // Held for two seconds, here and wherever a test switches child. The button fires at a second
  // and a half (HOLD_MS), and the tests held it for 1.6 s: a tenth of a second to spare. A page
  // kept from running for longer than that as the hold came due (a busy machine does it now and
  // then) got the release first, which clears the timer, and nothing opened: the next thing the
  // test asked for was on a start screen that never came. Measured: with the page stalled for
  // 0.3 s across the 1.5 s mark, a hold of 1.6 s opened nothing six times in six, and a hold of
  // 2 s opened the start screen six times in six.
  await avatar.click({ delay: 2000 });
  await expect(page.locator("[data-screen=start]")).toBeVisible();
});
