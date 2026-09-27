import type { IllustrationName } from "../illustrations";
import type { DeckWord } from "./deck";
import type { PhonemeId } from "./phonemes";

/** Letter to phoneme key for words built from plain text. */
export const PHONEME: Record<string, string> = {
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
  v: "v",
  w: "w",
};

/** A word whose sounds are given one by one, for letters the map does not cover. */
export function spell(id: string, text: string, phonemes: PhonemeId[], illustration: IllustrationName): DeckWord {
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

export function sounds(text: string): PhonemeId[] {
  return [...text.toLowerCase()].map((char) => {
    const phoneme = PHONEME[char];
    if (!phoneme) throw new Error(`No sound for "${char}" in "${text}"`);
    return phoneme as PhonemeId;
  });
}

/** A word spelled the way it sounds, one tile per letter. */
export function made(id: string, text: string, illustration: IllustrationName): DeckWord {
  return spell(id, text, sounds(text), illustration);
}
