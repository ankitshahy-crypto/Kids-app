import { expect, test, type Locator, type Page } from "@playwright/test";
import { answerGate, openTeacherChild } from "./gate";
import { installAudioSpy, spokenLines } from "./audioSpy";
import { createdThisWeek } from "./clock";
import { expectWiggle, game, matchPairs, onRound } from "./kit";

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
    },
  ],
};

/**
 * `quick` skips the wait for a game's praise to be said before its next round (a development-build
 * switch), so a test can play a whole game through. Tests about what is said leave it off.
 */
async function install(page: Page, saved: unknown = profile, options: { quick?: boolean } = {}) {
  await page.addInitScript(
    ({ saved, quick }) => {
      if (sessionStorage.getItem("games-seeded")) return;
      sessionStorage.setItem("games-seeded", "1");
      localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
      localStorage.removeItem("kids-app-silent-hint-v1");
      if (quick) localStorage.setItem("littlenest-quick-rounds", "1");
    },
    { saved, quick: options.quick ?? true },
  );
  await page.goto("./");
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: "Mia" }).click();
}

/** A child who has been taught enough letters for every game to have three rounds. */
const reader = {
  ...profile,
  profiles: [{ ...profile.profiles[0], ladder: { step: 2, successes: 0 } }],
};

async function openGame(page: Page, id: string): Promise<Locator> {
  await openGames(page);
  await page.locator(`[data-game-tile=${id}]`).click();
  const frame = game(page, id);
  await expect(frame).toBeVisible();
  return frame;
}

async function openGames(page: Page) {
  if ((await page.locator("[data-dock=games]").count()) === 0) {
    await page.getByRole("button", { name: "Back", exact: true }).click();
  }
  await page.locator("[data-dock=games]").click();
  await expect(page.locator("[data-game=home]")).toBeVisible();
}

async function passGate(page: Page) {
  await answerGate(page, true);
}

test("game tiles stay large on iPad", async ({ page }, testInfo) => {
  await install(page);
  await openGames(page);
  if (testInfo.project.name === "chromium") {
    await page.locator("[data-screen=games]").screenshot({ path: "test-results/screenshots/games_lobby.png" });
  }
  for (const viewport of [
    { width: 1024, height: 1366, name: "portrait" },
    { width: 1366, height: 1024, name: "landscape" },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const box = await page.locator("[data-game-tile=hatch]").boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBeGreaterThanOrEqual(100);
    expect(box!.width).toBeGreaterThan(140);
    if (testInfo.project.name === "chromium") {
      await page.locator("[data-screen=games]").screenshot({ path: `test-results/screenshots/games_ipad_${viewport.name}.png` });
    }
  }
});

test("hatch the egg wiggles a miss, glows the right letter, and hatches a baby after three words", async ({ page }, testInfo) => {
  await install(page);
  await openGames(page);
  await page.locator("[data-game-tile=hatch]").click();
  const board = game(page, "hatch");
  await expect(board).toHaveAttribute("data-level", "1");
  await expect(page.locator("[data-tip=game-hatch-start]")).toBeVisible();
  const rounds = Number(await board.getAttribute("data-rounds"));
  expect(rounds).toBeGreaterThanOrEqual(1);
  // The picture of the word is the question, beside the egg in its nest.
  await expect(board.locator(".hatch-picture svg")).toBeVisible();
  await expect(board.locator(".egg-art")).toHaveAttribute("data-hatched", "false");
  const wrong = board.locator('.pick[data-letter][data-needed="false"]').first();
  await wrong.click();
  await expect(board).toHaveAttribute("data-misses", "1");
  await expectWiggle(wrong);
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "0");
  await wrong.click();
  await expect(board).toHaveAttribute("data-misses", "2");
  // After two tries the right letter glows and the hand points at it.
  await expect(board.locator('.pick[data-glow="true"]')).toHaveCount(1);
  await expect(board.locator('.pick[data-glow="true"] .game-hand')).toBeVisible();
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/games_hatch.png" });
  }
  const words: string[] = [];
  for (let round = 0; round < rounds; round += 1) {
    await onRound(board, round);
    words.push((await board.getAttribute("data-word")) ?? "");
    // Each word finished cracks the egg a little more.
    await expect(board).toHaveAttribute("data-eggs", String(round));
    // On level 1 one letter, the word's first sound, finishes the word. One tap and no look back
    // at the board: after the last word the game is gone within a fifth of a second, and reading
    // an attribute of a board that has left waits for it until the test runs out of time.
    await board.locator('.pick[data-letter][data-needed="true"]').click();
  }
  // No word twice.
  expect(new Set(words).size).toBe(words.length);
  await expect(page.locator("[data-game=home]")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
  await expect(page.locator("[data-tip=game-hatch-end]")).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator("[data-step=letter]")).toHaveAttribute("data-current", "true");
  await page.locator("[data-dock=stickers]").click();
  await expect(page.locator("[data-kind=animal]")).toHaveCount(1);
});

