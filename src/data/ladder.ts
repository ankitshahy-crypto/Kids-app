import type { IllustrationName } from "../illustrations";
import { starterDeck, type DeckWord, type LetterTile } from "./deck";
import { alphabetSize } from "./schedule";
import type { ThemeId } from "./themes";
import { themedEntries, themedWordCatalog } from "./themeWords";
import { isUnit, lettersOnly, soundMet, soundUnit } from "./units";
import { letterWord } from "./letterWords";
import { letterTile, made, phonemeOf } from "./wordBuild";

/** 1 is a one-letter word. 5 is phonics for ages 5 to 7. */
export const LADDER_STEPS = [1, 2, 3, 4, 5] as const;
export type LadderStep = (typeof LADDER_STEPS)[number];

/** A few finished word tries move up one step. A miss never moves back. */
export const SUCCESSES_TO_ADVANCE = 3;

export type LadderProgress = {
  step: LadderStep;
  successes: number;
  /** The local day the words below were counted on. */
  day?: string;
  /** Words that already counted today, so a replay is one try, not three. */
  words?: string[];
};


export function isLadderStep(value: number): value is LadderStep {
  return LADDER_STEPS.includes(value as LadderStep);
}

export function emptyLadder(): LadderProgress {
  return { step: 1, successes: 0 };
}

function cleanWords(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const words = value.filter((item): item is string => typeof item === "string" && item.length > 0 && item.length <= 32);
  return [...new Set(words)].slice(0, 64);
}

export function normalizeLadder(value: unknown): LadderProgress {
  if (!value || typeof value !== "object") return emptyLadder();
  const raw = value as Partial<LadderProgress>;
  const step = typeof raw.step === "number" && isLadderStep(raw.step) ? raw.step : 1;
  const successes =
    typeof raw.successes === "number" && raw.successes > 0 ? Math.min(SUCCESSES_TO_ADVANCE, Math.floor(raw.successes)) : 0;
  const day = typeof raw.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.day) ? raw.day : undefined;
  const words = day ? cleanWords(raw.words) : [];
  return day && words.length > 0 ? { step, successes, day, words } : { step, successes };
}

/** A teacher places the child on a step. The success streak starts over. */
export function assignLadderStep(progress: LadderProgress | undefined, step: LadderStep): LadderProgress {
  const current = normalizeLadder(progress);
  if (current.step === step) return { ...current, successes: 0 };
  return { step, successes: 0 };
}

/**
 * Count one finished word try. Three successes move up one step.
 * A word counts once per local day: replaying "cat" three times is one try,
 * and tomorrow it counts again. Step 5 stays reserved for phonics until that
 * level is open, or a teacher sets it.
 *
 * `cap` is the furthest step the letters taught so far can support
 * (ladderCap). Without it a child was on "Four letters" within three days of
 * starting, knowing only m and a: a step is a word length, and there is no
 * four-letter word to read with two letters.
 */
export function recordLadderSuccess(
  progress: LadderProgress | undefined,
  options?: { phonicsOpen?: boolean; word?: string; day?: string; cap?: LadderStep },
): { ladder: LadderProgress; advanced: boolean } {
  const current = normalizeLadder(progress);
  const word = options?.word?.trim().toLowerCase() ?? "";
  const day = options?.day ?? "";
  const counted = word && day && current.day === day ? (current.words ?? []) : [];
  if (word && day && counted.includes(word)) return { ladder: current, advanced: false };
  const memo = word && day ? { day, words: [...counted, word].slice(-64) } : {};
  if (current.step >= 5) {
    return { ladder: { step: 5, successes: Math.min(SUCCESSES_TO_ADVANCE, current.successes + 1), ...memo }, advanced: false };
  }
  const successes = current.successes + 1;
  const blocked = (current.step === 4 && !options?.phonicsOpen) || (options?.cap !== undefined && current.step >= options.cap);
  if (successes >= SUCCESSES_TO_ADVANCE && !blocked) {
    return { ladder: { step: (current.step + 1) as LadderStep, successes: 0, ...memo }, advanced: true };
  }
  return {
    ladder: { step: current.step, successes: Math.min(SUCCESSES_TO_ADVANCE, successes), ...memo },
    advanced: false,
  };
}

/** All 26 letters have been introduced, so phonics words can open on their own. */
export function phonicsOpen(introducedCount: number): boolean {
  return introducedCount >= alphabetSize();
}

