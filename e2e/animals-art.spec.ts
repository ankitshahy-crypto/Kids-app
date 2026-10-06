import { readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";
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
  // the end of it. (Read at set times in the turn, not whenever the test happens to look; the turn
  // starts at a moment of this animal's own, which the animation's delay says.)
  const at = (ms: number) =>
    blink.evaluate((img, ms) => {
      const run = img.getAnimations()[0] as CSSAnimation | undefined;
      if (!run) return "no animation";
      run.pause();
      run.currentTime = ms + Number(run.effect?.getComputedTiming().delay ?? 0);
      return `${run.animationName} ${getComputedStyle(img).opacity}`;
    }, ms);
  expect(await at(0)).toBe("avatar-blink-frame 0");
  expect(await at(2400)).toBe("avatar-blink-frame 0");
  expect(await at(4500)).toBe("avatar-blink-frame 0");
  expect(await at(4720)).toBe("avatar-blink-frame 1");
  expect(await at(0)).toBe("avatar-blink-frame 0");
  await blink.evaluate((img) => img.getAnimations()[0]?.play());
  // The right answer: the cheering face fades in over the idle one, which stays where it is
  // underneath (the same picture element all along) until the fade is done, and the animal pops.
  const cheer = host.locator("img.avatar-over[data-face=cheer]");
  await expect(cheer).toHaveAttribute("src", /\/animals\/penguin\/cheer-face\.webp$/);
  await expect(cheer).toHaveAttribute("data-on", "false");
  await expect.poll(() => cheer.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBe(512);
  expect(await cheer.evaluate((img) => getComputedStyle(img).opacity)).toBe("0");
  await watchCheer(host);
  const need = (await frame.getAttribute("data-need")) ?? "";
  await frame.locator(`.pick[data-give=${need}], .pick[data-pick=${need}]`).first().click();
  await expect.poll(async () => (await cheerSeen(page)).looks).toContain("cheer on:true under:idle-face.webp");
  const seen = await cheerSeen(page);
  expect(seen.looks[0]).toBe("idle on:false under:idle-face.webp");
  // A fade, not a cut: 180 ms long, and halfway through it the cheering face is half there, with
  // the idle face still showing under it.
  expect(seen.fade).toEqual({ ms: 180, halfway: expect.any(Number), under: "visible" });
  expect(seen.fade!.halfway).toBeGreaterThan(0.2);
  expect(seen.fade!.halfway).toBeLessThan(0.9);
  // The pop: the animal itself squashes (wider and shorter), then stretches (narrower and taller),
  // while the jump runs on its body.
  expect(seen.pop).toEqual({ ms: 420, squash: "1.06 0.94", stretch: "0.95 1.06" });
  expect(seen.moves).toEqual(expect.arrayContaining(["game-pop", "game-cheer"]));
  // Fully there: nothing of the idle face or the blink is left under it to show round its edge.
  await expect.poll(() => cheer.evaluate((img) => getComputedStyle(img).opacity)).toBe("1");
  await expect.poll(() => host.evaluate((box) => [...box.querySelectorAll("img.avatar-face, img.avatar-blink")].map((img) => getComputedStyle(img).visibility).join())).toBe("hidden,hidden");
  // And out again: the next round's idle look is the idle face, there at once, with the cheering one fading away.
  await expect(host).toHaveAttribute("data-frame", "idle");
  expect(await host.locator("img.avatar-face").evaluate((img) => getComputedStyle(img).visibility)).toBe("visible");
  await expect.poll(() => cheer.evaluate((img) => getComputedStyle(img).opacity)).toBe("0");
  expect((await cheerSeen(page)).looks.every((look) => !look.includes("another element"))).toBe(true);
  expect(missing).toEqual([]);
});

type CheerSeen = {
  looks: string[];
  moves: string[];
  fade: { ms: number; halfway: number; under: string } | null;
  pop: { ms: number; squash: string; stretch: string } | null;
  moved: string[];
};

/**
 * Has the page note what a cheer does to the animal, as it happens (it lasts a moment): each look;
 * the fade of the cheering face and the pop of the animal, each stopped and read at set times of
 * its own clock (not on whichever frames a slow machine happens to draw) and then let go on; and,
 * frame by frame, whether the animal is ever seen scaled or off its place.
 */
