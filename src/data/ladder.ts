import type { IllustrationName } from "../illustrations";
import { starterDeck, type DeckWord, type LetterTile } from "./deck";
import type { PhonemeId } from "./phonemes";
import { letterPlanSize } from "./schedule";

/** 1 is a one-letter word. 5 is phonics for ages 5 to 7. */
export const LADDER_STEPS = [1, 2, 3, 4, 5] as const;
export type LadderStep = (typeof LADDER_STEPS)[number];

/** A few finished word tries move up one step. A miss never moves back. */
export const SUCCESSES_TO_ADVANCE = 3;

export type LadderProgress = {
  step: LadderStep;
  successes: number;
};

const PHONEME: Record<string, string> = {
  a: "ae",
  b: "b",
  c: "k",
  d: "d",
  e: "eh",
  f: "f",
  g: "g",
  h: "h",
  i: "ih",
  j: "j",
  k: "k",
  l: "l",
  m: "m",
  n: "n",
  o: "aw",
  p: "p",
  r: "r",
  s: "s",
  t: "t",
  u: "uh",
  w: "w",
};

export function isLadderStep(value: number): value is LadderStep {
  return LADDER_STEPS.includes(value as LadderStep);
}

export function emptyLadder(): LadderProgress {
  return { step: 1, successes: 0 };
}

export function normalizeLadder(value: unknown): LadderProgress {
  if (!value || typeof value !== "object") return emptyLadder();
  const raw = value as Partial<LadderProgress>;
  const step = typeof raw.step === "number" && isLadderStep(raw.step) ? raw.step : 1;
  const successes =
    typeof raw.successes === "number" && raw.successes > 0 ? Math.min(SUCCESSES_TO_ADVANCE, Math.floor(raw.successes)) : 0;
  return { step, successes };
}

/** A teacher places the child on a step. The success streak starts over. */
export function assignLadderStep(progress: LadderProgress | undefined, step: LadderStep): LadderProgress {
  const current = normalizeLadder(progress);
  if (current.step === step) return { ...current, successes: 0 };
  return { step, successes: 0 };
}

/**
 * Count one finished word try. Three successes move up one step.
 * Step 5 stays reserved for phonics until that level is open, or a teacher sets it.
 */
export function recordLadderSuccess(
  progress: LadderProgress | undefined,
  options?: { phonicsOpen?: boolean },
): { ladder: LadderProgress; advanced: boolean } {
  const current = normalizeLadder(progress);
  if (current.step >= 5) {
    return { ladder: { step: 5, successes: Math.min(SUCCESSES_TO_ADVANCE, current.successes + 1) }, advanced: false };
  }
  const successes = current.successes + 1;
  const blocked = current.step === 4 && !options?.phonicsOpen;
  if (successes >= SUCCESSES_TO_ADVANCE && !blocked) {
    return { ladder: { step: (current.step + 1) as LadderStep, successes: 0 }, advanced: true };
  }
  return {
    ladder: { step: current.step, successes: Math.min(SUCCESSES_TO_ADVANCE, successes) },
    advanced: false,
  };
}

/** The 3–5 letter plan is finished, so phonics words can open on their own. */
export function phonicsOpen(introducedCount: number): boolean {
  return introducedCount >= letterPlanSize();
}

export function ladderTitle(step: LadderStep): string {
  if (step === 1) return "One letter";
  if (step === 2) return "Two letters";
  if (step === 3) return "Short words";
  if (step === 4) return "Four letters";
  return "Phonics 5–7";
}

export function ladderDetail(step: LadderStep): string {
  if (step === 1) return "a, I";
  if (step === 2) return "at, in, it";
  if (step === 3) return "cat, sun, dog";
  if (step === 4) return "frog, jump, fish";
  return "Longer words and short sentences";
}

/** How many letters a word on this step may use. Step 5 is a short sentence. */
export function ladderMaxLetters(step: LadderStep): number {
  if (step === 5) return 24;
  return step;
}

function spell(id: string, text: string, phonemes: PhonemeId[], illustration: IllustrationName): DeckWord {
  const chars = [...text];
  if (chars.length !== phonemes.length) {
    throw new Error(`"${id}" has ${chars.length} letters and ${phonemes.length} sounds`);
  }
  return {
    id,
    word: text,
    illustration,
    letters: chars.map((char, index) => ({ char, phoneme: phonemes[index] })),
  };
}