export function ladderTitle(step: LadderStep): string {
  if (step === 1) return "Letter sounds";
  if (step === 2) return "Two letters";
  if (step === 3) return "Short words";
  if (step === 4) return "Four letters";
  return "Phonics 5–7";
}

export function ladderDetail(step: LadderStep): string {
  if (step === 1) return "m, a, then am";
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

/**
 * Step 1 has no words of its own: it is the letter cards, and the first
 * two-letter blend the week's letters make (see blendList).
 *
 * Why: the first phone test showed the old step-1 cards, the one-letter words
 * "a" and "I", confused everyone. "a" looked like a second A card with an
 * apple, and "I" played the short i of "pig" under a picture of a child. Both
 * words are still read whole in the stories and sentences.
 */
const step1: DeckWord[] = [];

/**
 * Step 2. Two-letter words that sound the way they are spelled. They have no
 * drawings ("at" cannot be drawn, and the old "an" showed an ant), so each
 * card shows the child's animal saying the word. "is" is left to the stories:
 * its s says z, and sounding it out letter by letter would teach it wrong.
 */
const step2: DeckWord[] = [
  made("am", "am"),
  made("at", "at"),
  made("an", "an"),
  made("in", "in"),
  made("it", "it"),
  made("on", "on"),
  made("up", "up"),
];

/**
 * Step 3. Three-letter words, in the order their letters are taught, so the
 * first weeks have words a child can sound out (mat and sat in week 2).
 *
 * A word has a drawing only when the drawing is that word. The phone test
 * found pictures standing in for other words (pin showed a toy, tin showed
 * milk, pan showed sand, net showed a nest, sad showed a smiling child); those
 * words now have their own drawing or none.
 */
const step3: DeckWord[] = [
  // m a s t
  made("mat", "mat", "mat"),
  made("sat", "sat"),
  // p i
  made("map", "map", "map"),
  made("tap", "tap", "tap"),
  made("pat", "pat"),
  made("pit", "pit"),
  made("sip", "sip"),
  made("sit", "sit"),
  made("tip", "tip"),
  // n d
  made("pan", "pan", "pan"),
  made("pin", "pin", "pin"),
  made("man", "man"),
  made("nap", "nap"),
  made("mad", "mad"),
  made("sad", "sad", "sad"),
  made("ant", "ant", "ant"),
  made("and", "and"),
  // o c
  fromDeck("cat"),
  made("cot", "cot"),
  made("dot", "dot"),
  made("pot", "pot", "pot"),
  made("top", "top", "top"),
  made("mop", "mop", "mop"),
  made("cap", "cap", "cap"),
  made("can", "can", "can"),
  // u b
  fromDeck("bus"),
  fromDeck("sun"),
  fromDeck("cup"),
  made("cub", "cub", "cub"),
  made("cab", "cab", "cab"),
  made("bat", "bat", "bat"),
  made("bun", "bun", "bun"),
  made("tub", "tub"),
  made("nut", "nut", "nut"),
  made("mud", "mud"),
  made("sub", "sub", "sub"),
  // g h
  fromDeck("hat"),
  fromDeck("dog"),
  fromDeck("pig"),
  made("bag", "bag", "bag"),
  made("bug", "bug", "bug"),
  made("hug", "hug"),
  made("dig", "dig", "dig"),
  made("hog", "hog"),
  made("hop", "hop"),
  // e r
  fromDeck("bed"),
  made("hen", "hen", "hen"),
  made("net", "net", "net"),
  made("pet", "pet"),
  made("red", "red"),
  made("ten", "ten"),
  made("gem", "gem", "gem"),
  made("rat", "rat"),
  made("run", "run"),
  made("rug", "rug", "rug"),
  // f l
  made("log", "log", "log"),
  made("fog", "fog"),
  made("fun", "fun"),
  made("elf", "elf"),
  // k
  made("kid", "kid"),
  // j w
  made("jet", "jet", "jet"),
  made("jam", "jam"),
  made("jug", "jug", "jug"),
  made("jog", "jog"),
  made("web", "web", "web"),
  made("wig", "wig"),
  made("win", "win"),
  // v y
  made("van", "van", "van"),
  made("vet", "vet"),
  made("yam", "yam"),
  made("yak", "yak"),
  made("yes", "yes"),
  // z
  made("zip", "zip"),
  made("zap", "zap"),
  // x q
  fromDeck("fox"),
  made("box", "box", "box"),
  made("six", "six"),
  made("mix", "mix"),
];

/** Step 4. Four-letter CCVC and CVCC words. */
const step4: DeckWord[] = [
  made("sand", "sand", "sand"),
  made("hand", "hand", "hand"),
  made("nest", "nest", "nest"),
  made("tent", "tent", "tent"),
  made("stop", "stop", "stopsign"),
  made("drum", "drum", "drum"),
  made("frog", "frog", "frog"),
  made("lamp", "lamp", "lamp"),
  made("flag", "flag", "flag"),
  made("crab", "crab", "crab"),
  made("milk", "milk", "milk"),
  made("jump", "jump", "jumper"),
  made("wasp", "wasp", "wasp"),
  made("fish", "fish", "fish"),
];

/**
 * Step 5 words: longer words, and the words of the sound units taught from
 * week 15 (sh, ee, magic e). A unit word is one tile per sound, so "ship" is
 * sh-i-p, and the e of "cake" is a silent tile.
 */
const step5Words: DeckWord[] = [
  // "apple" used to lead this list. It is not spelled the way it sounds (two p tiles, and "le"),
  // so it is no longer sounded out; it is still the picture for the letter a.
  made("plant", "plant", "plant"),
  made("grape", "grape", "grape"),
  made("smile", "smile", "smile"),
  made("ship", "ship", "ship"),
  made("shop", "shop", "shop"),
  made("chick", "chick", "chick"),
  made("chest", "chest", "chest"),
  made("moth", "moth", "moth"),
  made("bath", "bath", "bath"),
  made("ring", "ring", "ring"),
  made("swing", "swing", "swing"),
  made("duck", "duck", "duck"),
  made("sock", "sock", "sock"),
  made("bee", "bee", "bee"),
  made("feet", "feet", "feet"),
  made("moon", "moon", "moon"),
  made("boot", "boot", "boot"),
  made("rain", "rain", "rain"),
  made("snail", "snail", "snail"),
  made("day", "day", "day"),
  made("hay", "hay", "hay"),
  made("boat", "boat", "boat"),
  made("goat", "goat", "goat"),
  made("light", "light", "light"),
  made("night", "night", "night"),
  made("cake", "cake", "cake"),
  made("gate", "gate", "gate"),
  made("kite", "kite", "kite"),
  made("bike", "bike", "bike"),
  made("bone", "bone", "bone"),
  made("rope", "rope", "rope"),
  made("cube", "cube", "cube"),
  made("tune", "tune", "tune"),
  made("car", "car", "car"),
  made("jar", "jar", "jar"),
  made("fork", "fork", "fork"),
  made("corn", "corn", "corn"),
  made("fern", "fern", "fern"),
  made("bird", "bird", "bird"),
  made("shirt", "shirt", "shirt"),
  made("leaf", "leaf", "leaf"),
  made("seal", "seal", "seal"),
  made("cloud", "cloud", "cloud"),
  made("mouse", "mouse", "mouse"),
  made("coin", "coin", "coin"),
  made("whale", "whale", "whale"),
  made("wheel", "wheel", "wheel"),
];

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
      if (step === 1) throw new Error(`"${word.id}": step 1 has no words of its own`);
      if (step === 2 && length !== 2) throw new Error(`"${word.id}" is not two letters`);
      if (step === 3 && length !== 3) throw new Error(`"${word.id}" is not a short word`);
      if (step === 4 && length !== 4) throw new Error(`"${word.id}" is not four letters`);
      if (step === 5 && length < 5 && !word.letters.some((tile) => tile.silent || isUnit(tile.char))) {
        throw new Error(`"${word.id}" is not a longer word or a sound-unit word`);
      }
    }
  }
  for (const line of step5Sentences) {
    if (!line.sentenceId) throw new Error(`"${line.id}" needs a sentence id`);
    if (seen.has(line.id)) throw new Error(`Duplicate ladder id "${line.id}"`);
    seen.add(line.id);
  }
}

