import { calendarDayNumber, deviceTimeZone, localDateKey } from "./time";
import type { LadderStep } from "./ladder";

/**
 * Codes a grown-up types to carry a little progress between the class iPad
 * and a family's device, with no account and no server. A code holds lesson
 * positions, counts, and a preset note number. Never a name, never free text,
 * never anything about health. A typo is caught by the check digits.
 *
 *   Family code (teacher → home): reading week, word-ladder step, note for home.
 *   Progress code (home → teacher): lessons done, days practiced, sounds known.
 */

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const KIND_FAMILY = 1;
const KIND_PROGRESS = 2;

/** Weeks counted from Monday 5 January 2026, so a code can say how fresh it is. */
const EPOCH_DAY = calendarDayNumber(2026, 1, 5);

/** Preset notes a teacher can send home. Friendly, specific, and never about health or diagnosis. */
export const HOME_NOTES = [
  "",
  "Great listening this week!",
  "Wonderful blending this week!",
  "Lovely tracing this week!",
  "So proud of their hard work!",
  "Try the Friday review together.",
  "Read the weekly story together at bedtime.",
  "Practice this week's letters at home.",
  "Five minutes on more days will help.",
  "Ask them to read you a word!",
  "Keep up the great work!",
] as const;

export function noteText(id: number): string {
  return HOME_NOTES[id] ?? "";
}

export type FamilyCode = {
  /** Reading week index to place the child at, or null to leave placement alone. */
  weekIndex: number | null;
  ladderStep: LadderStep | null;
  /** Index into HOME_NOTES. 0 is no note. */
  note: number;
  /** Weeks since the epoch when the code was made. */
  week: number;
};

export type ProgressCode = {
  weekIndex: number;
  lessonsTotal: number;
  lessonsThisWeek: number;
  /** Monday first. */
  practicedDays: boolean[];
  knows: number;
  practicing: number;
  week: number;
};

export function weekStamp(now = new Date(), timeZone = deviceTimeZone()): number {
  const key = localDateKey(now, timeZone);
  const [year, month, day] = key.split("-").map(Number);
  return Math.max(0, Math.floor((calendarDayNumber(year, month, day) - EPOCH_DAY) / 7)) % 1024;
}

/** "This week", "Last week", or "3 weeks ago". */
export function stampLabel(week: number, now = new Date(), timeZone = deviceTimeZone()): string {
  const ago = (weekStamp(now, timeZone) - week + 1024) % 1024;
  if (ago === 0) return "This week";
  if (ago === 1) return "Last week";
  return `${ago} weeks ago`;
}

class Bits {
  private bits: number[] = [];
  push(value: number, width: number): void {
    const clamped = Math.max(0, Math.min(2 ** width - 1, Math.floor(value)));
    for (let bit = width - 1; bit >= 0; bit -= 1) this.bits.push((clamped >> bit) & 1);
  }
  get all(): number[] {
    return this.bits;
  }
}

class Reader {
  private at = 0;
  constructor(private readonly bits: number[]) {}
  take(width: number): number {
    let value = 0;
    for (let index = 0; index < width; index += 1) value = value * 2 + (this.bits[this.at + index] ?? 0);
    this.at += width;
    return value;
  }
}

function checksum(bits: number[]): number {
  let value = 7;
  for (const bit of bits) value = (value * 31 + bit + 1) % 1021;
  return value;
}

function encode(payload: number[], chars: number): string {
  const bits = [...payload];
  const total = chars * 5 - 10;
  if (bits.length > total) throw new Error("Code payload too long");
  while (bits.length < total) bits.push(0);
  const sum = new Bits();
  sum.push(checksum(bits), 10);
  const all = [...bits, ...sum.all];
  let out = "";
  for (let index = 0; index < all.length; index += 5) {
    let value = 0;
    for (let bit = 0; bit < 5; bit += 1) value = value * 2 + all[index + bit];
    out += ALPHABET[value];
  }
  return out.match(/.{1,4}/g)?.join("-") ?? out;
}

function decode(code: string, chars: number): number[] | null {
  const clean = code
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  if (clean.length !== chars) return null;
  const bits: number[] = [];
  for (const char of clean) {
    const value = ALPHABET.indexOf(char);
    if (value < 0) return null;
    for (let bit = 4; bit >= 0; bit -= 1) bits.push((value >> bit) & 1);
  }
  const body = bits.slice(0, bits.length - 10);
  const sum = new Reader(bits.slice(bits.length - 10)).take(10);
  return checksum(body) === sum ? body : null;
}

const FAMILY_CHARS = 8;
const PROGRESS_CHARS = 12;

export function familyCode(input: FamilyCode): string {
  const bits = new Bits();
  bits.push(KIND_FAMILY, 2);
  bits.push(input.weekIndex === null ? 0 : 1, 1);
  bits.push(input.weekIndex ?? 0, 7);
  bits.push(input.ladderStep ?? 0, 3);
  bits.push(input.note, 5);
  bits.push(input.week, 10);
  return encode(bits.all, FAMILY_CHARS);
}

export function readFamilyCode(code: string): FamilyCode | null {
  const body = decode(code, FAMILY_CHARS);
  if (!body) return null;
  const read = new Reader(body);
  if (read.take(2) !== KIND_FAMILY) return null;
  const placed = read.take(1) === 1;
  const weekIndex = read.take(7);
  const ladder = read.take(3);
  const note = read.take(5);
  const week = read.take(10);
  if (note >= HOME_NOTES.length) return null;
  return {
    weekIndex: placed ? weekIndex : null,
    ladderStep: ladder >= 1 && ladder <= 5 ? (ladder as LadderStep) : null,
    note,
    week,
  };
}

export function progressCode(input: ProgressCode): string {
  const bits = new Bits();
  bits.push(KIND_PROGRESS, 2);
  bits.push(input.weekIndex, 6);
  bits.push(input.lessonsTotal, 10);
  bits.push(input.lessonsThisWeek, 3);
  for (let day = 0; day < 7; day += 1) bits.push(input.practicedDays[day] ? 1 : 0, 1);
  bits.push(input.knows, 6);
  bits.push(input.practicing, 6);
  bits.push(input.week, 10);
  return encode(bits.all, PROGRESS_CHARS);
}

export function readProgressCode(code: string): ProgressCode | null {
  const body = decode(code, PROGRESS_CHARS);
  if (!body) return null;
  const read = new Reader(body);
  if (read.take(2) !== KIND_PROGRESS) return null;
  const weekIndex = read.take(6);
  const lessonsTotal = read.take(10);
  const lessonsThisWeek = read.take(3);
  const practicedDays = Array.from({ length: 7 }, () => read.take(1) === 1);
  const knows = read.take(6);
  const practicing = read.take(6);
  const week = read.take(10);
  return { weekIndex, lessonsTotal, lessonsThisWeek, practicedDays, knows, practicing, week };
}

/** Which kind of code this looks like, so one box can take either. */
export function codeKind(code: string): "family" | "progress" | null {
  if (readFamilyCode(code)) return "family";
  if (readProgressCode(code)) return "progress";
  return null;
}
