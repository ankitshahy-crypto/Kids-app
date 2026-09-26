import { expect, test, type Page } from "@playwright/test";

const WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
};

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

async function installAudioSpies(page: Page) {
  await page.addInitScript((saved) => {
    const target = window as Window & {
      __gains?: GainNode[];
      __speech?: { text: string; volume: number }[];
      webkitAudioContext?: typeof AudioContext;
    };
    target.__gains = [];
    target.__speech = [];
    const Ctor = window.AudioContext ?? target.webkitAudioContext;
    if (Ctor) {
      const original = Ctor.prototype.createGain;
      Ctor.prototype.createGain = function (this: AudioContext) {
        const node = original.call(this);
        target.__gains?.push(node);
        return node;
      };
    }
    const synth = window.SpeechSynthesis?.prototype;
    if (synth && typeof synth.speak === "function") {
      const speak = synth.speak;
      synth.speak = function (this: SpeechSynthesis, utterance: SpeechSynthesisUtterance) {
        target.__speech?.push({ text: utterance.text, volume: utterance.volume });
        return speak.call(this, utterance);
      };
    }
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
  }, profile);
}

async function passParent(page: Page) {
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const prompt = await dialog.getByRole("heading").innerText();
  const sum = prompt.match(/(\d+)\s*\+\s*(\d+)/);
  const answer = sum
    ? Number(sum[1]) + Number(sum[2])
    : WORDS[prompt.match(/number ([a-z]+)/i)?.[1]?.toLowerCase() ?? ""];
  await dialog.locator(".gate-choice", { hasText: new RegExp(`^${answer}$`) }).click();
  await expect(page.locator("[data-screen='parent']")).toBeVisible();
}

async function setRange(page: Page, id: string, value: string) {
  await page.locator(id).evaluate((element, next) => {
    const input = element as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, next);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

test("sliders drive the channel gains, and speech volume follows the browser", async ({ page }, testInfo) => {
  await installAudioSpies(page);
  await page.goto("./");
  await passParent(page);
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: "Settings" }).click();

  const ios = testInfo.project.name === "iphone";
  const note = page.getByText("volume buttons");
  if (ios) await expect(note).toBeVisible();
  else await expect(note).toHaveCount(0);

  await setRange(page, "#volume-voice", "25");
  await setRange(page, "#volume-effects", "70");
  await setRange(page, "#volume-music", "80");
  await expect.poll(async () => {
    const saved = await savedVolumes(page);
    return { voice: saved.voice, effects: saved.effects, music: saved.music };
  }).toEqual({ voice: 0.25, effects: 0.7, music: 0.8 });

  await page.locator("[data-mix='effects']").getByRole("button", { name: "Off" }).click();
  await expect.poll(async () => (await savedVolumes(page)).effectsOn).toBe(false);
  await page.locator("[data-mix='effects']").getByRole("button", { name: "On", exact: true }).click();
  await expect.poll(async () => (await savedVolumes(page)).effectsOn).toBe(true);
  await expect
    .poll(async () => page.evaluate(() => (window as Window & { __wordnestAudio?: { state: string; voice: number; effects: number; music: number } }).__wordnestAudio))
    .toBeTruthy();

  const live = await page.evaluate(() => (window as Window & { __wordnestAudio?: { state: string; voice: number; effects: number; music: number } }).__wordnestAudio);
  if (live && live.state === "running") {
    await expect.poll(async () => page.evaluate(() => (window as Window & { __wordnestAudio?: { effects: number } }).__wordnestAudio?.effects ?? -1)).toBeGreaterThan(0.62);
    const settled = await page.evaluate(() => (window as Window & { __wordnestAudio?: { voice: number; effects: number; music: number } }).__wordnestAudio);
    expect(settled?.voice).toBeGreaterThan(0.2);
    expect(settled?.voice).toBeLessThan(0.3);
    expect(settled?.effects).toBeLessThan(0.78);
    expect(settled?.music).toBeLessThan(0.05);
  }

  await page.getByRole("button", { name: "Preview" }).click();
  const spoken = await page.evaluate(() => (window as Window & { __speech?: { text: string; volume: number }[] }).__speech ?? []);
  const preview = spoken.find((item) => item.text.includes("read together"));
  if (preview) {
    if (ios) expect(preview.volume).toBe(1);
    else expect(preview.volume).toBeCloseTo(0.25, 1);
  }

  await page.evaluate(() => window.speechSynthesis?.cancel());
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Mia" }).click();
  await expect(page.locator("[data-screen='today']")).toBeVisible();
  await expect.poll(async () => page.evaluate(() => (window as Window & { __wordnestAudio?: { state: string; music: number } }).__wordnestAudio)).toMatchObject({ state: expect.any(String) });
  const today = await page.evaluate(() => (window as Window & { __wordnestAudio?: { state: string; music: number } }).__wordnestAudio);
  if (today?.state === "running") {
    const full = Math.abs(today.music - 0.8) < 0.08;
    const ducked = Math.abs(today.music - 0.8 * 0.22) < 0.05;
    expect(full || ducked).toBe(true);
  }
});

async function savedVolumes(page: Page): Promise<{ voice: number; effects: number; music: number; effectsOn: boolean }> {
  return page.evaluate(() => {
    const raw = localStorage.getItem("kids-app-settings-v1");
    const settings = raw ? (JSON.parse(raw) as { voiceVolume: number; effectsVolume: number; musicVolume: number; effects: boolean }) : null;
    return {
      voice: settings?.voiceVolume ?? -1,
      effects: settings?.effectsVolume ?? -1,
      music: settings?.musicVolume ?? -1,
      effectsOn: settings?.effects !== false,
    };
  });
}
