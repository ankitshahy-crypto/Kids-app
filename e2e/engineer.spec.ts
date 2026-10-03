import { expect, test, type Locator, type Page } from "@playwright/test";
import { installAudioSpy, spokenLines } from "./audioSpy";
import { child, expectStar, expectWiggle, game, onRound } from "./kit";

/**
 * LittleNest Build on the game kit: a river to bridge, a tower to stack, a ball
 * to roll to a flag, a load for a machine, and a beam to balance.
 *
 * Each game is checked for the same things: it asks aloud, what is tapped is
 * tried in the scene, a wrong try is shown and ends nothing, and the game ends
 * in a star.
 */

async function install(page: Page, options: { ageRange?: string; quick?: boolean; tips?: boolean } = {}) {
  const { ageRange = "4", quick = true, tips = false } = options;
  await page.addInitScript(
    ({ saved, quick, tips }) => {
      if (sessionStorage.getItem("build-seeded")) return;
      sessionStorage.setItem("build-seeded", "1");
      localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
      localStorage.removeItem("kids-app-silent-hint-v1");
      if (quick) localStorage.setItem("littlenest-quick-rounds", "1");
      if (!tips) localStorage.setItem("littlenest-settings-v1", JSON.stringify({ showTips: false }));
    },
    { saved: child(ageRange), quick, tips },
  );
  await page.goto("./");
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: "Mia" }).click();
}

async function openBuild(page: Page, id: string, options: Parameters<typeof install>[1] = {}): Promise<Locator> {
  await install(page, options);
  await page.locator("[data-course=build]").click();
  await page.locator(`[data-engineer=menu] [data-activity=${id}]`).click();
  const frame = game(page, id);
  await expect(frame).toBeVisible();
  return frame;
}

const numbers = (frame: Locator, attribute: string) =>
  frame.locator(`.pick[${attribute}]`).evaluateAll((picks, name) => picks.map((pick) => Number(pick.getAttribute(name))), attribute);

test("Build is on the home screen, and its page is four picture tiles", async ({ page }) => {
  await install(page);
  const build = page.locator("[data-course=build]");
  await expect(build).toBeVisible();
  await expect(build).toHaveAttribute("aria-label", "LittleNest Build");
  await build.click();
  const board = page.locator("[data-engineer=menu]");
  await expect(board).toHaveAttribute("data-level", "early");
  await expect(board.locator(".time-tile > span:last-child")).toHaveText(["Bridge", "Tower", "Ramps", "Machines"]);
  // Balance is for ages 5 to 7, and Science's games are on Science's page.
  await expect(board.locator("[data-activity=balance]")).toHaveCount(0);
  await expect(board.locator("[data-activity=float]")).toHaveCount(0);
  // The Build page holds Build only: no dock for a tile to slide under.
  await expect(page.locator(".today-dock")).toHaveCount(0);
  // Every tile is a drawing, and none runs off a phone.
  await page.setViewportSize({ width: 390, height: 844 });
  for (const tile of await board.locator("[data-activity]").all()) {
    await expect(tile.locator(".math-activity-art svg")).toHaveCount(1);
    await expect(tile).toBeInViewport({ ratio: 1 });
  }
});

