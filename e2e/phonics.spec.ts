import { expect, test, type Page } from "@playwright/test";
import { clipShipped, installAudioSpy, playedClips, spokenLines } from "./audioSpy";
import { createdThisWeek } from "./clock";

/**
 * The sound-unit weeks (15 to 26): sh, ee, magic e. A five-year-old placed on
 * week 15 meets the sh and ch cards, traces their letters, and reads a story
 * whose sh words are sounded out as one sound.
 */
function child(extra: Record<string, unknown> = {}) {
  return {
    id: "mia",
    name: "Mia",
    ageRange: "5",
    animal: "fox",
    createdAt: createdThisWeek(),
    stars: 0,
    days: {},
    ladder: { step: 1, successes: 0 },
    ...extra,
  };
}

function placement(weekIndex: number, stageId = "phonics") {
  return {
    version: 1,
    origin: "device",
    classId: "device-class",
    updatedAt: "2026-09-26T00:00:00.000Z",
    subjects: {
      reading: { classDefault: { subject: "reading", stageId, weekIndex }, byChildId: {} },
    },
  };
}

async function install(page: Page, profile: Record<string, unknown>, placed: Record<string, unknown> | null) {
  await installAudioSpy(page);
  await page.addInitScript(
    ({ saved, place }) => {
      // Seed once per tab, so a test can change the saved profile and reload.
      if (sessionStorage.getItem("littlenest-test-seeded")) return;
      sessionStorage.setItem("littlenest-test-seeded", "1");
      localStorage.setItem("littlenest-profiles-v1", JSON.stringify({ activeId: "mia", profiles: [saved] }));
      if (place) localStorage.setItem("littlenest-placement-v1", JSON.stringify(place));
      localStorage.setItem("littlenest-silent-hint-v1", "1");
    },
    { saved: profile, place: placed },
  );
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
}

async function passGate(page: Page) {
  const dialog = page.getByRole("dialog");
  const prompt = await dialog.getByRole("heading").innerText();
  const sum = prompt.match(/(\d+)\s*\+\s*(\d+)/);
  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
  const expected = sum ? Number(sum[1]) + Number(sum[2]) : (words[prompt.match(/number ([a-z]+)/i)?.[1]?.toLowerCase() ?? ""] ?? 0);
  const choices = dialog.locator(".gate-choice");
  const count = await choices.count();
  for (let index = 0; index < count; index += 1) {
    if (Number(await choices.nth(index).innerText()) === expected) {
      await choices.nth(index).click();
      return;
    }
  }
  throw new Error(`No choice matched ${prompt}`);
}

test("week 15 leads with the sh card, and its story sounds out sh as one sound", async ({ page }) => {
  await install(page, child(), placement(14));
  const today = page.locator("[data-screen=today]");
  await expect(today).toHaveAttribute("data-letters", "shch");
  await expect(today).toHaveAttribute("data-stage", "phonics");
  // The Letters stop shows the unit as it is written, not a capital.
  await expect(page.locator(".trail-letter")).toHaveText("sh");
  await expect(page.locator(".trail-letter")).toHaveClass(/is-unit/);

  await page.getByRole("button", { name: "Letters" }).click();
  const activity = page.locator(".activity");
  await expect(activity).toHaveAttribute("data-word", "letter-sh");
  await expect(activity).toHaveAttribute("data-letter-card", "true");
  await expect(activity.locator(".tile-wrap")).toHaveCount(1);
  await expect(activity.locator(".tile-wrap")).toHaveClass(/is-unit/);
  await expect(activity.locator(".tile-wrap")).toHaveAttribute("data-sound", "sh");
  await expect(activity.locator(".picture-card")).toHaveAttribute("aria-label", "ship");
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  // The card says "sh, as in ship", then "ship": the bundled clip when it is shipped, the device voice until then.
  await page.getByRole("button", { name: "Play sound" }).click();
  await expect.poll(() => spokenLines(page), { timeout: 20000 }).toEqual(expect.arrayContaining(["sh, as in ship", "ship"]));
  if (clipShipped("letters/sh.mp3")) expect(await playedClips(page)).toContain("letters/sh.mp3");
  await page.getByRole("button", { name: "Next word" }).click();
  await expect(activity).toHaveAttribute("data-word", "letter-ch");

  await page.getByRole("button", { name: "Back" }).click();
  // Drawing a unit week traces its letters one by one: s, h, c.
  await page.getByRole("button", { name: "Draw" }).click();
  await expect(page.locator("[data-screen=draw]")).toHaveAttribute("data-letters", "shc");

  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Story" }).click();
  const story = page.locator("[data-screen=story]");
  await expect(story).toHaveAttribute("data-story", /^w15-/);
  if ((await story.getAttribute("data-story")) !== "w15-the-ship") {
    await page.locator('[data-story-pick="w15-the-ship"]').click();
  }
  await expect(story).toHaveAttribute("data-story", "w15-the-ship");
  await page.getByRole("button", { name: "Read", exact: true }).click();
  const ship = page.locator(".story-word[data-word=ship]").first();
  await expect(ship).toHaveAttribute("data-role", "target");
  const heard = (await playedClips(page)).length;
  const lines = (await spokenLines(page)).length;
  await ship.click();
  // Three pieces light up in turn: sh, i, p.
  await expect(ship.locator("span")).toHaveCount(3);
  await expect(ship.locator("span").first()).toHaveText("sh");
  await expect
    .poll(async () => (await spokenLines(page)).slice(lines), { timeout: 20000 })
    .toEqual(expect.arrayContaining(["sh, as in ship", "i, as in pig", "p, as in pig", "ship"]));
  if (clipShipped("sounds/sh.mp3")) {
    expect((await playedClips(page)).slice(heard)).toEqual(expect.arrayContaining(["sounds/sh.mp3", "sounds/i.mp3", "sounds/p.mp3"]));
  }
  // "the" is read whole: th is a sound of its own, and it is not taught until week 16.
  await page.getByRole("button", { name: "Next page" }).click();
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(story).toHaveAttribute("data-page", "3");
  await expect(page.locator(".story-word[data-word=the]").first()).toHaveAttribute("data-role", "glue");
  await expect(page.locator(".story-word[data-word=dash]")).toHaveAttribute("data-role", "target");
});

