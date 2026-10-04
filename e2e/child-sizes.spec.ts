import { expect, test, type Page } from "@playwright/test";
import { createdThisWeek } from "./clock";
import { showWordCard } from "./lesson";

/**
 * From the design review of every screen: the main action looked switched off (pale peach), a
 * child's own labels were 12-13px, and the bird's eye and beak were too small for a finger.
 */

const ACTION = "rgb(90, 124, 96)";

async function open(page: Page, size: { width: number; height: number }) {
  await page.setViewportSize(size);
  await page.addInitScript((created) => {
    if (sessionStorage.getItem("sizes-seeded")) return;
    sessionStorage.setItem("sizes-seeded", "1");
    const mia = { id: "mia", name: "Mia", ageRange: "4", animal: "fox", createdAt: created, stars: 0, days: {} };
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify({ activeId: "mia", profiles: [mia] }));
    localStorage.setItem("kids-app-silent-hint-v1", "1");
    localStorage.setItem("littlenest-settings-v1", JSON.stringify({ showTips: false, showCode: true }));
  }, createdThisWeek());
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
}

/** Every bit of a child's own text on screen under 16px. (The Grown-ups button is for a grown-up.) */
async function smallText(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const found = new Set<string>();
    for (const element of document.querySelectorAll(".app.mode-kid *")) {
      if (element.closest(".grownups-launch, .grownup-tip, [aria-hidden=true]")) continue;
      if (element.getBoundingClientRect().width === 0) continue;
      const text = [...element.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent?.trim() ?? "")
        .join(" ")
        .trim();
      if (text.length < 2) continue;
      const size = parseFloat(getComputedStyle(element).fontSize);
      if (size < 16) found.add(`${size}px "${text.slice(0, 30)}"`);
    }
    return [...found];
  });
}

async function expectPrimary(page: Page, name: string | RegExp) {
  const button = page.getByRole("button", { name, exact: typeof name === "string" }).first();
  await expect(button).toHaveCSS("background-color", ACTION);
  await expect(button).toHaveCSS("color", "rgb(255, 253, 251)");
  const size = await button.evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(size).toBeGreaterThanOrEqual(18);
}

for (const size of [
  { width: 390, height: 844 },
  { width: 820, height: 1180 },
  { width: 1180, height: 820 },
]) {
  const where = `${size.width}x${size.height}`;

  test(`${where}: a child's own text is 16px or more on the path, a section page and Coding`, async ({ page }) => {
    await open(page, size);
    expect(await smallText(page), "path").toEqual([]);
    // The tiles show the section's name only; "LittleNest" stays in the name a screen reader says.
    await expect(page.locator(".course-brand")).toHaveCount(0);
    await expect(page.locator("[data-course=math]")).toHaveAttribute("aria-label", "LittleNest Numbers");
    await page.locator("[data-course=math]").click();
    expect(await smallText(page), "Numbers").toEqual([]);
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page.locator("[data-course=code]").click();
    // The section's code loads on first use; read it once it is drawn.
    await expect(page.locator("[data-code-section]").first()).toBeVisible();
    expect(await smallText(page), "Coding").toEqual([]);
  });

  test(`${where}: the main action is solid green with white type, and pale only when it is off`, async ({ page }) => {
    await open(page, size);
    await page.getByRole("button", { name: "Letters" }).click();
    await showWordCard(page, 2);
    await expectPrimary(page, /Play sound/i);
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page.getByRole("button", { name: "Story" }).click();
    await expectPrimary(page, "Read");
    await page.getByRole("button", { name: "Read", exact: true }).click();
    await expectPrimary(page, /Read it/i);
  });
}

test("the coding Play is pale until there is a block to play, then green", async ({ page }) => {
  await open(page, { width: 390, height: 844 });
  await page.locator("[data-course=code]").click();
  await page.getByRole("button", { name: "Say hello" }).click();
  const board = page.locator("[data-build=hello]");
  const play = board.locator("[data-play=run]");
  await expect(play).toBeDisabled();
  await expect(play).not.toHaveCSS("background-color", ACTION);
  await board.locator("[data-block=hello]").click();
  await expect(play).toHaveCSS("background-color", ACTION);
  const block = await board.locator(".build-name").first().evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(block).toBeGreaterThanOrEqual(16);
});

test("the bird's eye and beak are big enough for a finger on a phone", async ({ page }) => {
  await open(page, { width: 390, height: 844 });
  await page.locator("[data-course=science]").click();
  await page.locator("[data-science=menu] [data-activity=body]").click();
  for (const part of ["eye", "beak"]) {
    const box = (await page.locator(`.body-part[data-part=${part}]`).boundingBox())!;
    expect(Math.min(box.width, box.height), part).toBeGreaterThanOrEqual(60);
  }
  // A tap on the middle of each still lands on that part.
  for (const part of ["eye", "beak"]) {
    const hit = await page.locator(`.body-part[data-part=${part}]`).evaluate((element) => {
      const visible = element.querySelector("circle:last-child, path") ?? element;
      const box = visible.getBoundingClientRect();
      return document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)?.closest("[data-part]")?.getAttribute("data-part");
    });
    expect(hit).toBe(part);
  }
});

test("in Add, each thing in the groups is big enough to tap, and both groups fit the scene", async ({ page }) => {
  for (const age of ["4", "6-7"]) {
    await page.evaluate(() => sessionStorage.clear()).catch(() => {});
    await open(page, { width: 390, height: 844 });
    if (age !== "4") {
      await page.evaluate(() => {
        const store = JSON.parse(localStorage.getItem("kids-app-profiles-v1") ?? "{}");
        store.profiles[0].ageRange = "6-7";
        localStorage.setItem("kids-app-profiles-v1", JSON.stringify(store));
      });
      await page.reload();
      await page.getByRole("button", { name: "Mia" }).click();
    }
    await page.locator("[data-course=math]").click();
    await page.getByRole("button", { name: "Add the groups" }).click();
    const scene = (await page.locator(".game-scene").boundingBox())!;
    for (const thing of await page.locator(".add-row .count-thing").all()) {
      const box = (await thing.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(60);
      expect(box.x).toBeGreaterThanOrEqual(scene.x);
      expect(box.x + box.width).toBeLessThanOrEqual(scene.x + scene.width);
      expect(box.y + box.height).toBeLessThanOrEqual(scene.y + scene.height);
    }
    await page.getByRole("button", { name: "Back", exact: true }).click();
  }
});
