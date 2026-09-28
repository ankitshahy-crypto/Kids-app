import { expect, test, type Locator, type Page } from "@playwright/test";
import { createdThisWeek } from "./clock";

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

async function install(page: Page, saved: unknown = profile) {
  await page.addInitScript((saved) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.removeItem("kids-app-silent-hint-v1");
  }, saved);
  await page.goto("./");
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: "Mia" }).click();
}

async function openGames(page: Page) {
  if ((await page.locator("[data-dock=games]").count()) === 0) {
    await page.getByRole("button", { name: "Back", exact: true }).click();
  }
  await page.locator("[data-dock=games]").click();
  await expect(page.locator("[data-game=home]")).toBeVisible();
}

async function passGate(page: Page) {
  const dialog = page.getByRole("dialog");
  const prompt = await dialog.getByRole("heading").innerText();
  const sum = prompt.match(/(\d+)\s*\+\s*(\d+)/);
  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
  const expected = sum
    ? Number(sum[1]) + Number(sum[2])
    : (words[prompt.match(/number ([a-z]+)/i)?.[1]?.toLowerCase() ?? ""] ?? 0);
  const choices = dialog.locator(".gate-choice");
  const count = await choices.count();
  for (let index = 0; index < count; index += 1) {
    if (Number(await choices.nth(index).innerText()) === expected) {
      await choices.nth(index).click();
      return;
    }
  }
  throw new Error(`No matching grown-up choice for: ${prompt}`);
}

async function matchPairs(root: Locator, cardSelector: string) {
  const cards = await root.locator(cardSelector).evaluateAll((nodes) =>
    nodes.map((node) => ({
      id: node.getAttribute("data-card") ?? node.getAttribute("data-rhyme") ?? "",
      pair: node.getAttribute("data-pair") ?? "",
    })),
  );
  const groups = new Map<string, string[]>();
  for (const card of cards) {
    const list = groups.get(card.pair) ?? [];
    list.push(card.id);
    groups.set(card.pair, list);
  }
  for (const ids of groups.values()) {
    await root.locator(`${cardSelector}[data-card="${ids[0]}"], ${cardSelector}[data-rhyme="${ids[0]}"]`).click();
    await root.locator(`${cardSelector}[data-card="${ids[1]}"], ${cardSelector}[data-rhyme="${ids[1]}"]`).click();
  }
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

test("hatch the egg wiggles a miss, glows the right letter, and hatches a baby", async ({ page }, testInfo) => {
  await install(page);
  await openGames(page);
  await page.locator("[data-game-tile=hatch]").click();
  const board = page.locator("[data-game=hatch] .game-board");
  await expect(board).toHaveAttribute("data-level", "1");
  await expect(page.locator("[data-tip=game-hatch-start]")).toBeVisible();
  const wrong = board.locator('[data-letter][data-needed="false"]').first();
  await wrong.click();
  await expect(board).toHaveAttribute("data-misses", "1");
  await expect(wrong).toHaveAttribute("data-wiggle", "true");
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "0");
  await wrong.click();
  await expect(board).toHaveAttribute("data-misses", "2");
  await expect(board.locator('[data-glow="true"]')).toHaveCount(1);
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/games_hatch.png" });
  }
  while ((await board.locator('[data-letter][data-needed="true"]').count()) > 0) {
    await board.locator('[data-letter][data-needed="true"]').first().click();
  }
  await expect(board).toHaveAttribute("data-phase", "hatched");
  const baby = await board.getAttribute("data-baby");
  expect(baby).toBeTruthy();
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/games_hatch_baby.png" });
  }
  await board.getByRole("button", { name: "Done" }).click();
  await expect(page.locator("[data-game=home]")).toBeVisible();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
  await expect(page.locator("[data-tip=game-hatch-end]")).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator("[data-step=letter]")).toHaveAttribute("data-current", "true");
  await page.locator("[data-dock=stickers]").click();
  await expect(page.locator("[data-kind=animal]")).toHaveAttribute("data-sticker", baby!);
});

test("letter pop only pops balloons with the target sound", async ({ page }, testInfo) => {
  await install(page);
  await openGames(page);
  await page.locator("[data-game-tile=pop]").click();
  const board = page.locator("[data-game=pop] .game-board");
  const target = await board.getAttribute("data-target");
  expect(target).toBeTruthy();
  const wrong = board.locator(`[data-balloon]:not([data-letter="${target}"])`).first();
  await wrong.click();
  await expect(wrong).toHaveAttribute("data-wiggle", "true");
  await expect(wrong).toHaveAttribute("data-popped", "false");
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/games_pop.png" });
  }
  while ((await board.locator(`[data-balloon][data-letter="${target}"][data-popped="false"]`).count()) > 0) {
    await board.locator(`[data-balloon][data-letter="${target}"][data-popped="false"]`).first().click();
  }
  await expect(board).toHaveAttribute("data-phase", "done");
  await board.getByRole("button", { name: "Done" }).click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
});

