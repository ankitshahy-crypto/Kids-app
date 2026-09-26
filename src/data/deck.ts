import type { IllustrationName } from "../illustrations";
import type { PhonemeId } from "./phonemes";

export type LetterTile = {
  /** The letter shown on the tile. */
  char: string;
  /** Key into the phoneme map. Played when this tile is tapped or revealed. */
  phoneme: PhonemeId;
  /**
   * Optional clip that overrides the manifest (a parent recording, for example).
   * Otherwise the app plays `public/audio/` when that file is indexed, then device speech.
   */
  audioSrc?: string;
};

export type DeckWord = {
  id: string;
  word: string;
  letters: LetterTile[];
  /** Optional clip that overrides the word file in the audio manifest. */
  audioSrc?: string;
  illustration: IllustrationName;
  /** Optional parent photo. When set, shown instead of the built-in illustration. */
  photoSrc?: string;
};

export type Deck = {
  id: string;
  title: string;
  words: DeckWord[];
};

/**
 * Starter deck of short, familiar words.
 * Add another deck by appending to `decks`. Add a word by appending here and,
 * unless you set `photoSrc`, giving it an illustration in `src/illustrations.tsx`.
 */
export const starterDeck: Deck = {
  id: "starter",
  title: "Starter",
  words: [
    {
      id: "cat",
      word: "cat",
      illustration: "cat",
      letters: [
        { char: "c", phoneme: "k" },
        { char: "a", phoneme: "ae" },
        { char: "t", phoneme: "t" },
      ],
    },
    {
      id: "dog",
      word: "dog",
      illustration: "dog",
      letters: [
        { char: "d", phoneme: "d" },
        { char: "o", phoneme: "aw" },
        { char: "g", phoneme: "g" },
      ],
    },
    {
      id: "sun",
      word: "sun",
      illustration: "sun",
      letters: [
        { char: "s", phoneme: "s" },
        { char: "u", phoneme: "uh" },
        { char: "n", phoneme: "n" },
      ],
    },
    {
      id: "hat",
      word: "hat",
      illustration: "hat",
      letters: [
        { char: "h", phoneme: "h" },
        { char: "a", phoneme: "ae" },
        { char: "t", phoneme: "t" },
      ],
    },
    {
      id: "pig",
      word: "pig",
      illustration: "pig",
      letters: [
        { char: "p", phoneme: "p" },
        { char: "i", phoneme: "ih" },
        { char: "g", phoneme: "g" },
      ],
    },
    {
      id: "bus",
      word: "bus",
      illustration: "bus",
      letters: [
        { char: "b", phoneme: "b" },
        { char: "u", phoneme: "uh" },
        { char: "s", phoneme: "s" },
      ],
    },
    {
      id: "cup",
      word: "cup",
      illustration: "cup",
      letters: [
        { char: "c", phoneme: "k" },
        { char: "u", phoneme: "uh" },
        { char: "p", phoneme: "p" },
      ],
    },
    {
      id: "bed",
      word: "bed",
      illustration: "bed",
      letters: [
        { char: "b", phoneme: "b" },
        { char: "e", phoneme: "eh" },
        { char: "d", phoneme: "d" },
      ],
    },
    {
      id: "fox",
      word: "fox",
      illustration: "fox",
      letters: [
        { char: "f", phoneme: "f" },
        { char: "o", phoneme: "aw" },
        { char: "x", phoneme: "ks" },
      ],
    },
    {
      id: "apple",
      word: "apple",
      illustration: "apple",
      letters: [
        { char: "a", phoneme: "ae" },
        { char: "p", phoneme: "p" },
        { char: "p", phoneme: "p" },
        { char: "l", phoneme: "l" },
        { char: "e", phoneme: "uh" },
      ],
    },
  ],
};

export const decks: Deck[] = [starterDeck];

function assertDeck(deck: Deck): void {
  const seen = new Set<string>();
  for (const word of deck.words) {
    if (seen.has(word.id)) {
      throw new Error(`Duplicate deck id "${word.id}"`);
    }
    seen.add(word.id);
    const spelled = word.letters.map((letter) => letter.char).join("");
    if (spelled !== word.word) {
      throw new Error(`"${word.id}" spells "${spelled}", expected "${word.word}"`);
    }
  }
}

for (const deck of decks) {
  assertDeck(deck);
}
