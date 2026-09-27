import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";

const manifest = JSON.parse(readFileSync(new URL("../src/data/audioManifest.json", import.meta.url), "utf8")) as Record<
  string,
  Record<string, { file: string; say: string }>
>;

/**
 * Records what the app tried to say: device speech, a bundled clip played
 * through Web Audio (fetched from /audio/), or a clip played by an <audio>
 * element. `spokenLines` turns a clip's file back into its manifest line, so
 * a test can check "orange" whether it was spoken or played from a file.
 */
export async function installAudioSpy(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const target = window as Window & { __audioAttempts?: { kind: string; detail: string }[] };
    target.__audioAttempts = [];
    const synth = window.SpeechSynthesis?.prototype;
    if (synth && typeof synth.speak === "function") {
      const speak = synth.speak;
      synth.speak = function (this: SpeechSynthesis, utterance: SpeechSynthesisUtterance) {
        target.__audioAttempts?.push({ kind: "speech", detail: utterance.text });
        return speak.call(this, utterance);
      };
    }
    const play = HTMLAudioElement.prototype.play;
    HTMLAudioElement.prototype.play = function (this: HTMLAudioElement) {
      target.__audioAttempts?.push({ kind: "clip", detail: this.currentSrc || this.src || "" });
      return play.apply(this);
    };
    const fetchWas = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.includes("/audio/") && url.endsWith(".mp3")) target.__audioAttempts?.push({ kind: "clip", detail: url });
      return fetchWas(input, init);
    };
  });
}

const sayByFile = new Map<string, string>();
for (const kind of Object.values(manifest)) {
  for (const cue of Object.values(kind)) sayByFile.set(cue.file, cue.say);
}

/** Lines the app said or played, lowercased: the utterance text, or the clip's manifest line. */
export async function spokenLines(page: Page): Promise<string[]> {
  const attempts = await page.evaluate(
    () => (window as Window & { __audioAttempts?: { kind: string; detail: string }[] }).__audioAttempts ?? [],
  );
  return attempts.map((item) => {
    if (item.kind === "speech") return item.detail.toLowerCase();
    const file = item.detail.split("/audio/")[1] ?? item.detail;
    return (sayByFile.get(file) ?? file).toLowerCase();
  });
}
