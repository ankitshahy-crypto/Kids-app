import { recordedSrc, spokenLine } from "../data/audioCatalog";
import type { DeckWord, LetterTile } from "../data/deck";
import { letterName } from "../data/letterNames";
import { beginVoice, endVoice, playOnBus, unlockAudio, warmClips } from "./manager";
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

function speak(text: string, settings: Settings, signal: AbortSignal, follow?: ReadAlong): Promise<void> {
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
    if (follow) {
      utterance.onstart = () => tell(follow, { kind: "speech", rate: utterance.rate });
      utterance.onboundary = (event) => {
        if (event.name === "word" || event.name === undefined) tell(follow, { kind: "word", charIndex: event.charIndex });
      };
    }

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

function playFile(src: string, signal: AbortSignal, follow?: ReadAlong): Promise<void> {
  return playOnBus(src, "voice", signal, follow ? (durationMs) => tell(follow, { kind: "clip", durationMs }) : undefined);
}

/** One thing to say: a recorded clip when the device has it, else the line for the device voice. */
export type Cue = { src?: string; text: string };

/**
 * What a read-along needs to follow a line: a clip started (and how long it
 * is), the device voice started (and how fast it reads), or the device voice
 * reached a word (its first letter's place in the line).
 */
export type ReadAlongEvent =
  | { kind: "clip"; durationMs: number }
  | { kind: "speech"; rate: number }
  | { kind: "word"; charIndex: number };
export type ReadAlong = (event: ReadAlongEvent) => void;

function tell(follow: ReadAlong | undefined, event: ReadAlongEvent): void {
  if (!follow) return;
  try {
    follow(event);
  } catch {
    // A read-along handler must not interrupt the voice.
  }
}

/** A short pause between the parts of one line ("Tap the color you hear." ... "orange"). */
const BETWEEN_CUES_MS = 350;

/** The last instruction, word, or letter spoken, so "Hear again" can say it as often as a child likes. */
let lastCue: Cue[] | null = null;
let lastCueAt = 0;
let replayController: AbortController | null = null;

export function hasLastCue(): boolean {
  return lastCue !== null;
}

function remember(cues: Cue[]): void {
  lastCue = cues;
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
  return playCues(lastCue, settings, controller.signal, { remember: false }).catch(() => undefined);
}

/**
 * Prefer a recorded file when one is passed. Otherwise use device speech.
 * A parent recording, stored only on the device, uses the same `src` path.
 */
async function playOne(cue: Cue, settings: Settings, signal: AbortSignal, follow?: ReadAlong): Promise<void> {
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
        await playFile(cue.src, signal, follow);
        return;
      } catch (error) {
        if (isAbortError(error) || signal.aborted) throw abortError();
      }
    }
    await speak(cue.text, settings, signal, follow);
  } finally {
    endVoice();
  }
}

/**
 * One voice at a time. A new line stops the one still being said, so an
 * opening instruction and a tapped answer, or "Hear again", never talk over
 * each other. The caller's own signal still stops its line as before.
 */
let lineController: AbortController | null = null;

function takeVoice(signal: AbortSignal): AbortSignal {
  lineController?.abort();
  const controller = new AbortController();
  lineController = controller;
  if (signal.aborted) controller.abort();
  else signal.addEventListener("abort", () => controller.abort(), { once: true });
  return controller.signal;
}

/**
 * A line has been asked for. Nothing in the app listens: this is how the end-to-end tests count
 * what a screen asked to say. (What was heard is announced as each clip starts, in the manager;
 * a line asked for and cut off by the next before its clip could start is still a line asked for.)
 */
function announceLine(cues: Cue[]): void {
  try {
    window.dispatchEvent(new CustomEvent("littlenest:line", { detail: cues.map((cue) => cue.text) }));
  } catch {
    // No window, or no CustomEvent: nothing to tell.
  }
}

/**
 * Say each part in turn, with a beat between, and remember the whole line for "Hear again".
 * `onCue` is told which part is being said, as each one starts (a game can light what it is about:
 * Hatch the Egg lights each letter of the word as its sound is said).
 */
async function playCues(
  cues: Cue[],
  settings: Settings,
  signal: AbortSignal,
  options: { remember?: boolean; follow?: ReadAlong; onCue?: (index: number) => void } = {},
): Promise<void> {
  if (signal.aborted) throw abortError();
  if (cues.length === 0) return;
  announceLine(cues);
  if (options.remember !== false) remember(cues);
  const voice = takeVoice(signal);
  for (let index = 0; index < cues.length; index += 1) {
    if (index > 0) await sleep(BETWEEN_CUES_MS, voice);
    if (voice.aborted) throw abortError();
    options.onCue?.(index);
    await playOne(cues[index], settings, voice, options.follow);
  }
}

function playCue(cue: Cue, settings: Settings, signal: AbortSignal, options: { remember?: boolean; follow?: ReadAlong } = {}): Promise<void> {
  return playCues([cue], settings, signal, options);
}

/**
 * An instruction and what it is about, as one line: "Tap the color you hear."
 * then "orange". Tapping "Hear again" says the whole line, not just the end.
 */
export function playLine(cues: Cue[], settings: Settings, signal: AbortSignal, options: { remember?: boolean; onCue?: (index: number) => void } = {}): Promise<void> {
  return playCues(cues, settings, signal, options);
}

export function promptCue(id: string, fallback = ""): Cue {
  return { src: recordedSrc("prompts", id), text: spokenLine("prompts", id, fallback) };
}

