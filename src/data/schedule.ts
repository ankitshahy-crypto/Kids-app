import { starterDeck, type DeckWord } from "./deck";

export type WeekPlan = {
  week: number;
  /** One or two new letters this week. */
  newLetters: string[];
  /** Letters from earlier weeks to keep in view. */
  reviewLetters: string[];
};

/**
 * Early-reading order, not alphabetical. Each week adds one or two letters
 * and keeps a short review set. After the last week the plan repeats.
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
];

function localDayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

/** Lesson weeks start the day the profile was created, seven days each. */
export function weekIndex(createdAt: string, now = new Date()): number {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return 0;
  const days = localDayNumber(now) - localDayNumber(created);
  return Math.max(0, Math.floor(days / 7));
}

export function planForWeek(index: number): WeekPlan {
  const safe = ((index % letterSchedule.length) + letterSchedule.length) % letterSchedule.length;
  return letterSchedule[safe];
}

/** Friday is review day on the device calendar. */
export function isReviewDay(now = new Date()): boolean {
  return now.getDay() === 5;
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
