/**
 * Calendar dates in an IANA time zone.
 * Instants are stored as UTC ISO strings. A "day" is the local calendar date,
 * so a 23-hour or 25-hour daylight-saving day is still one day, and a repeated
 * hour does not create a second one.
 */

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function deviceTimeZone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone) return zone;
  } catch {
    // Intl can throw if the runtime has no locale data.
  }
  return "UTC";
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** UTC instant, stored as an ISO-8601 string. */
export function utcTimestamp(date = new Date()): string {
  return date.toISOString();
}

type WallTime = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 is Sunday, 5 is Friday. */
  weekday: number;
};

function wallTime(date: Date, timeZone: string): WallTime {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const bag: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  let hour = Number(bag.hour);
  if (hour === 24) hour = 0;
  const weekday = WEEKDAY_INDEX[bag.weekday] ?? 0;
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour,
    minute: Number(bag.minute),
    second: Number(bag.second),
    weekday,
  };
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

function dateKey(year: number, month: number, day: number): string {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

/** Local calendar date `YYYY-MM-DD` for an instant in `timeZone`. */
export function localDateKey(date: Date, timeZone: string): string {
  const wall = wallTime(date, timeZone);
  return dateKey(wall.year, wall.month, wall.day);
}

/** Days since the Unix epoch for a calendar date. Clock time and DST are ignored. */
export function calendarDayNumber(year: number, month: number, day: number): number {
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function keyFromDayNumber(dayNumber: number): string {
  const date = new Date(dayNumber * 86400000);
  return dateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function dayNumberFromKey(key: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const numeric = calendarDayNumber(year, month, day);
  if (keyFromDayNumber(numeric) !== key) return null;
  return numeric;
}

/**
 * Offset such that UTC instant + offset = wall-clock fields read as UTC.
 * East of UTC the offset is positive.
 */
function zoneOffsetMs(date: Date, timeZone: string): number {
  const wall = wallTime(date, timeZone);
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  return asUtc - date.getTime();
}

/** UTC instant of a wall-clock time in `timeZone`. */
export function zonedWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, second);
  const firstOffset = zoneOffsetMs(new Date(guess), timeZone);
  const first = guess - firstOffset;
  const secondOffset = zoneOffsetMs(new Date(first), timeZone);
  return new Date(guess - secondOffset);
}

/** Local midnight that begins the calendar day containing `date`. The result is a UTC instant. */
export function startOfLocalDay(date: Date, timeZone: string): Date {
  const wall = wallTime(date, timeZone);
  return zonedWallTimeToUtc(wall.year, wall.month, wall.day, 0, 0, 0, timeZone);
}

export function isFriday(date: Date, timeZone: string): boolean {
  return wallTime(date, timeZone).weekday === 5;
}

/** Monday `YYYY-MM-DD` of the local week that contains `date`. Weeks are Monday through Sunday. */
export function mondayKey(date: Date, timeZone: string): string {
  const wall = wallTime(date, timeZone);
  const back = wall.weekday === 0 ? 6 : wall.weekday - 1;
  return keyFromDayNumber(calendarDayNumber(wall.year, wall.month, wall.day) - back);
}

export function weekDateKeys(date: Date, timeZone: string): string[] {
  const start = dayNumberFromKey(mondayKey(date, timeZone));
  if (start === null) return [];
  return Array.from({ length: 7 }, (_, index) => keyFromDayNumber(start + index));
}

/** `YYYY-MM` in `timeZone`. Monthly class goals use this. */
export function monthKey(date: Date, timeZone: string): string {
  const wall = wallTime(date, timeZone);
  return `${pad(wall.year, 4)}-${pad(wall.month)}`;
}

/**
 * How many Monday boundaries have been crossed, in `timeZone`, since the week
 * that contains `createdAt`. The creation week is 0.
 */
export function calendarWeeksBetween(createdAt: Date, now: Date, timeZone: string): number {
  const start = dayNumberFromKey(mondayKey(createdAt, timeZone));
  const end = dayNumberFromKey(mondayKey(now, timeZone));
  if (start === null || end === null) return 0;
  return Math.max(0, Math.round((end - start) / 7));
}