function sounds(text: string): PhonemeId[] {
  return [...text.toLowerCase()].map((char) => {
    const phoneme = PHONEME[char];
    if (!phoneme) throw new Error(`No sound for "${char}" in "${text}"`);
    return phoneme as PhonemeId;
  });
}

function made(id: string, text: string, illustration: IllustrationName): DeckWord {
  return spell(id, text, sounds(text), illustration);
}

function fromDeck(id: string): DeckWord {
  const found = starterDeck.words.find((word) => word.id === id);
  if (!found) throw new Error(`Starter deck is missing "${id}"`);
  return found;
}

function sentence(
  id: string,
  say: string,
  illustration: IllustrationName,
  pieces: { text: string; wordId: string }[],
): DeckWord {
  const letters: LetterTile[] = pieces.map((piece) => ({
    char: piece.text,
    phoneme: "m",
    wordId: piece.wordId,
  }));
  return {
    id,
    word: say.replace(/\.$/, ""),
    sentenceId: id,
    illustration,
    letters,
  };
}

/** Step 1. One-letter words. */
const step1: DeckWord[] = [made("a", "a", "one"), spell("i", "I", ["ih"], "me")];

/** Step 2. Two-letter vowel-consonant words. */
const step2: DeckWord[] = [
  made("at", "at", "spot"),
  made("in", "in", "inside"),
  made("it", "it", "toy"),
  made("up", "up", "balloon"),
  made("on", "on", "stacked"),
  made("am", "am", "wave"),
  made("is", "is", "lampglow"),
  made("an", "an", "ant"),
];

/** Step 3. CVC picture words, then the rhyme words that use the same length. */
const step3: DeckWord[] = [
  fromDeck("cat"),
  fromDeck("dog"),
  fromDeck("sun"),
  fromDeck("hat"),
  fromDeck("pig"),
  fromDeck("bus"),
  fromDeck("cup"),
  fromDeck("bed"),
  fromDeck("fox"),
  made("map", "map", "spot"),
  made("tap", "tap", "hand"),
  made("pin", "pin", "toy"),
  made("tin", "tin", "milk"),
  made("man", "man", "me"),
  made("pan", "pan", "sand"),
  made("mad", "mad", "wave"),
  made("sad", "sad", "me"),
  made("net", "net", "nest"),
  made("pet", "pet", "frog"),
];

/** Step 4. Four-letter CCVC and CVCC words. */
const step4: DeckWord[] = [
  made("frog", "frog", "frog"),
  made("jump", "jump", "jumper"),
  made("fish", "fish", "fish"),
  made("milk", "milk", "milk"),
  made("nest", "nest", "nest"),
  made("tent", "tent", "tent"),
  made("sand", "sand", "sand"),
  made("hand", "hand", "hand"),
  made("stop", "stop", "stopsign"),
  made("drum", "drum", "drum"),
];

/** Step 5 words. Short sentences are separate and stay on this step. */
const step5Words: DeckWord[] = [fromDeck("apple"), made("plant", "plant", "plant"), made("grape", "grape", "grape"), made("smile", "smile", "smile")];

const step5Sentences: DeckWord[] = [
  sentence("i-am", "I am.", "me", [
    { text: "I", wordId: "i" },
    { text: "am", wordId: "am" },
  ]),
  sentence("a-cat", "A cat.", "cat", [
    { text: "A", wordId: "a" },
    { text: "cat", wordId: "cat" },
  ]),
  sentence("sun-is-up", "The sun is up.", "sun", [
    { text: "The", wordId: "the" },
    { text: "sun", wordId: "sun" },
    { text: "is", wordId: "is" },
    { text: "up", wordId: "up" },
  ]),
  sentence("see-dog", "I see a dog.", "dog", [
    { text: "I", wordId: "i" },
    { text: "see", wordId: "see" },
    { text: "a", wordId: "a" },
    { text: "dog", wordId: "dog" },
  ]),
];

const byStep: Record<LadderStep, DeckWord[]> = {
  1: step1,
  2: step2,
  3: step3,
  4: step4,
  5: step5Words,
};

