import { starterDeck, type DeckWord } from "./deck";
import { calendarWeeksBetween, deviceTimeZone, isFriday } from "./time";
import { isUnit, lettersOnly, unitLabel } from "./units";

export type WeekPlan = {
  week: number;
  /**
   * New sounds this week: 3 or 4 letters a week from week 1 (a, m, t, s), then
   * from week 15 sound units such as "sh" or "a_e" (see units.ts). A review or
   * practice week teaches none.
   */
  newLetters: string[];
  /** Sounds from earlier weeks to keep in view. On a review or practice week, the sounds it goes over. */
  reviewLetters: string[];
  /**
   * Nest words: the few tricky words a child reads whole (I, a, the), at most
   * three new a week. See nest.ts.
   */
  nestWords: string[];
  /** Which phase of the reading path this week belongs to (curriculum.ts). */
  phase: number;
  /** A week with no new sounds: "review" closes a phase, "practice" builds speed on what is known. */
  kind?: "review" | "practice";
};

/**
 * The reading plan, written as packs of about eight weeks, so a new pack of
 * weeks, stories, words and clips slots in after the last one without
 * touching the weeks before it (see curriculum.ts for the full 78-week path).
 *
 * Weeks 1 to 8 teach every single letter at 3 or 4 a week. The first group
 * (a, m, t, s) already makes words (am, at, mat, sat, Sam), so week 1 has real
 * words to slide under, not only "am". Week 9 reviews, weeks 10 to 14 practise
 * the letters in longer words, and weeks 15 to 26 are the sound units.
 *
 * Why: the first phone test found week 1 taught m and a only, so the slide and
 * the stories had one word ("am") to work with. Every phonics program teaches
 * several common sounds before or as blending starts; the groups here are our own.
 */
export type ReadingPack = {
  id: number;
  title: string;
  weeks: WeekPlan[];
};

const w = (week: number, phase: number, newLetters: string[], reviewLetters: string[], nestWords: string[] = [], kind?: WeekPlan["kind"]): WeekPlan =>
  kind ? { week, phase, newLetters, reviewLetters, nestWords, kind } : { week, phase, newLetters, reviewLetters, nestWords };

export const READING_PACKS: ReadingPack[] = [
  {
    id: 1,
    title: "Letter sounds and first words",
    weeks: [
      w(1, 1, ["a", "m", "t", "s"], [], ["i", "a", "the"]),
      w(2, 1, ["i", "p", "n"], ["a", "m", "t", "s"], ["is", "to"]),
      w(3, 1, ["o", "d", "c"], ["i", "p", "n"], ["go", "no", "he"]),
      w(4, 1, ["u", "g", "h"], ["o", "d", "c"], ["we", "my", "see"]),
      w(5, 1, ["b", "e", "r"], ["u", "g", "h"], ["you", "said"]),
      w(6, 1, ["f", "l", "k"], ["b", "e", "r"], ["was", "of"]),
      w(7, 1, ["j", "w", "v"], ["f", "l", "k"], ["are", "they"]),
      w(8, 1, ["y", "z", "x", "q"], ["j", "w", "v"], ["do", "come"]),
    ],
  },
  {
    id: 2,
    title: "Review, then longer words",
    weeks: [
      w(9, 1, [], ["e", "i", "u"], [], "review"),
      w(10, 2, [], ["b", "d", "p"], [], "practice"),
      w(11, 2, [], ["a", "o", "c", "k"], [], "practice"),
      w(12, 2, [], ["m", "n", "h"], [], "practice"),
      w(13, 2, [], ["w", "y", "j"], [], "practice"),
      w(14, 2, [], ["x", "q", "z"], [], "practice"),
      w(15, 3, ["sh", "ch"], ["x", "q", "z"]),
      w(16, 3, ["th", "ng"], ["sh", "ch"]),
    ],
  },
  {
    id: 3,
    title: "Two letters, one sound",
    weeks: [
      w(17, 3, ["ck", "ee"], ["th", "ng"]),
      w(18, 5, ["oo"], ["ck", "ee"]),
      w(19, 5, ["ai", "ay"], ["oo"]),
      w(20, 5, ["oa", "igh"], ["ai", "ay"]),
      w(21, 5, ["a_e", "i_e"], ["oa", "igh"]),
      w(22, 5, ["o_e", "u_e"], ["a_e", "i_e"]),
      w(23, 6, ["ar", "or"], ["o_e", "u_e"]),
      w(24, 6, ["er", "ir"], ["ar", "or"]),
    ],
  },
  {
    id: 4,
    title: "More vowel sounds",
    weeks: [w(25, 6, ["ea", "ou"], ["er", "ir"]), w(26, 6, ["oi", "wh"], ["ea", "ou"])],
  },
];

/** Every written week in order. After the last one the plan starts over. */
export const letterSchedule: WeekPlan[] = READING_PACKS.flatMap((pack) => pack.weeks);

/** How fast a child moves through the plan. "gentle" spends two calendar weeks on each plan week. */
export type ReadingPace = "steady" | "gentle";

export function isReadingPace(value: unknown): value is ReadingPace {
  return value === "steady" || value === "gentle";
}

/**
 * The plan week a calendar week reaches at this pace. Steady is one plan week
 * a calendar week (3 or 4 new sounds). Gentle takes two calendar weeks for
 * each, about two new sounds a week: the pace the app had before, for a
 * three-year-old.
 */
export function paceWeek(calendarWeek: number, pace: ReadingPace | undefined): number {
  const week = Math.max(0, Math.floor(calendarWeek));
  return pace === "gentle" ? Math.floor(week / 2) : week;
}

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

/**
 * What the lesson is about, in words for the grown-up beside the child:
 * "This week: A, M, T and S", on the Friday review "Review day: I, P, N, A,
 * M, T and S", and on a week with no new sounds "Review week: E, I and U" or
 * "Practice week: B, D and P". A sound unit reads as it is written: "sh", "a-e".
 *
 * Shown on the Today path and above every lesson card. The first phone test
 * asked for it to be plain what a week is about.
 */
export function weekFocus(letters: readonly string[], reviewDay = false, kind?: WeekPlan["kind"]): string {
  const names = letters.map((id) => (isUnit(id) ? unitLabel(id) : id.toUpperCase()));
  if (names.length === 0) return "";
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  const label = kind === "review" ? "Review week" : kind === "practice" ? "Practice week" : reviewDay ? "Review day" : "This week";
  return `${label}: ${list}`;
}

/**
 * The letters a lesson practises: the week's new sounds, with the review set
 * added on a Friday. A week with no new sounds practises its review set every day.
 */
export function practiceLetters(plan: WeekPlan, reviewDay: boolean): string[] {
  const source = plan.newLetters.length === 0 || reviewDay ? [...plan.newLetters, ...plan.reviewLetters] : [...plan.newLetters];
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
