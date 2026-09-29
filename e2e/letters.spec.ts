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
      stars: 1,
      days: {},
      ladder: { step: 3, successes: 0 },
    },
  ],
};

type Attempt = { kind: string; detail: string };

async function install(page: Page) {
  await page.addInitScript((saved) => {
    const target = window as Window & {
      __audioAttempts?: Attempt[];
      webkitAudioContext?: typeof AudioContext;
    };
    target.__audioAttempts = [];
    const push = (kind: string, detail: string) => {
      target.__audioAttempts?.push({ kind, detail });
    };
    const Ctor = window.AudioContext ?? target.webkitAudioContext;
    if (Ctor) {
      const resume = Ctor.prototype.resume;
      Ctor.prototype.resume = function (this: AudioContext) {
        push("context", "resume");
        return resume.apply(this);
      };
      const createBufferSource = Ctor.prototype.createBufferSource;
      Ctor.prototype.createBufferSource = function (this: AudioContext) {
        const node = createBufferSource.apply(this);
        const start = node.start.bind(node);
        node.start = ((...args: Parameters<AudioBufferSourceNode["start"]>) => {
          push("buffer", "start");
          return start(...args);
        }) as AudioBufferSourceNode["start"];
        return node;
      };
    }
    const play = HTMLAudioElement.prototype.play;
    HTMLAudioElement.prototype.play = function (this: HTMLAudioElement) {
      push("element", this.currentSrc || this.src || "");
      return play.apply(this);
    };
    const synth = window.SpeechSynthesis?.prototype;
    if (synth && typeof synth.speak === "function") {
      const speak = synth.speak;
      synth.speak = function (this: SpeechSynthesis, utterance: SpeechSynthesisUtterance) {
        push("speech", utterance.text);
        return speak.call(this, utterance);
      };
    }
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.removeItem("kids-app-silent-hint-v1");
  }, profile);
}

async function playCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const list = (window as Window & { __audioAttempts?: Attempt[] }).__audioAttempts ?? [];
    return list.filter((item) => item.kind === "speech" || item.kind === "element" || item.kind === "buffer").length;
  });
}

/**
 * A child's drag: about a second from one end to the other. Each letter's
 * sound starts when the finger reaches it, and the next letter's stops it,
 * so a drag faster than a clip can load would skip letters (as it would on a
 * phone). A near-instant drag made the letter count here depend on how fast
 * the machine fetched the clips.
 */
async function dragAcross(page: Page, track: Locator) {
  const box = await track.boundingBox();
  if (!box) throw new Error("The blend track has no box");
  const y = box.y + box.height / 2;
  const start = box.x + 8;
  const end = box.x + box.width - 4;
  const steps = 40;
  await page.mouse.move(start, y);
  await page.mouse.down();
  for (let step = 1; step <= steps; step += 1) {
    await page.mouse.move(start + ((end - start) * step) / steps, y);
    await page.waitForTimeout(25);
  }
  await page.mouse.up();
}

test("dragging the track lights each letter in order and plays the word", async ({ page }) => {
  await install(page);
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "Letters" }).click();

  const tiles = page.locator(".letters .tile-wrap");
  const track = page.locator(".blend-track");
  await expect(track).toBeVisible();
  await expect(tiles.nth(2)).toBeVisible();
  await expect(tiles.nth(0)).toHaveAttribute("data-lit", "false");
  await expect(tiles.nth(0).locator("button")).toBeDisabled();

  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();

  const count = await tiles.count();
  const order = Array.from({ length: count }, (_, index) => index).join(",");
  const before = await playCount(page);
  await dragAcross(page, track);

  await expect(page.locator(".blend")).toHaveAttribute("data-lit-order", order);
  for (let index = 0; index < count; index += 1) {
    await expect(tiles.nth(index)).toHaveAttribute("data-lit", "true");
  }
  await expect(page.locator(".activity")).toHaveAttribute("data-blended", "true");
  await expect.poll(async () => playCount(page)).toBeGreaterThanOrEqual(before + count + 1);

  const afterLetters = await playCount(page);
  await tiles.nth(0).locator("button").click();
  await expect.poll(async () => playCount(page)).toBeGreaterThan(afterLetters);
});

/** The translateX a tile currently has, in px, from its computed transform matrix. */
async function shiftOf(tile: Locator): Promise<number> {
  return tile.evaluate((element) => {
    const transform = getComputedStyle(element).transform;
    if (!transform || transform === "none") return 0;
    const parts = transform.match(/matrix\(([^)]+)\)/)?.[1].split(",").map(Number) ?? [];
    return parts[4] ?? 0;
  });
}

test("blending slides the tiles together as the word plays, by transform alone, and a new drag lets them apart", async ({ page }) => {
  await install(page);
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "Letters" }).click();
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();

  const blend = page.locator(".blend");
  const tiles = page.locator(".letters .tile-wrap");
  const track = page.locator(".blend-track");
  await expect(tiles.nth(2)).toBeVisible();
  const count = await tiles.count();
  await expect(blend).toHaveAttribute("data-joined", "false");
  const layoutBefore = await tiles.evaluateAll((elements) => elements.map((element) => (element as HTMLElement).offsetLeft));
  const gap = (await tiles.nth(1).boundingBox())!.x - ((await tiles.nth(0).boundingBox())!.x + (await tiles.nth(0).boundingBox())!.width);
  expect(gap).toBeGreaterThan(4);

  await dragAcross(page, track);
  await expect(page.locator(".activity")).toHaveAttribute("data-blended", "true");
  await expect(blend).toHaveAttribute("data-joined", "true");
  // The outer tiles move toward the middle by their share of the gaps, until the tiles touch.
  await expect.poll(() => shiftOf(tiles.nth(0))).toBeGreaterThan(gap * (count - 1) / 2 - 1);
  await expect.poll(() => shiftOf(tiles.nth(count - 1))).toBeLessThan(-(gap * (count - 1) / 2) + 1);
  const first = await tiles.nth(0).boundingBox();
  const second = await tiles.nth(1).boundingBox();
  expect(Math.abs(second!.x - (first!.x + first!.width))).toBeLessThan(2);
  // Transform only: nothing in the row was laid out again.
  const layoutAfter = await tiles.evaluateAll((elements) => elements.map((element) => (element as HTMLElement).offsetLeft));
  expect(layoutAfter).toEqual(layoutBefore);

  // Tapping a letter still sounds it, with the word left joined.
  const before = await playCount(page);
  await tiles.nth(0).locator("button").click();
  await expect.poll(() => playCount(page)).toBeGreaterThan(before);
  await expect(blend).toHaveAttribute("data-joined", "true");

  // A new pass along the track starts from separate sounds again.
  const box = (await track.boundingBox())!;
  await page.mouse.move(box.x + 8, box.y + box.height / 2);
  await page.mouse.down();
  await expect(blend).toHaveAttribute("data-joined", "false");
  await expect.poll(() => shiftOf(tiles.nth(0))).toBeLessThan(1);
  await page.mouse.up();
});
