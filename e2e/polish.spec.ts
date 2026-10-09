import { expect, test, type Locator, type Page } from "@playwright/test";
import { answerGate } from "./gate";
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
      ladder: { step: 1, successes: 0 },
    },
  ],
};

/** Week 0 of the letter plan: m and a. Big M is the first letter to trace. */
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
}

async function passGate(page: Page) {
  await answerGate(page, true);
}

async function dragAcross(page: Page, track: Locator) {
  const box = await track.boundingBox();
  if (!box) throw new Error("track has no box");
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 8, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 4, y, { steps: 40 });
  await page.mouse.up();
}

test("Save child is a real button in the Grown-ups menu, and the row names the age", async ({ page }) => {
  await install(page);
  await page.getByRole("button", { name: /grown-ups/i }).click();
  await passGate(page);
  await page.getByRole("button", { name: /Child profiles/ }).click();
  await expect(page.getByRole("heading", { name: "Child profiles" })).toBeVisible();
  await expect(page.locator(".child-meta").first()).toHaveText("Age 4 · on this device now");
  await expect(page.locator(".child-meta").first()).not.toContainText("Mia");

  await page.getByRole("button", { name: "Add another child" }).click();
  const save = page.getByRole("button", { name: "Save child" });
  await expect(save).toBeVisible();
  const style = await save.evaluate((element) => {
    const computed = getComputedStyle(element);
    return { minHeight: parseFloat(computed.minHeight), radius: parseFloat(computed.borderRadius), background: computed.backgroundColor };
  });
  expect(style.minHeight).toBeGreaterThanOrEqual(44);
  expect(style.radius).toBeGreaterThanOrEqual(10);
  expect(style.background).toBe("rgb(47, 74, 60)");
  for (const name of ["Edit", "Remove"]) {
    const button = page.getByRole("button", { name, exact: true }).first();
    const height = await button.evaluate((element) => parseFloat(getComputedStyle(element).minHeight));
    expect(height, name).toBeGreaterThanOrEqual(44);
  }
});

test("leaving a lesson with Back clears its grown-up tip", async ({ page }) => {
  await install(page);
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "Draw" }).click();
  await expect(page.locator("[data-tip]")).toHaveCount(1);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator("[data-screen=today]")).toBeVisible();
  await expect(page.locator("[data-tip]")).toHaveCount(0);
});

test("the week's letters stay clear of the Grown-ups button on a phone, however Today is scrolled", async ({ page }) => {
  // The phone pass of build 5: "This week: M and A" slid under the floating Grown-ups button as Today
  // scrolled. The label keeps to the left, out of the button's column, as the top row does.
  await page.setViewportSize({ width: 390, height: 763 });
  await install(page);
  await page.getByRole("button", { name: "Mia" }).click();
  const label = page.locator("[data-week-focus]");
  await expect(label).toHaveText("This week: M and A");
  const launch = page.getByRole("button", { name: "Grown-ups", exact: true });
  const button = await launch.boundingBox();
  const today = page.locator("[data-screen=today]");
  const overlaps = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) =>
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  for (const scroll of [0, 20, 40, 60, 80, 100, 140]) {
    await today.evaluate((element, top) => {
      element.scrollTop = top;
    }, scroll);
    await page.waitForTimeout(80);
    const box = await label.boundingBox();
    expect(box, `at scroll ${scroll}`).not.toBeNull();
    // Beside the button's column, never under it.
    expect(box!.x + box!.width, `at scroll ${scroll}, right edge`).toBeLessThanOrEqual(button!.x - 4);
    expect(overlaps(box!, button!), `at scroll ${scroll}`).toBe(false);
    // And what is drawn at its middle is the label, while it is on the screen.
    if (box!.y >= 0 && box!.y + box!.height <= 763) {
      const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("[data-week-focus]") !== null, { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 });
      expect(hit, `at scroll ${scroll}, the label is what a tap would reach`).toBe(true);
    }
  }
});

