import { BUILD } from "./engineer";
import { COLORS } from "./colors";
import { MATH } from "./math";
import { lessonSteps, type ChildProfile } from "./profiles";
import { SCIENCE } from "./science";
import { READING } from "./subject";
import { TIME } from "./timeMoney";
import { calendarDayNumber, deviceTimeZone, localDateKey, weekDateKeys } from "./time";
import { IDLE_MS } from "./reading";
import { isUnit, unitLabel } from "./units";
import { SOUND_KEY, type SoundCheck, type SoundTry } from "./profileExtras";

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

export type SoundCheckSource = "friday" | "start";

/**
 * One try per sound per day for each check: the day's first try is the one
 * that counts. Playing the game again the same day, after seeing the answer,
 * changes nothing. The Friday game and the Where to start check keep their
 * own latest tries, so one on the same day never hides the other.
 */
export function recordSoundCheck(
  profile: ChildProfile,
  sound: string,
  firstTry: boolean,
  now = new Date(),
  timeZone = deviceTimeZone(),
  source: SoundCheckSource = "friday",
): ChildProfile {
  const key = sound.toLowerCase();
  if (!SOUND_KEY.test(key)) return profile;
  const before = profile.soundChecks?.[key];
  const date = localDateKey(now, timeZone);
  if ((source === "start" ? before?.start : before?.friday)?.date === date) return profile;
  const attempt: SoundTry = { firstTry, date };
  const next: SoundCheck = {
    ...attempt,
    got: (before?.got ?? 0) + (firstTry ? 1 : 0),
    asked: (before?.asked ?? 0) + 1,
    ...(before?.friday ? { friday: before.friday } : {}),
    ...(before?.start ? { start: before.start } : {}),
    [source]: attempt,
  };
  return { ...profile, soundChecks: { ...(profile.soundChecks ?? {}), [key]: next } };
}

/**
 * What a child has done on this device so far, for the grown-up deciding on
 * the unlock. Facts from the device only, never a score, and nothing about
 * where the child "should" be. The words are chosen to claim no more than
 * the device knows: a letter sticker comes from finishing the Letters step
 * with that week's letters, a word sticker from blending, tracing or a game,
 * and a story is read along with the narrator.
 */
export type SoFar = {
  /** Letters and sound units worked on, in the order their stickers were earned. */
  letters: string[];
  /** Words worked on: blended, traced, or played in a game. */
  words: number;
  /** Read-alongs finished: days a story was finished. */
  stories: number;
  /** Days with a finished step, or a couple of minutes of practice. */
  days: number;
};

/**
 * A day counts as practice from two idle windows of active time. The clock
 * keeps running for one idle window after the last tap, so one tap and a
 * walk away earns exactly one window; it takes a second tap, or a finished
 * step, to make the day count.
 */
export const PRACTICE_DAY_MS = 2 * IDLE_MS;

export function soFar(profile: ChildProfile): SoFar {
  const letters = profile.stickers.filter((sticker) => sticker.kind === "letter" && sticker.subject === READING).map((sticker) => sticker.label);
  const words = profile.stickers.filter((sticker) => sticker.kind === "word" && sticker.subject === READING).length;
  let stories = 0;
  const practiced = new Set<string>();
  for (const [date, record] of Object.entries(profile.days)) {
    const any = Object.values(record).some((steps) => Object.values(steps).some(Boolean));
    if (any) practiced.add(date);
    if (record[READING]?.story) stories += 1;
  }
  const msByDate = new Map<string, number>();
  for (const byDate of Object.values(profile.practiceMs ?? {})) {
    for (const [date, ms] of Object.entries(byDate)) msByDate.set(date, (msByDate.get(date) ?? 0) + ms);
  }
  for (const [date, ms] of msByDate) if (ms >= PRACTICE_DAY_MS) practiced.add(date);
  return { letters, words, stories, days: practiced.size };
}

const SHOWN_LETTERS = 8;

function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * "worked on M, S, A, T and 6 words · read along 4 times · 9 days of practice", or null when there
 * is nothing yet. A long list of letters is cut short: "M, S, A, T, P, I, N, C (+4 more) and 23 words".
 */
export function soFarLine(profile: ChildProfile): string | null {
  const facts = soFar(profile);
  const parts: string[] = [];
  const worked: string[] = [];
  if (facts.letters.length > 0) {
    const shown = facts.letters.slice(0, SHOWN_LETTERS).map((letter) => unitLabel(letter).toUpperCase());
    const more = facts.letters.length - shown.length;
    worked.push(`${shown.join(", ")}${more > 0 ? ` (+${more} more)` : ""}`);
  }
  if (facts.words > 0) worked.push(count(facts.words, "word", "words"));
  if (worked.length > 0) parts.push(`worked on ${worked.join(" and ")}`);
  if (facts.stories > 0) parts.push(`read along ${facts.stories === 1 ? "once" : `${facts.stories} times`}`);
  if (facts.days > 0) parts.push(`${count(facts.days, "day", "days")} of practice`);
  return parts.length > 0 ? parts.join(" · ") : null;
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

/**
 * What the latest Friday sound game suggests about who says the sounds in
 * Sound It Out, for a grown-up to decide on. The app never switches on its
 * own. The Where to start check does not count: a child who aces it on day
 * one has not sounded out a word here yet.
 * - "ready": the app says the sounds, and every sound in the latest game
 *   (three or more) was right on the first try.
 * - "practicing": the child says the sounds, and the latest game had two or
 *   more sounds still being practiced.
 */
export type SaysSoundsHint = { kind: "none" } | { kind: "ready" | "practicing"; sounds: string[]; date: string };

export const SAYS_SOUNDS_READY_AFTER = 3;
export const SAYS_SOUNDS_BACK_AFTER = 2;

export function saysSoundsHint(profile: Pick<ChildProfile, "soundChecks" | "saysSounds">): SaysSoundsHint {
  const checks = Object.entries(profile.soundChecks ?? {}).flatMap(([sound, check]) => (check.friday ? [[sound, check.friday] as const] : []));
  if (checks.length === 0) return { kind: "none" };
  const latest = checks.reduce((max, [, check]) => (check.date > max ? check.date : max), "");
  const last = checks.filter(([, check]) => check.date === latest);
  const practicing = last.filter(([, check]) => !check.firstTry).map(([sound]) => sound).sort(soundOrder);
  if (profile.saysSounds) {
    return practicing.length >= SAYS_SOUNDS_BACK_AFTER ? { kind: "practicing", sounds: practicing, date: latest } : { kind: "none" };
  }
  if (last.length >= SAYS_SOUNDS_READY_AFTER && practicing.length === 0) {
    return { kind: "ready", sounds: last.map(([sound]) => sound).sort(soundOrder), date: latest };
  }
  return { kind: "none" };
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