test("the egg hatches at the end, and the baby is seen before the star", async ({ page }, testInfo) => {
  await install(page, profile, { quick: false });
  const board = await openGame(page, "hatch");
  const rounds = Number(await board.getAttribute("data-rounds"));
  for (let round = 0; round < rounds; round += 1) {
    await expect(board).toHaveAttribute("data-round", String(round), { timeout: 10_000 });
    await expect(board).toHaveAttribute("data-solved", "false", { timeout: 10_000 });
    await board.locator('.pick[data-letter][data-needed="true"]').first().click();
  }
  await expect(board).toHaveAttribute("data-phase", "hatched", { timeout: 10_000 });
  const baby = await board.getAttribute("data-baby");
  expect(baby).toBeTruthy();
  await expect(board.locator(".egg-art")).toHaveAttribute("data-hatched", "true");
  await expect(board.locator(`[data-baby-art=${baby}]`)).toBeVisible();
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/games_hatch_baby.png" });
  }
  await expect(page.locator("[data-game=home]")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.locator("[data-dock=stickers]").click();
  await expect(page.locator("[data-kind=animal]")).toHaveAttribute("data-sticker", baby!);
});

test("letter pop only pops balloons with the target letter, round after round", async ({ page }, testInfo) => {
  await install(page);
  const board = await openGame(page, "pop");
  const rounds = Number(await board.getAttribute("data-rounds"));
  const targets: string[] = [];
  for (let round = 0; round < rounds; round += 1) {
    await onRound(board, round);
    const target = (await board.getAttribute("data-target")) ?? "";
    targets.push(target);
    // The letter asked for is held up, and six balloons are in the sky, three of them with it.
    await expect(board.locator(".letter-sign")).toHaveAttribute("data-sign", target);
    await expect(board.locator(".pop-balloon")).toHaveCount(6);
    await expect(board.locator(`.pop-balloon[data-letter="${target}"]`)).toHaveCount(3);
    if (round === 0) {
      const wrong = board.locator(`.pop-balloon:not([data-letter="${target}"])`).first();
      await wrong.click();
      await expectWiggle(wrong);
      await expect(wrong).toHaveAttribute("data-popped", "false");
      await expect(board).toHaveAttribute("data-misses", "1");
      if (testInfo.project.name === "chromium") {
        await board.screenshot({ path: "test-results/screenshots/games_pop.png" });
      }
    }
    for (let pop = 0; pop < 3; pop += 1) {
      const next = board.locator(`.pop-balloon[data-letter="${target}"][data-popped="false"]`).first();
      await next.click();
      if (pop < 2) await expect(board).toHaveAttribute("data-popped", String(pop + 1));
    }
  }
  expect(new Set(targets).size).toBe(targets.length);
  await expect(page.locator("[data-game=home]")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
});

test("feed the animal: the pictures that start with the letter go on its plate", async ({ page }, testInfo) => {
  await install(page);
  const board = await openGame(page, "feed");
  const rounds = Number(await board.getAttribute("data-rounds"));
  for (let round = 0; round < rounds; round += 1) {
    await onRound(board, round);
    const target = (await board.getAttribute("data-target")) ?? "";
    await expect(board.locator(".letter-sign")).toHaveAttribute("data-sign", target);
    await expect(board.locator(".game-tray .pick")).toHaveCount(4);
    // Every choice is a drawing.
    await expect(board.locator(".game-tray .pick .art")).toHaveCount(4);
    if (round === 0) {
      const wrong = board.locator(`.pick[data-food]:not([data-letter="${target}"])`).first();
      await wrong.click();
      await expectWiggle(wrong);
      await expect(wrong).toHaveAttribute("data-fed", "false");
      await expect(board.locator(".feed-bite")).toHaveCount(0);
      if (testInfo.project.name === "chromium") {
        await board.screenshot({ path: "test-results/screenshots/games_feed.png" });
      }
    }
    const needed = await board.locator(`.pick[data-food][data-letter="${target}"]`).count();
    for (let fed = 0; fed < needed; fed += 1) {
      const next = board.locator(`.pick[data-food][data-letter="${target}"][data-fed="false"]`).first();
      const id = (await next.getAttribute("data-food")) ?? "";
      await next.click();
      if (fed < needed - 1) {
        // What was fed is seen on the plate.
        await expect(board.locator(`.feed-bite[data-bite="${id}"]`)).toBeVisible();
      }
    }
  }
  await expect(page.locator("[data-game=home]")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
});

test("rhyme match pairs picture words, and a pair that does not rhyme ends nothing", async ({ page }, testInfo) => {
  await install(page);
  const board = await openGame(page, "rhyme");
  await expect(board).toHaveAttribute("data-rounds", "2");
  for (let round = 0; round < 2; round += 1) {
    await onRound(board, round);
    await expect(board.locator(".pick[data-rhyme]")).toHaveCount(4);
    if (round === 0) {
      // One from each pair: they do not rhyme.
      const first = board.locator('.pick[data-rhyme][data-pair="0"]').first();
      const other = board.locator('.pick[data-rhyme][data-pair="1"]').first();
      await first.click();
      await expect(first).toHaveAttribute("data-chosen", "true");
      await other.click();
      await expectWiggle(other);
      await expect(other).toHaveAttribute("data-matched", "false");
      await expect(board).toHaveAttribute("data-misses", "1");
      await expect(board).toHaveAttribute("data-picked", "");
      if (testInfo.project.name === "chromium") {
        await board.screenshot({ path: "test-results/screenshots/games_rhyme.png" });
      }
    }
    await matchPairs(board, ".pick[data-rhyme]");
  }
  await expect(page.locator("[data-game=home]")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
});

test("rhyme match says both words and whether they rhyme", async ({ page }) => {
  await installAudioSpy(page);
  await install(page, profile, { quick: false });
  const before = (await spokenLines(page)).length;
  const board = await openGame(page, "rhyme");
  await expect.poll(async () => (await spokenLines(page)).slice(before), { timeout: 8_000 }).toContain("find two pictures that rhyme.");
  const first = board.locator('.pick[data-rhyme][data-pair="0"]').first();
  const other = board.locator('.pick[data-rhyme][data-pair="1"]').first();
  const wordA = (await first.getAttribute("data-word")) ?? "";
  const wordB = (await other.getAttribute("data-word")) ?? "";
  const missed = (await spokenLines(page)).length;
  await first.click();
  await other.click();
  await expect.poll(async () => (await spokenLines(page)).slice(missed), { timeout: 8_000 }).toEqual(expect.arrayContaining([wordA, wordB, "they do not rhyme."]));
  // The two found: each is set in the scene beside the other.
  const pair = board.locator('.pick[data-rhyme][data-pair="0"]');
  const matched = (await spokenLines(page)).length;
  await pair.nth(0).click();
  await pair.nth(1).click();
  await expect.poll(async () => (await spokenLines(page)).slice(matched), { timeout: 8_000 }).toContain("they rhyme!");
  await expect(board.locator('.rhyme-pair[data-pair="0"] .rhyme-half')).toHaveCount(2);
});

test("memory flip matches big and little letters, then numbers and their dots", async ({ page }, testInfo) => {
  await install(page);
  const board = await openGame(page, "memory");
  await expect(board).toHaveAttribute("data-rounds", "2");
  await onRound(board, 0);
  await expect(board).toHaveAttribute("data-mode", "letters");
  await expect(board.locator(".pick[data-card]")).toHaveCount(6);
  // Face down, a card shows a star and not what it is.
  await expect(board.locator('.pick[data-card][data-up="false"] .card-back')).toHaveCount(6);
  // Two that do not match turn back, and that is not counted as a miss.
  const cards = await board.locator(".pick[data-card]").evaluateAll((nodes) => nodes.map((node) => ({ id: node.getAttribute("data-card") ?? "", pair: node.getAttribute("data-pair") ?? "" })));
  const apart = cards.find((card) => card.pair !== cards[0].pair)!;
  await board.locator(`.pick[data-card="${cards[0].id}"]`).click();
  await expect(board.locator(`.pick[data-card="${cards[0].id}"]`)).toHaveAttribute("data-up", "true");
  await board.locator(`.pick[data-card="${apart.id}"]`).click();
  await expect(board).toHaveAttribute("data-up", "2");
  await expect(board).toHaveAttribute("data-up", "0");
  await expect(board).toHaveAttribute("data-misses", "0");
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/games_memory.png" });
  }
  await matchPairs(board, ".pick[data-card]");
  await onRound(board, 1);
  await expect(board).toHaveAttribute("data-mode", "numbers");
  await expect(board.locator('.pick[data-card][data-face="dots"]')).toHaveCount(3);
  await matchPairs(board, ".pick[data-card]");
  await expect(page.locator("[data-game=home]")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
});

for (const id of ["hatch", "pop", "feed", "rhyme", "memory"]) {
  test(`${id} fits a phone with the tip showing: the scene and everything to tap are in view`, async ({ page }) => {
    // A phone's screen less its status bar and home bar.
    await page.setViewportSize({ width: 390, height: 763 });
    // Hatch at its longest: six letters to choose from.
    await install(page, { ...reader, profiles: [{ ...reader.profiles[0], games: { hatch: 3, hatches: 0, spins: 0 } }] });
    const frame = await openGame(page, id);
    await expect(page.locator("[data-tip]")).toBeVisible();
    await expect(frame.locator(".game-scene")).toBeInViewport({ ratio: 1 });
    for (const pick of await frame.locator(".game-tray .pick, .pop-balloon").all()) {
      await expect(pick).toBeInViewport({ ratio: 1 });
      const box = await pick.boundingBox();
      // Nothing a child taps is smaller than a small fingertip.
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(56);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(56);
    }
  });
}

test("a teacher sets the hatch level and the egg follows it", async ({ page }) => {
  // Week one (m and a), whatever today's date: the egg's word must have a letter not yet taught.
  await page.addInitScript(() => {
    localStorage.setItem(
      "littlenest-placement-v1",
      JSON.stringify({
        version: 1,
        origin: "device",
        classId: "device-class",
        updatedAt: "2026-09-26T00:00:00.000Z",
        subjects: { reading: { classDefault: { subject: "reading", stageId: "letters", weekIndex: 0 }, byChildId: {} } },
      }),
    );
  });
  await install(page);
  await page.getByRole("button", { name: "Switch child" }).click({ delay: 1600 });
  await page.getByRole("button", { name: "Teacher", exact: true }).click();
  await passGate(page);
  await openTeacherChild(page, "mia");
  await page.getByRole("button", { name: "Word ladder step 3" }).click();
  await page.getByRole("button", { name: "Hatch level 2" }).click();
  await expect(page.locator("[data-section=games]")).toHaveAttribute("data-hatch-level", "2");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await passGate(page);
  await expect(page.locator("[data-section=games]")).toHaveAttribute("data-hatch-level", "2");
  await expect(page.locator("[data-section=games]")).toHaveAttribute("data-editable", "false");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Mia" }).click();
  await openGames(page);
  await page.locator("[data-game-tile=hatch]").click();
  const board = game(page, "hatch");
  await expect(board).toHaveAttribute("data-level", "2");
  // Level 2 blanks every taught letter (week one teaches m and a) and shows the rest.
  const word = (await board.getAttribute("data-word")) ?? "";
  expect(word).toHaveLength(3);
  const taught = [...word].filter((letter) => "ma".includes(letter)).length;
  expect(taught).toBeGreaterThan(0);
  await expect(board.locator('[data-blank="open"]')).toHaveCount(taught);
  await expect(board.locator('[data-blank="shown"]')).toHaveCount(3 - taught);
});

async function traceWheel(page: Page, board: Locator) {
  for (let guard = 0; guard < 6; guard += 1) {
    if ((await board.getAttribute("data-phase")) !== "challenge") return;
    if ((await board.getAttribute("data-kind")) !== "trace") return;
    const pad = board.locator(".spin-trace");
    await pad.scrollIntoViewIfNeeded();
    const raw = (await pad.getAttribute("data-stations")) ?? "";
    const box = await pad.locator("svg").boundingBox();
    const points = raw
      .split(" ")
      .filter(Boolean)
      .map((pair) => {
        const [x, y] = pair.split(",").map(Number);
        return { x: (box?.x ?? 0) + (x / 100) * (box?.width ?? 0), y: (box?.y ?? 0) + (y / 100) * (box?.height ?? 0) };
      });
    if (!box || points.length < 2) throw new Error("The mini letter has no stroke");
    await page.mouse.move(points[0].x, points[0].y);
    await page.mouse.down();
    for (const point of points) await page.mouse.move(point.x, point.y);
    await page.mouse.up();
  }
  if ((await board.getAttribute("data-phase")) === "challenge") throw new Error("The mini letter did not finish");
}

test("spin and say lands on learned challenges and keeps the star after a miss", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await install(page);
  await openGames(page);
  await page.locator("[data-game-tile=spin]").click();
  const board = page.locator("[data-game=spin] .game-board");
  await expect(page.locator("[data-tip=game-spin-start]")).toBeVisible();
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/games_spin.png" });
  }
  await board.locator("[data-wheel]").click();
  await expect(board).toHaveAttribute("data-phase", "challenge");
  await expect(board).toHaveAttribute("data-kind", "sound");
  await expect(board).toHaveAttribute("data-flick", "false");
  await expect(board).toHaveAttribute("data-reduced", "true");
  // The challenge is a round on the game kit: a scene with the child's animal, and pictures to tap.
  const frame = board.locator(".game-frame[data-screen=spin]");
  await expect(frame).toHaveAttribute("data-challenge", "sound");
  await expect(frame.locator(".game-host")).toBeVisible();
  const wrong = frame.locator('.pick[data-choice][data-answer="false"]').first();
  await wrong.click();
  await expectWiggle(wrong);
  await expect(frame).toHaveAttribute("data-misses", "1");
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "0");
  await board.locator('[data-answer="true"]').click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
  await expect(board).toHaveAttribute("data-phase", "ready");

  const kinds = ["word", "count", "color", "trace", "bonus"] as const;
  for (const [offset, kind] of kinds.entries()) {
    await board.locator("[data-wheel]").click();
    await expect(board).toHaveAttribute("data-kind", kind);
    if (kind === "word") await expect(board.locator('[data-blank="open"]')).toHaveCount(1);
    if (kind === "count") {
      const total = Number(await board.locator(".game-frame").getAttribute("data-target"));
      // Apples to count, each a drawing.
      await expect(board.locator(".spin-object .art")).toHaveCount(total);
    }
    if (kind === "trace") {
      const svg = board.locator(".spin-trace svg");
      const box = await svg.boundingBox();
      if (!box) throw new Error("The tracing board has no box");
      await page.mouse.move(box.x + 4, box.y + 4);
      await page.mouse.down();
      await page.mouse.move(box.x + 14, box.y + 8);
      await page.mouse.up();
      await expect(board).toHaveAttribute("data-hint", "Try again.");
      await expect(page.locator(".star-count")).toHaveAttribute("data-stars", String(1 + offset));
      await traceWheel(page, board);
    } else if (kind === "bonus") {
      await expect(board.locator("[data-prize-kind]")).toHaveAttribute("data-prize-kind", "sticker");
      // The present is a picture of the baby animal, with a check to take it.
      await expect(board.locator(".spin-prize [data-baby-art]")).toBeVisible();
      if (testInfo.project.name === "chromium") {
        await board.screenshot({ path: "test-results/screenshots/games_spin_bonus.png" });
      }
      await board.locator(".pick[data-keep]").click();
    } else {
      await board.locator('[data-answer="true"]').click();
    }
    await expect(board).toHaveAttribute("data-phase", "ready");
    await expect(page.locator(".star-count")).toHaveAttribute("data-stars", String(2 + offset));
  }

  await board.locator("[data-wheel]").click();
  await expect(board).toHaveAttribute("data-kind", "sound");
  await board.locator('[data-answer="true"]').click();
  await expect(board).toHaveAttribute("data-phase", "ready");
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "6");

  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator("[data-step=letter]")).toHaveAttribute("data-current", "true");
  await page.locator("[data-dock=stickers]").click();
  await expect(page.locator("[data-kind=animal]")).toHaveCount(1);
});

