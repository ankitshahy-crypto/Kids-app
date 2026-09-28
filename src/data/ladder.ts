import type { IllustrationName } from "../illustrations";
import manifest from "./audioManifest.json";
import { starterDeck, type DeckWord, type LetterTile } from "./deck";
import { alphabetSize } from "./schedule";
import { themedLetterExample, type ThemeId } from "./themes";
import { themedEntries, themedWordCatalog } from "./themeWords";
import { isUnit, soundMet, soundUnit } from "./units";
import { made, phonemeOf, spell } from "./wordBuild";

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
 */
export function recordLadderSuccess(
  progress: LadderProgress | undefined,
  options?: { phonicsOpen?: boolean; word?: string; day?: string },
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
  const blocked = current.step === 4 && !options?.phonicsOpen;
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

/**
 * Step 5 words: longer words, and the words of the sound units taught from
 * week 15 (sh, ee, magic e). A unit word is one tile per sound, so "ship" is
 * sh-i-p, and the e of "cake" is a silent tile.
 */
const step5Words: DeckWord[] = [
  fromDeck("apple"),
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

/** Does a word use this sound unit (or letter)? A unit tile is known by its phoneme, "a_e" for the a of cake. */
function usesSound(word: DeckWord, id: string): boolean {
  const lower = id.toLowerCase();
  return word.letters.some((tile) => !tile.silent && !tile.wordId && (isUnit(lower) ? tile.phoneme === lower : tile.char.toLowerCase() === lower));
}

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

/** Picture words on this step only. Sentences stay out of letter games. */
export function wordsForStep(step: LadderStep): DeckWord[] {
  return byStep[step];
}

/**
 * The step's words with the child's themes first: themed words drawn for the
 * theme, and regular words that fit it, then the rest of the regular list. A
 * step no theme has words for is the regular list.
 */
export function themedWordsForStep(step: LadderStep, themes: readonly ThemeId[]): DeckWord[] {
  const entries = themedEntries(themes, step);
  if (entries.length === 0) return byStep[step];
  const front: DeckWord[] = [];
  for (const entry of entries) {
    const word = "use" in entry ? ladderWord(entry.use) : entry;
    if (word && !front.includes(word)) front.push(word);
  }
  return [...front, ...byStep[step].filter((word) => !front.includes(word))];
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
  return word.letters.every((letter) => letter.wordId || letter.silent || known.has(letter.char.toLowerCase()));
}

/** Pictures for letter cards, where the drawing matches the spoken example. */
const LETTER_PICTURES: Partial<Record<string, IllustrationName>> = {
  a: "apple",
  c: "cat",
  d: "dog",
  e: "bed",
  f: "fish",
  h: "hat",
  i: "pig",
  l: "lamp",
  n: "nest",
  o: "dog",
  p: "pig",
  s: "sun",
  u: "sun",
  x: "fox",
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

const letterSays = manifest.letters as Record<string, { say?: string }>;

/** The example word the letter phrase names: "m, as in moon" gives "moon". */
export function letterExample(letter: string): string {
  const say = letterSays[letter.toLowerCase()]?.say ?? "";
  const match = say.match(/as in ([a-z]+)/i);
  return match ? match[1].toLowerCase() : letter.toLowerCase();
}

/**
 * A letter-sound card for the letter of the week: one tile that plays the
 * sound, then says its example word. Letters without a drawing show the letter.
 */
const letterCardCache = new Map<string, DeckWord>();

/** Themed example words that have a drawing of their own. */
const THEMED_PICTURES: Partial<Record<string, IllustrationName>> = {
  dinosaur: "dinosaurs",
  egg: "egg",
  truck: "vehicles",
  bus: "bus",
  car: "cab",
  van: "van",
  jet: "jet",
  rocket: "space",
  star: "star",
  cat: "cat",
  dog: "dog",
  pig: "pig",
  fox: "fox",
  hen: "hen",
  bug: "bug",
  ant: "ant",
  web: "web",
  fish: "fish",
  crab: "crab",
  wave: "wave",
  crown: "castles",
};

export function letterCard(letter: string, themes: readonly ThemeId[] = []): DeckWord {
  const char = isUnit(letter) ? letter.toLowerCase() : letter.toLowerCase().slice(0, 1);
  const unit = soundUnit(char);
  const themed = unit ? undefined : themedLetterExample(char, themes);
  const key = themed ? `${char}:${themed}` : char;
  // One object per letter (and themed example), like the fixed word lists, so
  // a card keeps its state while the lesson list is recomputed around it.
  const cached = letterCardCache.get(key);
  if (cached) return cached;
  const example = themed ?? unit?.example ?? letterExample(char);
  const picture = themed ? THEMED_PICTURES[themed] : LETTER_PICTURES[char];
  const card: DeckWord = {
    id: `letter-${char}`,
    word: example,
    letterCard: true,
    illustration: picture ?? "apple",
    // A unit card shows its letters as they are written ("sh", "a-e"), a letter card the capital.
    ...(picture ? {} : { glyph: unit ? unit.label : char.toUpperCase() }),
    letters: [
      {
        char: unit ? unit.label : char,
        phoneme: phonemeOf(char),
        // A themed card plays its own phrase, "d, as in dinosaur", not the regular one.
        ...(themed ? { say: `${char}, as in ${themed}`, sayId: `${char}-${themed.replace(/\s+/g, "-")}` } : {}),
      },
    ],
  };
  letterCardCache.set(key, card);
  return card;
}

/** The week's letters and sound units as cards, in plan order. */
export function letterCards(letters: readonly string[], themes: readonly ThemeId[] = []): DeckWord[] {
  const seen = new Set<string>();
  const cards: DeckWord[] = [];
  for (const letter of letters) {
    const id = letter.toLowerCase();
    if (!(/^[a-z]$/.test(id) || isUnit(id)) || seen.has(id)) continue;
    seen.add(id);
    cards.push(letterCard(id, themes));
  }
  return cards;
}

/** Does the word only use sound units the child has met? A word with no unit tiles always does. */
function unitsKnown(word: DeckWord, introduced: ReadonlySet<string>): boolean {
  return word.letters.every((tile) => tile.silent || tile.wordId || !isUnit(tile.phoneme) || soundMet(tile.phoneme, introduced));
}

/**
 * What drag-to-blend shows. Step 1 leads with the week's letters, so the card
 * on Today is the card in the lesson. A week that teaches a sound unit (sh,
 * ee) leads with its cards on every step, then the words that use it, since
 * a new sound has to be heard before its words. Known-letter words come next,
 * then the rest. Step 5 adds short sentences after the words, and leaves out
 * words whose sound units have not been introduced (`introduced` lists every
 * letter and unit taught so far; without it every word is in).
 */
export function blendList(
  step: LadderStep,
  letters: readonly string[],
  themes: readonly ThemeId[] = [],
  introduced?: readonly string[],
): DeckWord[] {
  if (step === 1) return [...letterCards(letters, themes), ...wordsForStep(1)];
  const units = letters.filter((letter) => isUnit(letter));
  const cards = letterCards(units, themes);
  const met = new Set([...(introduced ?? []), ...letters].map((id) => id.toLowerCase()));
  const words = themedWordsForStep(step, themes).filter((word) => !introduced || unitsKnown(word, met));
  const lines = sentencesForStep(step);
  const known = new Set(letters.map((letter) => letter.toLowerCase()));
  const theirs = words.filter((word) => units.some((unit) => usesSound(word, unit)));
  const matched = words.filter((word) => !theirs.includes(word) && lettersKnown(word, known));
  const rest = words.filter((word) => !theirs.includes(word) && !matched.includes(word));
  const ordered = [...theirs, ...matched, ...rest];
  if (ordered.length + lines.length <= 8) return [...cards, ...ordered, ...lines];
  const picked = theirs.length + matched.length >= 3 ? [...theirs, ...matched] : ordered;
  return [...cards, ...picked.slice(0, 6), ...lines.slice(0, 2)];
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
