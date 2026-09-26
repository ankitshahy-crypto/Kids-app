/**
 * Speakable stand-ins for phonics sounds.
 *
 * The Web Speech API cannot reliably produce pure IPA phonemes. It will say
 * a letter name ("dee") if you pass a single letter, so each sound is a short
 * approximation instead. Stop consonants include a tiny vowel ("buh") because
 * a synthesizer cannot hold a pure /b/. These are classroom-style hints, not
 * speech-therapy audio. A letter or word `audioSrc` replaces them when set.
 */
export const PHONEME_TTS = {
  ae: "aah",
  eh: "eh",
  ih: "ih",
  aw: "aw",
  uh: "uh",
  b: "buh",
  d: "duh",
  f: "fff",
  g: "guh",
  h: "huh",
  k: "kuh",
  l: "lll",
  m: "mmm",
  n: "nnn",
  p: "puh",
  s: "sss",
  t: "tuh",
  ks: "kss",
} as const;

export type PhonemeId = keyof typeof PHONEME_TTS;