test("a flick spins the wheel and a bonus can gift a dress-up item", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await install(page, {
    ...profile,
    profiles: [
      {
        ...profile.profiles[0],
        games: { hatch: 1, hatches: 0, spins: 11 },
      },
    ],
  });
  await openGames(page);
  await page.locator("[data-game-tile=spin]").click();
  const board = page.locator("[data-game=spin] .game-board");
  await board.locator("[data-wheel]").click();
  await expect(board).toHaveAttribute("data-kind", "bonus");
  await expect(board.locator("[data-prize-kind]")).toHaveAttribute("data-prize-kind", "outfit");
  await expect(board.locator("[data-prize]")).toHaveAttribute("data-prize", "scarf-stripe");
  // A dress-up present is shown on the child's own animal.
  await expect(board.locator(".spin-prize .hero")).toHaveAttribute("data-scarf", "scarf-stripe");
  await board.locator(".pick[data-keep]").click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.locator("[data-dock=closet]").click();
  await expect(page.locator('[data-item="scarf-stripe"]')).toHaveAttribute("data-unlocked", "true");
});

test("the wheel spins from a keyboard: Enter on it starts a challenge", async ({ page }) => {
  await install(page);
  await openGames(page);
  await page.locator("[data-game-tile=spin]").click();
  const board = page.locator("[data-game=spin] .game-board");
  await expect(board).toHaveAttribute("data-phase", "ready");
  // Focus and a key are what a hardware keyboard or a switch sends: only a click, no pointer.
  // The wheel listened for the pointer alone, so the game could not be started.
  await page.locator("[data-wheel]").focus();
  await page.keyboard.press("Enter");
  await expect(board).toHaveAttribute("data-phase", "challenge");
  // A key press spins like a tap, not a flick.
  await expect(board).toHaveAttribute("data-flick", "false");
  await expect(board).toHaveAttribute("data-kind", /sound|word|count|color|trace|bonus/);
});

