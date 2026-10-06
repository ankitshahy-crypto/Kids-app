import { readFileSync } from "node:fs";
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
  await install(page, profile("fox", { hat: "hat-leaf", glasses: "glasses-round", scarf: "scarf-stripe" }));
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
  await expect(hero.locator(".wear-scarf")).toHaveAttribute("src", /\/wardrobe\/scarf-stripe\.webp$/);
  for (const piece of [".wear-hat", ".wear-glasses", ".wear-scarf"]) {
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

/** Into a science game as the penguin; the frame, and the animal's painted face in it. */
async function penguinInGame(page: Page) {
  await page.getByRole("button", { name: "Mia" }).click();
  await page.locator("[data-course=science]").click();
  await page.locator("[data-science=menu] [data-activity]").first().click();
  const frame = page.locator(".game-frame").first();
  return { frame, host: frame.locator(".game-host .avatar-painted").first() };
}

test("in a game the animal blinks, and a right answer shows its cheering face", async ({ page }) => {
  const missing = watchArt(page);
  await install(page, profile("penguin"));
  const { frame, host } = await penguinInGame(page);
  await expect(host).toHaveAttribute("data-frame", "idle");
  const blink = host.locator("img.avatar-blink");
  await expect(blink).toHaveAttribute("src", /\/animals\/penguin\/blink-face\.webp$/);
  await expect.poll(() => blink.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBe(512);
  // The blink picture is the closed eyes and nothing else: most of it is see-through, its corners
  // and its middle column (between the eyes) too, so over the idle face only the eyes change.
  const eyes = await blink.evaluate((img) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img as HTMLImageElement, 0, 0, 512, 512);
    const alpha = (x: number, y: number) => ctx.getImageData(x, y, 1, 1).data[3];
    const all = ctx.getImageData(0, 0, 512, 512).data;
    let drawn = 0;
    let left = 0;
    for (let i = 3; i < all.length; i += 4) {
      if (all[i] <= 8) continue;
      drawn += 1;
      if (((i - 3) / 4) % 512 < 256) left += 1;
    }
    return { share: drawn / (512 * 512), left: left / Math.max(1, drawn), corners: [alpha(4, 4), alpha(507, 4), alpha(4, 507), alpha(507, 507)], chin: alpha(256, 470) };
  });
  expect(eyes.share).toBeGreaterThan(0.01);
  expect(eyes.share).toBeLessThan(0.2);
  // Two eyes: about half of it each side of the middle.
  expect(eyes.left).toBeGreaterThan(0.3);
  expect(eyes.left).toBeLessThan(0.7);
  expect(eyes.corners).toEqual([0, 0, 0, 0]);
  expect(eyes.chin).toBe(0);
  // It shows by an animation of its own: see-through for most of each turn, there for a moment at
  // the end of it. (Read at set times in the turn, not whenever the test happens to look.)
  const at = (ms: number) =>
    blink.evaluate((img, ms) => {
      const run = img.getAnimations()[0] as CSSAnimation | undefined;
      if (!run) return "no animation";
      run.pause();
      run.currentTime = ms;
      return `${run.animationName} ${getComputedStyle(img).opacity}`;
    }, ms);
  expect(await at(0)).toBe("avatar-blink-frame 0");
  expect(await at(2400)).toBe("avatar-blink-frame 0");
  expect(await at(4500)).toBe("avatar-blink-frame 0");
  expect(await at(4720)).toBe("avatar-blink-frame 1");
  expect(await at(0)).toBe("avatar-blink-frame 0");
  // The right answer: the cheering face (its own picture), and no blink over it. The cheer lasts a
  // moment, so the page notes each face it shows.
  await host.evaluate((box) => {
    const seen: string[] = [];
    (window as Window & { __faces?: string[] }).__faces = seen;
    const note = () => seen.push(`${box.getAttribute("data-frame")} ${box.querySelector("img")?.getAttribute("src")?.split("/").pop()} blink:${box.querySelectorAll("img.avatar-blink").length}`);
    note();
    new MutationObserver(note).observe(box, { attributes: true, childList: true, subtree: true });
  });
  const need = (await frame.getAttribute("data-need")) ?? "";
  await frame.locator(`.pick[data-give=${need}], .pick[data-pick=${need}]`).first().click();
  const faces = () => page.evaluate(() => (window as Window & { __faces?: string[] }).__faces ?? []);
  await expect.poll(faces).toContain("cheer cheer-face.webp blink:0");
  expect((await faces())[0]).toBe("idle idle-face.webp blink:1");
  expect(missing).toEqual([]);
});

for (const still of ["calm mode", "reduced motion"] as const) {
  test(`with ${still} the animal does not blink: its eyes stay open`, async ({ page }) => {
    if (still === "reduced motion") await page.emulateMedia({ reducedMotion: "reduce" });
    else await page.addInitScript(() => localStorage.setItem("littlenest-settings-v1", JSON.stringify({ calm: true })));
    await install(page, profile("penguin"));
    const { host } = await penguinInGame(page);
    await expect(page.locator(".app")).toHaveAttribute("data-calm", "true");
    const blink = host.locator("img.avatar-blink");
    await expect.poll(() => blink.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBe(512);
    // Nothing running on the closed eyes, and they are not left showing.
    await expect.poll(() => blink.evaluate((img) => `${img.getAnimations().filter((run) => run.playState === "running").length} ${getComputedStyle(img).opacity}`)).toBe("0 0");
    await page.waitForTimeout(300);
    expect(await blink.evaluate((img) => `${img.getAnimations().filter((run) => run.playState === "running").length} ${getComputedStyle(img).opacity}`)).toBe("0 0");
  });
}

test("every animal has a cheering face and a blink, the size of its idle face", async ({ page }) => {
  // The list the app itself goes by (made with the pictures, by scripts/animal-art.py).
  const art = JSON.parse(readFileSync(new URL("../src/data/animalArt.json", import.meta.url), "utf8")) as Record<string, { frames: string[] }>;
  const animals = Object.entries(art);
  expect(animals).toHaveLength(12);
  for (const [animal, entry] of animals) expect(entry.frames, animal).toEqual(expect.arrayContaining(["idle", "cheer", "blink"]));
  await page.goto("./");
  const sizes = await page.evaluate(
    async ({ base, names }) => {
      const load = (src: string) =>
        new Promise<number>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img.naturalWidth === img.naturalHeight ? img.naturalWidth : -1);
          img.onerror = () => resolve(0);
          img.src = src;
        });
      const out: Record<string, number> = {};
      for (const name of names) out[name] = await load(`${base}animals/${name}-face.webp`);
      return out;
    },
    { base: new URL("./", page.url()).pathname, names: animals.flatMap(([animal, entry]) => entry.frames.map((frame) => `${animal}/${frame}`)) },
  );
  for (const [name, size] of Object.entries(sizes)) expect(size, name).toBe(512);
});
