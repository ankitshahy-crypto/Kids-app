import { expect, test, type Locator, type Page } from "@playwright/test";
import { child, game, onRound, paintingIn, timePlacement } from "./kit";

// Two tests here hold back or refuse a painting's fetch from the test (page.route). The service
// worker would answer such a fetch itself, out of the test's sight, so none runs in this file.
test.use({ serviceWorkers: "block" });

/**
 * The scenes behind the games are paintings (public/backdrops, src/data/backdropArt.json). Each is
 * held where its game looks, the games' things stand on the painting's own lines, outdoors it
 * drifts a little, and the drawn scene is still there for when a painting cannot be fetched.
 */

/** The paintings the page asked for that did not come back. */
function watchArt(page: Page): string[] {
  const missing: string[] = [];
  page.on("response", (response) => {
    if (response.url().includes("/backdrops/") && !response.ok()) missing.push(`${response.status()} ${response.url()}`);
  });
  return missing;
}

async function install(page: Page, options: { ageRange?: string; calm?: boolean; quick?: boolean } = {}) {
  await page.addInitScript(
    ({ saved, placed, calm, quick }) => {
      if (sessionStorage.getItem("backdrops-seeded")) return;
      sessionStorage.setItem("backdrops-seeded", "1");
      localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
      localStorage.setItem("littlenest-placement-v1", JSON.stringify(placed));
      localStorage.removeItem("kids-app-silent-hint-v1");
      localStorage.setItem("littlenest-settings-v1", JSON.stringify({ showTips: false, calm }));
      // No wait for the praise between rounds (a development-build switch, see e2e/kit.ts).
      if (quick) localStorage.setItem("littlenest-quick-rounds", "1");
    },
    { saved: child(options.ageRange ?? "4"), placed: timePlacement(0), calm: options.calm ?? false, quick: options.quick ?? false },
  );
  await page.goto("./");
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: "Mia" }).click();
}

async function openMoney(page: Page, id: string): Promise<Locator> {
  await page.getByRole("button", { name: "LittleNest Time & Money" }).click();
  await page.locator(`[data-activity=${id}]`).click();
  const frame = game(page, id);
  await expect(frame).toBeVisible();
  return frame;
}

async function openScience(page: Page, id: string): Promise<Locator> {
  await page.locator("[data-course=science]").click();
  await page.locator(`[data-science=menu] [data-activity=${id}]`).click();
  const frame = game(page, id);
  await expect(frame).toBeVisible();
  return frame;
}

