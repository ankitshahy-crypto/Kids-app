import type { IllustrationName } from "../illustrations";
import type { DeckWord, LetterTile } from "./deck";
import type { PhonemeId } from "./phonemes";
import { isUnit, splitSounds } from "./units";

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
  q: "q",
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

/** The phoneme id for one letter or sound unit. */
export function phonemeOf(piece: string): PhonemeId {
  const lower = piece.toLowerCase();
  if (isUnit(lower)) return lower as PhonemeId;
  const phoneme = PHONEME[lower];
  if (!phoneme) throw new Error(`No sound for "${piece}"`);
  return phoneme as PhonemeId;
}

/**
 * The tiles of a word spelled the way it sounds: a letter a tile, except that
 * a digraph or vowel team is one tile (sh-i-p) and the e of a magic-e word is
 * a silent tile (c-a-k-e).
 */
export function tilesOf(text: string): LetterTile[] {
  return splitSounds(text).flatMap((piece): LetterTile[] => {
    if (piece.silent) return [{ char: piece.text, phoneme: "eh", silent: true }];
    // A spelling the app has no sound for (the ow of crown) stays one tile per letter.
    if (piece.untaught) return [...piece.text].map((char) => ({ char, phoneme: phonemeOf(char) }));
    return [{ char: piece.text, phoneme: phonemeOf(piece.sound) }];
  });
}

/** A word spelled the way it sounds, one tile per sound. */
export function made(id: string, text: string, illustration?: IllustrationName): DeckWord {
  const tiles = tilesOf(text);
  const spelled = tiles.map((tile) => tile.char).join("");
  if (spelled !== text.toLowerCase()) throw new Error(`"${id}" spells "${spelled}"`);
  // No drawing: the key is left off, so "illustration" in word tells a picture word from a plain one.
  return illustration ? { id, word: text, illustration, letters: tiles } : { id, word: text, letters: tiles };
}