function checkWords(): void {
  const seen = new Set<string>();
  for (const step of LADDER_STEPS) {
    for (const word of byStep[step]) {
      if (word.sentenceId) throw new Error(`"${word.id}" is a sentence on the word list`);
      if (seen.has(word.id)) throw new Error(`Duplicate ladder word "${word.id}"`);
      seen.add(word.id);
      const spelled = word.letters.map((letter) => letter.char).join("");
      if (spelled !== word.word) throw new Error(`"${word.id}" spells "${spelled}"`);
      const length = word.word.length;
      if (step === 1 && length !== 1) throw new Error(`"${word.id}" is not one letter`);
      if (step === 2 && length !== 2) throw new Error(`"${word.id}" is not two letters`);
      if (step === 3 && length !== 3) throw new Error(`"${word.id}" is not a short word`);
      if (step === 4 && length !== 4) throw new Error(`"${word.id}" is not four letters`);
      if (step === 5 && length < 5) throw new Error(`"${word.id}" is not a longer word`);
    }
  }
  for (const line of step5Sentences) {
    if (!line.sentenceId) throw new Error(`"${line.id}" needs a sentence id`);
    if (seen.has(line.id)) throw new Error(`Duplicate ladder id "${line.id}"`);
    seen.add(line.id);
  }
}

checkWords();

/** Picture words on this step only. Sentences stay out of letter games. */
export function wordsForStep(step: LadderStep): DeckWord[] {
  return byStep[step];
}

/** Picture words from step 1 through this step. */
export function wordsThrough(step: LadderStep): DeckWord[] {
  const words: DeckWord[] = [];
  for (const current of LADDER_STEPS) {
    if (current > step) break;
    words.push(...byStep[current]);
  }
  return words;
}

/** Short sentences. Only step 5 has them. */
export function sentencesForStep(step: LadderStep): DeckWord[] {
  return step === 5 ? step5Sentences : [];
}

function lettersKnown(word: DeckWord, known: Set<string>): boolean {
  return word.letters.every((letter) => letter.wordId || known.has(letter.char.toLowerCase()));
}

/**
 * What drag-to-blend shows. Known-letter words come first.
 * Step 5 adds the short sentences after the longer words.
 */
export function blendList(step: LadderStep, letters: readonly string[]): DeckWord[] {
  const pool = [...wordsForStep(step), ...sentencesForStep(step)];
  const known = new Set(letters.map((letter) => letter.toLowerCase()));
  const matched = pool.filter((word) => lettersKnown(word, known));
  const rest = pool.filter((word) => !matched.includes(word));
  const ordered = [...matched, ...rest];
  if (ordered.length <= 8) return ordered;
  const picked = matched.length >= 3 ? matched : ordered;
  return picked.slice(0, 6);
}

/** Words the child has already blended, at this step or an earlier one. */
export function wordsToTrace(stickers: { kind: string; label: string }[], step: LadderStep): DeckWord[] {
  const known = new Set(
    stickers.filter((sticker) => sticker.kind === "word").map((sticker) => sticker.label.trim().toLowerCase()),
  );
  return wordsThrough(step).filter((word) => known.has(word.word.toLowerCase()));
}

export type LadderClip = {
  kind: "words" | "sentences";
  id: string;
  say: string;
};

/** Every word and sentence the ladder speaks. Each one needs a neural clip. */
export function ladderClips(): LadderClip[] {
  const clips: LadderClip[] = [];
  const pushWord = (id: string, say: string) => {
    if (clips.some((clip) => clip.kind === "words" && clip.id === id)) return;
    clips.push({ kind: "words", id, say });
  };
  for (const step of LADDER_STEPS) {
    for (const word of byStep[step]) pushWord(word.id, word.word);
  }
  pushWord("the", "the");
  pushWord("see", "see");
  for (const line of step5Sentences) {
    clips.push({ kind: "sentences", id: line.id, say: line.word.endsWith(".") ? line.word : `${line.word}.` });
    for (const piece of line.letters) {
      if (piece.wordId) pushWord(piece.wordId, piece.wordId === "i" ? "I" : piece.wordId);
    }
  }
  return clips;
}
