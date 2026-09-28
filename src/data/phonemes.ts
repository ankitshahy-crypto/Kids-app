import { UNIT_IDS, type UnitId } from "./units";

/**
 * Phoneme keys for the starter deck and the sound units.
 * What the app says, and which recording to play, lives in `audioManifest.json`.
 * Device speech uses an example phrase ("b, as in ball"), never a bare syllable.
 */
const LETTER_PHONEMES = [
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

export type PhonemeId = (typeof LETTER_PHONEMES)[number] | UnitId;

/** Every phoneme id the manifest must name a letter phrase for: the letter sounds, then the units (sh, a_e). */
export const PHONEME_IDS: readonly PhonemeId[] = [...LETTER_PHONEMES, ...UNIT_IDS];
