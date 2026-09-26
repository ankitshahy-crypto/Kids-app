/**
 * Phoneme keys for the starter deck.
 * What the app says, and which recording to play, lives in `audioManifest.json`.
 * Device speech uses an example phrase ("b, as in ball"), never a bare syllable.
 */
export const PHONEME_IDS = [
  "ae",
  "eh",
  "ih",
  "aw",
  "uh",
  "b",
  "d",
  "f",
  "g",
  "h",
  "k",
  "l",
  "m",
  "n",
  "p",
  "s",
  "t",
  "ks",
] as const;

export type PhonemeId = (typeof PHONEME_IDS)[number];
