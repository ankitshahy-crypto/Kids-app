import available from "./audioAvailable.json";
import manifest from "./audioManifest.json";
import { starterDeck } from "./deck";
import { PHONEME_IDS } from "./phonemes";

export type AudioKind = "letters" | "words" | "sentences";

export type AudioCue = {
  file: string;
  say: string;
  source: "human" | "neural";
};

type Manifest = Record<AudioKind, Record<string, AudioCue>>;

const book = manifest as Manifest;
const ready = new Set<string>(available.files);
const FILE_PATH = /^[a-z0-9]+(?:\/[a-z0-9-]+)*\.mp3$/;
const BARE_SYLLABLE = /^(?:buh|duh|kuh|puh|guh|tuh|huh|aah|eh|ih|aw|uh|mmm|nnn|sss|fff|lll|kss)$/i;

function assertCue(kind: AudioKind, id: string, cue: AudioCue | undefined): void {
  if (!cue || !FILE_PATH.test(cue.file) || !cue.say.trim()) {
    throw new Error(`Audio manifest is missing a usable ${kind} entry for "${id}"`);
  }
  if (BARE_SYLLABLE.test(cue.say.trim())) {
    throw new Error(`Audio manifest entry "${id}" must be a real word or phrase, not "${cue.say}"`);
  }
}

for (const id of PHONEME_IDS) {
  const cue = book.letters[id];
  assertCue("letters", id, cue);
  if (!/, as in /i.test(cue.say) || cue.source !== "human") {
    throw new Error(`Letter sound "${id}" needs a human-recorded example phrase`);
  }
}

for (const [id, cue] of Object.entries(book.letters)) {
  assertCue("letters", id, cue);
  if (cue.source !== "human") {
    throw new Error(`Letter sound "${id}" must stay human-recorded`);
  }
}

for (const word of starterDeck.words) {
  const cue = book.words[word.id];
  assertCue("words", word.id, cue);
  if (cue.say.trim().toLowerCase() !== word.word.toLowerCase()) {
    throw new Error(`Word clip "${word.id}" should say "${word.word}"`);
  }
}

for (const [id, cue] of Object.entries(book.sentences)) {
  assertCue("sentences", id, cue);
  if (cue.source !== "neural") {
    throw new Error(`Sentence "${id}" should be marked for offline neural audio`);
  }
}

/** Bundled clip for this id, or nothing when that file has not been added yet. */
export function recordedSrc(kind: AudioKind, id: string): string | undefined {
  const cue = book[kind][id];
  if (!cue || !ready.has(cue.file)) return undefined;
  const base = import.meta.env.BASE_URL;
  return `${base}audio/${cue.file}`;
}

/** Example phrase or word used only when no recording is on the device. */
export function spokenLine(kind: AudioKind, id: string, fallback: string): string {
  return book[kind][id]?.say ?? fallback;
}
