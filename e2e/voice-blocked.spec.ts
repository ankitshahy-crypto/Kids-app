import { expect, test, type Page } from "@playwright/test";
import { deviceSpeech, installAudioSpy, playedClips } from "./audioSpy";
import { createdThisWeek } from "./clock";
import { game, openGame, openTimeMoney } from "./kit";

/**
 * An iPhone where the audio context is blocked when a round's question is due. On the phone the
 * question starts from the page, not from a tap, so it cannot resume the context itself; the clip
 * used to give up at once and the phone's own voice read the line, and only after the speaker was
 * tapped (a real tap) did the recorded voice come.
 *
 * Two shapes of blocked, both as WKWebView has them:
 *  - "context": the context says "suspended" and refuses to resume, but a media element may play
 *    (the app's WebView lets media start without a tap). The clip plays at once, through the element.
 *  - "all": the element refuses too, until a tap lands inside the game. The clip waits, and plays on
 *    that tap; the phone's voice is not used while the clip exists.
 */
test.use({ viewport: { width: 390, height: 844 } });

const profile = {
  activeId: "mia",
  profiles: [{ id: "mia", name: "Mia", ageRange: "4", animal: "fox", createdAt: createdThisWeek(), stars: 0, days: {} }],
};

type Blocked = "context" | "all";

async function blockAudio(page: Page, blocked: Blocked) {
  await page.addInitScript((blocked: Blocked) => {
    const target = window as Window & { __audioLocked?: boolean };
    target.__audioLocked = true;
    const proto = (window.BaseAudioContext ?? window.AudioContext).prototype as AudioContext;
    const state = Object.getOwnPropertyDescriptor(proto, "state");
    if (state?.get) {
      const real = state.get;
      Object.defineProperty(proto, "state", {
        configurable: true,
        get(this: AudioContext) {
          return target.__audioLocked ? "suspended" : real.call(this);
        },
      });
    }
    const resume = proto.resume;
    proto.resume = function (this: AudioContext) {
      if (target.__audioLocked) return Promise.reject(new DOMException("not allowed", "NotAllowedError"));
      return resume.call(this).then(() => {
        this.dispatchEvent(new Event("statechange"));
      });
    };
    if (blocked === "all") {
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
        if (target.__audioLocked) return Promise.reject(new DOMException("not allowed", "NotAllowedError"));
        return play.call(this);
      };
    }
    // The tap that unblocks: any tap once the game is on the page (the tap that opened it does not count).
    window.addEventListener(
      "click",
      () => {
        if (document.querySelector(".game-frame")) target.__audioLocked = false;
      },
      true,
    );
  }, blocked);
}

async function openScienceGame(page: Page, id: string, blocked: Blocked) {
  await installAudioSpy(page);
  await blockAudio(page, blocked);
  await page.addInitScript((saved) => {
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.setItem("littlenest-silent-hint-v1", "1");
    localStorage.setItem("littlenest-settings-v1", JSON.stringify({ showTips: false }));
  }, profile);
  await page.goto("./");
  await page.getByRole("button", { name: "Mia" }).click();
  await page.locator("[data-course=science]").click();
  await page.locator(`[data-science=menu] [data-activity=${id}]`).click();
  const frame = game(page, id);
  await expect(frame).toBeVisible();
  return frame;
}

async function openCoins(page: Page, blocked: Blocked) {
  await installAudioSpy(page);
  await blockAudio(page, blocked);
  await openTimeMoney(page, { tips: false });
  return openGame(page, "coins");
}

const QUESTION: Record<string, RegExp> = {
  homes: /^prompts\/science-home-/,
  body: /^prompts\/science-find-/,
  coins: /^prompts\/coins-find\.mp3$/,
};

const fallbacksOf = (page: Page) => {
  const seen: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "warning" && /fell back to the phone's voice/.test(message.text())) seen.push(message.text());
  });
  return seen;
};

for (const id of ["homes", "body", "coins"]) {
  test(`${id}: with the context blocked, the question's clip plays at once through a media element, not the phone's voice`, async ({ page }) => {
    const fallbacks = fallbacksOf(page);
    await (id === "coins" ? openCoins(page, "context") : openScienceGame(page, id, "context"));
    await expect.poll(() => playedClips(page), { timeout: 4000 }).toEqual(expect.arrayContaining([expect.stringMatching(QUESTION[id])]));
    expect(await deviceSpeech(page), "the phone's voice was not used").toEqual([]);
    expect(fallbacks, "no fallback was taken").toEqual([]);
  });

  test(`${id}: with everything blocked, the clip waits and plays on the next tap, never the phone's voice`, async ({ page }) => {
    const fallbacks = fallbacksOf(page);
    const frame = id === "coins" ? await openCoins(page, "all") : await openScienceGame(page, id, "all");
    // The question is due, everything is blocked: nothing from the phone's voice, and the clip waits.
    await page.waitForTimeout(2500);
    expect(await deviceSpeech(page), "the phone's voice was not used").toEqual([]);
    expect((await playedClips(page)).filter((clip) => QUESTION[id].test(clip)), "the question's clip has not started yet").toEqual([]);
    expect(fallbacks, "no fallback was taken").toEqual([]);
    // A tap on the title, which is nothing to the game, resumes the context: the clip plays now.
    await frame.locator(".game-top h1").click();
    await expect.poll(() => playedClips(page), { timeout: 4000 }).toEqual(expect.arrayContaining([expect.stringMatching(QUESTION[id])]));
    expect(await deviceSpeech(page)).toEqual([]);
    expect(fallbacks).toEqual([]);
    // The speaker still says the question again, at once, as a clip.
    const before = (await playedClips(page)).length;
    await frame.locator("[data-hear]").click();
    await expect.poll(() => playedClips(page).then((clips) => clips.slice(before).filter((clip) => QUESTION[id].test(clip)).length), { timeout: 4000 }).toBeGreaterThan(0);
    expect(await deviceSpeech(page)).toEqual([]);
    expect(fallbacks).toEqual([]);
  });
}
