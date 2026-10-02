import type { IllustrationName } from "../illustrations";

/**
 * The one picture word for each letter, used everywhere a letter is shown with
 * a word: the letter card ("m, as in moon"), the big-and-little line in Draw,
 * the grown-up tip, and the printable sheet.
 *
 * Why one list: the first phone test found three different word sets in use.
 * The card said "i, as in pig" under a pig, the Draw step said "like igloo",
 * the tip asked about igloo, and twelve cards had no picture at all. A child
 * was shown the same pig for both p and i in the same week.
 *
 * Rules for a word here:
 *  - it starts with the letter's sound (x is the exception: it ends "fox");
 *  - a short vowel gets a word that starts with that vowel (apple, egg,
 *    igloo, octopus, umbrella), not a word with the vowel in the middle;
 *  - it has its own drawing, and no two letters share one.
 *
 * The letter clips in audioManifest.json say these words ("t, as in tent");
 * letterWords.test.ts fails when the two drift apart.
 */
export type LetterWord = {
  letter: string;
  word: string;
  illustration: IllustrationName;
};

function entry(letter: string, word: string, illustration: IllustrationName): LetterWord {
  return { letter, word, illustration };
}

/** In teaching order (see schedule.ts). */
export const LETTER_WORDS: Record<string, LetterWord> = {
  m: entry("m", "moon", "moon"),
  a: entry("a", "apple", "apple"),
  s: entry("s", "sun", "sun"),
  t: entry("t", "tent", "tent"),
  p: entry("p", "pig", "pig"),
  i: entry("i", "igloo", "igloo"),
  n: entry("n", "nest", "nest"),
  d: entry("d", "dog", "dog"),
  o: entry("o", "octopus", "octopus"),
  c: entry("c", "cat", "cat"),
  u: entry("u", "umbrella", "umbrella"),
  b: entry("b", "bus", "bus"),
  g: entry("g", "goat", "goat"),
  h: entry("h", "hat", "hat"),
  e: entry("e", "egg", "egg"),
  r: entry("r", "rain", "rain"),
  f: entry("f", "fish", "fish"),
  l: entry("l", "lamp", "lamp"),
  k: entry("k", "kite", "kite"),
  j: entry("j", "jet", "jet"),
  w: entry("w", "web", "web"),
  v: entry("v", "van", "van"),
  y: entry("y", "yo-yo", "yoyo"),
  z: entry("z", "zebra", "zebra"),
  x: entry("x", "fox", "fox"),
  q: entry("q", "queen", "queen"),
};

export function letterWord(letter: string): LetterWord {
  const key = letter.toLowerCase().slice(0, 1);
  return LETTER_WORDS[key] ?? entry(key, key, "apple");
}