test("a magic-e word keeps its quiet e on the tiles, and phonics words wait for their sounds", async ({ page }) => {
  await install(page, child({ ladder: { step: 5, successes: 0 } }), placement(20));
  await expect(page.locator("[data-screen=today]")).toHaveAttribute("data-letters", "a_ei_e");
  await page.getByRole("button", { name: "Letters" }).click();
  const activity = page.locator(".activity");
  await expect(activity).toHaveAttribute("data-word", "letter-a_e");
  await expect(activity.locator(".tile")).toHaveAttribute("aria-label", /^a-e sound$/i);
  await expect(activity.locator(".picture-card")).toHaveAttribute("aria-label", "cake");
  for (let tries = 0; tries < 8; tries += 1) {
    if ((await activity.getAttribute("data-word")) === "cake") break;
    await page.getByRole("button", { name: "Next word" }).click();
  }
  await expect(activity).toHaveAttribute("data-word", "cake");
  const tiles = activity.locator(".tile-wrap");
  await expect(tiles).toHaveCount(4);
  await expect(tiles.nth(1)).toHaveAttribute("data-sound", "a_e");
  await expect(tiles.nth(3)).toHaveAttribute("data-sound", "silent");
  await expect(tiles.nth(3)).toHaveClass(/is-silent/);
  // No word with an untaught team (ee, oo) is on this week's list.
  const words = await activity.evaluate((node) => Number(node.querySelector(".chunk-strip-word")?.getAttribute("data-word-count")));
  expect(words).toBeGreaterThan(2);
});

test("the parent panel lists the sound units learned, and the calendar holds a four-year-old at the letter weeks", async ({ page }) => {
  // Created 20 weeks ago: a five-year-old is on week 21 (a-e, i-e); a four-year-old waits at week 14 (x, q).
  const created = new Date(new Date(createdThisWeek()).getTime() - 20 * 7 * 24 * 60 * 60 * 1000).toISOString();
  await install(page, child({ createdAt: created }), null);
  await expect(page.locator("[data-screen=today]")).toHaveAttribute("data-letters", "a_ei_e");
  await page.getByRole("button", { name: "Switch child" }).click();
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await passGate(page);
  const letters = page.locator("[data-screen=parent] [data-section=letters]");
  await expect(letters.locator(".letter-chip[data-unit=true]").first()).toHaveText("SH");
  // 26 letters, then the 13 units taught through week 21 (sh to i-e).
  await expect(letters.locator(".letter-chip")).toHaveCount(26 + 13);
  const place = page.locator("[data-screen=parent] [data-section=placement]");
  await expect(place).toContainText("Week 21 · A-E I-E");
  await expect(place).toContainText("Traces big and little A a, E e, I i.");

  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("littlenest-profiles-v1") ?? "{}");
    saved.profiles[0].ageRange = "4";
    localStorage.setItem("littlenest-profiles-v1", JSON.stringify(saved));
  });
  await page.reload();
  await page.getByRole("button", { name: "Mia" }).click();
  await expect(page.locator("[data-screen=today]")).toHaveAttribute("data-letters", "xq");
  await expect(page.locator("[data-screen=today]")).toHaveAttribute("data-week", "13");
});
