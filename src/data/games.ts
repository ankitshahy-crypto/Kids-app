import { starterDeck, type DeckWord, type LetterTile } from "./deck";
import { ladderMaxLetters, type LadderStep } from "./ladder";
import type { PhonemeId } from "./phonemes";
import { isWardrobeId, wardrobe, wardrobeItem } from "./wardrobe";

/** 1 is the first sound. 2 is a short word. 3 is a longer word. */
export const HATCH_LEVELS = [1, 2, 3] as const;
export type HatchLevel = (typeof HATCH_LEVELS)[number];

/** Two finished eggs move to the next word length. A miss never moves back. */
export const HATCHES_TO_ADVANCE = 2;
export const GLOW_AFTER_MISSES = 2;

export type GameProgress = {
  hatch: HatchLevel;
  hatches: number;
  /** Finished spins. The next tap lands on the next challenge. */
  spins: number;
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
  return { hatch: 1, hatches: 0, spins: 0 };
}

export function normalizeGames(value: unknown): GameProgress {
  if (!value || typeof value !== "object") return emptyGames();
  const raw = value as Partial<GameProgress>;
  const hatch = typeof raw.hatch === "number" && isHatchLevel(raw.hatch) ? raw.hatch : 1;
  const hatches =
    typeof raw.hatches === "number" && Number.isFinite(raw.hatches) && raw.hatches > 0
      ? Math.min(HATCHES_TO_ADVANCE, Math.floor(raw.hatches))
      : 0;
  const spins =
    typeof raw.spins === "number" && Number.isFinite(raw.spins) && raw.spins > 0
      ? Math.min(10000, Math.floor(raw.spins))
      : 0;
  return { hatch, hatches, spins };
}

export function assignHatchLevel(progress: GameProgress | undefined, level: HatchLevel): GameProgress {
  const current = normalizeGames(progress);
  if (current.hatch === level) return current;
  return { ...current, hatch: level, hatches: 0 };
}

/** Count a finished egg. Two finishes move up one level and never go backward. */
export function recordHatch(progress: GameProgress | undefined): { games: GameProgress; advanced: boolean } {
  const current = normalizeGames(progress);
  if (current.hatch >= 3) {
    return {
      games: { ...current, hatch: 3, hatches: Math.min(HATCHES_TO_ADVANCE, current.hatches + 1) },
      advanced: false,
    };
  }
  const hatches = current.hatches + 1;
  if (hatches >= HATCHES_TO_ADVANCE) {
    const next = (current.hatch + 1) as HatchLevel;
    return { games: { ...current, hatch: next, hatches: 0 }, advanced: true };
  }
  return { games: { ...current, hatches }, advanced: false };
}

