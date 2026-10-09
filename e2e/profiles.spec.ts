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
  // Nothing for a grown-up opens over the child's screen: the one-time PIN offer waits in Grown-ups.
  await expect(page.locator("[data-pin-prompt=true]")).toHaveCount(0);
}

/** Open Grown-ups from the child's screen, and pass the check. */
async function openGrownupsMenu(page: Page) {
  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  await passGate(page);
  await expect(page.locator("[data-screen=grownups]")).toBeVisible();
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
  // Sam is on Today. Open Grown-ups from there (the one-time PIN offer comes here; not now) and remove Sam.
  await openGrownupsMenu(page);
  await page.locator("[data-pin-skip=true]").click();
  await page.getByRole("button", { name: /Child profiles/ }).click();
  await page.locator("[data-confirm=ask]").click();
  await page.locator("[data-confirm=ready]").click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator("[data-screen=start]")).toBeVisible();
  await expect(page.locator("[data-first-run=true]")).toBeVisible();
  await expect(page.locator("[data-screen=today]")).toHaveCount(0);
});

test("the PIN offer never opens on the child's screen: it waits inside Grown-ups, after the check, and a saved PIN guards the next check", async ({ page }) => {
  // The phone pass of build 5: a four-digit PIN sheet opened over the first child's Today, with the
  // silent-switch note under it. The sheet is for a grown-up, so it comes once a grown-up is through
  // the check, on the Grown-ups menu. Until a PIN is saved, the check stays the typed sum.
  await page.goto("./");
  await addSam(page);
  const prompt = page.locator("[data-pin-prompt=true]");
  // On Today, and into a lesson and back: no PIN sheet, and the Grown-ups button is the only grown-up thing.
  await page.waitForTimeout(800);
  await expect(prompt).toHaveCount(0);
  await expect(page.locator("[data-mode=kid]")).toHaveCount(1);
  await page.locator("[data-step=letter]").click();
  await expect(page.locator(".blend-track")).toBeVisible();
  await expect(prompt).toHaveCount(0);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator("[data-screen=today]")).toBeVisible();
  // The grown-up check is still the typed sum (no PIN exists yet), and the offer comes after it.
  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  await expect(page.locator("[data-gate=math]")).toBeVisible();
  await passGate(page);
  await expect(page.locator("[data-screen=grownups]")).toBeVisible();
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

  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator("[data-screen=today]")).toBeVisible();
  await page.getByRole("button", { name: "Switch child" }).click({ delay: 2000 });
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await expect(page.locator("[data-gate=pin]")).toBeVisible();
  await expect(page.getByLabel("Answer")).toHaveCount(0);
  await page.getByRole("button", { name: "Cancel" }).click();
  // The offer does not come back, on the child's screen or in Grown-ups.
  await page.reload();
  await expect(page.locator("[data-pin-prompt=true]")).toHaveCount(0);
  await page.getByRole("button", { name: "Sam", exact: true }).click();
  await expect(page.locator("[data-screen=today]")).toBeVisible();
  await expect(page.locator("[data-pin-prompt=true]")).toHaveCount(0);
});

test("the PIN offer is made once in Grown-ups, and Not now ends it; a classroom can still set one in Settings", async ({ page }) => {
  await page.goto("./");
  await addSam(page);
  await openGrownupsMenu(page);
  const prompt = page.locator("[data-pin-prompt=true]");
  await expect(prompt).toBeVisible();
  await prompt.locator("[data-pin-skip=true]").click();
  await expect(prompt).toHaveCount(0);
  await expect(page.locator("[data-screen=grownups]")).toBeVisible();
  // Not again: back to the child, and into Grown-ups once more.
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator("[data-screen=today]")).toBeVisible();
  await expect(prompt).toHaveCount(0);
  await openGrownupsMenu(page);
  await expect(prompt).toHaveCount(0);
  // The PIN can still be set in Settings.
  await page.getByRole("button", { name: /^Settings/ }).click();
  await expect(page.locator("[data-setting=pin]")).toBeVisible();
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

test("a shared class iPad asks the grown-up check from a break and at the end of the lesson too", async ({ page }) => {
  // Every way to the start screen, where each child's profile is one tap away, is a switch of child.
  const today = await page.evaluate(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  await page.addInitScript((today) => {
    localStorage.setItem(
      "littlenest-profiles-v1",
      JSON.stringify({
        activeId: "mia",
        profiles: [
          { id: "mia", name: "Mia", ageRange: "4", animal: "fox", createdAt: new Date().toISOString(), stars: 0, days: { [today]: { reading: { letter: true, draw: true, story: false, moment: true } } } },
        ],
      }),
    );
    localStorage.setItem("littlenest-settings-v1", JSON.stringify({ sharedDevice: true, extraChunks: 0 }));
    localStorage.setItem("littlenest-silent-hint-v1", "1");
  }, today);
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  // From a break: Switch child asks, and Cancel leaves the child on the break.
  await page.getByRole("button", { name: "Story" }).click();
  await page.locator("[data-break]").click();
  await expect(page.locator("[data-screen=break]")).toBeVisible();
  const gate = page.locator("[data-gate]");
  await page.getByRole("button", { name: "Switch child" }).click();
  await expect(gate).toBeVisible();
  await expect(page.locator("[data-screen=start]")).toHaveCount(0);
  await gate.getByRole("button", { name: "Cancel" }).click();
  await expect(gate).toHaveCount(0);
  await expect(page.locator("[data-screen=break]")).toBeVisible();
  await page.getByRole("button", { name: "I'm ready" }).click();
  // At the end of the lesson: All done asks too, and Cancel leaves the wrap-up where it was.
  await page.getByRole("button", { name: "Story" }).click();
  await page.getByRole("button", { name: "Read", exact: true }).click();
  for (let turn = 0; turn < 5; turn += 1) await page.getByRole("button", { name: "Next page" }).click();
  await page.getByRole("button", { name: "All done" }).click();
  const sheet = page.locator("[data-wrap-up]");
  await expect(sheet).toHaveAttribute("data-more", "false");
  await sheet.locator(".wrap-up-done").click();
  await expect(gate).toBeVisible();
  await expect(page.locator("[data-screen=start]")).toHaveCount(0);
  await gate.getByRole("button", { name: "Cancel" }).click();
  await expect(gate).toHaveCount(0);
  await expect(sheet).toBeVisible();
  // A grown-up answers: the start screen, and the next child begins on Today with no wrap-up left open.
  // (A button that commits takes no second tap for a moment after the first; a test is quicker than that.)
  await expect(sheet.locator(".wrap-up-done")).not.toHaveAttribute("data-busy", "true");
  await sheet.locator(".wrap-up-done").click();
  await passGate(page);
  await expect(page.locator("[data-screen=start]")).toBeVisible();
  await page.getByRole("button", { name: "Mia" }).click();
  await expect(page.locator("[data-screen=today]")).toBeVisible();
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
