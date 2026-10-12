import { expect, test } from "@playwright/test";
import { deviceSpeech, installAudioSpy, playedClips } from "./audioSpy";
import { createdThisWeek } from "./clock";
import { traceCurrentStroke } from "./traceFlow";

// A name of six letters, as a grown-up typed it: the screen keeps that spelling.
const profile = {
  activeId: "aleena",
  profiles: [{ id: "aleena", name: "Aleena", ageRange: "4", animal: "fox", createdAt: createdThisWeek(), stars: 0, days: {} }],
};

test.use({ viewport: { width: 390, height: 844 } });

test("Trace my name: Back stops the letters; the end says the name as a word and stays until Done", async ({ page }) => {
  test.slow();
  await installAudioSpy(page);
  await page.addInitScript((saved) => {
    localStorage.setItem("littlenest-profiles-v1", JSON.stringify(saved));
    localStorage.setItem("littlenest-silent-hint-v1", "1");
  }, profile);
  await page.goto("./");
  await page.getByRole("button", { name: "Aleena" }).click();

  // 1. Back while the opening line is spelling the name: no letter starts after the screen is gone.
  await page.getByRole("button", { name: "Trace my name" }).click();
  const root = page.locator("[data-screen=my-name]");
  await expect(root).toBeVisible();
  await expect.poll(() => playedClips(page), { timeout: 15000 }).toEqual(expect.arrayContaining(["spell/a.mp3"]));
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(root).toHaveCount(0);
  const clipsAtBack = (await playedClips(page)).length;
  const speechAtBack = (await deviceSpeech(page)).length;
  await page.waitForTimeout(2500);
  expect((await playedClips(page)).length).toBe(clipsAtBack);
  expect((await deviceSpeech(page)).length).toBe(speechAtBack);

  // 2. Traced to the end, letter by letter in order.
  await page.getByRole("button", { name: "Trace my name" }).click();
  await expect(root).toBeVisible();
  for (let step = 0; step < 240; step += 1) {
    const phase = await page.evaluate(() => document.querySelector("[data-screen=my-name]")?.getAttribute("data-phase") ?? null);
    if (phase === null || phase === "cheer") break;
    if (phase === "demo") {
      await root.getByRole("button", { name: "Your turn" }).click({ timeout: 1500 }).catch(() => undefined);
      await page.waitForTimeout(300);
    } else if (phase === "trace") {
      await traceCurrentStroke(page, "my-name");
    } else {
      await page.waitForTimeout(300);
    }
  }
  await expect(root).toHaveAttribute("data-phase", "cheer");
  const clipsAtCheer = (await playedClips(page)).length;
  // The line keeps the name as it was typed, and the name is said as one word (the device voice: a
  // name has no clip of its own), not spelled out letter by letter.
  await expect(root.locator(".letter-prompt")).toHaveText("You traced Aleena.");
  await expect.poll(() => deviceSpeech(page), { timeout: 10000 }).toEqual(expect.arrayContaining([expect.stringMatching(/^aleena$/i)]));
  expect((await deviceSpeech(page)).filter((said) => /^aleena$/i.test(said))).toHaveLength(1);
  expect((await playedClips(page)).slice(clipsAtCheer).filter((clip) => /^spell\//.test(clip))).toEqual([]);
  // The screen stays with the finished name, Done on it, for as long as the child likes.
  await page.waitForTimeout(4000);
  await expect(root).toHaveAttribute("data-phase", "cheer");
  await expect(page.locator("[data-screen=today]")).toHaveCount(0);
  const done = root.getByRole("button", { name: "Done" });
  await expect(done).toBeVisible();
  // Done goes back to Today, with the star.
  await done.click();
  await expect(page.locator("[data-screen=today]")).toBeVisible();
  await expect(root).toHaveCount(0);
  await expect(page.locator("[data-screen=today]")).toHaveAttribute("data-stars", "1");
});
