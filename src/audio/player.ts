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
let primedText = "";
let primedAt = 0;

/**
 * Call synchronously inside a tap. A non-empty utterance unlocks iOS speech
 * for the rest of the session. Pass the first lesson line so that tap is
 * also the sound the child hears.
 */
export function primeSpeech(cue?: string): void {
  try {
    unlockAudio();
    const synth = window.speechSynthesis;
    if (!synth) return;
    const spoken = cue?.trim() ?? "";
    if (spoken) {
      primedText = spoken;
      primedAt = Date.now();
    }
    synth.resume();
    const utterance = new SpeechSynthesisUtterance(spoken || "\u00a0");
    utterance.volume = 1;
    utterance.rate = 1;
    utterance.lang = "en-US";
    synth.speak(utterance);
  } catch {
    // A browser can throw if speech is unavailable. The activity still starts.
  }
}

/** True when this exact line was just spoken from a tap. */
export function consumePrimedSpeech(text: string): boolean {
  const spoken = text.trim();
  if (!primedText || primedText !== spoken || Date.now() - primedAt > 5000) return false;
  primedText = "";
  return true;
}

export function hasFreshPrimedSpeech(): boolean {
  return primedText !== "" && Date.now() - primedAt < 5000;
}

export function resumeSpeech(): void {
  window.speechSynthesis?.resume();
}

let speechGeneration = 0;

export function cancelSpeech(): void {
  speechGeneration += 1;
  primedText = "";
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

function speechVolume(settings: Settings): number {
  if (!deviceSpeechFollowsSlider()) return 1;
  const level = settings.voiceVolume;
  if (!Number.isFinite(level)) return 1;
  return Math.min(1, Math.max(0, level));
}

function speak(text: string, settings: Settings, signal: AbortSignal): Promise<void> {
  const synth = window.speechSynthesis;
  if (!synth || !text.trim()) return sleep(SILENT_BEAT_MS, signal);
  if (signal.aborted) return Promise.reject(abortError());

  // Speak in this turn, before any await. iOS drops speech that starts from
  // a timer unless an earlier tap already unlocked the synthesizer.
  const generation = ++speechGeneration;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = SPEECH_RATES[settings.speed];
  utterance.pitch = NATURAL_PITCH;
  utterance.volume = speechVolume(settings);
  utterance.lang = "en-US";
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
    return sleep(SILENT_BEAT_MS, signal);
  }

  return new Promise((resolve, reject) => {
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

    utterance.onend = () => finish();
    utterance.onerror = () => finish();

    const onAbort = () => {
      if (generation === speechGeneration) synth.cancel();
      finish(abortError());
    };
    signal.addEventListener("abort", onAbort);

    const backupMs = Math.min(9000, (800 + text.length * 420) / utterance.rate);
    timer = window.setTimeout(() => {
      // Only cancel this utterance. A newer speak() has its own generation.
      if (generation === speechGeneration) synth.cancel();
      finish();
    }, backupMs);
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
    if (consumePrimedSpeech(cue.text)) {
      // The tap that opened the lesson already spoke this line.
      await sleep(1200, signal);
      return;
    }
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

/** Speak with the device voice only. Nothing is fetched and nothing leaves the device. */
export function playOnDevice(text: string, settings: Settings, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(abortError());
  if (!settings.voice || !text.trim()) return sleep(SILENT_BEAT_MS, signal);
  beginVoice();
  return speak(text, settings, signal).finally(() => endVoice());
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

export function playNumber(value: number, settings: Settings, signal: AbortSignal): Promise<void> {
  const id = String(value);
  return playCue(
    {
      src: recordedSrc("numbers", id),
      text: spokenLine("numbers", id, id),
    },
    settings,
    signal,
  );
}

export function playColor(name: string, settings: Settings, signal: AbortSignal): Promise<void> {
  const id = name.trim().toLowerCase().replace(/\s+/g, "-");
  return playCue(
    {
      src: recordedSrc("colors", id),
      text: spokenLine("colors", id, name),
    },
    settings,
    signal,
  );
}

export function playPrompt(id: string, settings: Settings, signal: AbortSignal, fallback = ""): Promise<void> {
  return playCue(
    {
      src: recordedSrc("prompts", id),
      text: spokenLine("prompts", id, fallback),
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
