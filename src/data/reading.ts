import { milestonesBetween } from "./rewards";
import type { ChildProfile } from "./profiles";
import { READING, subjectDefinition, type SubjectId } from "./subject";
import { deviceTimeZone, localDateKey, monthKey, startOfLocalDay, weekDateKeys, zonedWallTimeToUtc } from "./time";

/** Time counts only when the last tap or key was inside this window. */
export const IDLE_MS = 60_000;

export type ReadingClock = {
  /** When the current active stretch began. Null while paused. */
  startedAt: number | null;
  lastInteractionAt: number;
  visible: boolean;
};

export type ReadingCredit = {
  profile: ChildProfile;
  /** True when today's goal was just met. Later minutes do not set this again. */
  awardedNow: boolean;
  milestones: number[];
};

export type ReadingBar = {
  key: string;
  label: string;
  minutes: number;
};

const WEEK_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Next local midnight after the instant, as epoch ms. */
function nextMidnight(instant: number, timeZone: string): number {
  const start = startOfLocalDay(new Date(instant), timeZone).getTime();
  return startOfLocalDay(new Date(start + 36 * 60 * 60 * 1000), timeZone).getTime();
}

function creditSpan(
  days: Record<string, number>,
  start: number,
  end: number,
  timeZone: string,
): { days: Record<string, number>; addedMs: number } {
  if (end <= start) return { days, addedMs: 0 };
  const next = { ...days };
  let addedMs = 0;
  let cursor = start;
  for (let guard = 0; cursor < end && guard < 4; guard += 1) {
    const boundary = nextMidnight(cursor, timeZone);
    const sliceEnd = Math.min(end, boundary > cursor ? boundary : end);
    const ms = sliceEnd - cursor;
    if (ms <= 0) break;
    const key = localDateKey(new Date(cursor), timeZone);
    next[key] = (next[key] ?? 0) + ms;
    addedMs += ms;
    cursor = sliceEnd;
  }
  return { days: next, addedMs };
}

/**
 * Add the time since the clock started, then pause or keep going.
 * Hidden time is not counted. After `IDLE_MS` without an interaction the
 * stretch stops, and the quiet gap is not filled in later.
 */
export function advanceReading(
  days: Record<string, number>,
  clock: ReadingClock,
  now: number,
  timeZone: string,
  event?: { visible?: boolean; interact?: boolean },
): { days: Record<string, number>; clock: ReadingClock; addedMs: number } {
  let nextDays = days;
  let addedMs = 0;
  if (clock.startedAt !== null && clock.visible) {
    const stop = Math.min(now, clock.lastInteractionAt + IDLE_MS);
    const credited = creditSpan(days, clock.startedAt, Math.max(clock.startedAt, stop), timeZone);
    nextDays = credited.days;
    addedMs = credited.addedMs;
  }
  const visible = event?.visible ?? clock.visible;
  const lastInteractionAt = event?.interact ? now : clock.lastInteractionAt;
  const active = visible && now - lastInteractionAt < IDLE_MS;
  return {
    days: nextDays,
    addedMs,
    clock: { startedAt: active ? now : null, lastInteractionAt, visible },
  };
}

function mergedMs(current: Record<string, number>, totals: Record<string, number>): Record<string, number> {
  const next = { ...current };
  for (const [key, value] of Object.entries(totals)) {
    if (!Number.isFinite(value) || value < 0) continue;
    next[key] = Math.max(next[key] ?? 0, Math.floor(value));
  }
  return next;
}

function timeFor(profile: ChildProfile, subject: SubjectId): Record<string, number> {
  if (subject === READING) return profile.readingMs ?? {};
  return profile.practiceMs?.[subject] ?? {};
}

function awardedFor(profile: ChildProfile, subject: SubjectId): string[] {
  if (subject === READING) return profile.readingAwarded ?? [];
  return profile.practiceAwarded?.[subject] ?? [];
}

/** Minutes already saved for every subject, added together by date. */
export function practiceTotal(profile: ChildProfile): Record<string, number> {
  const totals: Record<string, number> = {};
  const buckets = profile.practiceMs;
  if (!buckets || typeof buckets !== "object") return totals;
  for (const days of Object.values(buckets)) {
    if (!days || typeof days !== "object") continue;
    for (const [day, ms] of Object.entries(days)) {
      if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 0) continue;
      totals[day] = (totals[day] ?? 0) + ms;
    }
  }
  return totals;
}

