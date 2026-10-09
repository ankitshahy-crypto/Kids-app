import { expect, test, type Locator, type Page } from "@playwright/test";
import { installAudioSpy, spokenLines } from "./audioSpy";
import { child, expectStar, expectWiggle, game, noting, onRound } from "./kit";

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
    // The plank that fits. What that looks like is checked below, where the game is not hurried:
    // here the next river follows at once.
    await bridge.locator(`.pick[data-plank="${gap}"]`).click();
  }
  await expectStar(page);
});

test("bridge: the planks lie in rows under the river, lined up with it: too short, just right and too long are seen at a glance", async ({ page }) => {
  // The playtest of build 3: the planks were drawn in tiles, each to its own scale, and all three
  // looked as if they would reach. In rows under the river, to its scale, they are seen against it.
  await page.setViewportSize({ width: 390, height: 844 });
  const bridge = await openBuild(page, "bridge");
  for (let round = 0; round < 3; round += 1) {
    await onRound(bridge, round);
    const gap = Number(await bridge.getAttribute("data-gap"));
    const seen = await bridge.evaluate((frame) => {
      const near = frame.querySelector(".bridge-bank:not(.is-far)")!.getBoundingClientRect();
      const far = frame.querySelector(".bridge-bank.is-far")!.getBoundingClientRect();
      const rows = [...frame.querySelectorAll(".game-tray .pick")].map((pick) => {
        const water = pick.querySelector(".plank-row-water")!.getBoundingClientRect();
        const plank = pick.querySelector(".plank-row-plank")!.getBoundingClientRect();
        return { length: Number(pick.getAttribute("data-plank")), top: pick.getBoundingClientRect().top, water: [water.left, water.right], plank: [plank.left, plank.right] };
      });
      return { river: [near.right, far.left], rows };
    });
    const [riverStart, riverEnd] = seen.river;
    const width = riverEnd - riverStart;
    // Three rows, one under another.
    expect(new Set(seen.rows.map((row) => Math.round(row.top))).size).toBe(3);
    for (const row of seen.rows) {
      // Each row's river is the river above it.
      expect(Math.abs(row.water[0] - riverStart)).toBeLessThanOrEqual(1.5);
      expect(Math.abs(row.water[1] - riverEnd)).toBeLessThanOrEqual(1.5);
      const end = row.plank[1];
      if (row.length === gap) {
        // Just right: from bank to bank, resting a little on each.
        expect(row.plank[0]).toBeLessThan(riverStart);
        expect(end).toBeGreaterThan(riverEnd);
        expect(end - riverEnd).toBeLessThan(width * 0.2);
      } else if (row.length < gap) {
        // Plainly too short: it ends well inside the river.
        expect(riverEnd - end).toBeGreaterThan(width * 0.2);
      } else {
        // Plainly too long: it runs well onto the far bank.
        expect(end - riverEnd).toBeGreaterThan(width * 0.4);
      }
    }
    await bridge.locator(`.pick[data-plank="${gap}"]`).click();
  }
  await expectStar(page);
});

test("bridge: the third miss points at the plank that fits", async ({ page }) => {
  // Not hurried: the crossing at the end has to stay on screen long enough to be seen.
  const bridge = await openBuild(page, "bridge", { quick: false });
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
    // The page notes the stack as it grows. (The last block put on ends the round, and under the
    // quick setting the next round's empty stack is there a moment later: asked from here, the
    // block could be gone before the question lands.)
    const stacked = await noting(tower, (frame) => [...frame.querySelectorAll(".tower-stack .tower-block")].map((block) => block.getAttribute("data-block")));
    for (let placed = 0; placed < blocks.length; placed += 1) {
      await expect(tower).toHaveAttribute("data-ready", "true");
      const want = Number(await tower.getAttribute("data-answer"));
      expect(want).toBe([...blocks].sort((a, b) => b - a)[placed]);
      const before = (await stacked()).length;
      await tower.locator(`.pick[data-block="${want}"]`).click();
      await expect.poll(async () => (await stacked()).slice(before).some((stack) => stack.includes(String(want)))).toBe(true);
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
  }
  await expectStar(page);
});

