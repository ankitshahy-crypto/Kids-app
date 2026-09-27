import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";

const manifest = JSON.parse(readFileSync(new URL("../src/data/audioManifest.json", import.meta.url), "utf8")) as Record<
  string,
  Record<string, { file: string; say: string }>
>;
const available = JSON.parse(readFileSync(new URL("../src/data/audioAvailable.json", import.meta.url), "utf8")) as { files: string[] };

/** True when this clip (letters/m.mp3) is bundled with the app. */
export function clipShipped(file: string): boolean {
  return available.files.includes(file);
}

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
    // A clip counts when its bytes are read to play, not when the offline
    // download caches it in the background.
    const fetchWas = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const response = await fetchWas(input, init);
      if (url.includes("/audio/") && url.endsWith(".mp3")) {
        const read = response.arrayBuffer.bind(response);
        response.arrayBuffer = () => {
          target.__audioAttempts?.push({ kind: "clip", detail: url });
          return read();
        };
      }
      return response;
    };
  });
}

const sayByFile = new Map<string, string>();
for (const kind of Object.values(manifest)) {
  for (const cue of Object.values(kind)) sayByFile.set(cue.file, cue.say);
}

/** Clip files the app played, in order (letters/m.mp3), leaving out device speech. */
export async function playedClips(page: Page): Promise<string[]> {
  const attempts = await page.evaluate(
    () => (window as Window & { __audioAttempts?: { kind: string; detail: string }[] }).__audioAttempts ?? [],
  );
  return attempts.filter((item) => item.kind === "clip").map((item) => item.detail.split("/audio/")[1] ?? item.detail);
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
