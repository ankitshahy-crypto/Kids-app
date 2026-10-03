import type { IllustrationName } from "../illustrations";
import { starterDeck, type DeckWord } from "./deck";
import { pictureWords } from "./ladder";
import { LETTER_WORDS } from "./letterWords";
import { letterTile } from "./wordBuild";
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

export function isBabyAnimal(name: string): name is BabyAnimal {
  return (BABY_ANIMALS as readonly string[]).includes(name);
}

// One letter as a tile that names itself ("c, as in cat"). Shared with the letter cards (wordBuild.ts).
export { letterTile };

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

/*
 * Every round below takes a `salt`: a number that is different on each play
 * (the spin count, or a count kept by the game screen). It picks the word or
 * the letter, and shuffles the answers.
 *
 * Why: the first phone test found every game the same on every play. The
 * rounds were built from the first match in each list, so Hatch always showed
 * one word, Pop always asked for the first letter of the week, and the right
 * answer was always the first button. A child learned "tap the left one".
 * The same salt always gives the same round, so tests stay exact.
 */

/** A steady shuffle: the same items and salt always come out in the same order. */
function mix<T>(items: readonly T[], salt: number): T[] {
  const copy = [...items];
  let state = (Math.floor(Math.abs(salt)) + 1) >>> 0;
  for (let index = copy.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swap = state % (index + 1);
    const held = copy[index];
    copy[index] = copy[swap];
    copy[swap] = held;
  }
  return copy;
}

/** The item `salt` places along, going round. */
function turn<T>(items: readonly T[], salt: number): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(Math.abs(salt)) % items.length];
}

export type HatchRound = {
  word: DeckWord;
  level: HatchLevel;
  /** Indexes the child fills. Other letters are already showing. */
  blanks: number[];
  /** Lowercase letters on the big tiles, in a shuffled order. */
  choices: string[];
};

function knownSet(known: readonly string[]): Set<string> {
  return new Set(known.map((letter) => letter.toLowerCase()).filter((letter) => /^[a-z]$/.test(letter)));
}

/** One letter to a tile, and none silent: a word whose blanks can be filled from letter tiles. */
function spellable(word: DeckWord): boolean {
  return !word.sentenceId && !word.letterCard && word.letters.every((tile) => tile.char.length === 1 && !tile.silent && !tile.wordId);
}

const tileChars = (word: DeckWord) => word.letters.map((letter) => letter.char.toLowerCase());

/**
 * A picture word for this egg. The picture is the question, so only words
 * with a drawing of their own are used (the old pool included "a" under an
 * apple, and words with another word's picture).
 *
 * Level 1 asks for a first sound, so the word starts with a taught letter.
 * Levels 2 and 3 ask for the taught letters of a three-letter or a longer
 * word; a word the child can spell in full is preferred. `salt` moves through
 * the words that fit.
 */
function pickWord(words: readonly DeckWord[], level: HatchLevel, known: Set<string>, salt: number): DeckWord {
  const drawn = words.filter((word) => Boolean(word.illustration) && spellable(word));
  const pool = drawn.length > 0 ? drawn : starterDeck.words;
  const sized = pool.filter((word) => (level === 1 ? word.letters.length <= 4 : level === 2 ? word.letters.length === 3 : word.letters.length > 3));
  const fits = sized.length > 0 ? sized : pool;
  if (known.size === 0) return turn(fits, salt) ?? pool[0];
  if (level === 1) {
    const starts = fits.filter((word) => known.has(tileChars(word)[0] ?? ""));
    return turn(starts.length > 0 ? starts : fits, salt) ?? pool[0];
  }
  const whole = fits.filter((word) => tileChars(word).every((char) => known.has(char)));
  const partly = fits.filter((word) => tileChars(word).some((char) => known.has(char)));
  return turn(whole.length >= 2 ? whole : partly.length > 0 ? partly : fits, salt) ?? pool[0];
}