test("feed the animal accepts a drag or a tap for the target letter", async ({ page }, testInfo) => {
  await install(page);
  await openGames(page);
  await page.locator("[data-game-tile=feed]").click();
  const board = page.locator("[data-game=feed] .game-board");
  const target = await board.getAttribute("data-target");
  const wrong = board.locator(`[data-food]:not([data-letter="${target}"])`).first();
  await wrong.click();
  await expect(wrong).toHaveAttribute("data-wiggle", "true");
  await expect(wrong).toHaveAttribute("data-fed", "false");
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/games_feed.png" });
  }
  const first = board.locator(`[data-food][data-letter="${target}"]`).first();
  await first.dragTo(board.locator("[data-drop=animal]"));
  await expect(first).toHaveAttribute("data-fed", "true");
  const rest = board.locator(`[data-food][data-letter="${target}"][data-fed="false"]`);
  while ((await rest.count()) > 0) {
    await rest.first().click();
  }
  await expect(board).toHaveAttribute("data-phase", "done");
  await board.getByRole("button", { name: "Done" }).click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
});

test("rhyme match pairs picture words and ignores a mismatch", async ({ page }, testInfo) => {
  await install(page);
  await openGames(page);
  await page.locator("[data-game-tile=rhyme]").click();
  const board = page.locator("[data-game=rhyme] .game-board");
  const first = board.locator("[data-rhyme]").nth(0);
  const other = board.locator('[data-rhyme][data-pair="1"]').first();
  const firstPair = await first.getAttribute("data-pair");
  if (firstPair !== "1") {
    await first.click();
    await other.click();
    await expect(other).toHaveAttribute("data-wiggle", "true");
    await expect(other).toHaveAttribute("data-matched", "false");
  }
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/games_rhyme.png" });
  }
  await matchPairs(board, "[data-rhyme]");
  await expect(board).toHaveAttribute("data-phase", "done");
  await board.getByRole("button", { name: "Done" }).click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
});

test("memory flip matches letters and a number with its dots", async ({ page }, testInfo) => {
  await install(page);
  await openGames(page);
  await page.locator("[data-game-tile=memory]").click();
  const board = page.locator("[data-game=memory] .game-board");
  await expect(board).toHaveAttribute("data-mode", "letters");
  if (testInfo.project.name === "chromium") {
    await board.screenshot({ path: "test-results/screenshots/games_memory.png" });
  }
  await matchPairs(board, "[data-card]");
  await expect(board.locator("[data-phase=done]")).toBeVisible();
  await board.getByRole("button", { name: "Done" }).click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
  await page.locator("[data-game-tile=memory]").click();
  await page.getByRole("button", { name: "Numbers" }).click();
  await expect(board).toHaveAttribute("data-mode", "numbers");
  await matchPairs(board, "[data-card]");
  await expect(board.locator("[data-phase=done]")).toBeVisible();
  await board.getByRole("button", { name: "Done" }).click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
});

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
  await page.getByRole("button", { name: "Switch child" }).click();
  await page.getByRole("button", { name: "Teacher", exact: true }).click();
  await passGate(page);
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
  const board = page.locator("[data-game=hatch] .game-board");
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

test("spin and say lands on learned challenges and keeps a star after a hint", async ({ page }, testInfo) => {
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
  await board.locator('[data-choice][data-answer="false"]').first().click();
  await expect(board).toHaveAttribute("data-hint", "Try again.");
  await expect(board.locator('[data-glow="true"]')).toHaveCount(1);
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
      const total = Number(await board.locator("[data-target]").getAttribute("data-target"));
      await expect(board.locator(".spin-object")).toHaveCount(total);
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
      if (testInfo.project.name === "chromium") {
        await board.screenshot({ path: "test-results/screenshots/games_spin_bonus.png" });
      }
      await board.getByRole("button", { name: "Done" }).click();
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
  await board.getByRole("button", { name: "Done" }).click();
  await expect(page.locator(".star-count")).toHaveAttribute("data-stars", "1");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.locator("[data-dock=closet]").click();
  await expect(page.locator('[data-item="scarf-stripe"]')).toHaveAttribute("data-unlocked", "true");
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
