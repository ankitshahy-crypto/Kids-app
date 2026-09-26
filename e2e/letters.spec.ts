import { expect, test, type Page } from "@playwright/test";

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

async function attempts(page: Page): Promise<number> {
  return page.evaluate(() => (window as Window & { __audioAttempts?: Attempt[] }).__audioAttempts?.length ?? 0);
}

test("each letter tile highlights and attempts audio, in any order", async ({ page }) => {
  await install(page);
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  await page.getByRole("button", { name: "Letters" }).click();

  const tiles = page.locator(".letters .tile-wrap");
  await expect(tiles.nth(2)).toBeVisible();
  await expect(tiles.nth(0).locator("button")).toBeEnabled();
  await expect(tiles.nth(1).locator("button")).toBeEnabled();
  await expect(tiles.nth(2).locator("button")).toBeEnabled();

  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();

  for (const index of [1, 2, 0]) {
    const before = await attempts(page);
    await tiles.nth(index).locator("button").click();
    await expect(tiles.nth(index)).toHaveClass(/is-active/);
    await expect.poll(async () => attempts(page)).toBeGreaterThan(before);
  }
});
