/**
 * Each letter's name, spelled the way the recorded voice says it ("em", "double you"). Trace your
 * name spells the child's name with these, one recorded clip a letter (the `spell` kind in
 * audioManifest.json), since a name has no clip of its own and is never sent to a voice service.
 * The same spellings are in scripts/generate-audio.mjs, which makes the clips.
 */
export const LETTER_NAMES: Record<string, string> = {
  a: "ay",
  b: "bee",
  c: "see",
  d: "dee",
  e: "ee",
  f: "eff",
  g: "jee",
  h: "aitch",
  i: "eye",
  j: "jay",
  k: "kay",
  l: "ell",
  m: "em",
  n: "en",
  o: "oh",
  p: "pee",
  q: "cue",
  r: "ar",
  s: "ess",
  t: "tee",
  u: "you",
  v: "vee",
  w: "double you",
  x: "ex",
  y: "why",
  z: "zee",
};

/** The name of a letter ("em" for m), or the letter itself for anything that is not one. */
export function letterName(letter: string): string {
  const key = letter.trim().toLowerCase();
  return LETTER_NAMES[key] ?? letter;
}

/** The letters of a name, as the clips spell it: letters only, in order, lowercase. */
export function nameLetters(name: string): string[] {
  return [...name.toLowerCase()].filter((char) => /^[a-z]$/.test(char));
}