export function colorCue(name: string): Cue {
  const id = name.trim().toLowerCase().replace(/\s+/g, "-");
  return { src: recordedSrc("colors", id), text: spokenLine("colors", id, name) };
}

export function numberCue(value: number): Cue {
  const id = String(value);
  return { src: recordedSrc("numbers", id), text: spokenLine("numbers", id, id) };
}

export function wordCue(id: string, fallback: string): Cue {
  return { src: recordedSrc("words", id), text: spokenLine("words", id, fallback) };
}

/**
 * A letter's phrase ("m, as in moon"): names the letter, for letter cards and
 * for games that ask to find it. A tile that stands for a letter carries the
 * letter in `phraseId`, so C says "c, as in cat" and not its phoneme's phrase.
 */
export function letterCue(letter: LetterTile): Cue {
  const id = letter.phraseId ?? letter.phoneme;
  return { src: letter.audioSrc ?? recordedSrc("letters", id), text: spokenLine("letters", id, letter.char) };
}

/** A letter's bare sound ("mmm"), or its phrase when no sound clip is on the device. */
export function letterSoundCue(letter: LetterTile): Cue {
  const src = recordedSrc("sounds", letter.phoneme);
  return src ? { src, text: spokenLine("letters", letter.phraseId ?? letter.phoneme, letter.char) } : letterCue(letter);
}

/**
 * A letter's name on its own ("em"), for spelling a child's name out in the recorded voice. With no
 * name clip on the device yet, the letter's phrase clip ("m, as in moon") stands in: still the
 * recorded voice, never the device's.
 */
export function spellCue(letter: string): Cue {
  const id = letter.trim().toLowerCase();
  const src = recordedSrc("spell", id);
  if (src) return { src, text: spokenLine("spell", id, letterName(id)) };
  return { src: recordedSrc("letters", id), text: spokenLine("letters", id, letterName(id)) };
}

/** A whole word from the deck. */
export function deckWordCue(word: DeckWord): Cue {
  return { src: word.audioSrc ?? recordedSrc("words", word.id), text: spokenLine("words", word.id, word.word) };
}

/** A line for the device voice only, such as the child's own name. Nothing is fetched. */
export function deviceCue(text: string): Cue {
  return { text };
}

export function playLetter(
  letter: LetterTile,
  settings: Settings,
  signal: AbortSignal,
): Promise<void> {
  // The silent e of cake: a short beat while its tile lights, and no sound.
  if (letter.silent) return sleep(SILENT_LETTER_MS, signal);
  return playCue(letterCue(letter), settings, signal);
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
  return playCue(letterSoundCue(letter), settings, signal);
}

/**
 * One tile under the slider: a whole word inside a sentence, else the
 * letter's bare sound ("mmm").
 *
 * A letter card's tile used to say the card's whole phrase ("m, as in moon")
 * here. Sliding under it then started a 1.5 second line that the end of the
 * track cut off to say "moon", so the one thing the slide is for, hearing the
 * sound of the letter above the finger, did not happen. The phrase is the
 * card's opening line now (playCardLine); the slide says the sound.
 */
export function playTile(_card: DeckWord, letter: LetterTile, settings: Settings, signal: AbortSignal): Promise<void> {
  if (letter.wordId) return playWordId(letter.wordId, letter.char, settings, signal);
  return playLetterSound(letter, settings, signal);
}

/** A letter card's own line, said when it opens and on Play sound: "m, as in moon". */
export function playCardLine(card: DeckWord, settings: Settings, signal: AbortSignal): Promise<void> {
  const letter = card.letters[0];
  if (!letter) return Promise.resolve();
  return playLetter(letter, settings, signal);
}

/** Get a card's sounds ready so each one starts the moment the slider reaches its tile. */
export function warmCard(card: DeckWord): void {
  const sources = card.letters.map((letter) =>
    letter.wordId ? recordedSrc("words", letter.wordId) : letter.silent ? undefined : recordedSrc("sounds", letter.phoneme),
  );
  const whole = card.sentenceId
    ? recordedSrc("sentences", card.sentenceId)
    : recordedSrc("words", card.letterCard ? card.word.trim().toLowerCase().replace(/\s+/g, "-") : card.id);
  warmClips([...sources, whole]);
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
  if (text.trim()) remember([{ text }]);
  if (!settings.voice || !text.trim()) return sleep(SILENT_BEAT_MS, signal);
  const voice = takeVoice(signal);
  beginVoice();
  return speak(text, settings, voice).finally(() => endVoice());
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
  return playCue(wordCue(id, fallback), settings, signal);
}

export function playNumber(value: number, settings: Settings, signal: AbortSignal): Promise<void> {
  return playCue(numberCue(value), settings, signal);
}

export function playColor(name: string, settings: Settings, signal: AbortSignal): Promise<void> {
  return playCue(colorCue(name), settings, signal);
}

export function playPrompt(id: string, settings: Settings, signal: AbortSignal, fallback = ""): Promise<void> {
  return playCue(promptCue(id, fallback), settings, signal);
}

/** A story page, read by the bundled narrator when the line is recorded, else the device voice. */
export function playStoryLine(id: string, text: string, settings: Settings, signal: AbortSignal, follow?: ReadAlong): Promise<void> {
  return playCue(
    {
      src: recordedSrc("stories", id),
      text,
    },
    settings,
    signal,
    { follow },
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
