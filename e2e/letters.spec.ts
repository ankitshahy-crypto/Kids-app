import { expect, test, type Locator, type Page } from "@playwright/test";
import { pinnedReading } from "./pinLesson";

const profile = {
  activeId: "mia",
  profiles: [
    {
      id: "mia",
      name: "Mia",
      ageRange: "4",
      animal: "fox",
      createdAt: "2026-09-01T15:00:00.000Z",
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
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved.profile));
    localStorage.setItem("littlenest-placement-v1", JSON.stringify(saved.placed));
    localStorage.removeItem("kids-app-silent-hint-v1");
  }, { profile, placed: pinnedReading });
}

async function playCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const list = (window as Window & { __audioAttempts?: Attempt[] }).__audioAttempts ?? [];
    return list.filter((item) => item.kind === "speech" || item.kind === "element" || item.kind === "buffer").length;
  });
}

async function dragAcross(page: Page, track: Locator) {
  const box = await track.boundingBox();
  if (!box) throw new Error("The blend track has no box");
  const y = box.y + box.height / 2;
  const start = box.x + 8;
  const end = box.x + box.width - 4;
  await page.mouse.move(start, y);
  await page.mouse.down();
  await page.mouse.move(end, y, { steps: 48 });
  await page.mouse.up();
}

test("dragging the track lights each letter in order and plays the word", async ({ page }) => {
  await install(page);
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "Letters" }).click();

  const tiles = page.locator(".letters .tile-wrap");
  const track = page.locator(".blend-track");
  await expect(page.locator(".activity")).toHaveAttribute("data-word", "cat");
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
