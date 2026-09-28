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
const SILENT_LETTER_MS = 320;

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

/** The last instruction, word, or letter spoken, so "Hear again" can say it as often as a child likes. */
let lastCue: { src?: string; text: string } | null = null;
let lastCueAt = 0;
let replayController: AbortController | null = null;

export function hasLastCue(): boolean {
  return lastCue !== null;
}

function remember(cue: { src?: string; text: string }): void {
  lastCue = cue;
  lastCueAt = Date.now();
}

/**
 * Forget a line spoken before `since`, for example by the screen that just
 * closed. A line the new screen has already spoken is kept.
 */
export function clearLastCue(since = Number.POSITIVE_INFINITY): void {
  if (lastCueAt >= since) return;
  lastCue = null;
  replayController?.abort();
  replayController = null;
}

/** Say the last line again. Nothing happens when nothing has been said yet. */
export function replayLastCue(settings: Settings): Promise<void> {
  if (!lastCue) return Promise.resolve();
  replayController?.abort();
  const controller = new AbortController();
  replayController = controller;
  return playCue(lastCue, settings, controller.signal, { remember: false }).catch(() => undefined);
}

/**
 * Prefer a recorded file when one is passed. Otherwise use device speech.
 * A parent recording, stored only on the device, uses the same `src` path.
 */
async function playCue(
  cue: { src?: string; text: string },
  settings: Settings,
  signal: AbortSignal,
  options: { remember?: boolean } = {},
): Promise<void> {
  if (signal.aborted) throw abortError();
  if (options.remember !== false) remember(cue);
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
  // The silent e of cake: a short beat while its tile lights, and no sound.
  if (letter.silent) return sleep(SILENT_LETTER_MS, signal);
  return playCue(
    letter.say
      ? { src: letter.sayId ? recordedSrc("letters", letter.sayId) : undefined, text: letter.say }
      : {
          src: letter.audioSrc ?? recordedSrc("letters", letter.phoneme),
          text: spokenLine("letters", letter.phoneme, letter.char),
        },
    settings,
    signal,
  );
}

/**
 * The letter's sound on its own ("mmm"), for sounding out a word. Without a
 * sound clip on the device it says the example phrase instead, since a device
 * voice cannot say a bare sound.
 */
export function playLetterSound(letter: LetterTile, settings: Settings, signal: AbortSignal): Promise<void> {
  if (letter.silent) return sleep(SILENT_LETTER_MS, signal);
  const src = recordedSrc("sounds", letter.phoneme);
  if (!src) return playLetter(letter, settings, signal);
  return playCue({ src, text: letter.say ?? spokenLine("letters", letter.phoneme, letter.char) }, settings, signal);
}

/**
 * One tile of a card: a whole word inside a sentence, the phrase on a letter
 * card ("m, as in moon"), or the bare sound while a word is sounded out.
 */
export function playTile(card: DeckWord, letter: LetterTile, settings: Settings, signal: AbortSignal): Promise<void> {
  if (letter.wordId) return playWordId(letter.wordId, letter.char, settings, signal);
  return card.letterCard ? playLetter(letter, settings, signal) : playLetterSound(letter, settings, signal);
}

/** The whole card: its sentence, its word, or a letter card's example word ("moon"). */
export function playWhole(card: DeckWord, settings: Settings, signal: AbortSignal): Promise<void> {
  if (card.sentenceId) return playSentence(card.sentenceId, settings, signal);
  if (card.letterCard) {
    const example = card.word.trim();
    return playWordId(example.toLowerCase().replace(/\s+/g, "-"), example, settings, signal);
  }
  return playWord(card, settings, signal);
}

/** Speak with the device voice only. Nothing is fetched and nothing leaves the device. */
export function playOnDevice(text: string, settings: Settings, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(abortError());
  if (text.trim()) remember({ text });
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

/** A word from the manifest, used when a sentence tile is a whole word. */
export function playWordId(id: string, fallback: string, settings: Settings, signal: AbortSignal): Promise<void> {
  return playCue(
    {
      src: recordedSrc("words", id),
      text: spokenLine("words", id, fallback),
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

/** A story page, read by the bundled narrator when the line is recorded, else the device voice. */
export function playStoryLine(id: string, text: string, settings: Settings, signal: AbortSignal): Promise<void> {
  return playCue(
    {
      src: recordedSrc("stories", id),
      text,
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
