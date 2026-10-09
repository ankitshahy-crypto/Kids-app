/**
 * Spelling a name out loud. Trace your name says the child's name a letter at a time, from the
 * `spell` clips in audioManifest.json: one recorded clip a letter, each saying the letter's name
 * ("em" for M), in the same voice as the rest of the app. A name has no clip of its own and is
 * never sent to a voice service, so it is spelled, not said whole.
 *
 * Each clip's line is the capital letter ("M"): what a phone's own voice would read as the
 * letter's name if the clip were ever missing. scripts/generate-audio.mjs says the name through a
 * pronunciation of its own for each letter, so "A" is never read as a word.
 */
export const SPELL_LETTERS = [..."abcdefghijklmnopqrstuvwxyz"];

/** The letters of a name, as the clips spell it: letters only, in order, lowercase. */
export function nameLetters(name: string): string[] {
  return [...name.toLowerCase()].filter((char) => /^[a-z]$/.test(char));
}