test("bridge: a plank that is too short falls in, and the one that fits lets the animal walk over", async ({ page }, testInfo) => {
  const bridge = await openBuild(page, "bridge");
  await expect(bridge).toHaveAttribute("data-rounds", "3");
  await expect(bridge.locator(".game-tray .pick")).toHaveCount(3);
  for (let round = 0; round < 3; round += 1) {
    await onRound(bridge, round);
    const gap = Number(await bridge.getAttribute("data-gap"));
    const planks = await numbers(bridge, "data-plank");
    // The animal waits on the near bank, and no plank is down.
    await expect(bridge).toHaveAttribute("data-crossed", "false");
    await expect(bridge.locator(".bridge-plank")).toHaveCount(0);
    // On every new river it is back on the near bank, not left where it crossed the last one.
    expect(await bridge.locator(".game-host").evaluate((host) => parseFloat((host as HTMLElement).style.left))).toBeLessThan(5);
    const wrong = planks.find((plank) => plank !== gap)!;
    if (round === 0) {
      const pick = bridge.locator(`.pick[data-plank="${wrong}"]`);
      await pick.click();
      // The plank is laid and seen not to fit; nothing ends.
      await expect(bridge).toHaveAttribute("data-tried", wrong < gap ? "short" : "long");
      await expect(bridge.locator(".bridge-plank")).toHaveAttribute("data-fit", wrong < gap ? "short" : "long");
      await expectWiggle(pick);
      await expect(bridge).toHaveAttribute("data-crossed", "false");
      await expect(bridge).toHaveAttribute("data-misses", "1");
    }
    await bridge.locator(`.pick[data-plank="${gap}"]`).click();
    if (round === 0) {
      await expect(bridge).toHaveAttribute("data-crossed", "true");
      await expect(bridge.locator(".bridge-plank")).toHaveAttribute("data-fit", "fits");
      // The animal is sent to the far bank.
      await expect
        .poll(() => bridge.locator(".game-host").evaluate((host) => parseFloat((host as HTMLElement).style.left)))
        .toBeGreaterThan(28 + gap * 9);
      if (testInfo.project.name === "chromium") await bridge.screenshot({ path: "test-results/screenshots/build_bridge.png" });
    }
  }
  await expectStar(page);
});

test("bridge: the third miss points at the plank that fits", async ({ page }) => {
  const bridge = await openBuild(page, "bridge");
  await onRound(bridge, 0);
  const gap = Number(await bridge.getAttribute("data-gap"));
  const wrong = (await numbers(bridge, "data-plank")).find((plank) => plank !== gap)!;
  for (let miss = 1; miss <= 3; miss += 1) {
    await bridge.locator(`.pick[data-plank="${wrong}"]`).click();
    await expect(bridge).toHaveAttribute("data-misses", String(miss));
  }
  await expect(bridge).toHaveAttribute("data-reveal", "true");
  await expect(bridge.locator(`.pick[data-plank="${gap}"]`)).toHaveAttribute("data-reveal", "true");
  await expect(bridge.locator(".game-hand")).toBeVisible();
  // It is still the child who lays it.
  await expect(bridge).toHaveAttribute("data-crossed", "false");
  await bridge.locator(`.pick[data-plank="${gap}"]`).click();
  await expect(bridge).toHaveAttribute("data-crossed", "true");
});

test("tower: the widest block goes on first, and one put on too soon wobbles and comes off", async ({ page }, testInfo) => {
  const tower = await openBuild(page, "tower");
  await expect(tower).toHaveAttribute("data-rounds", "2");
  for (let round = 0; round < 2; round += 1) {
    await onRound(tower, round);
    const blocks = await numbers(tower, "data-block");
    expect(blocks.length).toBe(round === 0 ? 3 : 4);
    // Never handed over already in the order they go on.
    expect(blocks).not.toEqual([...blocks].sort((a, b) => b - a));
    if (round === 0) {
      const smallest = Math.min(...blocks);
      const pick = tower.locator(`.pick[data-block="${smallest}"]`);
      await pick.click();
      await expect(tower).toHaveAttribute("data-wobble", String(smallest));
      await expectWiggle(pick);
      await expect(tower).toHaveAttribute("data-stack", "");
      // It comes off again, and can be put on when its turn comes.
      await expect(tower).toHaveAttribute("data-wobble", "none");
    }
    for (let placed = 0; placed < blocks.length; placed += 1) {
      await expect(tower).toHaveAttribute("data-ready", "true");
      const want = Number(await tower.getAttribute("data-answer"));
      expect(want).toBe([...blocks].sort((a, b) => b - a)[placed]);
      await tower.locator(`.pick[data-block="${want}"]`).click();
      await expect(tower.locator(`.tower-stack .tower-block[data-block="${want}"]`)).toHaveCount(1);
    }
    if (round === 0 && testInfo.project.name === "chromium") await tower.screenshot({ path: "test-results/screenshots/build_tower.png" });
  }
  await expectStar(page);
});

