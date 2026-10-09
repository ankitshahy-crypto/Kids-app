import { expect, test, type Page } from "@playwright/test";
import { deviceSpeech, installAudioSpy, playedClips, requestedCues, spokenLines } from "./audioSpy";
import { createdThisWeek } from "./clock";
import { sentAddresses } from "./requests";

/**
 * A child who cannot read yet needs to hear what to do. Every first activity
 * says its instruction (and what it is about) as soon as it opens, without a
 * tap, and "Again" says that whole line back before anything else is tapped.
 */

const profile = {
  activeId: "mia",
  profiles: [
    {
      id: "mia",
      name: "Mia",
      ageRange: "4",
      animal: "fox",
      createdAt: createdThisWeek(),
      stars: 0,
      days: {},
      stickers: [{ subject: "reading", kind: "word", label: "cat" }],
      ladder: { step: 3, successes: 0 },
    },
  ],
};

const placement = {
  version: 1,
  origin: "device",
  classId: "device-class",
  updatedAt: "2026-09-26T00:00:00.000Z",
  subjects: {
    time: { classDefault: { subject: "time", stageId: "day", weekIndex: 0 }, byChildId: {} },
  },
};

/** Within this long of opening, the activity must have asked for a voice line. */
const CUE_WITHIN_MS = 2000;
/** A clip's bytes can take a while on a busy test server; the line itself was asked for at once. */
const LINE_WITHIN_MS = 20000;

async function install(page: Page, child: Record<string, unknown> = {}) {
  await installAudioSpy(page);
  await page.addInitScript(() => {
    // Finish each device-voice line at once, so lines never queue behind one another.
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.speak = (utterance: SpeechSynthesisUtterance) => {
      const target = window as Window & { __audioAttempts?: { kind: string; detail: string }[] };
      target.__audioAttempts?.push({ kind: "speech", detail: utterance.text });
      window.setTimeout(() => utterance.onend?.(new Event("end") as SpeechSynthesisEvent), 30);
    };
    synth.cancel = () => undefined;
  });
  await page.addInitScript(
    ({ saved, placed }) => {
      localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
      localStorage.setItem("littlenest-placement-v1", JSON.stringify(placed));
      localStorage.removeItem("kids-app-silent-hint-v1");
    },
    { saved: { ...profile, profiles: [{ ...profile.profiles[0], ...child }] }, placed: placement },
  );
  await page.goto("./");
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: "Mia" }).click();
  await expect(page.locator("[data-screen=today]")).toBeVisible();
}

async function pickSubject(page: Page, name: string, subject: string) {
  await page.getByRole("button", { name: `LittleNest ${name}` }).click();
  await expect(page.locator("[data-screen=today]")).toHaveAttribute("data-subject", subject);
}

/**
 * Opens an activity and checks that it speaks on its own within two seconds,
 * then that Again repeats that opening line (every part of it, in order)
 * before any other tap.
 */
async function expectOpeningLine(page: Page, open: () => Promise<void>, screen: string, parts: RegExp[]) {
  const asked = (await requestedCues(page)).length;
  const before = (await spokenLines(page)).length;
  await open();
  await expect(page.locator(`[data-screen=${screen}]`)).toBeVisible();
  // The screen asks for its line on its own, within two seconds of opening.
  await expect.poll(async () => (await requestedCues(page)).length, { timeout: CUE_WITHIN_MS }).toBeGreaterThan(asked);
  // The whole opening line, in order: the instruction, then what it is about.
  await expect.poll(async () => (await spokenLines(page)).slice(before), { timeout: LINE_WITHIN_MS }).toEqual(expect.arrayContaining(parts.map((part) => expect.stringMatching(part))));
  const opening = (await spokenLines(page)).slice(before);
  expectInOrder(opening, parts);

  // Again, before anything else is tapped, says the same line again.
  const heard = (await spokenLines(page)).length;
  await page.locator("[data-hear-again]").click();
  await expect.poll(async () => (await spokenLines(page)).slice(heard), { timeout: LINE_WITHIN_MS }).toEqual(expect.arrayContaining(parts.map((part) => expect.stringMatching(part))));
  expectInOrder((await spokenLines(page)).slice(heard), parts);
}