export function recordSpin(progress: GameProgress | undefined): GameProgress {
  const current = normalizeGames(progress);
  return { ...current, spins: Math.min(10000, current.spins + 1) };
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

export function feedRound(known: readonly string[], step?: LadderStep): { target: string; foods: Food[] } {
  const taught = knownSet(known);
  const max = step ? ladderMaxLetters(step) : 24;
  const pool = FOODS.filter((food) => food.label.length <= max);
  const foods = pool.length >= 2 ? pool : FOODS;
  const target = foods.find((food) => taught.size === 0 || taught.has(food.letter))?.letter ?? "m";
  const matching = foods.filter((food) => food.letter === target);
  const others = foods.filter((food) => food.letter !== target && (taught.size === 0 || taught.has(food.letter)));
  const round = [...matching, ...others].slice(0, 4);
  return { target, foods: round.length > 0 ? round : foods.slice(0, 4) };
}

export type RhymePair = { a: string; b: string; step: 3 | 4 };

export const RHYME_PAIRS: readonly RhymePair[] = [
  { a: "map", b: "tap", step: 3 },
  { a: "pin", b: "tin", step: 3 },
  { a: "man", b: "pan", step: 3 },
  { a: "mad", b: "sad", step: 3 },
  { a: "net", b: "pet", step: 3 },
  { a: "nest", b: "tent", step: 4 },
  { a: "jump", b: "bump", step: 4 },
  { a: "fish", b: "wish", step: 4 },
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

/** Two rhyming pairs at this ladder step whose first sounds are already taught. */
export function rhymeRound(known: readonly string[], salt = 0, step: LadderStep = 3): RhymeCard[] {
  const taught = knownSet(known);
  const startsKnown = (word: string) => taught.size === 0 || taught.has(word[0] ?? "");
  const knownPair = (pair: RhymePair) => startsKnown(pair.a) && startsKnown(pair.b);
  const eligible = RHYME_PAIRS.filter((pair) => pair.step <= step && knownPair(pair));
  const top = eligible.reduce((best, pair) => Math.max(best, pair.step), 0);
  const atTop = eligible.filter((pair) => pair.step === top);
  const early = RHYME_PAIRS.filter((pair) => pair.step <= 3);
  const source = atTop.length >= 2 ? atTop : eligible.length >= 2 ? eligible : early.length > 0 ? early : RHYME_PAIRS;
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

/** Challenges on the wheel, in tap order. Bonus is a prize, never a loss. */
export const SPIN_KINDS = ["sound", "word", "count", "color", "trace", "bonus"] as const;
export type SpinKind = (typeof SPIN_KINDS)[number];

const SEGMENT = 360 / SPIN_KINDS.length;

export function spinTurn(index: number): SpinKind {
  const count = SPIN_KINDS.length;
  const safe = ((Math.floor(index) % count) + count) % count;
  return SPIN_KINDS[safe];
}

/** Degrees clockwise from the top to the middle of this segment when the wheel has not turned. */
function segmentCenter(index: number): number {
  return index * SEGMENT + SEGMENT / 2;
}

/** Which segment sits under the pointer after this clockwise rotation. */
export function kindAtRotation(rotation: number): SpinKind {
  const normalized = ((rotation % 360) + 360) % 360;
  const atTop = (360 - normalized) % 360;
  const index = Math.floor(atTop / SEGMENT) % SPIN_KINDS.length;
  return SPIN_KINDS[index];
}

/**
 * A tap spins forward at least `turns` times and stops on the challenge for `index`.
 * `from` is the wheel's current angle so it never jerks backward.
 */
export function wheelRotation(index: number, from = 0, turns = 4): number {
  const segment = SPIN_KINDS.indexOf(spinTurn(index));
  const landing = (360 - segmentCenter(segment) + 360) % 360;
  let target = (Math.floor(from / 360) + turns) * 360 + landing;
  if (target < from + 360) target += 360;
  return target;
}

/** A flick coasts forward and settles on the nearest segment. */
export function snapForward(raw: number, from: number): number {
  const normalized = ((raw % 360) + 360) % 360;
  const atTop = (360 - normalized) % 360;
  const segment = Math.floor(atTop / SEGMENT) % SPIN_KINDS.length;
  const landing = (360 - segmentCenter(segment) + 360) % 360;
  let target = Math.floor(raw / 360) * 360 + landing;
  if (target < from) target += 360;
  return target;
}

export function soundChoices(known: readonly string[], salt = 0): { target: string; choices: string[] } {
  const pool = [...knownSet(known)];
  const letters = pool.length > 0 ? pool : ["m", "a", "s"];
  const target = letters[Math.abs(Math.floor(salt)) % letters.length] ?? "m";
  const others = letters.filter((letter) => letter !== target);
  const alphabet = "abcdefghijklmnopqrstuvwxyz".split("").filter((letter) => letter !== target && !others.includes(letter));
  return { target, choices: [target, ...others, ...alphabet].slice(0, 3) };
}

export type WordBlank = {
  word: DeckWord;
  blank: number;
  choices: string[];
};

/** One missing letter in a picture word. Level 1 hides the first sound, like “_ a t”. */
export function wordBlank(known: readonly string[], level: HatchLevel, words: readonly DeckWord[] = starterDeck.words): WordBlank {
  const round = hatchRound(known, level, words);
  const blank = level === 2 && round.blanks.includes(1) ? 1 : (round.blanks[0] ?? 0);
  const answer = round.word.letters[blank]?.char.toLowerCase() ?? "a";
  const rest = round.choices.filter((letter) => letter !== answer);
  return { word: round.word, blank, choices: [answer, ...rest].slice(0, 3) };
}

export function countChoices(total: number): { total: number; choices: number[] } {
  const count = Math.max(1, Math.min(10, Math.floor(total) || 1));
  const choices = [count];
  if (count > 1) choices.push(count - 1);
  if (count < 10) choices.push(count + 1);
  while (choices.length < 3) {
    const next = (choices[choices.length - 1] ?? count) + 1;
    if (!choices.includes(next)) choices.push(next);
    else break;
  }
  return { total: count, choices: choices.slice(0, 3) };
}

export function colorChoices(target: string, options: readonly string[]): { target: string; choices: string[] } {
  const hear = target.trim().toLowerCase() || "red";
  const rest = options.map((color) => color.toLowerCase()).filter((color) => color !== hear);
  const fallback = ["red", "blue", "yellow", "green"].filter((color) => color !== hear && !rest.includes(color));
  return { target: hear, choices: [hear, ...rest, ...fallback].slice(0, 3) };
}

export function traceLetter(known: readonly string[]): string {
  const letters = [...knownSet(known)];
  return letters[0] ?? "m";
}

export type SpinPrize =
  | { kind: "sticker"; label: string }
  | { kind: "outfit"; id: string; name: string };

/**
 * Bonus prizes alternate. A sticker comes first. The dress-up item is one the
 * child cannot buy with the star this spin will add.
 */
export function bonusPrize(
  spinIndex: number,
  gifts: readonly string[],
  babies: readonly string[],
  stars = 0,
): SpinPrize {
  const visit = Math.floor(Math.max(0, Math.floor(spinIndex)) / SPIN_KINDS.length);
  const owned = new Set(gifts);
  const upcomingStars = stars + 1;
  const outfit =
    wardrobe.find((item) => !owned.has(item.id) && upcomingStars < item.stars) ??
    wardrobe.find((item) => !owned.has(item.id));
  if (visit % 2 === 1 && outfit && isWardrobeId(outfit.id)) {
    return { kind: "outfit", id: outfit.id, name: wardrobeItem(outfit.id)?.name ?? outfit.id };
  }
  return { kind: "sticker", label: nextBaby(babies) };
}