checkWords();

/** A regular ladder word by id, for themed lists that reuse one. */
function ladderWord(id: string): DeckWord | undefined {
  for (const step of LADDER_STEPS) {
    const found = byStep[step].find((word) => word.id === id);
    if (found) return found;
  }
  return undefined;
}

function checkThemedWords(): void {
  const regular = new Set(LADDER_STEPS.flatMap((step) => byStep[step].map((word) => word.id)));
  for (const word of themedWordCatalog()) {
    if (regular.has(word.id)) throw new Error(`Themed word "${word.id}" is already a ladder word`);
    const spelled = word.letters.map((letter) => letter.char).join("");
    if (spelled !== word.word) throw new Error(`"${word.id}" spells "${spelled}"`);
  }
  for (const step of LADDER_STEPS) {
    for (const entry of themedEntries(["dinosaurs", "vehicles", "space", "animals", "bugs", "ocean", "castles"], step)) {
      if ("use" in entry) {
        const found = ladderWord(entry.use);
        if (!found) throw new Error(`Theme uses unknown ladder word "${entry.use}"`);
        if (!byStep[step].includes(found)) throw new Error(`"${entry.use}" is not a step ${step} word`);
        continue;
      }
      const length = entry.word.length;
      if (step <= 4 && length !== step) throw new Error(`Themed "${entry.id}" is not a step ${step} word`);
      if (step === 5 && length < 5) throw new Error(`Themed "${entry.id}" is not a longer word`);
    }
  }
}

