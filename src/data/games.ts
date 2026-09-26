import { starterDeck, type DeckWord, type LetterTile } from "./deck";
import type { PhonemeId } from "./phonemes";

/** 1 is the first sound. 2 is a short word. 3 is a longer word. */
export const HATCH_LEVELS = [1, 2, 3] as const;
export type HatchLevel = (typeof HATCH_LEVELS)[number];

/** Two finished eggs move to the next word length. A miss never moves back. */
export const HATCHES_TO_ADVANCE = 2;
export const GLOW_AFTER_MISSES = 2;

export type GameProgress = {
  hatch: HatchLevel;
  hatches: number;
};

export const BABY_ANIMALS = ["kitten", "puppy", "fawn", "owlet", "duckling", "cub"] as const;
export type BabyAnimal = (typeof BABY_ANIMALS)[number];

const LETTER_PHONEME: Record<string, string> = {
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
  q: "k",
  r: "r",
  s: "s",
  t: "t",
  u: "uh",
  v: "v",
  w: "w",
  x: "ks",
  y: "y",
  z: "z",
};

export function letterTile(char: string): LetterTile {
  const lower = char.toLowerCase();
  return { char: lower, phoneme: (LETTER_PHONEME[lower] ?? "m") as PhonemeId };
}

export function isHatchLevel(value: number): value is HatchLevel {
  return HATCH_LEVELS.includes(value as HatchLevel);
}

export function emptyGames(): GameProgress {
  return { hatch: 1, hatches: 0 };
}

export function normalizeGames(value: unknown): GameProgress {
  if (!value || typeof value !== "object") return emptyGames();
  const raw = value as Partial<GameProgress>;
  const hatch = typeof raw.hatch === "number" && isHatchLevel(raw.hatch) ? raw.hatch : 1;
  const hatches =
    typeof raw.hatches === "number" && Number.isFinite(raw.hatches) && raw.hatches > 0
      ? Math.min(HATCHES_TO_ADVANCE, Math.floor(raw.hatches))
      : 0;
  return { hatch, hatches };
}

export function assignHatchLevel(progress: GameProgress | undefined, level: HatchLevel): GameProgress {
  const current = normalizeGames(progress);
  if (current.hatch === level) return current;
  return { hatch: level, hatches: 0 };
}

/** Count a finished egg. Two finishes move up one level and never go backward. */
export function recordHatch(progress: GameProgress | undefined): { games: GameProgress; advanced: boolean } {
  const current = normalizeGames(progress);
  if (current.hatch >= 3) {
    return { games: { hatch: 3, hatches: Math.min(HATCHES_TO_ADVANCE, current.hatches + 1) }, advanced: false };
  }
  const hatches = current.hatches + 1;
  if (hatches >= HATCHES_TO_ADVANCE) {
    const next = (current.hatch + 1) as HatchLevel;
    return { games: { hatch: next, hatches: 0 }, advanced: true };
  }
  return { games: { hatch: current.hatch, hatches }, advanced: false };
}

export function nextBaby(collected: readonly string[]): BabyAnimal {
  const have = new Set(collected.map((label) => label.toLowerCase()));
  return BABY_ANIMALS.find((name) => !have.has(name)) ?? BABY_ANIMALS[collected.length % BABY_ANIMALS.length];
}

export type HatchRound = {
  word: DeckWord;
  level: HatchLevel;
  /** Indexes the child fills. Other letters are already showing. */
  blanks: number[];
  /** Lowercase letters on the big tiles, needed ones first. */
  choices: string[];
};

function knownSet(known: readonly string[]): Set<string> {
  return new Set(known.map((letter) => letter.toLowerCase()).filter((letter) => /^[a-z]$/.test(letter)));
}

function pickWord(words: readonly DeckWord[], level: HatchLevel, known: Set<string>): DeckWord {
  const pool = words.length > 0 ? words : starterDeck.words;
  const chars = (word: DeckWord) => word.letters.map((letter) => letter.char.toLowerCase());
  const match = pool.find((word) => {
    const letters = chars(word);
    if (level === 1) return known.size === 0 || known.has(letters[0] ?? "");
    if (level === 2) return letters.length === 3 && (known.size === 0 || letters.some((letter) => known.has(letter)));
    return letters.length > 3 && (known.size === 0 || letters.some((letter) => known.has(letter)));
  });
  if (match) return match;
  if (level === 3) return pool.find((word) => word.letters.length > 3) ?? pool[pool.length - 1];
  if (level === 2) return pool.find((word) => word.letters.length === 3) ?? pool[0];
  return pool[0];
}

/** One egg. Level 1 blanks the first sound. Later levels blank every taught letter. */
export function hatchRound(known: readonly string[], level: HatchLevel, words: readonly DeckWord[] = starterDeck.words): HatchRound {
  const taught = knownSet(known);
  const word = pickWord(words, level, taught);
  const blanks: number[] = [];
  word.letters.forEach((letter, index) => {
    const char = letter.char.toLowerCase();
    if (level === 1) {
      if (index === 0) blanks.push(index);
      return;
    }
    if (taught.size === 0 || taught.has(char)) blanks.push(index);
  });
  if (blanks.length === 0) blanks.push(0);
  const needed = [...new Set(blanks.map((index) => word.letters[index].char.toLowerCase()))];
  const rest = [...taught].filter((letter) => !needed.includes(letter));
  const alphabet = "abcdefghijklmnopqrstuvwxyz".split("").filter((letter) => !needed.includes(letter) && !rest.includes(letter));
  const choices = [...needed, ...rest, ...alphabet].slice(0, 6);
  return { word, level, blanks, choices };
}

