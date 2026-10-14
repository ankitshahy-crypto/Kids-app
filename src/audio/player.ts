import { recordedSrc, spokenLine } from "../data/audioCatalog";
import type { DeckWord, LetterTile } from "../data/deck";
import { beginVoice, endVoice, playChime, playOnBus, showCaption, unlockAudio, warmClips } from "./manager";
import type { Settings } from "../settings";

const SILENT_BEAT_MS = 720;
const SILENT_LETTER_MS = 320;

/**
 * Every line the app says is a recorded clip in the one app voice (voice.config.json). The phone's
 * own voice (speechSynthesis) is never used: it was Apple's Samantha on an iPhone and a Google
 * network voice in Chrome, so a child heard two or three voices in one lesson, and in Chrome the
 * line's words left the device.
 *
 * Call this synchronously inside the tap that opens an activity. It unlocks iOS audio with a silent
 * buffer (unlockAudio) and says nothing; the activity's first line then plays from its clip. (It used
 * to speak that first line in the phone's voice and skip the clip.) The argument is ignored and kept
 * only so the call sites read the same.
 */
export function primeSpeech(_cue?: string): void {
  unlockAudio();
}

/** Kept for its call sites; there is no device speech to resume. Unlocks audio on the tap. */
export function resumeSpeech(): void {
  unlockAudio();
}

/** Kept for its call sites; clips stop through their own signals. */
export function cancelSpeech(): void {
  // Nothing to cancel: there is no device speech.
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

function playFile(src: string, signal: AbortSignal, follow?: ReadAlong, fresh = false): Promise<void> {
  return playOnBus(src, "voice", signal, follow ? (durationMs) => tell(follow, { kind: "clip", durationMs }) : undefined, fresh);
}

/** One thing to say: its recorded clip, and its words (shown on screen if the clip cannot play). */
export type Cue = { src?: string; text: string };

/**
 * What a read-along needs to follow a line: its clip started, and how long it is. Word times come
 * from src/data/storyTimings.json. `missing` means the clip could not play and the words are shown.
 */
export type ReadAlongEvent = { kind: "clip"; durationMs: number } | { kind: "missing" };
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
 * A line could not be said from its clip. In the unit tests that is a failure (every line the code
 * uses must have a clip); in the app a soft chime plays, the words are shown, and the e2e tests
 * listen for the event.
 */
function clipMissing(cue: Cue, why: string): void {
  if (import.meta.env.MODE === "test") throw new Error(`No playable clip for "${cue.text}" (${why})`);
  try {
    window.dispatchEvent(new CustomEvent("littlenest:missing-clip", { detail: { text: cue.text, src: cue.src ?? null, why } }));
  } catch {
    // No window: nothing to tell.
  }
}

/**
 * Play the line's clip. A clip that fails to load or play is tried once more; if it fails again,
 * or the line has no clip at all, a soft chime plays and the words are shown on screen. The phone's
 * own voice is never used.
 */
async function playOne(cue: Cue, settings: Settings, signal: AbortSignal, follow?: ReadAlong): Promise<void> {
  if (signal.aborted) throw abortError();
  if (!settings.voice) {
    await sleep(SILENT_BEAT_MS, signal);
    return;
  }
  if (!cue.src) {
    clipMissing(cue, "no clip");
    tell(follow, { kind: "missing" });
    await chimeAndShow(cue.text, signal);
    return;
  }
  beginVoice();
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await playFile(cue.src, signal, follow, attempt > 0);
        return;
      } catch (error) {
        if (isAbortError(error) || signal.aborted) throw abortError();
      }
    }
  } finally {
    endVoice();
  }
  clipMissing(cue, "clip failed twice");
  tell(follow, { kind: "missing" });
  await chimeAndShow(cue.text, signal);
}

/** A soft chime, and the line's words on screen for a moment: what a child gets instead of a robot voice. */
async function chimeAndShow(text: string, signal: AbortSignal): Promise<void> {
  playChime();
  showCaption(text);
  await sleep(Math.min(4000, 900 + text.length * 45), signal);
}

/**
 * One voice at a time. A new line stops the one still being said, so an
 * opening instruction and a tapped answer, or "Hear again", never talk over
 * each other. The caller's own signal still stops its line as before.
 */
let lineController: AbortController | null = null;
/** The line being said now, settled when it ends or is stopped; null between lines. */
let lineNow: Promise<void> | null = null;

function takeVoice(signal: AbortSignal): AbortSignal {
  lineController?.abort();
  const controller = new AbortController();
  lineController = controller;
  if (signal.aborted) controller.abort();
  else signal.addEventListener("abort", () => controller.abort(), { once: true });
  return controller.signal;
}

/**
 * Settles once no line is being said, so that something said on a timer (the Done button's cue)
 * can wait its turn instead of taking the voice from a line a child asked for. A line that starts
 * while this waits is waited for too.
 */
export function voiceIdle(): Promise<void> {
  const now = lineNow;
  if (!now) return Promise.resolve();
  return now.then(voiceIdle, voiceIdle);
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
  const line = (async () => {
    for (let index = 0; index < cues.length; index += 1) {
      if (index > 0) await sleep(BETWEEN_CUES_MS, voice);
      if (voice.aborted) throw abortError();
      options.onCue?.(index);
      await playOne(cues[index], settings, voice, options.follow);
    }
  })();
  const settled = line.then(() => undefined, () => undefined);
  lineNow = settled;
  void settled.then(() => {
    if (lineNow === settled) lineNow = null;
  });
  return line;
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
 * A letter's name on its own ("em"), for spelling a child's name out in the recorded voice. The
 * child's name itself is never spoken by any voice, on or off the device: it is spelled with these.
 * There is no stand-in: the letter's phrase clip ("n, as in nest") is not its name (#201). A missing
 * spell clip fails the unit tests (clipMissing) and chimes in the app.
 */
export function spellCue(letter: string): Cue {
  const id = letter.trim().toLowerCase();
  return { src: recordedSrc("spell", id), text: spokenLine("spell", id, id.toUpperCase()) };
}

/** A whole word from the deck. */
export function deckWordCue(word: DeckWord): Cue {
  return { src: word.audioSrc ?? recordedSrc("words", word.id), text: spokenLine("words", word.id, word.word) };
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
 * sound clip it says the letter's recorded phrase ("m, as in moon") instead.
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

/** A story page, read by the recorded narrator; the read-along follows storyTimings.json. */
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