checkThemedWords();

/** The words of this step only (some have no drawing). Sentences stay out of letter games. */
export function wordsForStep(step: LadderStep): DeckWord[] {
  return byStep[step];
}

/**
 * The words of this step that have a drawing, for games where the picture is
 * the question (Hatch the Egg, the Spin & Say word). A step with none (1 and
 * 2) gives an empty list, and those games fall back to the starter pictures.
 */
export function pictureWordsForStep(step: LadderStep): DeckWord[] {
  return byStep[step].filter((word) => Boolean(word.illustration));
}

/** Every ladder word with a drawing of its own, shortest words first: the pool for picture games. */
export function pictureWords(): DeckWord[] {
  return LADDER_STEPS.flatMap((step) => pictureWordsForStep(step));
}

/** Words from step 1 through this step. */
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

/** Drawings for the sound-unit cards of weeks 15 to 26: each is the unit's example word. */
const UNIT_PICTURES: Partial<Record<string, IllustrationName>> = {
  sh: "ship",
  ch: "chick",
  th: "thumb",
  ng: "ring",
  ck: "duck",
  ee: "bee",
  oo: "moon",
  ai: "rain",
  ay: "day",
  oa: "boat",
  igh: "light",
  a_e: "cake",
  i_e: "kite",
  o_e: "bone",
  u_e: "cube",
  ar: "star",
  or: "fork",
  er: "fern",
  ir: "bird",
  ea: "leaf",
  ou: "cloud",
  oi: "coin",
  wh: "whale",
};

/** The example word a letter card names: "m, as in moon" gives "moon". One list for the whole app (letterWords.ts). */
export function letterExample(letter: string): string {
  return letterWord(letter).word;
}

const letterCardCache = new Map<string, DeckWord>();

/**
 * A letter-sound card for the letter of the week: one tile that plays the
 * letter's phrase ("m, as in moon") under a drawing of that word.
 *
 * A letter has one picture word, the same for every child. An interest theme
 * used to swap it ("m, as in moth" for Bugs, "d, as in dinosaur"), and the
 * first phone test showed why that does not work: the card said moth, the
 * Draw step and the tip said moon, more than half the themed words had no
 * drawing (the card showed a bare letter), and several were poor examples of
 * the sound (truck, orbit, owl). The picture word is the child's hook for the
 * sound, so it stays put; themes still choose the words to read, the things
 * to count and the story lines.
 */
export function letterCard(letter: string): DeckWord {
  const char = isUnit(letter) ? letter.toLowerCase() : letter.toLowerCase().slice(0, 1);
  // One object per letter, like the fixed word lists, so a card keeps its
  // state while the lesson list is recomputed around it.
  const cached = letterCardCache.get(char);
  if (cached) return cached;
  const unit = soundUnit(char);
  const picture = unit ? UNIT_PICTURES[unit.id] : letterWord(char).illustration;
  const card: DeckWord = {
    id: `letter-${char}`,
    word: unit ? unit.example : letterWord(char).word,
    letterCard: true,
    // A unit card shows its letters as they are written ("sh", "a-e") when its word has no drawing.
    ...(picture ? { illustration: picture } : { glyph: unit ? unit.label : char.toUpperCase() }),
    // letterTile names the letter, so C says "c, as in cat" and not its phoneme's "k, as in kite".
    letters: [unit ? { char: unit.label, phoneme: phonemeOf(char) } : letterTile(char)],
  };
  letterCardCache.set(char, card);
  return card;
}

