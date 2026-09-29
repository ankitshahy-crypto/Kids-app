import { expect, test, type Page } from "@playwright/test";
import { answerGate } from "./gate";
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
    await page.screenshot({ path: "test-results/screenshots/offline-lesson-iphone.png", animations: "disabled" });
  }

  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator("[data-screen=today]")).toBeVisible();
  await page.getByRole("button", { name: "My Nest" }).click();
  await expect(page.locator("[data-screen=nest]")).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Switch child" }).click({ delay: 1600 });
  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  await answerGate(page, true);
  await page.getByRole("button", { name: /Offline/ }).click();
  const offline = page.locator("[data-section=offline]");
  await expect(offline.getByText("Ready for offline")).toBeVisible();
  await expect(offline.getByText("iPhone Safari")).toBeVisible();
  await expect(offline.getByText("Android")).toBeVisible();
  await expect(offline.getByText("iPhone voices usually work offline")).toBeVisible();
  if (testInfo.project.name === "iphone") {
    await offline.screenshot({ path: "test-results/screenshots/offline-ready-iphone.png", animations: "disabled" });
  }
});
