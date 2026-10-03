import { letterWord } from "./letterWords";

/** Manifest id for the big/little sentence. The clip is generated with the other prompts. */
export function pairPromptId(letter: string): string {
  return `pair-${letter.toLowerCase()}`;
}

/**
 * "Big A and little a both say a, as in apple"
 *
 * Why the wording changed: the line was written with the sound between
 * slashes ("both say /a/, like apple"), and the voice read the slashes aloud
 * ("per meter slash", "slash a slash") on all 26 clips. It also took its
 * example word from the printable sheets, which named different words from
 * the letter cards (fox for f, leaf for l, wagon for w).
 *
 * Now the word comes from the one list (letterWords.ts), and
 * scripts/generate-audio.mjs makes the clip so the letter's sound is spoken:
 * "Big B and little b both say buh, as in bus". The text here is what a
 * phone's own voice reads if the clip is ever missing.
 */
export function pairLine(letter: string): string {
  const lower = letter.toLowerCase();
  return `Big ${lower.toUpperCase()} and little ${lower} both say ${lower}, as in ${letterWord(lower).word}`;
}
