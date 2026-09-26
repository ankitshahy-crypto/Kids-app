import { pictureForLetter } from "./sheets";

/** Manifest id for the big/little sentence. The clip is generated with the other prompts. */
export function pairPromptId(letter: string): string {
  return `pair-${letter.toLowerCase()}`;
}

/** "Big A and little a both say /a/, like apple" */
export function pairLine(letter: string): string {
  const lower = letter.toLowerCase();
  const word = pictureForLetter(lower).word;
  return `Big ${lower.toUpperCase()} and little ${lower} both say /${lower}/, like ${word}`;
}
