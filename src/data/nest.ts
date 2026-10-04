import { letterSchedule } from "./schedule";

/**
 * Nest words: the few common words a child reads whole instead of sounding
 * out, because their spelling does not follow the sounds taught so far (the,
 * to, said), or because sounding them out would teach the wrong sound.
 *
 * Two to three are new each week (schedule.ts), never more than three. In a
 * story a Nest word wears a small feather and is read whole on a tap; the
 * lesson shows the week's new ones on one card.
 *
 * "I" and "a" were the bug that started this: once i was taught, tapping "I"
 * played the short i of "pig" and then "I", and "a" played the a of "apple",
 * where a sentence says "uh". "is" sounds out with an s that says z. These
 * three and "the" stay Nest words for good, even once every letter is known.
 */
export const ALWAYS_WHOLE: ReadonlySet<string> = new Set(["i", "a", "the", "is"]);

/** The Nest words new in this plan week (0-based week index, wrapping like the plan). */
export function nestWordsForWeek(index: number): string[] {
  const safe = ((index % letterSchedule.length) + letterSchedule.length) % letterSchedule.length;
  return [...letterSchedule[safe].nestWords];
}

/** Every Nest word met from the first week through this one, in teaching order. */
export function nestWordsThrough(index: number): string[] {
  const count = Math.min(Math.max(index, 0) + 1, letterSchedule.length);
  const words: string[] = [];
  for (let at = 0; at < count; at += 1) {
    for (const word of letterSchedule[at].nestWords) if (!words.includes(word)) words.push(word);
  }
  return words;
}

/** How a Nest word is shown: "I" is always a capital, the rest as they are. */
export function nestLabel(word: string): string {
  return word === "i" ? "I" : word;
}

/** Every Nest word in the plan. Each one needs a word clip. */
export function allNestWords(): string[] {
  return nestWordsThrough(letterSchedule.length - 1);
}
