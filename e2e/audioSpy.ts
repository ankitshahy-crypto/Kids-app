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
 * Records what the app said: device speech, or a bundled clip at the moment
 * it starts to play (the app announces each one with a "littlenest:clip"
 * event). `spokenLines` turns a clip's file back into its manifest line, so
 * a test can check "orange" whether it was spoken or played from a file.
 *
 * A clip used to be counted when its bytes were read. A lesson card now loads
 * its letter sounds before the slide reaches them, so reading a clip is no
 * longer playing it.
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
    window.addEventListener("littlenest:clip", (event) => {
      const src = String((event as CustomEvent<string>).detail ?? "");
      target.__audioAttempts?.push({ kind: "clip", detail: new URL(src, location.href).href });
    });
    // The moment the page asks for a clip to play is noted too, as a request, for checks on how soon a
    // screen speaks. The offline download and a card loading its sounds ahead fetch at low priority; a
    // clip being played now does not.
    const fetchWas = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.includes("/audio/") && url.endsWith(".mp3") && init?.priority !== "low") {
        target.__audioAttempts?.push({ kind: "request", detail: url });
      }
      return fetchWas(input, init);
    };
  });
}

const sayByFile = new Map<string, string>();
for (const kind of Object.values(manifest)) {
  for (const cue of Object.values(kind)) sayByFile.set(cue.file, cue.say);
}

/**
 * What the page has asked to say so far: a clip it started fetching to play,
 * or a device-voice line. The blank utterance that unlocks iOS speech does
 * not count. Use this for "speaks within N seconds"; `spokenLines` is for what
 * was said, which for a clip waits on its bytes.
 */
export async function requestedCues(page: Page): Promise<string[]> {
  const attempts = await page.evaluate(
    () => (window as Window & { __audioAttempts?: { kind: string; detail: string }[] }).__audioAttempts ?? [],
  );
  return attempts
    .filter((item) => (item.kind === "request" || item.kind === "speech" || item.kind === "clip") && item.detail.trim() !== "")
    .map((item) => (item.kind === "speech" ? item.detail.toLowerCase() : (item.detail.split("/audio/")[1] ?? item.detail)));
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
  return attempts
    .filter((item) => item.kind === "speech" || item.kind === "clip")
    .map((item) => {
      if (item.kind === "speech") return item.detail.toLowerCase();
      const file = item.detail.split("/audio/")[1] ?? item.detail;
      return (sayByFile.get(file) ?? file).toLowerCase();
    });
}
