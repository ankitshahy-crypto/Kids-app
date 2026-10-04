import type { LetterTile } from "./deck";

/**
 * Sounds a reader can hold ("mmm", "sss", "aaa") and sounds that are over at
 * once (t, p, d). On the slider a stretchy sound gets a longer tile with a long
 * line under its letter, and a quick sound a shorter tile with a dot, so a
 * child can see which sounds to stretch while sliding and which to say short.
 * A general phonics idea (continuous and stop sounds), drawn our own way.
 */
const STRETCHY = new Set([
  // vowels
  "ae", "eh", "ih", "aw", "uh",
  // consonants you can hold
  "m", "n", "s", "f", "l", "r", "v", "z",
  // sound units you can hold
  "sh", "th", "ng", "ee", "oo", "ai", "ay", "oa", "igh", "a_e", "i_e", "o_e", "u_e", "ar", "or", "er", "ir", "ea", "ou", "oi",
]);

export type SoundLength = "stretchy" | "quick";

export function soundLength(tile: Pick<LetterTile, "phoneme" | "silent" | "wordId">): SoundLength | null {
  if (tile.silent || tile.wordId) return null;
  return STRETCHY.has(tile.phoneme) ? "stretchy" : "quick";
}
