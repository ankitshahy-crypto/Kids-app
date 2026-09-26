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
    const target = window as Window & { __audioAttempts?: Attempt[]; webkitAudioContext?: typeof AudioContext };
    target.__audioAttempts = [];
    const push = (kind: string, detail: string) => {
      target.__audioAttempts?.push({ kind, detail });
    };
    const Ctor = window.AudioContext ?? target.webkitAudioContext;
    if (Ctor) {
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

test("a lesson still plays after the connection drops", async ({ page }, testInfo) => {
  test.setTimeout(90000);
  await install(page);
  await page.goto("./");
  await expect(page.locator("html")).toHaveAttribute("data-offline", "ready", { timeout: 30000 });

  await page.context().setOffline(true);
  try {
    await page.reload();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Playwright WebKit throws after an offline service-worker navigation that did finish.
    if (!message.includes("WebKit encountered an internal error")) throw error;
  }
  await expect(page.getByRole("button", { name: "Mia" })).toBeVisible();
  await page.getByRole("button", { name: "Mia" }).click();
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
  await page.getByRole("button", { name: "Letters" }).click();
  await expect(page.locator(".blend-track")).toBeVisible();
  await expect.poll(() => playCount(page)).toBeGreaterThan(0);
  if (testInfo.project.name === "iphone") {
    await page.screenshot({ path: "/opt/cursor/artifacts/offline-lesson-iphone.png", animations: "disabled" });
  }

  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator("[data-screen=today]")).toBeVisible();
  await page.getByRole("button", { name: "Play library" }).click();
  await expect(page.locator("[data-screen=library]")).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Switch child" }).click();
  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const prompt = await dialog.getByRole("heading").innerText();
  const sum = prompt.match(/(\d+)\s*\+\s*(\d+)/);
  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
  const expected = sum
    ? Number(sum[1]) + Number(sum[2])
    : words[prompt.match(/number ([a-z]+)/i)?.[1]?.toLowerCase() ?? ""];
  const choices = dialog.locator(".gate-choice");
  const count = await choices.count();
  for (let index = 0; index < count; index += 1) {
    if (Number(await choices.nth(index).innerText()) === expected) {
      await choices.nth(index).click();
      break;
    }
  }
  await page.getByRole("button", { name: /Offline/ }).click();
  const offline = page.locator("[data-section=offline]");
  await expect(offline.getByText("Ready for offline")).toBeVisible();
  await expect(offline.getByText("iPhone Safari")).toBeVisible();
  await expect(offline.getByText("Android")).toBeVisible();
  await expect(offline.getByText("iPhone voices usually work offline")).toBeVisible();
  if (testInfo.project.name === "iphone") {
    await offline.screenshot({ path: "/opt/cursor/artifacts/offline-ready-iphone.png", animations: "disabled" });
  }
});