test("flicking the wheel starts a challenge", async ({ page }) => {
  await install(page);
  await openGames(page);
  await page.locator("[data-game-tile=spin]").click();
  const wheel = page.locator("[data-wheel]");
  const box = await wheel.boundingBox();
  if (!box) throw new Error("The wheel has no box");
  await page.mouse.move(box.x + box.width * 0.32, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.78, box.y + box.height * 0.28, { steps: 8 });
  await page.mouse.up();
  const board = page.locator("[data-game=spin] .game-board");
  await expect(board).toHaveAttribute("data-phase", "challenge");
  await expect(board).toHaveAttribute("data-flick", "true");
  await expect(board).toHaveAttribute("data-kind", /sound|word|count|color|trace|bonus/);
});

test("each game's speaker is in the corner of its scene, clear of the buttons at the top", async ({ page }) => {
  // The reading games once had a "Hear it" button of their own with the kit speaker's class name, and
  // the kit's rule set each one over the Back button at the top left of the screen. They are kit games
  // now, with the kit's speaker; this keeps it where it belongs.
  await page.setViewportSize({ width: 390, height: 844 });
  await install(page);
  await openGames(page);
  for (const id of ["hatch", "pop", "feed", "rhyme", "memory"]) {
    await page.locator(`[data-game-tile=${id}]`).click();
    const frame = game(page, id);
    const hear = frame.locator(".game-scene > .game-hear");
    await expect(hear).toBeVisible();
    const box = (await hear.boundingBox())!;
    const scene = (await frame.locator(".game-scene").boundingBox())!;
    expect(box.x, `${id}: inside the scene`).toBeGreaterThanOrEqual(scene.x);
    expect(box.y, `${id}: inside the scene`).toBeGreaterThanOrEqual(scene.y);
    expect(box.y + box.height, `${id}: in the top of the scene`).toBeLessThan(scene.y + scene.height / 2);
    for (const other of await page.locator(".top-bar button, .games-back").all()) {
      const at = await other.boundingBox();
      if (!at) continue;
      const apart = box.x >= at.x + at.width || at.x >= box.x + box.width || box.y >= at.y + at.height || at.y >= box.y + box.height;
      expect(apart, `${id}: the speaker is clear of ${await other.getAttribute("aria-label")}`).toBe(true);
    }
    // The way back to the list is beside the game's name, not on it and not on a line of its own.
    const back = (await page.locator(".games-back").boundingBox())!;
    const title = (await frame.locator("h1").boundingBox())!;
    expect(back.x + back.width, `${id}: back is left of the name`).toBeLessThanOrEqual(title.x + 1);
    expect(back.y, `${id}: back is on the name's line`).toBeLessThan(title.y + title.height);
    // The wheel names its parts with pictures; no game has a button with "Hear it" written on it.
    await expect(page.getByRole("button", { name: "Hear it", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "All games" }).click();
    await expect(page.locator("[data-game=home]")).toBeVisible();
  }
});

test("before the first spin, the pointer sits over the middle of a picture, not the line between two", async ({ page }) => {
  await install(page);
  await openGames(page);
  await page.locator("[data-game-tile=spin]").click();
  const pointer = await page.locator(".spin-pointer").boundingBox();
  // The Sound slice: a slice whose middle is under the pointer is mirror-even about it.
  const icon = await page.locator("[data-wheel] svg > g").first().locator("path").first().boundingBox();
  const wheel = await page.locator("[data-wheel]").boundingBox();
  const pointerX = pointer!.x + pointer!.width / 2;
  const iconX = icon!.x + icon!.width / 2;
  expect(Math.abs(iconX - pointerX)).toBeLessThan(3);
  expect(icon!.y + icon!.height / 2).toBeLessThan(wheel!.y + wheel!.height / 2);
});