function awardedDays(profile: ChildProfile): Set<string> {
  const days = new Set<string>(profile.readingAwarded ?? []);
  const buckets = profile.practiceAwarded;
  if (buckets && typeof buckets === "object") {
    for (const dates of Object.values(buckets)) {
      if (!Array.isArray(dates)) continue;
      for (const day of dates) {
        if (typeof day === "string") days.add(day);
      }
    }
  }
  return days;
}

function sameMs(left: Record<string, number>, right: Record<string, number>): boolean {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    if ((left[key] ?? 0) !== (right[key] ?? 0)) return false;
  }
  return true;
}

/**
 * Save active time and, the first time a day reaches the goal, add one star
 * and that day's nest piece. Minutes past the goal do not add another star.
 */
export function applyReadingCredit(
  profile: ChildProfile,
  totals: Record<string, number>,
  goalMinutes: number,
  now = new Date(),
  timeZone = deviceTimeZone(),
  subject: SubjectId = READING,
): ReadingCredit {
  if (!subjectDefinition(subject)) return { profile, awardedNow: false, milestones: [] };
  const current = timeFor(profile, subject);
  const nextMs = mergedMs(current, totals);
  const goalMs = Math.max(0, goalMinutes) * 60_000;
  const combined = practiceTotal(profile);
  for (const [day, ms] of Object.entries(nextMs)) {
    combined[day] = (combined[day] ?? 0) - (current[day] ?? 0) + ms;
  }
  const already = awardedDays(profile);
  const hits = Object.keys(nextMs).filter((day) => (combined[day] ?? 0) >= goalMs && goalMs > 0 && !already.has(day));
  if (hits.length === 0 && sameMs(current, nextMs)) {
    return { profile, awardedNow: false, milestones: [] };
  }
  let stars = profile.stars;
  let celebrated = profile.celebrated;
  let nest = profile.nest;
  const milestones: number[] = [];
  for (const day of hits) {
    const before = stars;
    stars += 1;
    const marks = milestonesBetween(before, stars, celebrated);
    milestones.push(...marks);
    celebrated = [...celebrated, ...marks];
    if (!nest.some((piece) => piece.date === day)) {
      const piece = nest.length % 2 === 0 ? "twig" : "egg";
      nest = [...nest, { date: day, piece }];
    }
  }
  const today = localDateKey(now, timeZone);
  const practiceMs = { ...profile.practiceMs, [subject]: nextMs };
  const practiceAwarded = { ...profile.practiceAwarded, [subject]: [...awardedFor(profile, subject), ...hits] };
  const reading =
    subject === READING
      ? { readingMs: nextMs, readingAwarded: practiceAwarded[subject] }
      : { readingMs: profile.readingMs, readingAwarded: profile.readingAwarded };
  return {
    profile: {
      ...profile,
      stars,
      celebrated,
      nest,
      ...reading,
      practiceMs,
      practiceAwarded,
    },
    awardedNow: hits.includes(today),
    milestones,
  };
}

function minutes(ms: number): number {
  return Math.floor(ms / 60_000);
}

function monthKeys(now: Date, timeZone: string): string[] {
  const month = monthKey(now, timeZone);
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthNumber = Number(monthText);
  const keys: string[] = [];
  for (let day = 1; day <= 31; day += 1) {
    const instant = zonedWallTimeToUtc(year, monthNumber, day, 12, 0, 0, timeZone);
    const key = localDateKey(instant, timeZone);
    if (!key.startsWith(`${yearText}-${pad(monthNumber)}-`)) break;
    if (keys.includes(key)) break;
    keys.push(key);
  }
  return keys;
}

/** Bars for the Day, Week, or Month chart. Minutes are whole minutes. */
export function readingBars(
  days: Record<string, number>,
  range: "day" | "week" | "month",
  now: Date,
  timeZone: string,
): ReadingBar[] {
  const today = localDateKey(now, timeZone);
  if (range === "day") {
    return [{ key: today, label: "Today", minutes: minutes(days[today] ?? 0) }];
  }
  if (range === "week") {
    return weekDateKeys(now, timeZone).map((key, index) => ({
      key,
      label: WEEK_LABELS[index] ?? "",
      minutes: minutes(days[key] ?? 0),
    }));
  }
  return monthKeys(now, timeZone).map((key) => ({
    key,
    label: key.slice(-2).replace(/^0/, ""),
    minutes: minutes(days[key] ?? 0),
  }));
}

/** Total and average over days that have already started. Later days stay on the chart as empty. */
export function readingSummary(bars: ReadingBar[], today: string): { total: number; average: number } {
  const elapsed = bars.filter((bar) => bar.key <= today);
  const total = elapsed.reduce((sum, bar) => sum + bar.minutes, 0);
  const count = Math.max(1, elapsed.length);
  return { total, average: Math.round(total / count) };
}