test("Build asks aloud, and says what happened to each try", async ({ page }, testInfo) => {
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
  // The plank lies across, and the animal is sent to the far bank.
  await expect(bridge).toHaveAttribute("data-crossed", "true");
  await expect(bridge.locator(".bridge-plank")).toHaveAttribute("data-fit", "fits");
  await expect.poll(() => bridge.locator(".game-host").evaluate((host) => parseFloat((host as HTMLElement).style.left))).toBeGreaterThan(28 + gap * 9);
  if (testInfo.project.name === "chromium") await bridge.screenshot({ path: "test-results/screenshots/build_bridge.png" });
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

/** Note every value an attribute of the game takes, with the round it was in: "0:fits". */
async function watch(frame: Locator, attribute: string) {
  await frame.evaluate((node, name) => {
    const seen: string[] = [];
    (window as unknown as { __seen: string[] }).__seen = seen;
    const note = () => seen.push(`${node.getAttribute("data-round")}:${node.getAttribute(name)}`);
    new MutationObserver(note).observe(node, { attributes: true, attributeFilter: [name, "data-round"] });
  }, attribute);
}

const watched = (page: Page) => page.evaluate(() => (window as unknown as { __seen: string[] }).__seen);

test("a right answer straight after a wrong one stays: the plank is not taken away again, nor the pile", async ({ page }) => {
  // A wrong try is cleared away after a moment. That clearing used to go off even when the right answer
  // had been given in the meantime, and took it away: the plank vanished from under the animal.
  const bridge = await openBuild(page, "bridge", { quick: false, ageRange: "6-7" });
  const gap = Number(await bridge.getAttribute("data-gap"));
  const wrong = (await numbers(bridge, "data-plank")).find((plank) => plank !== gap)!;
  await watch(bridge, "data-tried");
  await bridge.locator(`.pick[data-plank="${wrong}"]`).click();
  await bridge.locator(`.pick[data-plank="${gap}"]`).click();
  await expect(bridge).toHaveAttribute("data-round", "1", { timeout: 10_000 });
  // From the plank that fits to the end of the round, it was never taken away.
  const tried = (await watched(page)).filter((entry) => entry.startsWith("0:"));
  expect(tried).toContain("0:fits");
  expect(tried.slice(tried.indexOf("0:fits"))).not.toContain("0:none");

  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.locator("[data-engineer=menu] [data-activity=balance]").click();
  const balance = game(page, "balance");
  const left = Number(await balance.getAttribute("data-left"));
  const other = (await numbers(balance, "data-pile")).find((pile) => pile !== left)!;
  await watch(balance, "data-right");
  await balance.locator(`.pick[data-pile="${other}"]`).click();
  await balance.locator(`.pick[data-pile="${left}"]`).click();
  await expect(balance).toHaveAttribute("data-round", "1", { timeout: 10_000 });
  const piles = (await watched(page)).filter((entry) => entry.startsWith("0:"));
  expect(piles).toContain(`0:${left}`);
  expect(piles.slice(piles.indexOf(`0:${left}`))).not.toContain("0:0");
});

test("a right answer is seen working: the machine does the job, and the beam comes level", async ({ page }, testInfo) => {
  // Not hurried, so what the right answer does stays on screen: in a quick game the next round follows at once.
  const machines = await openBuild(page, "machines", { quick: false, ageRange: "6-7" });
  const job = (await machines.getAttribute("data-job")) ?? "";
  await expect(machines.locator(".job-art")).toHaveAttribute("data-done", "false");
  await machines.locator(`.pick[data-machine=${await machines.getAttribute("data-answer")}]`).click();
  await expect(machines.locator(`.job-art[data-job=${job}]`)).toHaveAttribute("data-done", "true");
  if (testInfo.project.name === "chromium") await machines.screenshot({ path: "test-results/screenshots/build_machines.png" });
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.locator("[data-engineer=menu] [data-activity=balance]").click();
  const balance = game(page, "balance");
  await expect(balance).toHaveAttribute("data-tilt", "left");
  await balance.locator(`.pick[data-pile="${await balance.getAttribute("data-left")}"]`).click();
  await expect(balance).toHaveAttribute("data-tilt", "level");
  if (testInfo.project.name === "chromium") await balance.screenshot({ path: "test-results/screenshots/build_balance.png" });
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