/** The scene's painting, once it is in: the right picture, all of it loaded, and no drawn scene under it. */
async function painted(frame: Locator, kind: string) {
  const scene = frame.locator(".game-scene");
  await expect(scene).toHaveAttribute("data-scene", kind);
  await expect(scene).toHaveAttribute("data-painted", "true");
  const art = scene.locator("img.game-backdrop-art");
  await expect(art).toHaveAttribute("src", new RegExp(`/backdrops/${kind}\\.webp$`));
  await paintingIn(art);
  await expect.poll(() => art.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBe(1500);
  return { scene, art };
}

/**
 * How far down the painting something's bottom edge is, as a share of the painting's height. The
 * painting covers the scene: as tall as the scene when the scene is narrower than three by two,
 * and otherwise as tall as two thirds of the scene's width with its top cut off (it is held by its
 * bottom). So this is where the thing stands on the picture itself, whatever the scene's shape.
 */
async function down(scene: Locator, thing: Locator): Promise<number> {
  const [box, of] = [await thing.boundingBox(), await scene.boundingBox()];
  if (!box || !of) throw new Error("Nothing to measure");
  const art = Math.max(of.height, (of.width * 2) / 3);
  return 1 - (of.y + of.height - (box.y + box.height)) / art;
}

/** The movements running on the painting by themselves (its drift), by name. A fade in is not one. */
const drifting = (art: Locator) =>
  art.evaluate((img) =>
    img
      .getAnimations()
      .filter((animation) => "animationName" in animation && animation.playState === "running")
      .map((animation) => (animation as CSSAnimation).animationName),
  );

// The two tablet shapes are also the two where the game is drawn larger (zoom 1.2 on its side, 1.45
// upright). WebKit made container units larger by that zoom, and the thing for sale stood 55px
// above the counter on an upright iPad while Chromium showed it standing on it; the line is worked
// out without those units now, and this is where WebKit says so.
for (const [shape, size] of [
  ["wider than the painting", { width: 1280, height: 720 }],
  ["narrower than the painting, a phone", { width: 390, height: 844 }],
  ["narrower than the painting, an iPad upright", { width: 810, height: 1080 }],
] as const) {
  test(`a game's scene is its painting, held where the game looks, with its things on the painting's own line (a scene ${shape})`, async ({ page }) => {
    await page.setViewportSize(size);
    const missing = watchArt(page);
    await install(page);
    const shop = await openMoney(page, "shop");
    const { scene, art } = await painted(shop, "shop");
    // The scene's shape is the one this test is for: on the desktop size it is wider than three by
    // two (the painting is held by its bottom and its top is cut off), on the phone narrower.
    const box = (await scene.boundingBox())!;
    expect(box.width / box.height > 1.5).toBe(shape === "wider than the painting");
  // The painting is the scene: nothing is drawn under it.
  await expect(scene.locator("svg.game-backdrop")).toHaveCount(0);
  // As tall as the scene and wider, held at its middle, its bottom on the scene's bottom.
  expect(await art.evaluate((img) => getComputedStyle(img).objectFit)).toBe("cover");
  expect(await art.evaluate((img) => getComputedStyle(img).objectPosition)).toBe("50% 100%");
  // Indoors nothing drifts.
  await expect(art).toHaveAttribute("data-drift", "false");
  expect(await drifting(art)).toEqual([]);
    // The thing for sale stands on the counter: its foot is on the painted counter's front edge
    // (about three quarters of the way down the painting), not where the drawn counter was.
    await expect(scene).toHaveAttribute("style", /--scene-floor:\s*0\.775/);
    expect(await down(scene, shop.locator(".shop-counter > :first-child"))).toBeCloseTo(0.775, 2);

    // The lemonade stall is at the right of its painting, and the painting is held there.
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page.locator("[data-activity=lemonade]").click();
    const stand = game(page, "lemonade");
    const stall = await painted(stand, "stand");
    expect(await stall.art.evaluate((img) => getComputedStyle(img).objectPosition)).toBe("100% 100%");
    // The coins earned (one a cup) lie on the stall's counter.
    const cups = Number(await stand.getAttribute("data-answer"));
    await stand.locator(`.pick[data-cups="${cups}"]`).click();
    await expect(stand).toHaveAttribute("data-earned", String(cups));
    await expect(stand.locator(".coin-row .coin-art")).toHaveCount(cups);
    expect(await down(stall.scene, stand.locator(".coin-row"))).toBeCloseTo(0.76, 2);

    // The animal to paint sits where the painted wall meets the floor.
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page.getByRole("button", { name: "LittleNest Colors" }).click();
    await page.locator("[data-activity=paint]").click();
    const paint = game(page, "paint");
    const room = await painted(paint, "room");
    expect(await down(room.scene, paint.locator(".painted-hero"))).toBeCloseTo(0.833, 2);
    expect(missing).toEqual([]);
  });
}

test("outdoors the painting drifts, slowly, and never shows an edge", async ({ page }) => {
  await install(page);
  const body = await openScience(page, "body");
  const { scene, art } = await painted(body, "field");
  await expect(art).toHaveAttribute("data-drift", "true");
  expect(await drifting(art)).toEqual(["backdrop-drift"]);
  // One way takes 26 seconds, and then it comes back. Read at both ends of the way (set, not waited
  // for): the painting is a touch larger than the scene throughout, so it covers it wherever it is.
  const ends = await art.evaluate((img) => {
    const run = img.getAnimations().find((animation) => "animationName" in animation)!;
    const timing = run.effect!.getComputedTiming();
    const frame = img.parentElement!.getBoundingClientRect();
    run.pause();
    const covers = [0, Number(timing.duration)].map((ms) => {
      run.currentTime = ms;
      const box = img.getBoundingClientRect();
      return box.left <= frame.left && box.right >= frame.right && box.top <= frame.top && box.bottom >= frame.bottom - 0.5;
    });
    run.play();
    return { ms: timing.duration, turns: timing.iterations, way: timing.direction, covers };
  });
  expect(ends).toEqual({ ms: 26000, turns: Infinity, way: "alternate", covers: [true, true] });
});

for (const [name, setup] of [
  ["reduced motion", { reduced: true, calm: false }],
  ["calm mode", { reduced: false, calm: true }],
] as const) {
  test(`with ${name} the painting is there and still, at rest at its own size`, async ({ page }) => {
    if (setup.reduced) await page.emulateMedia({ reducedMotion: "reduce" });
    await install(page, { calm: setup.calm });
    if (setup.calm) await expect(page.locator(".app")).toHaveAttribute("data-calm", "true");
    const body = await openScience(page, "body");
    const { scene, art } = await painted(body, "field");
    await page.waitForTimeout(300);
    expect(await drifting(art)).toEqual([]);
    const [of, box] = [await scene.boundingBox(), await art.boundingBox()];
    expect(of && box ? [box.x - of.x, box.y - of.y, box.width - of.width, box.height - of.height].map((off) => Math.abs(off) < 0.5) : []).toEqual([true, true, true, true]);
  });
}

test("the weather is its painting, the rain painted in", async ({ page }) => {
  const missing = watchArt(page);
  await install(page, { ageRange: "6-7" });
  const weather = await openScience(page, "weather");
  await expect(weather).toHaveAttribute("data-rounds", "5");
  const scenes: Record<string, string> = { rain: "rainy", sun: "afternoon", snow: "snowy", wind: "windy", cold: "snowy", hot: "afternoon", windy: "windy", chilly: "snowy" };
  const seen: string[] = [];
  for (let round = 0; round < 5; round += 1) {
    await onRound(weather, round);
    const kind = scenes[(await weather.getAttribute("data-item")) ?? ""];
    seen.push(kind);
    const { scene, art } = await painted(weather, kind);
    // The painting is the whole scene, the rain of the rainy one painted in: nothing drawn over it.
    await expect(scene.locator("svg.game-backdrop")).toHaveCount(0);
    // The sunny scene is held so that its sun is in view.
    if (kind === "afternoon") expect(await art.evaluate((img) => getComputedStyle(img).objectPosition)).toBe("75% 100%");
    await weather.locator(`.pick[data-pick=${await weather.getAttribute("data-answer")}]`).click();
  }
  // Five kinds of weather out of eight, each on one of the four painted scenes.
  expect(seen).toHaveLength(5);
  for (const kind of seen) expect(["afternoon", "rainy", "snowy", "windy"]).toContain(kind);
  expect(missing).toEqual([]);
});

test("the three small skies of Day and night stay drawn, over a painted table", async ({ page }) => {
  await install(page);
  const day = await openMoney(page, "day");
  await painted(day, "table");
  await expect(day.locator(".game-tray .sky-art svg")).toHaveCount(3);
  await expect(day.locator(".sky-art img")).toHaveCount(0);
});

test("the first time a painting lands it fades in over a scene already laid out for it; after that it is there at once", async ({ page }) => {
  // The painting is held back until the test lets it go.
  let letGo!: () => void;
  const held = new Promise<void>((resolve) => (letGo = resolve));
  let asked = 0;
  await page.route(/\/backdrops\/shop\.webp$/, async (route) => {
    asked += 1;
    await held;
    await route.continue();
  });
  await install(page);
  const shop = await openMoney(page, "shop");
  const scene = shop.locator(".game-scene");
  const art = scene.locator("img.game-backdrop-art");
  // On its way: not seen yet, and no drawn scene in its place, but the thing for sale already
  // stands where the painted counter will be (nothing jumps when the painting lands).
  await expect(scene).toHaveAttribute("data-painted", "true");
  await expect(art).toHaveAttribute("data-in", "false");
  await expect(art).toHaveAttribute("decoding", "async");
  expect(await art.evaluate((img) => getComputedStyle(img).opacity)).toBe("0");
  await expect(scene.locator("svg.game-backdrop")).toHaveCount(0);
  const stood = await down(scene, shop.locator(".shop-counter > :first-child"));
  expect(stood).toBeCloseTo(0.775, 2);
  letGo();
  await expect(art).toHaveAttribute("data-in", "true");
  await expect.poll(() => art.evaluate((img) => getComputedStyle(img).opacity)).toBe("1");
  expect(await art.evaluate((img) => getComputedStyle(img).transitionDuration)).toBe("0.18s");
  expect(await down(scene, shop.locator(".shop-counter > :first-child"))).toBeCloseTo(stood, 3);
  // Seen once: the next time the game opens it is there from the start.
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.locator("[data-activity=shop]").click();
  await expect(art).toHaveAttribute("data-in", "true");
  await expect(art).toHaveAttribute("decoding", "sync");
  expect(asked).toBeGreaterThanOrEqual(1);
});

test("a painting that cannot be fetched leaves the drawn scene, and the game plays on", async ({ page }) => {
  await page.route(/\/backdrops\/shop\.webp$/, (route) => route.abort());
  await install(page, { quick: true });
  const shop = await openMoney(page, "shop");
  const scene = shop.locator(".game-scene");
  await expect(scene).toHaveAttribute("data-painted", "false");
  await expect(scene.locator("svg.game-backdrop")).toHaveCount(1);
  await expect(scene.locator("img.game-backdrop-art")).toHaveCount(0);
  // Laid out for the drawn counter again: the thing for sale stands on it, lower down.
  expect(await shop.locator(".shop-counter").evaluate((counter) => getComputedStyle(counter).paddingBottom)).toBe("44px");
  // And it is still a game: the first round is paid for and the next one opens.
  await expect(shop).toHaveAttribute("data-task", "pennies");
  const price = Number(await shop.getAttribute("data-price"));
  for (let index = 0; index < price; index += 1) await shop.locator(`[data-pick=penny-${index}]`).click();
  await onRound(shop, 1);
  // The next round does not ask for it again: it stays drawn for this visit.
  await expect(scene).toHaveAttribute("data-painted", "false");
});

test("on the painted pond a thing that sinks is seen through the water, and one that floats is not", async ({ page }) => {
  // (Reduced motion, so the look is there at once and can be read the moment the thing is dropped.)
  await page.emulateMedia({ reducedMotion: "reduce" });
  await install(page);
  const float = await openScience(page, "float");
  await painted(float, "pond");
  // The page notes how each thing looks as it comes to rest: asked afterwards, the next thing is
  // already being held up.
  await float.evaluate((frame) => {
    const looks: string[] = [];
    (window as Window & { __looks?: string[] }).__looks = looks;
    new MutationObserver(() => {
      const thing = frame.querySelector(".float-thing");
      const result = thing?.getAttribute("data-result");
      if (!thing || result === "held") return;
      looks.push(`${result} ${getComputedStyle(thing.querySelector(".art")!).opacity}`);
    }).observe(frame, { attributes: true, subtree: true, attributeFilter: ["data-result"] });
  });
  const rounds = Number(await float.getAttribute("data-rounds"));
  const answers: string[] = [];
  for (let round = 0; round < rounds; round += 1) {
    await expect(float).toHaveAttribute("data-round", String(round), { timeout: 15_000 });
    await expect(float).toHaveAttribute("data-dropped", "false");
    const answer = (await float.getAttribute("data-answer")) ?? "";
    answers.push(answer);
    await float.locator(`.pick[data-guess=${answer}]`).click();
  }
  await expect.poll(() => page.evaluate(() => (window as Window & { __looks?: string[] }).__looks?.length ?? 0)).toBe(rounds);
  const looks = await page.evaluate(() => (window as Window & { __looks?: string[] }).__looks ?? []);
  expect(looks).toEqual(answers.map((answer) => (answer === "sink" ? "sink 0.55" : "float 1")));
  // Both happened, so both looks were seen.
  expect(new Set(answers)).toEqual(new Set(["sink", "float"]));
});
