import { lessonDone, soFar, soundSummary, WEEKLY_TARGET } from "./progress";
import { unitLabel } from "./units";
import type { ChildProfile } from "./profiles";

/** Monday of the week holding a local `YYYY-MM-DD` key, as a key. Pure calendar arithmetic. */
export function mondayKey(key: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  const back = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - back);
  return date.toISOString().slice(0, 10);
}

/** Weeks (Monday to Sunday) with the whole reading lesson finished on WEEKLY_TARGET days or more. */
export function weeksCompleted(profile: ChildProfile): number {
  const dates = new Set<string>(Object.keys(profile.days));
  for (const piece of profile.nest) dates.add(piece.date);
  const perWeek = new Map<string, number>();
  for (const key of dates) {
    if (!lessonDone(profile, key)) continue;
    const monday = mondayKey(key);
    if (monday) perWeek.set(monday, (perWeek.get(monday) ?? 0) + 1);
  }
  let weeks = 0;
  for (const days of perWeek.values()) if (days >= WEEKLY_TARGET) weeks += 1;
  return weeks;
}

export type ParentSummary = {
  /** The initial, or the name as stored when the grown-up chose it. */
  label: string;
  weeks: number;
  lessons: number;
  /** Sounds right on the first try in the latest check. */
  mastered: string[];
  /** Letters and sounds worked on (letter stickers). */
  lettersWorked: number;
  words: number;
  stories: number;
  stickers: number;
  stars: number;
  practiceDays: number;
};

export function initialOf(name: string): string {
  const first = [...name.trim()][0] ?? "?";
  return `${first.toUpperCase()}.`;
}

export function parentSummary(profile: ChildProfile, showName = false): ParentSummary {
  const facts = soFar(profile);
  const lessonDays = new Set<string>();
  for (const key of Object.keys(profile.days)) if (lessonDone(profile, key)) lessonDays.add(key);
  for (const piece of profile.nest) lessonDays.add(piece.date);
  return {
    label: showName ? profile.name : initialOf(profile.name),
    weeks: weeksCompleted(profile),
    lessons: lessonDays.size,
    mastered: soundSummary(profile).knows,
    lettersWorked: facts.letters.length,
    words: facts.words,
    stories: facts.stories,
    stickers: profile.stickers.length,
    stars: profile.stars,
    practiceDays: facts.days,
  };
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Plain text for the share sheet. No dates, no device details, never more of a name than chosen. */
export function summaryText(summary: ParentSummary, product: string): string {
  const lines = [
    `${summary.label}'s ${product} progress`,
    `Weeks completed: ${summary.weeks}`,
    `Lessons finished: ${summary.lessons}`,
    `Sounds mastered: ${summary.mastered.length > 0 ? summary.mastered.map((s) => unitLabel(s)).join(" ") : "none checked yet"}`,
    `Letters worked on: ${summary.lettersWorked}`,
    `Words practiced: ${summary.words}`,
    `Stories read: ${summary.stories}`,
    `Stickers: ${summary.stickers} · Stars: ${summary.stars}`,
    `Days of practice: ${summary.practiceDays}`,
    "",
    `Effort, not scores. Kept on this device by ${product}.`,
  ];
  return lines.join("\n");
}

export { plural };