test("ramp: the ball waits on the grass, a ramp that is too low stops short, and the right one reaches the flag", async ({ page }, testInfo) => {
  const ramp = await openBuild(page, "ramp");
  await expect(ramp).toHaveAttribute("data-rounds", "3");
  const flags: number[] = [];
  for (let round = 0; round < 3; round += 1) {
    await onRound(ramp, round);
    const flag = Number(await ramp.getAttribute("data-flag"));
    flags.push(flag);
    // No ramp stands until one is chosen, so no answer looks picked already.
    await expect(ramp.locator(".ramp-slope")).toHaveCount(0);
    await expect(ramp.locator(".ramp-spot[data-flag=true]")).toHaveCount(1);
    if (round === 0) {
      const wrong = flag === 1 ? 3 : 1;
      const pick = ramp.locator(`.pick[data-ramp="${wrong}"]`);
      await pick.click();
      // The ball is watched all the way before anything is said about it.
      await expect(ramp).toHaveAttribute("data-rolling", "true");
      await expect(ramp.locator(".ramp-slope")).toHaveAttribute("data-height", String(wrong));
      await expect(ramp).toHaveAttribute("data-landed", String(wrong));
      await expectWiggle(pick);
      await expect(ramp).toHaveAttribute("data-solved", "false");
      if (testInfo.project.name === "chromium") await ramp.screenshot({ path: "test-results/screenshots/build_ramp.png" });
    }
    // The right ramp: the ball rolls, and the next round follows (or the star, after the last).
    await ramp.locator(`.pick[data-ramp="${flag}"]`).click();
    await expect(ramp.locator(".ramp-slope")).toHaveAttribute("data-height", String(flag));
  }
  // The flag stands in each of the three places once.
  expect([...flags].sort()).toEqual([1, 2, 3]);
  await expectStar(page);
});

test("machines: a lever lifts the rock, a pulley pulls up the bucket, and wheels move the box", async ({ page }, testInfo) => {
  const machines = await openBuild(page, "machines");
  await expect(machines).toHaveAttribute("data-rounds", "3");
  const machineFor: Record<string, string> = { rock: "lever", bucket: "pulley", box: "wheel" };
  const jobs: string[] = [];
  for (let round = 0; round < 3; round += 1) {
    await onRound(machines, round);
    const job = (await machines.getAttribute("data-job")) ?? "";
    jobs.push(job);
    const answer = machineFor[job];
    await expect(machines).toHaveAttribute("data-answer", answer);
    await expect(machines.locator(".game-tray .pick")).toHaveCount(3);
    await expect(machines.locator(".job-art")).toHaveAttribute("data-done", "false");
    if (round === 0) {
      const wrong = machines.locator(`.pick:not([data-machine=${answer}])`).first();
      await wrong.click();
      await expectWiggle(wrong);
      await expect(machines.locator(".job-art")).toHaveAttribute("data-done", "false");
    }
    await machines.locator(`.pick[data-machine=${answer}]`).click();
    if (round === 0) {
      // The machine is seen doing the job.
      await expect(machines.locator(`.job-art[data-job=${job}]`)).toHaveAttribute("data-done", "true");
      if (testInfo.project.name === "chromium") await machines.screenshot({ path: "test-results/screenshots/build_machines.png" });
    }
  }
  expect([...jobs].sort()).toEqual(["box", "bucket", "rock"]);
  await expectStar(page);
});

test("ages 5 to 7 get Balance: the beam leans to the heavier side and is level when the piles match", async ({ page }, testInfo) => {
  await install(page, { ageRange: "6-7" });
  await page.locator("[data-course=build]").click();
  const board = page.locator("[data-engineer=menu]");
  await expect(board).toHaveAttribute("data-level", "later");
  await expect(board.locator(".time-tile > span:last-child")).toHaveText(["Bridge", "Tower", "Ramps", "Machines", "Balance"]);
  // More rounds than the younger child gets.
  for (const [id, rounds] of [
    ["bridge", "4"],
    ["ramp", "4"],
  ]) {
    await board.locator(`[data-activity=${id}]`).click();
    await expect(game(page, id)).toHaveAttribute("data-rounds", rounds);
    await page.getByRole("button", { name: "Back", exact: true }).click();
  }
  await board.locator("[data-activity=balance]").click();
  const balance = game(page, "balance");
  await expect(balance).toHaveAttribute("data-rounds", "3");
  for (let round = 0; round < 3; round += 1) {
    await onRound(balance, round);
    const left = Number(await balance.getAttribute("data-left"));
    // With nothing on the other side, the beam leans to the blocks.
    await expect(balance).toHaveAttribute("data-right", "0");
    await expect(balance).toHaveAttribute("data-tilt", "left");
    const piles = await numbers(balance, "data-pile");
    expect(piles).toContain(left);
    if (round === 0) {
      const wrong = piles.find((pile) => pile !== left)!;
      const pick = balance.locator(`.pick[data-pile="${wrong}"]`);
      await pick.click();
      await expect(balance).toHaveAttribute("data-tilt", wrong > left ? "right" : "left");
      await expectWiggle(pick);
      // The pile is lifted off again.
      await expect(balance).toHaveAttribute("data-right", "0");
    }
    await balance.locator(`.pick[data-pile="${left}"]`).click();
    if (round === 0) {
      await expect(balance).toHaveAttribute("data-tilt", "level");
      if (testInfo.project.name === "chromium") await balance.screenshot({ path: "test-results/screenshots/build_balance.png" });
    }
  }
  await expectStar(page);
});