test("stroke numbers on Big M do not overlap: each one is clear of the others and of the start dots", async ({ page }) => {
  // The phone pass of build 5: the 1 and the 2 sat on each other at the top of M (both strokes start
  // at the same corner). The 2 is beside its start dot now, left of the letter. Measured as drawn,
  // not by the numbers' own coordinates: a digit has width and height.
  await install(page);
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "Draw" }).click();
  await expect(page.getByRole("heading", { name: /Big M/ })).toBeVisible();
  const numbers = page.locator(".trace-glyph .stroke-number");
  await expect(numbers).toHaveCount(4);
  const boxes = await numbers.evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect();
      return { x: box.left, y: box.top, w: box.width, h: box.height };
    }),
  );
  const apart = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }, margin: number) =>
    a.x + a.w + margin <= b.x || b.x + b.w + margin <= a.x || a.y + a.h + margin <= b.y || b.y + b.h + margin <= a.y;
  for (let a = 0; a < boxes.length; a += 1) {
    expect(boxes[a].w, `number ${a + 1} is drawn`).toBeGreaterThan(0);
    for (let b = a + 1; b < boxes.length; b += 1) {
      expect(apart(boxes[a], boxes[b], 4), `numbers ${a + 1} and ${b + 1} are apart`).toBe(true);
    }
  }
  // And none sits on a start dot: in the drawing's own units, a digit's middle keeps its half-height
  // and more from every dot's edge.
  const spots = await numbers.evaluateAll((elements) => elements.map((element) => ({ x: Number(element.getAttribute("x")), y: Number(element.getAttribute("y")) })));
  const dots = await page.locator(".trace-glyph .stroke-start").evaluateAll((elements) =>
    elements.map((element) => ({ x: Number(element.getAttribute("cx")), y: Number(element.getAttribute("cy")), r: Number(element.getAttribute("r")) })),
  );
  for (const [a, spot] of spots.entries()) {
    for (const [at, dot] of dots.entries()) {
      expect(Math.hypot(spot.x - dot.x, spot.y - dot.y), `number ${a + 1} is clear of start dot ${at + 1}`).toBeGreaterThanOrEqual(dot.r + 3);
    }
  }
  // The strokes themselves are as they were: M is four strokes from its two top corners.
  await expect(page.locator(".trace-glyph .stroke-guide")).toHaveCount(4);
  const starts = await page.locator(".trace-glyph .stroke-start").evaluateAll((elements) => elements.map((element) => `${element.getAttribute("cx")},${element.getAttribute("cy")}`));
  expect(starts).toEqual(["22,18", "22,18", "50,84", "78,18"]);
});

test("the bar starts under the first tile, whole on the screen and on the track", async ({ page }) => {
  await install(page);
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "Letters" }).click();
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  const track = page.locator(".blend-track");
  await expect(track).toBeVisible();
  const trackBox = await track.boundingBox();
  const bar = page.locator("[data-blend-token]");
  const tileBox = await page.locator(".letters .tile-wrap").first().boundingBox();
  // Not cut off by the screen's edge or the track's: its whole width is inside both, under the first tile.
  await expect.poll(async () => {
    const box = await bar.boundingBox();
    return box ? [box.x >= 0, box.x >= trackBox!.x - 1, box.x + box.width <= trackBox!.x + trackBox!.width + 1, Math.abs(box.x - tileBox!.x) <= 3, Math.abs(box.width - tileBox!.width) <= 3] : [];
  }).toEqual([true, true, true, true, true]);
  // The animal waits at the edge of the track, whole on the screen.
  const animalBox = await page.locator(".blend-animal").boundingBox();
  expect(animalBox!.x).toBeGreaterThanOrEqual(0);
  expect(animalBox!.x).toBeLessThan(trackBox!.x + trackBox!.width / 4);
});

test("after blending, the bar is under the whole word and the animal has come in, on the track", async ({ page }) => {
  await install(page);
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "Letters" }).click();
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  const track = page.locator(".blend-track");
  await dragAcross(page, track);
  await expect(page.locator(".activity")).toHaveAttribute("data-blended", "true");
  await expect(page.locator("[data-blend-token]")).toHaveAttribute("data-under", "word");
  await expect(page.locator(".blend-animal")).toHaveAttribute("data-word-teller", "said");
  const trackBox = await track.boundingBox();
  const barBox = await page.locator("[data-blend-token]").boundingBox();
  const animalBox = await page.locator(".blend-animal").boundingBox();
  expect(barBox!.x + barBox!.width).toBeLessThanOrEqual(trackBox!.x + trackBox!.width + 1);
  expect(barBox!.x).toBeGreaterThanOrEqual(trackBox!.x - 1);
  expect(animalBox!.x).toBeGreaterThanOrEqual(trackBox!.x - 1);
  expect(animalBox!.x + animalBox!.width).toBeLessThanOrEqual(trackBox!.x + trackBox!.width + 1);
});