/** One egg. Level 1 blanks the first sound. Later levels blank every taught letter. */
export function hatchRound(
  known: readonly string[],
  level: HatchLevel,
  words: readonly DeckWord[] = starterDeck.words,
  salt = 0,
): HatchRound {
  const taught = knownSet(known);
  const word = pickWord(words, level, taught, salt);
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
  const rest = mix([...taught].filter((letter) => !needed.includes(letter)), salt);
  // Other letters come from the ones taught; when those run out, from letters that look nothing like them.
  const spare = [...SPARE_LETTERS, ..."abcdefghijklmnopqrstuvwxyz"].filter((letter) => !needed.includes(letter) && !rest.includes(letter));
  // One first sound is found among three letters; the letters of a whole word among six.
  const size = Math.max(level === 1 ? 3 : 6, needed.length);
  // The needed letters are always there; where they sit changes with every egg.
  const choices = mix([...new Set([...needed, ...rest, ...spare])].slice(0, size), salt + 7);
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

/** Letters that look nothing alike, to fill a round when few letters are taught yet. */
const SPARE_LETTERS = ["s", "t", "o", "b", "x", "e"];

/**
 * Six balloons: three with the letter to pop and three with other letters,
 * in a shuffled order. The letter moves through the ones taught, one per
 * play (it was always the week's first letter, in the same three places).
 */
export function popRound(known: readonly string[], salt = 0): { target: string; balloons: Balloon[] } {
  const letters = [...knownSet(known)];
  const target = turn(letters, salt) ?? "m";
  const others = mix(letters.filter((letter) => letter !== target), salt);
  const spare = SPARE_LETTERS.filter((letter) => letter !== target && !others.includes(letter));
  const distract = [...others, ...spare].slice(0, 3);
  const faces = mix([target, target, target, ...distract], salt + 3);
  return { target, balloons: faces.map((letter, index) => ({ id: String(index), letter, target: letter === target })) };
}

/** Something a child can name from its drawing, and the letter its name starts with. */
export type PictureItem = {
  id: string;
  letter: string;
  label: string;
  illustration: IllustrationName;
};

/** Words whose first letter does not make its usual sound: the g of gem says j. */
const ODD_FIRST_SOUND = new Set(["gem"]);
/** Letters that start words with the same sound: a cat and a kite both start with the k sound. */
const SAME_SOUND: Record<string, string[]> = { c: ["k", "q"], k: ["c", "q"], q: ["c", "k"] };

let pictureItemCache: PictureItem[] | null = null;

/**
 * Every drawing with a name that starts with one plain letter sound: the
 * letters' picture words, then the ladder's picture words. A word that starts
 * with a sound unit (ship, chick, whale) is left out, since its first letter
 * does not say its own sound there.
 */
export function pictureItems(): PictureItem[] {
  if (pictureItemCache) return pictureItemCache;
  const items: PictureItem[] = [];
  const add = (id: string, letter: string, label: string, illustration: IllustrationName) => {
    if (ODD_FIRST_SOUND.has(id) || items.some((item) => item.illustration === illustration || item.id === id)) return;
    items.push({ id, letter, label, illustration });
  };
  for (const entry of Object.values(LETTER_WORDS)) {
    // The id is the word's clip id ("yo-yo"), so a tapped picture can say its name.
    if (entry.word.toLowerCase().startsWith(entry.letter)) add(entry.word.toLowerCase().replace(/\s+/g, "-"), entry.letter, entry.word, entry.illustration);
  }
  for (const word of pictureWords()) {
    const first = word.letters[0];
    if (!first || first.char.length !== 1 || first.silent || !word.illustration) continue;
    add(word.id, first.char.toLowerCase(), word.word, word.illustration);
  }
  pictureItemCache = items;
  return items;
}

/**
 * Feed the Animal: four pictures, one or two of which start with the letter.
 *
 * It used to be nine "foods" drawn as plain colored circles (milk was a white
 * dot) for eight letters only, always asking for m with the same three dots.
 * Now any letter taught can be asked for, with real drawings: the animal eats
 * whatever starts with the sound, which is the game children know as feeding
 * a hungry monster.
 */
export function feedRound(known: readonly string[], salt = 0): { target: string; items: PictureItem[] } {
  const taught = knownSet(known);
  const all = pictureItems();
  const has = (letter: string) => all.some((item) => item.letter === letter);
  const askable = [...taught].filter(has);
  const target = turn(askable.length > 0 ? askable : ["m"], salt) ?? "m";
  const matching = mix(all.filter((item) => item.letter === target), salt).slice(0, 2);
  const apart = (item: PictureItem) => item.letter !== target && !(SAME_SOUND[target] ?? []).includes(item.letter);
  // Other pictures come from letters already taught when there are enough, so every name is a sound the child has met.
  const familiar = all.filter((item) => apart(item) && taught.has(item.letter));
  const others = mix(familiar.length >= 2 ? familiar : all.filter(apart), salt + 5).slice(0, 4 - matching.length);
  return { target, items: mix([...matching, ...others], salt + 11) };
}

/**
 * Words that rhyme, by the sound they end with. Every word has a drawing, so
 * a child who cannot read yet plays by picture and by ear.
 *
 * The old list was eight pairs shown as words over colored squares, and one
 * pair did not rhyme (nest and tent). Only the first two pairs were ever
 * used.
 */
export const RHYME_FAMILIES: readonly { ending: string; words: readonly string[] }[] = [
  { ending: "at", words: ["cat", "hat", "bat", "mat"] },
  { ending: "og", words: ["dog", "log", "frog"] },
  { ending: "ug", words: ["bug", "rug", "jug"] },
  { ending: "an", words: ["pan", "can", "van"] },
  { ending: "ig", words: ["pig", "dig"] },
  { ending: "et", words: ["net", "jet"] },
  { ending: "op", words: ["top", "mop"] },
  { ending: "un", words: ["sun", "bun"] },
  { ending: "ap", words: ["cap", "map", "tap"] },
  { ending: "ox", words: ["fox", "box"] },
  { ending: "ub", words: ["cub", "sub"] },
  { ending: "and", words: ["sand", "hand"] },
  { ending: "oat", words: ["boat", "goat"] },
  { ending: "ight", words: ["light", "night"] },
  { ending: "ar", words: ["star", "car", "jar"] },
  { ending: "ay", words: ["day", "hay"] },
  { ending: "ing", words: ["ring", "swing"] },
];

export type RhymeCard = {
  id: string;
  word: string;
  pair: string;
  illustration: IllustrationName;
};

/**
 * Two rhyming pairs, as four shuffled picture cards. The two families never
 * share a vowel sound, so cat and hat are not set beside map and tap.
 */
export function rhymeRound(salt = 0): RhymeCard[] {
  const drawings = new Map(pictureWords().map((word) => [word.id, word.illustration as IllustrationName]));
  const families = RHYME_FAMILIES.map((family) => ({ ...family, words: family.words.filter((word) => drawings.has(word)) })).filter(
    (family) => family.words.length >= 2,
  );
  const first = turn(families, salt) ?? families[0];
  const vowel = (ending: string) => ending.match(/[aeiou]+/)?.[0] ?? "";
  const apart = families.filter((family) => family !== first && vowel(family.ending) !== vowel(first.ending));
  const second = turn(apart, salt * 3 + 1) ?? apart[0];
  const cards = [first, second].flatMap((family, index) =>
    mix(family.words, salt + index).slice(0, 2).map((word) => ({ id: `${word}-${index}`, word, pair: String(index), illustration: drawings.get(word) as IllustrationName })),
  );
  return mix(cards, salt + 13);
}

export type MemoryFace = "upper" | "lower" | "numeral" | "dots";

export type MemoryCard = {
  id: string;
  pair: string;
  face: MemoryFace;
  value: string;
};

/** Three pairs: a big letter and its little letter, or a number and its dots. The three change with each board. */
export function memoryRound(known: readonly string[], mode: "letters" | "numbers", salt = 0): MemoryCard[] {
  if (mode === "numbers") {
    const values = mix([1, 2, 3, 4, 5, 6], salt).slice(0, 3);
    const cards = values.flatMap((value) => [
      { id: `num-${value}`, pair: String(value), face: "numeral" as const, value: String(value) },
      { id: `dots-${value}`, pair: String(value), face: "dots" as const, value: String(value) },
    ]);
    return mix(cards, salt + 1);
  }
  const taught = [...knownSet(known)];
  const letters = mix(taught.length >= 3 ? taught : ["m", "a", "s"], salt).slice(0, 3);
  const cards = letters.flatMap((letter) => [
    { id: `upper-${letter}`, pair: letter, face: "upper" as const, value: letter.toUpperCase() },
    { id: `lower-${letter}`, pair: letter, face: "lower" as const, value: letter },
  ]);
  return mix(cards, salt + 1);
}

/*
 * A play of several rounds.
 *
 * Each of these games was one round: one word, one letter, one board, then a button that said Done. A
 * game now plays a few rounds on the game kit (src/game/kit.tsx). The rounds are the round for this
 * play's salt and for the salts after it, and any that would ask for the same word or letter again is
 * passed over. When too few words or letters fit (a first week, one letter taught), the game is that
 * many rounds shorter, never the same question twice.
 */

/** How many rounds a reading game plays. */
export const GAME_ROUNDS = 3;

function gather<T>(make: (salt: number) => T, same: (a: T, b: T) => boolean, salt: number, count: number): T[] {
  const rounds: T[] = [];
  for (let step = 0; rounds.length < count && step < count * 6; step += 1) {
    const next = make(salt + step);
    if (!rounds.some((round) => same(round, next))) rounds.push(next);
  }
  return rounds;
}

/** Three eggs' worth of words, none twice. */
export function hatchRounds(known: readonly string[], level: HatchLevel, words: readonly DeckWord[] = starterDeck.words, salt = 0, count = GAME_ROUNDS): HatchRound[] {
  return gather(
    (at) => hatchRound(known, level, words, at),
    (a, b) => a.word.id === b.word.id,
    salt,
    count,
  );
}

/** Three letters to pop, none twice. */
export function popRounds(known: readonly string[], salt = 0, count = GAME_ROUNDS): { target: string; balloons: Balloon[] }[] {
  return gather(
    (at) => popRound(known, at),
    (a, b) => a.target === b.target,
    salt,
    count,
  );
}

/** Three letters to feed, none twice. */
export function feedRounds(known: readonly string[], salt = 0, count = GAME_ROUNDS): { target: string; items: PictureItem[] }[] {
  return gather(
    (at) => feedRound(known, at),
    (a, b) => a.target === b.target,
    salt,
    count,
  );
}

/** Two boards of rhymes. No word is on both. */
export function rhymeRounds(salt = 0, count = 2): RhymeCard[][] {
  return gather(
    (at) => rhymeRound(at),
    (a, b) => a.some((card) => b.some((other) => other.word === card.word)),
    salt,
    count,
  );
}

/** Memory is played twice: big and little letters, then numbers and dots. (They were two tabs with their names in writing.) */
export function memoryRounds(known: readonly string[], salt = 0): { mode: "letters" | "numbers"; cards: MemoryCard[] }[] {
  return (["letters", "numbers"] as const).map((mode) => ({ mode, cards: memoryRound(known, mode, salt) }));
}

/** The lines these games say that they did not say before. */
const PLAY_LINES: Record<string, string> = {
  // What the rhyme game says of two pictures.
  "play-rhyme-yes": "They rhyme!",
  "play-rhyme-no": "They do not rhyme.",
  // Spin & Say: the bonus was three words on the screen, and the tracing challenge said nothing at all.
  "play-bonus": "A present for you! Tap the check.",
  "play-trace": "Trace the letter.",
};

export function playLine(id: string): string {
  return PLAY_LINES[id] ?? "";
}

/** The reading games' new spoken lines. scripts/sync-manifest.ts writes these into the clip list. */
export function playManifestEntries(): { id: string; say: string }[] {
  return Object.entries(PLAY_LINES).map(([id, say]) => ({ id, say }));
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

/** A letter to listen for, and three letters to choose from, shuffled. */
export function soundChoices(known: readonly string[], salt = 0): { target: string; choices: string[] } {
  const pool = [...knownSet(known)];
  const letters = pool.length > 0 ? pool : ["m", "a", "s"];
  const target = turn(letters, salt) ?? "m";
  const others = mix(letters.filter((letter) => letter !== target), salt);
  const spare = SPARE_LETTERS.filter((letter) => letter !== target && !others.includes(letter));
  return { target, choices: mix([target, ...[...others, ...spare].slice(0, 2)], salt + 5) };
}

export type WordBlank = {
  word: DeckWord;
  blank: number;
  choices: string[];
};

/** One missing letter in a picture word. Level 1 hides the first sound, like “_ a t”. */
export function wordBlank(
  known: readonly string[],
  level: HatchLevel,
  words: readonly DeckWord[] = starterDeck.words,
  salt = 0,
): WordBlank {
  const round = hatchRound(known, level, words, salt);
  // Past level 1 the missing letter moves through the word's taught letters.
  const blank = level === 1 ? (round.blanks[0] ?? 0) : (turn(round.blanks, salt) ?? 0);
  const answer = round.word.letters[blank]?.char.toLowerCase() ?? "a";
  const rest = round.choices.filter((letter) => letter !== answer);
  return { word: round.word, blank, choices: mix([answer, ...rest.slice(0, 2)], salt + 5) };
}

/**
 * How many things to count on this spin. It was the day's lesson number on
 * every spin; now it moves from 1 up to a little past that number.
 */
export function spinCount(lesson: number, salt = 0): number {
  const top = Math.max(3, Math.min(10, (Math.floor(lesson) || 1) + 2));
  return 1 + (Math.floor(Math.abs(salt)) * 7 + (Math.floor(lesson) || 1)) % top;
}

export function countChoices(total: number, salt = 0): { total: number; choices: number[] } {
  const count = Math.max(1, Math.min(10, Math.floor(total) || 1));
  const choices = [count];
  if (count > 1) choices.push(count - 1);
  if (count < 10) choices.push(count + 1);
  while (choices.length < 3) {
    const next = (choices[choices.length - 1] ?? count) + 1;
    if (!choices.includes(next)) choices.push(next);
    else break;
  }
  return { total: count, choices: mix(choices.slice(0, 3), salt + 5) };
}

/** A color to find among three swatches. The color moves through the lesson's colors, one per spin. */
export function colorChoices(target: string, options: readonly string[], salt = 0): { target: string; choices: string[] } {
  const named = options.map((color) => color.toLowerCase());
  const lesson = target.trim().toLowerCase() || "red";
  const pool = named.includes(lesson) ? named : [lesson, ...named];
  const hear = turn(pool, salt) ?? lesson;
  const rest = mix(pool.filter((color) => color !== hear), salt);
  const fallback = ["red", "blue", "yellow", "green"].filter((color) => color !== hear && !rest.includes(color));
  return { target: hear, choices: mix([hear, ...[...rest, ...fallback].slice(0, 2)], salt + 5) };
}

/** The letter to trace on this spin. It moves through the letters the child knows, one per spin. */
export function traceLetter(known: readonly string[], salt = 0): string {
  const letters = [...knownSet(known)];
  return letters[Math.abs(Math.floor(salt)) % Math.max(1, letters.length)] ?? "m";
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
