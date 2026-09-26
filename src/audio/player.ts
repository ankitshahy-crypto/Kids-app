import { recordedSrc, spokenLine } from "../data/audioCatalog";
import type { DeckWord, LetterTile } from "../data/deck";
import { beginVoice, endVoice, playOnBus, unlockAudio } from "./manager";
import { deviceSpeechFollowsSlider } from "./platform";
import { pickVoice } from "./voices";
import { SPEECH_RATES, type Settings } from "../settings";

/** 1.0 keeps the device voice at a natural pitch. */
const NATURAL_PITCH = 1;

export const PREVIEW_PHRASE = "Hi. Let's read together.";

const SILENT_BEAT_MS = 720;

/**
 * iOS only allows speech after a user gesture. Call this synchronously inside
 * the tap handler that starts the app. A single space is effectively silent
 * and unlocks later playback for the rest of the WebView session.
 */
export function primeSpeech(): void {
  try {
    unlockAudio();
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.resume();
    const utterance = new SpeechSynthesisUtterance(" ");
    utterance.volume = 1;
    utterance.rate = 1;
    utterance.lang = "en-US";
    synth.speak(utterance);
  } catch {
    // A browser can throw if speech is unavailable. The activity still starts.
  }
}

export function resumeSpeech(): void {
  window.speechSynthesis?.resume();
}

export function cancelSpeech(): void {
  window.speechSynthesis?.cancel();
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function abortError(): DOMException {
  return new DOMException("aborted", "AbortError");
}

export function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError());
      return;
    }
    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(abortError());
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function loadVoices(synth: SpeechSynthesis, signal: AbortSignal): Promise<SpeechSynthesisVoice[]> {
  const ready = synth.getVoices();
  if (ready.length > 0 || signal.aborted) return Promise.resolve(ready);
  return new Promise((resolve) => {
    const finish = () => {
      window.clearTimeout(timer);
      synth.removeEventListener("voiceschanged", finish);
      resolve(synth.getVoices());
    };
    const timer = window.setTimeout(finish, 400);
    synth.addEventListener("voiceschanged", finish);
    signal.addEventListener("abort", finish, { once: true });
  });
}

function speechVolume(settings: Settings): number {
  if (!deviceSpeechFollowsSlider()) return 1;
  const level = settings.voiceVolume;
  if (!Number.isFinite(level)) return 1;
  return Math.min(1, Math.max(0, level));
}

function speak(text: string, settings: Settings, signal: AbortSignal): Promise<void> {
  const synth = window.speechSynthesis;
  if (!synth || !text.trim()) return sleep(SILENT_BEAT_MS, signal);

  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError());
      return;
    }

    let settled = false;
    let timer = 0;

    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      if (signal.aborted || isAbortError(error)) {
        reject(abortError());
        return;
      }
      resolve();
    };

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = SPEECH_RATES[settings.speed];
    utterance.pitch = NATURAL_PITCH;
    utterance.volume = speechVolume(settings);
    utterance.lang = "en-US";
    utterance.onend = () => finish();
    utterance.onerror = () => finish();

    const onAbort = () => {
      synth.cancel();
      finish(abortError());
    };
    signal.addEventListener("abort", onAbort);

    const backupMs = Math.min(9000, (800 + text.length * 420) / utterance.rate);
    timer = window.setTimeout(() => {
      synth.cancel();
      finish();
    }, backupMs);

    const start = () => {
      if (settled) return;
      try {
        const voice = pickVoice(synth.getVoices(), settings.voiceURI);
        if (voice) utterance.voice = voice;
      } catch {
        // A voice list entry the engine rejects should not stop the lesson.
      }
      try {
        synth.resume();
        synth.speak(utterance);
      } catch {
        finish();
      }
    };

    void loadVoices(synth, signal).then(() => {
      if (settled) return;
      if (synth.speaking) {
        synth.cancel();
        window.setTimeout(start, 60);
      } else {
        start();
      }
    });
  });
}

let previewGeneration = 0;
let previewDucked = false;

function releasePreviewDuck(generation: number): void {
  if (generation !== previewGeneration || !previewDucked) return;
  previewDucked = false;
  endVoice();
}

/** Hear the chosen device voice. Works even when lesson voice is off. */
export function previewVoice(settings: Settings): void {
  const synth = window.speechSynthesis;
  if (!synth) return;
  unlockAudio();
  const generation = ++previewGeneration;
  if (previewDucked) {
    previewDucked = false;
    endVoice();
  }
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(PREVIEW_PHRASE);
  utterance.rate = SPEECH_RATES[settings.speed];
  utterance.pitch = NATURAL_PITCH;
  utterance.volume = speechVolume(settings);
  utterance.lang = "en-US";
  try {
    const voice = pickVoice(synth.getVoices(), settings.voiceURI);
    if (voice) utterance.voice = voice;
  } catch {
    // Preview still speaks with the engine default if the chosen voice is rejected.
  }
  const close = () => releasePreviewDuck(generation);
  utterance.onend = close;
  utterance.onerror = close;
  previewDucked = true;
  beginVoice();
  try {
    synth.resume();
    synth.speak(utterance);
  } catch {
    close();
  }
}

function playFile(src: string, signal: AbortSignal): Promise<void> {
  return playOnBus(src, "voice", signal);
}

/**
 * Prefer a recorded file when one is passed. Otherwise use device speech.
 * A parent recording, stored only on the device, uses the same `src` path.
 */
async function playCue(
  cue: { src?: string; text: string },
  settings: Settings,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted) throw abortError();
  if (!settings.voice) {
    await sleep(SILENT_BEAT_MS, signal);
    return;
  }
  beginVoice();
  try {
    if (cue.src) {
      try {
        await playFile(cue.src, signal);
        return;
      } catch (error) {
        if (isAbortError(error) || signal.aborted) throw abortError();
      }
    }
    await speak(cue.text, settings, signal);
  } finally {
    endVoice();
  }
}

export function playLetter(
  letter: LetterTile,
  settings: Settings,
  signal: AbortSignal,
): Promise<void> {
  return playCue(
    {
      src: letter.audioSrc ?? recordedSrc("letters", letter.phoneme),
      text: spokenLine("letters", letter.phoneme, letter.char),
    },
    settings,
    signal,
  );
}

export function playWord(word: DeckWord, settings: Settings, signal: AbortSignal): Promise<void> {
  return playCue(
    {
      src: word.audioSrc ?? recordedSrc("words", word.id),
      text: spokenLine("words", word.id, word.word),
    },
    settings,
    signal,
  );
}

export function playSentence(id: string, settings: Settings, signal: AbortSignal): Promise<void> {
  return playCue(
    {
      src: recordedSrc("sentences", id),
      text: spokenLine("sentences", id, ""),
    },
    settings,
    signal,
  );
}
