import { expect, test, type Page } from "@playwright/test";
import { clipSeconds, clipStarts, installAudioSpy } from "./audioSpy";
import { createdThisWeek } from "./clock";
import { game, onRound } from "./kit";

const profile = {
  activeId: "mia",
  profiles: [{ id: "mia", name: "Mia", ageRange: "4", animal: "fox", createdAt: createdThisWeek(), stars: 0, days: {} }],
};

async function install(page: Page) {
  await page.addInitScript((saved) => {
    if (sessionStorage.getItem("done-seeded")) return;
    sessionStorage.setItem("done-seeded", "1");
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.removeItem("kids-app-silent-hint-v1");
    localStorage.setItem("littlenest-quick-rounds", "1");
  }, profile);
  await page.goto("./");
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: "Mia" }).click();
}

/** The last round of Hatch the egg, played through: the Done button is then on the screen. */
async function finishHatch(page: Page) {
  await page.locator("[data-dock=games]").click();
  await page.locator("[data-game-tile=hatch]").click();
  const board = game(page, "hatch");
  const rounds = Number(await board.getAttribute("data-rounds"));
  for (let round = 0; round < rounds; round += 1) {
    await onRound(board, round);
    await board.locator('.pick[data-letter][data-needed="true"]').click();
  }
  const done = page.locator("[data-game-done=true]");
  await expect(done).toBeVisible({ timeout: 10_000 });
  return done;
}

test("Done is one big button: 260 by 72 on a phone, 300 by 80 on an iPad", async ({ page }) => {
  await install(page);
  const done = await finishHatch(page);
  const ipad = (page.viewportSize()?.width ?? 0) >= 768;
  // A game's frame is drawn larger as one piece on an iPad (zoom 1.45 upright, 1.2 on its side), so
  // the button is measured in the frame's own pixels: what the layout gives it, before that zoom.
  const zoom = Number((await page.locator(".game-frame").evaluate((frame) => getComputedStyle(frame).getPropertyValue("--frame-zoom"))).trim() || "1");
  const box = (await done.boundingBox())!;
  expect(Math.round(box.width / zoom)).toBe(ipad ? 300 : 260);
  expect(Math.round(box.height / zoom)).toBe(ipad ? 80 : 72);
  // On a row of its own: nothing else in the tray sits beside it.
  const row = page.locator(".game-done-row");
  expect(Math.round((await row.boundingBox())!.width)).toBeGreaterThanOrEqual(Math.round(box.width));
});

test("a pre-reader is shown Done: the tick comes after the cheer, with focus, and the button pulses once if left alone", async ({ page }) => {
  test.slow();
  await install(page);
  const done = await finishHatch(page);
  // The cheer is being said: no tick yet.
  await expect(done).toHaveAttribute("data-cue", "soon");
  await expect(done.locator(".done-tick")).toHaveCSS("opacity", "0");
  // A moment after the cheer: the tick, and focus on the button for a keyboard or a switch.
  await expect(done).toHaveAttribute("data-cue", "shown", { timeout: 10_000 });
  await expect(done.locator(".done-tick")).toHaveCSS("opacity", "1");
  await expect(done).toBeFocused();
  // Left alone for eight seconds: the pulse, once.
  await expect(done).toHaveAttribute("data-cue", "pulse", { timeout: 12_000 });
  // Tapped: the game leaves, with the star.
  await done.click();
  await expect(page.locator("[data-game=home]")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
});

test("the cue waits for a replay the child asked for, instead of cutting it off", async ({ page }) => {
  test.slow();
  await installAudioSpy(page);
  await install(page);
  const done = await finishHatch(page);
  // Straight after the last round: the child asks to hear the line again. The replay is several
  // clips (the question, the sounds, the word); the cue must not take the voice from any of them.
  const before = (await clipStarts(page)).length;
  await page.locator("[data-hear=true]").click();
  await expect(done).toHaveAttribute("data-cue", "shown", { timeout: 15_000 });
  await expect.poll(async () => (await clipStarts(page)).some((clip) => clip.file === "prompts/kit-tap-done.mp3"), { timeout: 15_000 }).toBe(true);
  const starts = (await clipStarts(page)).slice(before);
  const cue = starts.find((clip) => clip.file === "prompts/kit-tap-done.mp3")!;
  const replay = starts.filter((clip) => clip.at < cue.at && clip.file !== "prompts/kit-tap-done.mp3" && clip.file !== "prompts/kit-done.mp3");
  expect(replay.length).toBeGreaterThanOrEqual(2);
  // The cue began only after the last clip of the replay had played to its end.
  let replayEnd = 0;
  for (const clip of replay) replayEnd = Math.max(replayEnd, clip.at + (await clipSeconds(page, clip.file)) * 1000);
  expect(cue.at).toBeGreaterThanOrEqual(replayEnd - 150);
});