/** The week's letters and sound units as cards, in plan order. */
export function letterCards(letters: readonly string[]): DeckWord[] {
  const seen = new Set<string>();
  const cards: DeckWord[] = [];
  for (const letter of letters) {
    const id = letter.toLowerCase();
    if (!(/^[a-z]$/.test(id) || isUnit(id)) || seen.has(id)) continue;
    seen.add(id);
    cards.push(letterCard(id));
  }
  return cards;
}

/** A tile's sound as the schedule names it: a letter, or a unit id such as "sh" or "a_e". */
function tileSound(tile: LetterTile): string {
  return isUnit(tile.phoneme) ? tile.phoneme : tile.char.toLowerCase();
}

/**
 * Can the child sound this word out? Every tile is a letter or a sound unit
 * that has been taught. A silent e and a whole-word tile always pass.
 */
export function decodable(word: DeckWord, known: ReadonlySet<string>): boolean {
  return word.letters.every((tile) => {
    if (tile.silent || tile.wordId) return true;
    return isUnit(tile.phoneme) ? soundMet(tile.phoneme, known) : known.has(tile.char.toLowerCase());
  });
}

/**
 * The furthest step the letters taught so far can support: the longest word
 * length (2, 3 or 4 letters) that has a word the child can sound out. Week 1
 * (m, a) reaches step 2 with "am"; "mat" opens step 3 in week 2; "sand" opens
 * step 4 in week 4. Step 5 opens with the whole alphabet (phonicsOpen).
 */
export function ladderCap(introduced: readonly string[]): LadderStep {
  const known = new Set(introduced.map((id) => id.toLowerCase()));
  let cap: LadderStep = 1;
  for (const step of [2, 3, 4] as const) {
    if (!byStep[step].some((word) => decodable(word, known))) break;
    cap = step;
  }
  return cap === 4 && phonicsOpen(lettersOnly(introduced).length) ? 5 : cap;
}

/**
 * Does finishing this card count toward the next step? Only a word the child
 * blended, and only one at least as long as the step asks for.
 *
 * Letter cards used to count ("letter:m"), so the first lesson, two letter
 * cards and one word, was three successes and a step up every day. A step up
 * now means three words of that step's length, read on different tries.
 */
export function countsForLadder(word: DeckWord, step: LadderStep): boolean {
  if (word.letterCard || word.sentenceId) return false;
  const tiles = word.letters.filter((tile) => !tile.silent).length;
  return tiles >= Math.max(2, Math.min(step, 4));
}

/** Does the word use one of these letters or units? */
function usesAny(word: DeckWord, sounds: ReadonlySet<string>): boolean {
  return word.letters.some((tile) => !tile.silent && !tile.wordId && sounds.has(tileSound(tile)));
}

/** Words read whole in the short sentences, not sounded out. */
const SIGHT_WORDS = new Set(["i", "a", "the", "is", "see"]);

/** Words in a lesson, after the letter cards. Step 1 is mostly cards, with a first taste of blending. */
export function lessonWordCount(step: LadderStep): number {
  return step === 1 ? 2 : 6;
}

/** The longest word a lesson on this step shows. Step 1 already blends two letters (m, a, then "am"). */
export function lessonMaxLetters(step: LadderStep): number {
  return Math.max(2, ladderMaxLetters(step));
}

/** `count` items starting `turn` places in, wrapping round, so a list moves on a little each day. */
function turnTo<T>(items: readonly T[], turn: number, count: number): T[] {
  if (items.length <= count) return [...items];
  const start = (((Math.floor(turn) * count) % items.length) + items.length) % items.length;
  return Array.from({ length: count }, (_, index) => items[(start + index) % items.length]);
}

