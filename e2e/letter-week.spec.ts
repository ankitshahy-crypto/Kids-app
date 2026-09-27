import { expect, test, type Locator, type Page } from "@playwright/test";
import { clipShipped, installAudioSpy, playedClips, spokenLines } from "./audioSpy";

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
      ladder: { step: 1, successes: 0 },
    },
  ],
};

/** Week 0 of the letter plan: m and a. */
const placement = {
  version: 1,
  origin: "device",
  classId: "device-class",
  updatedAt: "2026-09-26T00:00:00.000Z",
  subjects: {
    reading: { classDefault: { subject: "reading", stageId: "letters", weekIndex: 0 }, byChildId: {} },
  },
};

async function install(page: Page) {
  await page.addInitScript(
    ({ saved, placed }) => {
      localStorage.setItem("littlenest-profiles-v1", JSON.stringify(saved));
      localStorage.setItem("littlenest-placement-v1", JSON.stringify(placed));
      localStorage.setItem("littlenest-silent-hint-v1", "1");
    },
    { saved: profile, placed: placement },
  );
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  await expect(page.locator("[data-screen=today]")).toHaveAttribute("data-letters", "ma");
}

async function dragAcross(page: Page, track: Locator) {
  const box = await track.boundingBox();
  if (!box) throw new Error("track has no box");
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 8, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 8, y, { steps: 40 });
  await page.mouse.up();
}

test("the letter of the week is the first card in Sound it out", async ({ page }) => {
  await installAudioSpy(page);
  await install(page);
  await page.getByRole("button", { name: "Letters" }).click();

  const activity = page.locator(".activity");
  await expect(activity).toHaveAttribute("data-ladder-step", "1");
  await expect(activity).toHaveAttribute("data-word", "letter-m");
  await expect(activity).toHaveAttribute("data-letter-card", "true");
  const tiles = page.locator(".letters .tile-wrap");
  await expect(tiles).toHaveCount(1);
  await expect(tiles.first().locator("button")).toHaveAttribute("aria-label", "M sound");
  // m has no drawing that matches "m, as in moon", so the card shows the letter and its word.
  await expect(page.locator(".letter-glyph")).toHaveAttribute("data-glyph", "M");
  await expect(page.locator(".letter-glyph small")).toHaveText("moon");
  await expect(page.locator(".picture-card")).toHaveAttribute("aria-label", "moon");

  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  // A letter card says the phrase, then its example word: not the bare sound a blend uses.
  await page.getByRole("button", { name: "Play sound" }).click();
  await expect.poll(() => spokenLines(page), { timeout: 20000 }).toEqual(expect.arrayContaining(["m, as in moon", "moon"]));
  if (clipShipped("sounds/m.mp3")) {
    const clips = await playedClips(page);
    expect(clips).toContain("letters/m.mp3");
    expect(clips).not.toContain("sounds/m.mp3");
  }
  await dragAcross(page, page.locator(".blend-track"));
  await expect(activity).toHaveAttribute("data-blended", "true");
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");

  // The second card is the week's other letter, drawn as an apple.
  await page.getByRole("button", { name: "Next word" }).click();
  await expect(activity).toHaveAttribute("data-word", "letter-a");
  await expect(page.locator(".letter-glyph")).toHaveCount(0);
  await expect(page.locator(".picture-card svg")).toBeVisible();
  await expect(page.locator(".picture-card")).toHaveAttribute("aria-label", "apple");

  // Then the one-letter words the step already had.
  await page.getByRole("button", { name: "Next word" }).click();
  await expect(activity).toHaveAttribute("data-word", "a");
  await expect(activity).toHaveAttribute("data-letter-card", "false");

  // A letter card earns the letter sticker, not a pretend word.
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("littlenest-profiles-v1") ?? "{}"));
  const stickers = (saved.profiles?.[0]?.stickers ?? []) as { kind: string; label: string }[];
  expect(stickers.some((sticker) => sticker.kind === "letter" && sticker.label === "m")).toBe(true);
  expect(stickers.some((sticker) => sticker.kind === "word" && sticker.label === "moon")).toBe(false);
  expect(saved.profiles?.[0]?.ladder?.words).toEqual(["letter:m"]);
});