async function watchCheer(host: Locator) {
  await host.evaluate((box) => {
    const seen: CheerSeen = { looks: [], moves: [], fade: null, pop: null, moved: [] };
    (window as Window & { __cheer?: CheerSeen }).__cheer = seen;
    const idle = box.querySelector("img.avatar-face") as HTMLImageElement & { __first?: boolean };
    idle.__first = true;
    const over = box.querySelector("img.avatar-over[data-face=cheer]") as HTMLImageElement;
    const animal = (box.closest(".hero") ?? box) as HTMLElement;
    const body = box.closest(".game-host-body") as HTMLElement;
    const at = (run: Animation, ms: number, read: () => string) => {
      run.pause();
      run.currentTime = ms;
      return read();
    };
    const look = () => {
      const under = box.querySelector("img.avatar-face") as (HTMLImageElement & { __first?: boolean }) | null;
      seen.looks.push(`${box.getAttribute("data-frame")} on:${over.getAttribute("data-on")} under:${under?.getAttribute("src")?.split("/").pop()}${under?.__first ? "" : " (another element)"}`);
      for (const run of box.closest(".game-host")!.getAnimations({ subtree: true })) {
        const name = (run as CSSAnimation).animationName;
        if (name && !seen.moves.includes(name)) seen.moves.push(name);
      }
      if (over.getAttribute("data-on") !== "true") return;
      const fade = over.getAnimations().find((run) => (run as CSSTransition).transitionProperty === "opacity");
      if (fade && !seen.fade) {
        const ms = Number(fade.effect?.getComputedTiming().duration);
        const halfway = Number(at(fade, ms / 2, () => getComputedStyle(over).opacity));
        seen.fade = { ms, halfway, under: getComputedStyle(idle).visibility };
        fade.currentTime = 0;
        fade.play();
      }
      const pop = animal.getAnimations().find((run) => (run as CSSAnimation).animationName === "game-pop");
      if (pop && !seen.pop) {
        const ms = Number(pop.effect?.getComputedTiming().duration);
        // (The squash and the stretch are two of its keyframes: 22% and 55% of the way.)
        const squash = at(pop, ms * 0.22, () => getComputedStyle(animal).scale);
        const stretch = at(pop, ms * 0.55, () => getComputedStyle(animal).scale);
        seen.pop = ms > 1 ? { ms, squash, stretch } : null;
        pop.currentTime = 0;
        pop.play();
      }
    };
    look();
    new MutationObserver(look).observe(box, { attributes: true, childList: true, subtree: true });
    const frame = () => {
      const scale = getComputedStyle(animal).scale;
      const place = new DOMMatrix(getComputedStyle(body).transform);
      if (!["none", "1", "1 1"].includes(scale)) seen.moved.push(`scale ${scale}`);
      if (Math.abs(place.f) > 0.5 || Math.abs(place.b) > 0.01 || Math.abs(place.a - 1) > 0.01) seen.moved.push(`body ${place.toString()}`);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

const cheerSeen = (page: Page) => page.evaluate(() => (window as Window & { __cheer?: CheerSeen }).__cheer!);

for (const still of ["calm mode", "reduced motion"] as const) {
  test(`with ${still} the animal does not blink: its eyes stay open`, async ({ page }) => {
    if (still === "reduced motion") await page.emulateMedia({ reducedMotion: "reduce" });
    else await page.addInitScript(() => localStorage.setItem("littlenest-settings-v1", JSON.stringify({ calm: true })));
    await install(page, profile("penguin"));
    const { frame, host } = await penguinInGame(page);
    await expect(page.locator(".app")).toHaveAttribute("data-calm", "true");
    const blink = host.locator("img.avatar-blink");
    await expect.poll(() => blink.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBe(512);
    // Nothing running on the closed eyes, and they are not left showing.
    await expect.poll(() => blink.evaluate((img) => `${img.getAnimations().filter((run) => run.playState === "running").length} ${getComputedStyle(img).opacity}`)).toBe("0 0");
    await page.waitForTimeout(300);
    expect(await blink.evaluate((img) => `${img.getAnimations().filter((run) => run.playState === "running").length} ${getComputedStyle(img).opacity}`)).toBe("0 0");
    // A right answer: no pop and no jump (the animal is never seen squashed, stretched or off its
    // place), and the cheering face still fades in over the idle one, since a fade is softer than a cut.
    const cheer = host.locator("img.avatar-over[data-face=cheer]");
    await expect.poll(() => cheer.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBe(512);
    await watchCheer(host);
    const need = (await frame.getAttribute("data-need")) ?? "";
    await frame.locator(`.pick[data-give=${need}], .pick[data-pick=${need}]`).first().click();
    await expect.poll(async () => (await cheerSeen(page)).looks).toContain("cheer on:true under:idle-face.webp");
    const seen = await cheerSeen(page);
    expect(seen.fade).toEqual({ ms: 180, halfway: expect.any(Number), under: "visible" });
    expect(seen.fade!.halfway).toBeGreaterThan(0.2);
    expect(seen.fade!.halfway).toBeLessThan(0.9);
    expect(seen.pop).toBeNull();
    // The idle face still goes once the cheering one is fully there (the wait is the fade's time).
    await expect.poll(() => host.locator("img.avatar-face").evaluate((img) => getComputedStyle(img).visibility)).toBe("hidden");
    await expect(host).toHaveAttribute("data-frame", "idle");
    expect((await cheerSeen(page)).moved).toEqual([]);
  });
}

test("two animals on one screen do not blink in step: each starts its turn at a moment of its own", async ({ page }) => {
  await install(page, profile("penguin"));
  const { host } = await penguinInGame(page);
  const blink = host.locator("img.avatar-blink");
  await expect.poll(() => blink.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBe(512);
  // The moment is the animal's own (--blink-at, seconds into the 4.8 s turn), and the blink's
  // animation starts that far in.
  const startOf = async () => {
    const at = Number(await host.evaluate((box) => (box as HTMLElement).style.getPropertyValue("--blink-at")));
    expect(at).toBeGreaterThanOrEqual(0);
    expect(at).toBeLessThan(4.8);
    expect(await blink.evaluate((img) => Number(img.getAnimations()[0]?.effect?.getComputedTiming().delay))).toBeCloseTo(-at * 1000, 0);
    return at;
  };
  const first = await startOf();
  // It keeps that moment through a change of mood (the animal is not made again for a cheer)...
  const frame = page.locator(".game-frame").first();
  const need = (await frame.getAttribute("data-need")) ?? "";
  await frame.locator(`.pick[data-give=${need}], .pick[data-pick=${need}]`).first().click();
  await expect(host).toHaveAttribute("data-frame", "cheer");
  await expect(host).toHaveAttribute("data-frame", "idle");
  expect(await startOf()).toBe(first);
  // ...and another animal has another: the same game opened twice more does not give the same one
  // three times (a moment is one of 480, so two of the three may happen to agree).
  const starts = new Set([first]);
  for (let again = 0; again < 2; again += 1) {
    await install(page, profile("penguin"));
    await penguinInGame(page);
    await expect.poll(() => blink.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBe(512);
    starts.add(await startOf());
  }
  expect(starts.size).toBeGreaterThan(1);
});

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
