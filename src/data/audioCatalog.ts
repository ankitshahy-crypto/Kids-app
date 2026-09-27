import available from "./audioAvailable.json";
import manifest from "./audioManifest.json";
import { starterDeck } from "./deck";
import { ladderClips } from "./ladder";
import { PHONEME_IDS } from "./phonemes";
import { THEME_IDS, THEMES } from "./themes";
import { themedWordCatalog } from "./themeWords";

/** Manifest id of a themed letter phrase: "d-dinosaur" for "d, as in dinosaur". */
export function themedLetterId(char: string, example: string): string {
  return `${char}-${example.trim().toLowerCase().replace(/\s+/g, "-")}`;
}

export type AudioKind = "letters" | "sounds" | "words" | "sentences" | "numbers" | "prompts" | "colors" | "stories";

export type AudioCue = {
  file: string;
  /**
   * The line the clip says. For a "sounds" clip (the bare letter sound used
   * when sounding out a word) this is the letter's example phrase, which is
   * what the app says instead when that clip is not on the device.
   */
  say: string;
  /** "neural" clips are generated offline by scripts/generate-audio.mjs. A person can replace any of them. */
  source: "human" | "neural";
};

type Manifest = Record<Exclude<AudioKind, "stories" | "sounds">, Record<string, AudioCue>> & {
  sounds?: Record<string, AudioCue>;
  stories?: Record<string, AudioCue>;
};

const book = manifest as Manifest;
const ready = new Set<string>(available.files);
const FILE_PATH = /^[a-z0-9]+(?:\/[a-z0-9-]+)*\.mp3$/;
const BARE_SYLLABLE = /^(?:buh|duh|kuh|puh|guh|tuh|huh|aah|eh|ih|aw|uh|mmm|nnn|sss|fff|lll|kss)$/i;

function assertCue(kind: AudioKind, id: string, cue: AudioCue | undefined): asserts cue is AudioCue {
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
  if (!/, as in /i.test(cue.say)) {
    throw new Error(`Letter sound "${id}" needs an example phrase`);
  }
}

for (const [id, cue] of Object.entries(book.letters)) {
  assertCue("letters", id, cue);
  if (!/, as in /i.test(cue.say)) {
    throw new Error(`Letter phrase "${id}" should name an example word`);
  }
}

// Every plain letter has a bare sound clip for sounding out words. It falls
// back to the letter's example phrase, so the two must say the same thing.
for (const [id, cue] of Object.entries(book.letters)) {
  if (id.includes("-")) continue;
  const sound = book.sounds?.[id];
  assertCue("sounds", id, sound);
  if (!sound.file.startsWith("sounds/") || sound.say !== cue.say) {
    throw new Error(`Letter sound "${id}" should live under sounds/ and share the phrase "${cue.say}"`);
  }
}

for (const word of themedWordCatalog()) {
  const cue = book.words[word.id];
  assertCue("words", word.id, cue);
  if (cue.say !== word.word) throw new Error(`Themed word clip "${word.id}" should say "${word.word}"`);
}

for (const theme of THEME_IDS) {
  for (const [char, example] of Object.entries(THEMES[theme].letters)) {
    const id = themedLetterId(char, example ?? "");
    const cue = book.letters[id];
    assertCue("letters", id, cue);
    if (cue.say !== `${char}, as in ${example}`) throw new Error(`Themed letter "${id}" should say "${char}, as in ${example}"`);
  }
}

for (const word of starterDeck.words) {
  const cue = book.words[word.id];
  assertCue("words", word.id, cue);
  if (cue.say.trim().toLowerCase() !== word.word.toLowerCase()) {
    throw new Error(`Word clip "${word.id}" should say "${word.word}"`);
  }
}

for (const clip of ladderClips()) {
  const cue = book[clip.kind][clip.id];
  assertCue(clip.kind, clip.id, cue);
  if (cue.say !== clip.say) {
    throw new Error(`Ladder ${clip.kind} "${clip.id}" should say "${clip.say}"`);
  }
  if (cue.source !== "neural") {
    throw new Error(`Ladder ${clip.kind} "${clip.id}" should be marked for offline neural audio`);
  }
}

for (const [id, cue] of Object.entries(book.sentences)) {
  assertCue("sentences", id, cue);
  if (cue.source !== "neural") {
    throw new Error(`Sentence "${id}" should be marked for offline neural audio`);
  }
}

for (const [id, cue] of Object.entries(book.numbers)) {
  assertCue("numbers", id, cue);
  if (cue.source !== "neural") {
    throw new Error(`Number "${id}" should be marked for offline neural audio`);
  }
}

for (const [id, cue] of Object.entries(book.prompts)) {
  assertCue("prompts", id, cue);
  if (cue.source !== "neural") {
    throw new Error(`Prompt "${id}" should be marked for offline neural audio`);
  }
}

for (const [id, cue] of Object.entries(book.stories ?? {})) {
  assertCue("stories", id, cue);
  if (cue.source !== "neural") {
    throw new Error(`Story line "${id}" should be marked for offline neural audio`);
  }
}

for (const [id, cue] of Object.entries(book.colors)) {
  assertCue("colors", id, cue);
  if (cue.source !== "neural") {
    throw new Error(`Color "${id}" should be marked for offline neural audio`);
  }
}

/** Bundled clip for this id, or nothing when that file has not been added yet. */
export function recordedSrc(kind: AudioKind, id: string): string | undefined {
  const cue = book[kind]?.[id];
  if (!cue || !ready.has(cue.file)) return undefined;
  const base = import.meta.env.BASE_URL;
  return `${base}audio/${cue.file}`;
}

/** Example phrase or word used only when no recording is on the device. */
export function spokenLine(kind: AudioKind, id: string, fallback: string): string {
  return book[kind]?.[id]?.say ?? fallback;
}