function expectInOrder(lines: string[], parts: RegExp[]) {
  let from = 0;
  for (const part of parts) {
    const at = lines.findIndex((line, index) => index >= from && part.test(line));
    expect(at, `${part} after position ${from} in ${JSON.stringify(lines)}`).toBeGreaterThanOrEqual(0);
    from = at + 1;
  }
}

test("the letter card says its letter as soon as it opens, and Again says it back", async ({ page }) => {
  // On the first ladder step the deck opens on the week's letter card.
  await install(page, { ladder: { step: 1, successes: 0 }, stickers: [] });
  const asked = (await requestedCues(page)).length;
  const before = (await spokenLines(page)).length;
  await page.getByRole("button", { name: "Letters" }).click();
  const activity = page.locator(".activity");
  await expect(activity).toHaveAttribute("data-letter-card", "true");
  try {
    await expect.poll(async () => (await requestedCues(page)).length, { timeout: CUE_WITHIN_MS }).toBeGreaterThan(asked);
  } catch (error) {
    // What the card was doing when it stayed quiet, for a failure read from CI's annotations.
    const state = await page.evaluate(() => {
      const card = document.querySelector(".activity") as HTMLElement | null;
      const target = window as Window & { __audioAttempts?: { kind: string; detail: string }[] };
      return {
        card: card ? { ...card.dataset } : null,
        attempts: target.__audioAttempts ?? [],
        offline: document.documentElement.dataset.offline,
        settings: localStorage.getItem("littlenest-settings-v1"),
        speech: typeof window.speechSynthesis,
      };
    });
    throw new Error(`${error instanceof Error ? error.message : String(error)}
state: ${JSON.stringify(state)}`);
  }
  await expect.poll(async () => (await spokenLines(page)).slice(before), { timeout: LINE_WITHIN_MS }).toEqual(expect.arrayContaining([expect.stringMatching(/, as in /)]));
  // Hearing the card once does not finish the step: the star still waits for the child.
  await expect(page.locator("[data-screen=today]")).toHaveCount(0);
  await expect(activity).toBeVisible();
  const heard = await spokenLines(page);
  await page.locator("[data-hear-again]").click();
  await expect.poll(async () => (await spokenLines(page)).length, { timeout: LINE_WITHIN_MS }).toBeGreaterThan(heard.length);
  const again = (await spokenLines(page)).slice(heard.length);
  expect(heard.slice(before)).toEqual(expect.arrayContaining(again));
});

test("Trace my name says what to do, then spells the name in the recorded voice, and Again repeats both", async ({ page }) => {
  // The phone pass of build 4: the name came from the phone's own voice, a different one from the
  // lesson's. It is spelled out now, a recorded clip a letter: M, I, A.
  const requested: string[] = [];
  page.on("request", (request) => requested.push(request.url()));
  await install(page);
  await expectOpeningLine(page, () => page.getByRole("button", { name: "Trace my name" }).click(), "my-name", [/^trace your name\.$/, /^m$/, /^i$/, /^a$/]);
  await expect.poll(() => playedClips(page)).toEqual(expect.arrayContaining(["spell/m.mp3", "spell/i.mp3", "spell/a.mp3"]));
  // Nothing with the name in it is fetched, and the device voice is never asked to say it.
  expect(sentAddresses(requested)).not.toMatch(/mia/i);
  expect(await deviceSpeech(page)).toEqual([]);
});

test("Count objects says its instruction on open, and Again repeats it", async ({ page }) => {
  await install(page);
  await pickSubject(page, "Numbers", "math");
  await expectOpeningLine(page, () => page.getByRole("button", { name: "Count objects" }).click(), "count", [/^how many\? tap each one to count\.$/]);
});