test("Build asks aloud, and says what happened to each try", async ({ page }) => {
  await installAudioSpy(page);
  const before = (await spokenLines(page)).length;
  const said = async () => (await spokenLines(page)).slice(before);
  const bridge = await openBuild(page, "bridge", { quick: false });
  await expect.poll(said, { timeout: 8_000 }).toContain("help your animal cross the river. which plank fits?");
  const gap = Number(await bridge.getAttribute("data-gap"));
  const planks = await numbers(bridge, "data-plank");
  const short = planks.find((plank) => plank < gap);
  const long = planks.find((plank) => plank > gap);
  if (short) {
    await bridge.locator(`.pick[data-plank="${short}"]`).click();
    await expect.poll(said, { timeout: 8_000 }).toContain("too short. it fell in.");
  }
  if (long) {
    await bridge.locator(`.pick[data-plank="${long}"]`).click();
    await expect.poll(said, { timeout: 8_000 }).toContain("too long. it sticks out.");
  }
  await bridge.locator(`.pick[data-plank="${gap}"]`).click();
  await expect.poll(said, { timeout: 8_000 }).toContain("it fits!");
  // The speaker in the scene says the question again.
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.locator("[data-engineer=menu] [data-activity=machines]").click();
  const machines = game(page, "machines");
  const asks: Record<string, string> = {
    rock: "the rock is too heavy to lift. what can lift it?",
    bucket: "the bucket is down in the well. what can pull it up?",
    box: "the box is too heavy to carry. what can move it?",
  };
  const job = (await machines.getAttribute("data-job")) ?? "";
  await expect.poll(said, { timeout: 8_000 }).toContain(asks[job]);
  const heard = (await spokenLines(page)).length;
  await machines.locator(".game-hear").click();
  await expect.poll(async () => (await spokenLines(page)).slice(heard), { timeout: 8_000 }).toContain(asks[job]);
  // A wrong machine says its own name, so the miss still teaches a word.
  const answer = (await machines.getAttribute("data-answer")) ?? "";
  const wrong = machines.locator(`.pick:not([data-machine=${answer}])`).first();
  const name = { lever: "lever", pulley: "pulley", wheel: "wheels" }[(await wrong.getAttribute("data-machine")) ?? ""] ?? "";
  const beforeMiss = (await spokenLines(page)).length;
  await wrong.click();
  await expect.poll(async () => (await spokenLines(page)).slice(beforeMiss), { timeout: 8_000 }).toContain(name);
});

for (const id of ["bridge", "tower", "ramp", "machines", "balance"]) {
  test(`${id} fits a phone with the tip showing: the scene and every choice are in view`, async ({ page }) => {
    // A phone's screen less its status bar and home bar.
    await page.setViewportSize({ width: 390, height: 763 });
    const frame = await openBuild(page, id, { tips: true, ageRange: "6-7" });
    await expect(page.locator("[data-tip]")).toBeVisible();
    await expect(frame.locator(".game-scene")).toBeInViewport({ ratio: 1 });
    for (const pick of await frame.locator(".game-tray .pick").all()) {
      await expect(pick).toBeInViewport({ ratio: 1 });
      const box = await pick.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(60);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(60);
    }
  });
}
