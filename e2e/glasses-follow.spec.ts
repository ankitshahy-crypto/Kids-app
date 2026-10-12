import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { createdThisWeek } from "./clock";

// A phone, where the bunny in glasses was seen to cheer with the glasses left where its idle eyes were.
test.use({ viewport: { width: 390, height: 844 } });

const profile = {
  activeId: "mia",
  profiles: [
    {
      id: "mia",
      name: "Mia",
      ageRange: "4",
      animal: "bunny",
      outfit: { hat: "hat-crown", scarf: "scarf-dots", glasses: "glasses-round", color: null },
      createdAt: createdThisWeek(),
      stars: 0,
      days: {},
    },
  ],
};

async function openPop(page: Page) {
  await page.addInitScript((saved) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.setItem("littlenest-silent-hint-v1", "1");
    localStorage.setItem("littlenest-quick-rounds", "1");
  }, profile);
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  await page.locator("[data-dock=games]").click();
  await page.locator("[data-game-tile=pop]").click();
  const board = page.locator(".game-frame[data-screen=pop]");
  await expect(board).toHaveAttribute("data-round", "0");
  return board;
}

/** The 2x3 matrix a transform computes to, or null for none. */
const matrixOf = (transform: string): number[] | null => {
  const parts = transform.match(/matrix\(([^)]+)\)/)?.[1].split(",").map(Number);
  return parts && parts.length === 6 ? parts : null;
};

test("Letter Pop: the glasses go with the bunny's head through the cheer, and sit on the eyes again after", async ({ page }) => {
  const board = await openPop(page);
  const host = board.locator(".game-host");
  const head = host.locator(".hero-head");
  const glasses = host.locator(".wear-glasses");
  const face = host.locator(".avatar-painted");
  await expect(glasses).toBeVisible();
  await expect(head).toHaveAttribute("data-pose", "idle");
  const faceBox = (await face.boundingBox())!;
  const idleGlasses = (await glasses.boundingBox())!;
  // Where the glasses sit on the idle face, as fractions of the face box.
  const idleAt = { x: (idleGlasses.x + idleGlasses.width / 2 - faceBox.x) / faceBox.width, y: (idleGlasses.y + idleGlasses.height / 2 - faceBox.y) / faceBox.height };
  expect(idleAt.y).toBeGreaterThan(0.3);
  expect(idleAt.y).toBeLessThan(0.7);
  // Nothing is drawn behind the pieces: no box of any colour round the glasses or the head layer.
  for (const part of [head, glasses]) {
    expect(await part.evaluate((element) => getComputedStyle(element).backgroundColor)).toMatch(/^(rgba\(0, 0, 0, 0\)|transparent)$/);
    expect(await part.evaluate((element) => getComputedStyle(element).backgroundImage)).toBe("none");
  }
  // The pose the art gives the cheer frame, which the head layer is to take.
  const art = JSON.parse(readFileSync(new URL("../src/data/animalArt.json", import.meta.url), "utf8")) as Record<string, { pose?: Record<string, { dx: number; dy: number; rotate: number; scale: number }> }>;
  const pose = art.bunny.pose?.cheer ?? null;
  expect(pose, "the bunny's cheer frame has a measured head pose").not.toBeNull();

  // Pop the letter's balloons until the bunny cheers (the round's last one does it).
  const target = (await board.getAttribute("data-target")) ?? "";
  for (let pop = 0; pop < 3; pop += 1) {
    await board.locator(`.pop-balloon[data-letter="${target}"][data-popped="false"]`).first().click();
    if ((await host.getAttribute("data-mood")) === "cheer") break;
  }
  await expect(host).toHaveAttribute("data-mood", "cheer");
  await expect(face).toHaveAttribute("data-frame", "cheer");
  await expect(head).toHaveAttribute("data-pose", "cheer");
  // The head layer has moved to the cheer face's head: the pose, as a transform about the box's corner.
  const width = faceBox.width;
  const height = faceBox.height;
  const turn = (pose!.rotate * Math.PI) / 180;
  const expected = [pose!.scale * Math.cos(turn), pose!.scale * Math.sin(turn), -pose!.scale * Math.sin(turn), pose!.scale * Math.cos(turn), pose!.dx * width, pose!.dy * height];
  await expect
    .poll(async () => matrixOf(await head.evaluate((element) => getComputedStyle(element).transform)), { timeout: 2000 })
    .toEqual(expected.map((value) => expect.closeTo(value, 1)));
  // And so the glasses have moved with it: their middle is where the pose puts the idle middle.
  const moved = (await glasses.boundingBox())!;
  const faceNow = (await face.boundingBox())!;
  const at = { x: (moved.x + moved.width / 2 - faceNow.x) / faceNow.width, y: (moved.y + moved.height / 2 - faceNow.y) / faceNow.height };
  const want = {
    x: pose!.scale * (Math.cos(turn) * idleAt.x - Math.sin(turn) * idleAt.y) + pose!.dx,
    y: pose!.scale * (Math.sin(turn) * idleAt.x + Math.cos(turn) * idleAt.y) + pose!.dy,
  };
  expect(Math.abs(at.x - want.x), `glasses x ${at.x} vs ${want.x}`).toBeLessThan(0.06);
  expect(Math.abs(at.y - want.y), `glasses y ${at.y} vs ${want.y}`).toBeLessThan(0.06);

  // The cheer over, the idle face is back and the glasses are on its eyes again.
  await expect(host).toHaveAttribute("data-mood", "idle", { timeout: 3000 });
  await expect(head).toHaveAttribute("data-pose", "idle");
  await expect.poll(async () => head.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
  const back = (await glasses.boundingBox())!;
  const faceBack = (await face.boundingBox())!;
  expect(Math.abs((back.x + back.width / 2 - faceBack.x) / faceBack.width - idleAt.x)).toBeLessThan(0.02);
  expect(Math.abs((back.y + back.height / 2 - faceBack.y) / faceBack.height - idleAt.y)).toBeLessThan(0.02);
});