test("Hear a color says the instruction, then the color, and Again repeats both", async ({ page }) => {
  await install(page);
  await pickSubject(page, "Colors", "colors");
  await page.getByRole("button", { name: "Hear a color" }).click();
  const hear = (await page.locator("[data-screen=name]").getAttribute("data-hear")) ?? "";
  expect(hear).toBeTruthy();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator("[data-screen=today]")).toBeVisible();
  await expectOpeningLine(page, () => page.getByRole("button", { name: "Hear a color" }).click(), "name", [/^tap the color you hear\.$/, new RegExp(`^${hear}$`)]);
  // The game's own speaker, above the animal, is a picture and not a word.
  await expect(page.locator("[data-screen=name] .game-hear svg")).toBeVisible();
});

test("Parts of the day asks its question on open, and Again repeats it", async ({ page }) => {
  await install(page);
  await pickSubject(page, "Time & Money", "time");
  // First what is happening ("We eat breakfast."), then the question.
  await expectOpeningLine(page, () => page.getByRole("button", { name: "Day and night" }).click(), "day", [/\.$/, /^is it morning, afternoon, or night\?$/]);
  // The game's own speaker, above the animal, is a picture and not a word.
  await expect(page.locator("[data-screen=day] .game-hear svg")).toBeVisible();
});

test("Hear a number says the instruction, then the number, and the shape match names its shape", async ({ page }) => {
  await install(page);
  await pickSubject(page, "Numbers", "math");
  await page.getByRole("button", { name: "Hear a number" }).click();
  const hear = (await page.locator("[data-screen=know]").getAttribute("data-hear")) ?? "";
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator("[data-screen=today]")).toBeVisible();
  const numbers = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
  await expectOpeningLine(page, () => page.getByRole("button", { name: "Hear a number" }).click(), "know", [
    /^tap the number you hear\.$/,
    new RegExp(`^(${hear}|${numbers[Number(hear)] ?? hear})$`),
  ]);
  await expect(page.locator("[data-screen=know] .game-hear svg")).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator("[data-screen=today]")).toBeVisible();
  await page.getByRole("button", { name: "Match a shape" }).click();
  const shape = (await page.locator("[data-screen=shape]").getAttribute("data-prompt")) ?? "";
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator("[data-screen=today]")).toBeVisible();
  await expectOpeningLine(page, () => page.getByRole("button", { name: "Match a shape" }).click(), "shape", [/^find the same shape\.$/, new RegExp(`^${shape}$`)]);
});

async function openGame(page: Page, id: string) {
  const back = page.getByRole("button", { name: "All games" });
  if (await back.count()) await back.click();
  else await page.locator("[data-dock=games]").click();
  await expect(page.locator("[data-game=home]")).toBeVisible();
  await page.locator(`[data-game-tile=${id}]`).click();
  await expect(page.locator(`[data-game=${id}]`)).toBeVisible();
}

test("each game says what to do as it opens, and Again says it back", async ({ page }) => {
  test.setTimeout(120000);
  await install(page);
  const games: { id: string; parts: RegExp[] }[] = [
    { id: "hatch", parts: [/^tap the missing letters\.$/] },
    { id: "pop", parts: [/^pop the balloons with this letter\.$/, /, as in /] },
    // Feed shows pictures of all kinds (a moon, a mat, a map), so the line says "pictures", not "foods".
    { id: "feed", parts: [/^feed me the pictures that start with this letter\.$/, /, as in /] },
    { id: "rhyme", parts: [/^find two pictures that rhyme\.$/] },
    { id: "memory", parts: [/^flip two cards\. find a match\.$/] },
    { id: "spin", parts: [/^spin the wheel\.$/] },
  ];
  for (const game of games) {
    await expectOpeningLine(page, () => openGame(page, game.id), "games", game.parts);
    // The game's own speaker, in its scene, is a picture and not a word.
    if (game.id !== "spin") await expect(page.locator(`[data-game=${game.id}] .game-scene > .game-hear svg`)).toBeVisible();
  }
});
