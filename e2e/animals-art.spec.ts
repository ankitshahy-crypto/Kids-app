import { expect, test, type Page } from "@playwright/test";
import { createdThisWeek } from "./clock";
import { passGate } from "./gate";

const profile = (animal: string, outfit: Record<string, string> = {}) => ({
  activeId: "mia",
  profiles: [{ id: "mia", name: "Mia", ageRange: "6-7", animal, createdAt: createdThisWeek(), stars: 5, days: {}, outfit, unlocked: Object.values(outfit) }],
});

async function install(page: Page, saved: unknown) {
  await page.addInitScript(
    ({ saved }) => {
      localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
      localStorage.removeItem("kids-app-silent-hint-v1");
      localStorage.setItem("littlenest-quick-rounds", "1");
    },
    { saved },
  );
  await page.goto("./");
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
}

/** The painted faces the page asked for that did not come back. */
function watchArt(page: Page): string[] {
  const missing: string[] = [];
  page.on("response", (response) => {
    if (response.url().includes("/animals/") && !response.ok()) missing.push(`${response.status()} ${response.url()}`);
  });
  return missing;
}

test("the child's animal is the painted face: on the home screen, dressed up, and in a story", async ({ page }) => {
  const missing = watchArt(page);
  await install(page, profile("fox", { hat: "hat-leaf", glasses: "glasses-round" }));
  await page.getByRole("button", { name: "Mia" }).click();
  const hero = page.locator("[data-screen=today] .hero").first();
  const face = hero.locator(".avatar-art.avatar-painted");
  await expect(face).toHaveAttribute("data-frame", "idle");
  await expect(face.locator("img").first()).toHaveAttribute("src", /\/animals\/fox\/idle-face\.webp$/);
  // The picture is there (not a broken image): it has a size once loaded.
  await expect.poll(() => face.locator("img").first().evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBe(512);
  // The outfit pieces sit on the head: the hat over the top of the face, the glasses across its middle.
  const box = (await face.boundingBox())!;
  const hat = (await hero.locator(".wear-hat").boundingBox())!;
  const glasses = (await hero.locator(".wear-glasses").boundingBox())!;
  expect(hat.y).toBeLessThan(box.y + box.height * 0.3);
  expect(glasses.y).toBeGreaterThan(box.y + box.height * 0.3);
  expect(glasses.y + glasses.height).toBeLessThan(box.y + box.height * 0.7);
  // The pieces are painted pictures too, placed on the face.
  await expect(hero.locator(".wear-hat")).toHaveAttribute("src", /\/wardrobe\/hat-leaf\.webp$/);
  await expect(hero.locator(".wear-glasses")).toHaveAttribute("src", /\/wardrobe\/glasses-round\.webp$/);
  for (const piece of [".wear-hat", ".wear-glasses"]) {
    await expect.poll(() => hero.locator(piece).evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(100);
  }
  await page.getByRole("button", { name: "Story" }).click();
  await expect(page.locator(".story-scene .hero .avatar-painted img").first()).toHaveAttribute("src", /\/animals\/fox\/idle-face\.webp$/);
  expect(missing).toEqual([]);
});

test("the sky colour turns the animal itself blue, with its own filter, and the dot scarf sits at the chin", async ({ page }, testInfo) => {
  const missing = watchArt(page);
  await install(page, profile("bear", { color: "color-sky", scarf: "scarf-dots" }));
  await page.getByRole("button", { name: "Mia" }).click();
  const hero = page.locator("[data-screen=today] .hero").first();
  await expect(hero).toHaveAttribute("data-color", "color-sky");
  const filter = await hero.locator(".avatar-painted img").first().evaluate((img) => getComputedStyle(img).filter);
  expect(filter).toMatch(/hue-rotate|sepia/);
  // The picture's blue shows: the fur, drawn through the same filter and sampled, is bluer than it
  // is red. (Chromium only: a canvas does not take a filter in WebKit; the page's own render does.)
  const face = hero.locator(".avatar-painted img").first();
  await expect.poll(() => face.evaluate((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth)).toBe(512);
  if (testInfo.project.name === "chromium") {
    const [red, blue] = await face.evaluate((el) => {
      const img = el as HTMLImageElement;
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      ctx.filter = getComputedStyle(img).filter;
      ctx.drawImage(img, 0, 0, 64, 64);
      const fur = ctx.getImageData(18, 20, 6, 6).data;
      let r = 0;
      let b = 0;
      for (let i = 0; i < fur.length; i += 4) {
        r += fur[i];
        b += fur[i + 2];
      }
      return [r, b];
    });
    expect(blue).toBeGreaterThan(red);
  }
  // The scarf's band and knot sit across the bottom of the face, nothing hanging under its cut edge.
  const box = (await hero.locator(".avatar-painted").boundingBox())!;
  const scarf = (await hero.locator(".wear-scarf").boundingBox())!;
  expect(scarf.y).toBeGreaterThan(box.y + box.height * 0.55);
  expect(scarf.y + scarf.height).toBeLessThan(box.y + box.height * 1.02);
  expect(missing).toEqual([]);
});

test("every animal on the picker is painted, and each one's face is a different picture", async ({ page }) => {
  const missing = watchArt(page);
  await page.addInitScript(() => localStorage.removeItem("kids-app-profiles-v1"));
  await page.goto("./");
  await page.getByRole("button", { name: "Add a child" }).click();
  await passGate(page);
  const faces = page.locator(".animal-pick .avatar-painted img");
  await expect(faces).toHaveCount(12);
  const sources = await faces.evaluateAll((imgs) => imgs.map((img) => (img as HTMLImageElement).src));
  expect(new Set(sources).size).toBe(12);
  for (const src of sources) expect(src).toMatch(/\/animals\/[a-z]+\/idle-face\.webp$/);
  await expect.poll(() => faces.evaluateAll((imgs) => imgs.every((img) => (img as HTMLImageElement).naturalWidth === 512))).toBe(true);
  expect(missing).toEqual([]);
});

test("a mood with no frame of its own shows the idle face, and the mood still shows in the box", async ({ page }) => {
  const missing = watchArt(page);
  await install(page, profile("bear"));
  await page.getByRole("button", { name: "Mia" }).click();
  await page.locator("[data-course=science]").click();
  await page.locator("[data-science=menu] [data-activity]").first().click();
  const host = page.locator(".game-frame .game-host .avatar-painted").first();
  await expect(host).toHaveAttribute("data-mood", "idle");
  await expect(host).toHaveAttribute("data-frame", "idle");
  // A wrong tap: the coach's puzzled look. The bear has no think frame yet, so the idle face stays
  // (the tilt is on the box), and nothing is asked for that is not there.
  const frame = page.locator(".game-frame").first();
  const need = (await frame.getAttribute("data-need")) ?? "";
  const other = frame.locator(`.pick[data-give]:not([data-give=${need}]), .pick[data-pick]:not([data-pick=${need}])`).first();
  await other.click();
  await expect(host).toHaveAttribute("data-mood", "think");
  await expect(host).toHaveAttribute("data-frame", "idle");
  expect(missing).toEqual([]);
});