/**
 * What the Letters step shows today: the week's letter cards, then words to slide under.
 *
 * Rebuilt after the first phone test, which showed four faults in the old list:
 *
 *  1. Sliding under a word is the point of the step, and week 1 had no word.
 *     Its cards were M, A and the one-letter words "a" and "I". Now the first
 *     lesson is M, A, then "am".
 *  2. The letter cards showed on step 1 only, so a child who had moved up a
 *     step never met the week's new letters here. Now they lead every lesson.
 *  3. The words were not ones the child could sound out. The list was the
 *     step's first six words whatever letters were known (cat, dog, sun in
 *     week 1). Now a word is in only when every letter in it has been taught
 *     (`introduced`: every letter and unit taught so far, this week's included).
 *  4. The list never changed: the same six words every day. Now `turn` (the
 *     day's number) moves each part of the list on, so tomorrow differs.
 *
 * Order: cards; then up to two themed words the child can read; then words
 * that use this week's letters (most of the list); then older words, so earlier
 * letters stay in practice. Step 5 ends with two short sentences.
 *
 * Without `introduced` (a printable sheet for letters a grown-up picked, or a
 * test) nothing is held back for its letters.
 */
export function blendList(
  step: LadderStep,
  letters: readonly string[],
  themes: readonly ThemeId[] = [],
  introduced?: readonly string[],
  turn = 0,
): DeckWord[] {
  const cards = letterCards(letters);
  const today = new Set(letters.map((id) => id.toLowerCase()));
  const known = introduced ? new Set([...introduced, ...letters].map((id) => id.toLowerCase())) : null;
  const longest = lessonMaxLetters(step);
  const fits = (word: DeckWord) => (step === 5 || word.word.length <= longest) && (!known || decodable(word, known));

  const themed: DeckWord[] = [];
  const regular: DeckWord[] = [];
  // Which step's list a word came from: its length, in effect (2 to 5).
  const level = new Map<DeckWord, number>();
  for (const current of LADDER_STEPS) {
    if (current > step && !(step === 1 && current === 2)) continue;
    for (const entry of themedEntries(themes, current)) {
      const word = "use" in entry ? ladderWord(entry.use) : entry;
      if (word && fits(word) && !themed.includes(word)) themed.push(word);
    }
    for (const word of byStep[current]) {
      if (!fits(word)) continue;
      regular.push(word);
      level.set(word, current);
    }
  }

  const total = lessonWordCount(step);
  const picked: DeckWord[] = turnTo(themed, turn, Math.min(2, total));
  const rest = regular.filter((word) => !picked.includes(word));
  // Longest first, so a child reads at their own word length: "sit" before "it" on step 3.
  const longestFirst = (a: DeckWord, b: DeckWord) => (level.get(b) ?? 0) - (level.get(a) ?? 0);
  // Words that use this week's letters.
  const fresh = rest.filter((word) => usesAny(word, today)).sort(longestFirst);
  // Older words, so earlier letters stay in practice ("mat", not "am", on step 3).
  const older = rest.filter((word) => !fresh.includes(word)).sort(longestFirst);
  // Most of the list is this week's letters; a third is kept for older words when there are any.
  const olderShare = older.length > 0 ? Math.max(1, Math.floor(total / 3)) : 0;
  const freshPick = turnTo(fresh, turn, Math.max(0, total - picked.length - olderShare));
  const olderWant = Math.max(0, total - picked.length - freshPick.length);
  // Stay on the longest older words while there are enough of them to move through.
  const top = older.filter((word) => level.get(word) === level.get(older[0]));
  const olderPick = turnTo(top.length >= olderWant * 2 ? top : older, turn, olderWant);
  const words = [...picked, ...freshPick, ...olderPick];
  // A sentence is held to the same rule as a word: each of its words is one the child can sound out, or
  // one of the few read whole (I, a, the, is, see). "A cat." waits for c and t.
  const readable = (line: DeckWord) =>
    !known ||
    line.letters.every((piece) => {
      const id = piece.wordId ?? "";
      const word = ladderWord(id);
      return SIGHT_WORDS.has(id) || (word ? decodable(word, known) : false);
    });
  const lines = step === 5 ? turnTo(sentencesForStep(step).filter(readable), turn, 2) : [];
  return [...cards, ...words, ...lines];
}

/** Words the child has already blended, at this step or an earlier one, themed words included. */
export function wordsToTrace(stickers: { kind: string; label: string }[], step: LadderStep): DeckWord[] {
  const known = new Set(
    stickers.filter((sticker) => sticker.kind === "word").map((sticker) => sticker.label.trim().toLowerCase()),
  );
  const themed = themedWordCatalog().filter((word) => word.word.length <= ladderMaxLetters(step));
  return [...wordsThrough(step), ...themed].filter((word) => known.has(word.word.toLowerCase()));
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
