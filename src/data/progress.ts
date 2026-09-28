import { BUILD } from "./engineer";
import { COLORS } from "./colors";
import { MATH } from "./math";
import { lessonSteps, type ChildProfile } from "./profiles";
import { SCIENCE } from "./science";
import { READING } from "./subject";
import { TIME } from "./timeMoney";
import { calendarDayNumber, deviceTimeZone, localDateKey, weekDateKeys } from "./time";
import { isUnit } from "./units";
import { SOUND_KEY, type SoundCheck } from "./profileExtras";

export type { SoundCheck, SoundChecks } from "./profileExtras";

/**
 * Completion for grown-ups: what a child finished, never how well. The same
 * numbers feed the parent's Progress page, the teacher's class list, and the
 * progress code a parent can give the teacher. Nothing here is shown to the child.
 */

/** A week of short lessons. Five school days; weekends are a bonus. */
export const WEEKLY_TARGET = 5;

export type ExploreArea = "math" | "colors" | "time" | "build" | "science" | "games";

export const EXPLORE_LABELS: Record<ExploreArea, string> = {
  math: "Numbers",
  colors: "Colors",
  time: "Time & Money",
  build: "Build",
  science: "Science",
  games: "Games & Coding",
};

const EXPLORE_SUBJECTS: Record<string, ExploreArea> = {
  [MATH]: "math",
  [COLORS]: "colors",
  [TIME]: "time",
  [BUILD]: "build",
  [SCIENCE]: "science",
};

export type Completion = {
  /** Days the whole reading lesson was finished, all time. */
  lessonsTotal: number;
  /** Days the whole reading lesson was finished, Monday to Sunday this week. */
  lessonsThisWeek: number;
  /** Monday first: did the child practice anything that day? */
  practicedDays: boolean[];
  /** Whole minutes practiced this week, every area together. */
  minutesThisWeek: number;
  /** Explore areas with at least one finished activity this week. */
  exploreThisWeek: ExploreArea[];
  /** Local date of the last finished step, or null before the first. */
  lastActive: string | null;
  /** Whole days since `lastActive`. Null before the first step. */
  daysSinceActive: number | null;
};

function dayNumber(key: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  return calendarDayNumber(Number(match[1]), Number(match[2]), Number(match[3]));
}

/** The whole reading lesson on `key`: every step, or the nest piece that marks it. */
export function lessonDone(profile: ChildProfile, key: string): boolean {
  const steps = profile.days[key]?.[READING];
  if (steps && lessonSteps.every((step) => steps[step])) return true;
  return profile.nest.some((piece) => piece.date === key);
}

function anyStep(profile: ChildProfile, key: string): boolean {
  const day = profile.days[key];
  if (!day) return false;
  return Object.values(day).some((steps) => Object.values(steps).some(Boolean));
}

export function completion(profile: ChildProfile, now = new Date(), timeZone = deviceTimeZone()): Completion {
  const week = weekDateKeys(now, timeZone);
  const weekSet = new Set(week);
  const lessonDays = new Set<string>();
  for (const key of Object.keys(profile.days)) if (lessonDone(profile, key)) lessonDays.add(key);
  for (const piece of profile.nest) lessonDays.add(piece.date);

  const explore = new Set<ExploreArea>();
  for (const key of week) {
    const day = profile.days[key];
    if (!day) continue;
    for (const [subject, steps] of Object.entries(day)) {
      const done = Object.entries(steps).filter(([, finished]) => finished);
      if (done.length === 0) continue;
      const area = EXPLORE_SUBJECTS[subject];
      if (area) explore.add(area);
      if (done.some(([step]) => step.startsWith("game-"))) explore.add("games");
    }
  }

  let ms = 0;
  for (const days of Object.values(profile.practiceMs ?? {})) {
    for (const [key, value] of Object.entries(days ?? {})) if (weekSet.has(key)) ms += value;
  }

  const active = Object.keys(profile.days).filter((key) => anyStep(profile, key));
  for (const piece of profile.nest) active.push(piece.date);
  const lastActive = active.sort().at(-1) ?? null;
  const today = dayNumber(localDateKey(now, timeZone));
  const last = lastActive ? dayNumber(lastActive) : null;

  return {
    lessonsTotal: lessonDays.size,
    lessonsThisWeek: week.filter((key) => lessonDays.has(key)).length,
    practicedDays: week.map((key) => anyStep(profile, key) || lessonDays.has(key)),
    minutesThisWeek: Math.round(ms / 60000),
    exploreThisWeek: (Object.keys(EXPLORE_LABELS) as ExploreArea[]).filter((area) => explore.has(area)),
    lastActive,
    daysSinceActive: today !== null && last !== null ? Math.max(0, today - last) : null,
  };
}

/** "Today", "Yesterday", "4 days ago", or "Not started yet". */
export function lastActiveLabel(days: number | null): string {
  if (days === null) return "Not started yet";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

/** Who might like a nudge first: longest since practice, then fewest lessons this week. */
export function byNudge<T extends { completion: Completion }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => {
    const idle = (b.completion.daysSinceActive ?? 999) - (a.completion.daysSinceActive ?? 999);
    if (idle !== 0) return idle;
    return a.completion.lessonsThisWeek - b.completion.lessonsThisWeek;
  });
}

/* ---------------------------------------------------------------------------
 * Quiet check-ins. The Friday sound game and the "where to start" check note
 * whether each sound was picked on the first try. Grown-ups see "Knows" and
 * "Still practicing"; the child only ever sees stars for trying.
 * ------------------------------------------------------------------------- */

export function recordSoundCheck(
  profile: ChildProfile,
  sound: string,
  firstTry: boolean,
  now = new Date(),
  timeZone = deviceTimeZone(),
): ChildProfile {
  const key = sound.toLowerCase();
  if (!SOUND_KEY.test(key)) return profile;
  const before = profile.soundChecks?.[key];
  const next: SoundCheck = {
    firstTry,
    date: localDateKey(now, timeZone),
    got: (before?.got ?? 0) + (firstTry ? 1 : 0),
    asked: (before?.asked ?? 0) + 1,
  };
  return { ...profile, soundChecks: { ...(profile.soundChecks ?? {}), [key]: next } };
}

/** Sounds in teaching order: letters a–z first, then the phonics units. */
function soundOrder(a: string, b: string): number {
  const unitA = isUnit(a) ? 1 : 0;
  const unitB = isUnit(b) ? 1 : 0;
  return unitA - unitB || a.localeCompare(b);
}

/** "Knows" is the latest check on the first try; everything else is "Still practicing". */
export function soundSummary(profile: ChildProfile): { knows: string[]; practicing: string[] } {
  const knows: string[] = [];
  const practicing: string[] = [];
  for (const [sound, check] of Object.entries(profile.soundChecks ?? {})) {
    (check.firstTry ? knows : practicing).push(sound);
  }
  return { knows: knows.sort(soundOrder), practicing: practicing.sort(soundOrder) };
}

/** Sounds for this Friday's check-in: this week's and the week before's, newest first, at most five. */
export function checkInSounds(weekLetters: readonly string[], introduced: readonly string[], limit = 5): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const sound of [...weekLetters, ...[...introduced].reverse()]) {
    const key = sound.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
    if (out.length >= limit) break;
  }
  return out;
}
