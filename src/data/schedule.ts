import { starterDeck, type DeckWord } from "./deck";
import { calendarWeeksBetween, deviceTimeZone, isFriday } from "./time";
import { lettersOnly } from "./units";

export type WeekPlan = {
  week: number;
  /** One or two new letters this week. From week 15, sound units such as "sh" or "a_e" (see units.ts). */
  newLetters: string[];
  /** Letters from earlier weeks to keep in view. */
  reviewLetters: string[];
};

/**
 * Early-reading order, not alphabetical. Each week adds one or two letters
 * and keeps a short review set. Weeks 15 to 26 add the sound units a child
 * meets next: digraphs, vowel teams, magic e, and r-controlled vowels.
 * After the last week the plan repeats.
 */
export const letterSchedule: WeekPlan[] = [
  { week: 1, newLetters: ["m", "a"], reviewLetters: [] },
  { week: 2, newLetters: ["s", "t"], reviewLetters: ["m", "a"] },
  { week: 3, newLetters: ["p", "i"], reviewLetters: ["s", "t"] },
  { week: 4, newLetters: ["n", "d"], reviewLetters: ["p", "i"] },
  { week: 5, newLetters: ["o", "c"], reviewLetters: ["n", "d"] },
  { week: 6, newLetters: ["u", "b"], reviewLetters: ["o", "c"] },
  { week: 7, newLetters: ["g", "h"], reviewLetters: ["u", "b"] },
  { week: 8, newLetters: ["e", "r"], reviewLetters: ["g", "h"] },
  { week: 9, newLetters: ["f", "l"], reviewLetters: ["e", "r"] },
  { week: 10, newLetters: ["k"], reviewLetters: ["f", "l"] },
  { week: 11, newLetters: ["j", "w"], reviewLetters: ["k"] },
  { week: 12, newLetters: ["v", "y"], reviewLetters: ["j", "w"] },
  { week: 13, newLetters: ["z"], reviewLetters: ["v", "y"] },
  { week: 14, newLetters: ["x", "q"], reviewLetters: ["z"] },
  { week: 15, newLetters: ["sh", "ch"], reviewLetters: ["x", "q"] },
  { week: 16, newLetters: ["th", "ng"], reviewLetters: ["sh", "ch"] },
  { week: 17, newLetters: ["ck", "ee"], reviewLetters: ["th", "ng"] },
  { week: 18, newLetters: ["oo"], reviewLetters: ["ck", "ee"] },
  { week: 19, newLetters: ["ai", "ay"], reviewLetters: ["oo"] },
  { week: 20, newLetters: ["oa", "igh"], reviewLetters: ["ai", "ay"] },
  { week: 21, newLetters: ["a_e", "i_e"], reviewLetters: ["oa", "igh"] },
  { week: 22, newLetters: ["o_e", "u_e"], reviewLetters: ["a_e", "i_e"] },
  { week: 23, newLetters: ["ar", "or"], reviewLetters: ["o_e", "u_e"] },
  { week: 24, newLetters: ["er", "ir"], reviewLetters: ["ar", "or"] },
  { week: 25, newLetters: ["ea", "ou"], reviewLetters: ["er", "ir"] },
  { week: 26, newLetters: ["oi", "wh"], reviewLetters: ["ea", "ou"] },
];

/**
 * Lesson weeks are Monday–Sunday in `timeZone` (the device zone by default).
 * Week 0 is the week the profile was created. The next Monday starts week 1.
 */
export function weekIndex(createdAt: string, now = new Date(), timeZone = deviceTimeZone()): number {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return 0;
  return calendarWeeksBetween(created, now, timeZone);
}

/** New letters and sound units from the first lesson week through this one, in teaching order. */
export function lettersIntroduced(index: number): string[] {
  const count = Math.min(Math.max(index, 0) + 1, letterSchedule.length);
  const seen = new Set<string>();
  const letters: string[] = [];
  for (let i = 0; i < count; i += 1) {
    for (const letter of letterSchedule[i].newLetters) {
      const lower = letter.toLowerCase();
      if (seen.has(lower)) continue;
      seen.add(lower);
      letters.push(lower);
    }
  }
  return letters;
}

/** Everything the plan teaches: 26 letters and the sound units after them. */
export function letterPlanSize(): number {
  return letterSchedule.reduce((total, week) => total + week.newLetters.length, 0);
}

/** The single letters in the plan: the alphabet a child knows before the sound units begin. */
export function alphabetSize(): number {
  return lettersOnly(letterSchedule.flatMap((week) => week.newLetters)).length;
}

/** How many weeks teach single letters before the sound units begin. */
export function alphabetWeeks(): number {
  const first = letterSchedule.findIndex((week) => lettersOnly(week.newLetters).length < week.newLetters.length);
  return first === -1 ? letterSchedule.length : first;
}

export function planForWeek(index: number): WeekPlan {
  const safe = ((index % letterSchedule.length) + letterSchedule.length) % letterSchedule.length;
  return letterSchedule[safe];
}

/** Friday is review day on the device calendar, or in `timeZone` when one is passed. */
export function isReviewDay(now = new Date(), timeZone = deviceTimeZone()): boolean {
  return isFriday(now, timeZone);
}

export function practiceLetters(plan: WeekPlan, reviewDay: boolean): string[] {
  const source = reviewDay ? [...plan.newLetters, ...plan.reviewLetters] : [...plan.newLetters];
  const seen = new Set<string>();
  const letters: string[] = [];
  for (const letter of source) {
    const lower = letter.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    letters.push(lower);
  }
  return letters;
}

/** Prefer starter words that use this week's letters. Fall back to the full deck. */
export function wordsForLetters(letters: string[]): DeckWord[] {
  const wanted = new Set(letters.map((letter) => letter.toLowerCase()));
  const matches = starterDeck.words.filter((word) =>
    word.letters.some((letter) => wanted.has(letter.char.toLowerCase())),
  );
  return matches.length >= 3 ? matches : starterDeck.words;
}
