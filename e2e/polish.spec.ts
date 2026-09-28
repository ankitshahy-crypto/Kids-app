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

test("stroke numbers on Big M do not overlap", async ({ page }) => {
  await install(page);
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "Draw" }).click();
  await expect(page.getByRole("heading", { name: /Big M/ })).toBeVisible();
  const numbers = page.locator(".trace-glyph .stroke-number");
  await expect(numbers).toHaveCount(4);
  const spots = await numbers.evaluateAll((elements) =>
    elements.map((element) => ({ x: Number(element.getAttribute("x")), y: Number(element.getAttribute("y")) })),
  );
  for (let a = 0; a < spots.length; a += 1) {
    for (let b = a + 1; b < spots.length; b += 1) {
      const gap = Math.hypot(spots[a].x - spots[b].x, spots[a].y - spots[b].y);
      expect(gap, `numbers ${a + 1} and ${b + 1}`).toBeGreaterThanOrEqual(8);
    }
  }
});

test("the hero stays on the track after blending", async ({ page }) => {
  await install(page);
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "Letters" }).click();
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  const track = page.locator(".blend-track");
  await dragAcross(page, track);
  await expect(page.locator(".activity")).toHaveAttribute("data-blended", "true");
  const trackBox = await track.boundingBox();
  const tokenBox = await page.locator("[data-blend-token]").boundingBox();
  expect(trackBox).toBeTruthy();
  expect(tokenBox).toBeTruthy();
  expect(tokenBox!.x + tokenBox!.width).toBeLessThanOrEqual(trackBox!.x + trackBox!.width + 1);
  expect(tokenBox!.x).toBeGreaterThanOrEqual(trackBox!.x - 1);
});
