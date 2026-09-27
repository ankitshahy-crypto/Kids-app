import type { IllustrationName } from "../illustrations";
import type { DeckWord } from "./deck";
import { starterDeck } from "./deck";
import { letterSchedule } from "./schedule";
import { COLORS } from "./colors";
import { MATH } from "./math";
import { READING, type SubjectId } from "./subject";

export type SheetKind = {
  subject: SubjectId;
  id: string;
  title: string;
};

/** Printable kinds a subject can offer. Reading has letter tracing and blending. */
const sheetCatalog: SheetKind[] = [
  { subject: READING, id: "letter", title: "Letter tracing" },
  { subject: READING, id: "blending", title: "Blending" },
  { subject: MATH, id: "trace", title: "Number tracing" },
  { subject: MATH, id: "count", title: "Counting" },
  { subject: COLORS, id: "coloring", title: "Coloring page" },
];

export function sheetsFor(subject: SubjectId): SheetKind[] {
  return sheetCatalog.filter((sheet) => sheet.subject === subject);
}

export const pictogramKinds = [
  "moon",
  "tent",
  "igloo",
  "nest",
  "octopus",
  "umbrella",
  "goat",
  "egg",
  "rain",
  "leaf",
  "kite",
  "jet",
  "wagon",
  "van",
  "yak",
  "zoo",
  "box",
  "quilt",
] as const;

export type PictogramKind = (typeof pictogramKinds)[number];

export type PictureWord = {
  letter: string;
  word: string;
  illustration?: IllustrationName;
  pictogram?: PictogramKind;
};

/** A familiar picture word for each letter in the teaching order. */
export const pictureWords: Record<string, PictureWord> = {
  m: { letter: "m", word: "moon", pictogram: "moon" },
  a: { letter: "a", word: "apple", illustration: "apple" },
  s: { letter: "s", word: "sun", illustration: "sun" },
  t: { letter: "t", word: "tent", pictogram: "tent" },
  p: { letter: "p", word: "pig", illustration: "pig" },
  i: { letter: "i", word: "igloo", pictogram: "igloo" },
  n: { letter: "n", word: "nest", pictogram: "nest" },
  d: { letter: "d", word: "dog", illustration: "dog" },
  o: { letter: "o", word: "octopus", pictogram: "octopus" },
  c: { letter: "c", word: "cat", illustration: "cat" },
  u: { letter: "u", word: "umbrella", pictogram: "umbrella" },
  b: { letter: "b", word: "bus", illustration: "bus" },
  g: { letter: "g", word: "goat", pictogram: "goat" },
  h: { letter: "h", word: "hat", illustration: "hat" },
  e: { letter: "e", word: "egg", pictogram: "egg" },
  r: { letter: "r", word: "rain", pictogram: "rain" },
  f: { letter: "f", word: "fox", illustration: "fox" },
  l: { letter: "l", word: "leaf", pictogram: "leaf" },
  k: { letter: "k", word: "kite", pictogram: "kite" },
  j: { letter: "j", word: "jet", pictogram: "jet" },
  w: { letter: "w", word: "wagon", pictogram: "wagon" },
  v: { letter: "v", word: "van", pictogram: "van" },
  y: { letter: "y", word: "yak", pictogram: "yak" },
  z: { letter: "z", word: "zoo", pictogram: "zoo" },
  x: { letter: "x", word: "box", pictogram: "box" },
  q: { letter: "q", word: "quilt", pictogram: "quilt" },
};

export function scheduleLetters(): string[] {
  return letterSchedule.flatMap((week) => week.newLetters);
}

export function pictureForLetter(letter: string): PictureWord {
  const key = letter.toLowerCase();
  return pictureWords[key] ?? { letter: key, word: key, pictogram: "moon" };
}

/** Short CVC words. Prefer words built from the chosen letters when there are enough. */
export function blendingWords(letters: string[]): DeckWord[] {
  const cvc = starterDeck.words.filter((word) => word.word.length === 3 && word.letters.length === 3);
  const wanted = new Set(letters.map((letter) => letter.toLowerCase()));
  const matched = cvc.filter((word) => word.letters.every((letter) => wanted.has(letter.char)));
  const picked = matched.length >= 3 ? matched : cvc;
  return picked.slice(0, 6);
}