/** The letter still missing, so its tile can glow after two tries. */
export function glowLetter(round: HatchRound, filled: readonly number[]): string | null {
  const open = round.blanks.find((index) => !filled.includes(index));
  if (open === undefined) return null;
  return round.word.letters[open]?.char.toLowerCase() ?? null;
}

export type Balloon = {
  id: string;
  letter: string;
  target: boolean;
};

/** Balloons for one sound. Odd slots are the target so a round always has some to pop. */
export function popRound(known: readonly string[]): { target: string; balloons: Balloon[] } {
  const letters = [...knownSet(known)];
  const target = letters[0] ?? "m";
  const distract = letters.filter((letter) => letter !== target);
  const extras = distract.length > 0 ? distract : ["a", "s", "t"];
  const balloons = [0, 1, 2, 3, 4, 5].map((index) => {
    const letter = index % 2 === 0 ? target : extras[Math.floor(index / 2) % extras.length];
    return { id: String(index), letter, target: letter === target };
  });
  return { target, balloons };
}

export type Food = {
  id: string;
  letter: string;
  label: string;
};

export const FOODS: readonly Food[] = [
  { id: "milk", letter: "m", label: "milk" },
  { id: "muffin", letter: "m", label: "muffin" },
  { id: "apple", letter: "a", label: "apple" },
  { id: "sandwich", letter: "s", label: "sandwich" },
  { id: "taco", letter: "t", label: "taco" },
  { id: "pear", letter: "p", label: "pear" },
  { id: "ice", letter: "i", label: "ice" },
  { id: "nuts", letter: "n", label: "nuts" },
  { id: "donut", letter: "d", label: "donut" },
];

export function feedRound(known: readonly string[]): { target: string; foods: Food[] } {
  const taught = knownSet(known);
  const target = FOODS.find((food) => taught.size === 0 || taught.has(food.letter))?.letter ?? "m";
  const matching = FOODS.filter((food) => food.letter === target);
  const others = FOODS.filter((food) => food.letter !== target && (taught.size === 0 || taught.has(food.letter)));
  return { target, foods: [...matching, ...others].slice(0, 4) };
}

export type RhymePair = { a: string; b: string };

export const RHYME_PAIRS: readonly RhymePair[] = [
  { a: "map", b: "tap" },
  { a: "pin", b: "tin" },
  { a: "man", b: "pan" },
  { a: "mad", b: "sad" },
  { a: "net", b: "pet" },
];

export type RhymeCard = {
  id: string;
  word: string;
  pair: string;
};

function mix<T>(items: readonly T[], salt: number): T[] {
  const copy = [...items];
  let state = (salt + 1) >>> 0;
  for (let index = copy.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swap = state % (index + 1);
    const held = copy[index];
    copy[index] = copy[swap];
    copy[swap] = held;
  }
  return copy;
}

/** Two rhyming pairs whose first sounds are already taught. */
export function rhymeRound(known: readonly string[], salt = 0): RhymeCard[] {
  const taught = knownSet(known);
  const startsKnown = (word: string) => taught.size === 0 || taught.has(word[0] ?? "");
  const ready = RHYME_PAIRS.filter((pair) => startsKnown(pair.a) && startsKnown(pair.b));
  const source = ready.length > 0 ? ready : RHYME_PAIRS;
  const chosen = source.slice(0, 2);
  const cards = chosen.flatMap((pair, index) => [
    { id: `${pair.a}-${index}`, word: pair.a, pair: String(index) },
    { id: `${pair.b}-${index}`, word: pair.b, pair: String(index) },
  ]);
  return mix(cards, salt);
}

export type MemoryFace = "upper" | "lower" | "numeral" | "dots";

export type MemoryCard = {
  id: string;
  pair: string;
  face: MemoryFace;
  value: string;
};

export function memoryRound(known: readonly string[], mode: "letters" | "numbers", salt = 0): MemoryCard[] {
  if (mode === "numbers") {
    const cards = [1, 2, 3].flatMap((value) => [
      { id: `num-${value}`, pair: String(value), face: "numeral" as const, value: String(value) },
      { id: `dots-${value}`, pair: String(value), face: "dots" as const, value: String(value) },
    ]);
    return mix(cards, salt);
  }
  const taught = [...knownSet(known)];
  const letters = (taught.length >= 3 ? taught : ["m", "a", "s"]).slice(0, 3);
  const cards = letters.flatMap((letter) => [
    { id: `upper-${letter}`, pair: letter, face: "upper" as const, value: letter.toUpperCase() },
    { id: `lower-${letter}`, pair: letter, face: "lower" as const, value: letter },
  ]);
  return mix(cards, salt);
}
