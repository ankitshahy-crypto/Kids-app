/**
 * Quiet check-in results, kept on the child's profile. A separate module so
 * the profile store can read them without importing the progress views.
 */
/** One day's first try at a sound: picked on the first try, or still practicing. */
export type SoundTry = {
  firstTry: boolean;
  /** Local date. */
  date: string;
};

export type SoundCheck = {
  /** The latest try, from either check. A replay the same day does not change it. */
  firstTry: boolean;
  /** Local date of the latest try. */
  date: string;
  /** First-try picks, all time, one per day for each check. */
  got: number;
  /** Days asked, all time, for each check. */
  asked: number;
  /** The latest Friday sound game try. What the "says the sounds" hint goes by. */
  friday?: SoundTry;
  /** The latest Where to start check try. */
  start?: SoundTry;
};

export type SoundChecks = Record<string, SoundCheck>;

export const SOUND_KEY = /^[a-z]{1,3}$|^[aiou]_e$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function soundTry(raw: unknown): SoundTry | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const attempt = raw as Partial<SoundTry>;
  if (typeof attempt.firstTry !== "boolean" || typeof attempt.date !== "string" || !DATE.test(attempt.date)) return undefined;
  return { firstTry: attempt.firstTry, date: attempt.date };
}

export function normalizeSoundChecks(value: unknown): SoundChecks {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: SoundChecks = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!SOUND_KEY.test(key) || !raw || typeof raw !== "object") continue;
    const check = raw as Partial<SoundCheck>;
    if (typeof check.firstTry !== "boolean" || typeof check.date !== "string" || !DATE.test(check.date)) continue;
    const asked = typeof check.asked === "number" && check.asked >= 1 ? Math.floor(check.asked) : 1;
    const got = typeof check.got === "number" && check.got >= 0 ? Math.min(asked, Math.floor(check.got)) : check.firstTry ? 1 : 0;
    const latest = { firstTry: check.firstTry, date: check.date };
    let friday = soundTry(check.friday);
    let start = soundTry(check.start);
    // A save from before the two checks kept their own tries: a `start: true` mark, or nothing, on the latest try.
    if (!friday && !start) {
      if ((check as { start?: unknown }).start === true) start = latest;
      else friday = latest;
    }
    out[key] = { ...latest, got, asked, ...(friday ? { friday } : {}), ...(start ? { start } : {}) };
  }
  return out;
}


/** On a family's device: what the teacher's family code said. */
export type TeacherLink = {
  /** Index into HOME_NOTES. 0 is no note. */
  note: number;
  weekIndex: number | null;
  ladderStep: number | null;
  /** Week stamp of the code. */
  week: number;
  /** Local date the code was typed in. */
  entered: string;
};

/** On the class iPad: what a family's progress code said. */
export type HomeReport = {
  weekIndex: number;
  lessonsTotal: number;
  lessonsThisWeek: number;
  practicedDays: boolean[];
  knows: number;
  practicing: number;
  week: number;
  entered: string;
};

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function whole(value: unknown, max: number): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= max ? value : null;
}

export function normalizeTeacherLink(value: unknown): TeacherLink | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const note = whole(raw.note, 31);
  const week = whole(raw.week, 1023);
  if (note === null || week === null || typeof raw.entered !== "string" || !DATE_KEY.test(raw.entered)) return undefined;
  return {
    note,
    weekIndex: whole(raw.weekIndex, 127),
    ladderStep: whole(raw.ladderStep, 5),
    week,
    entered: raw.entered,
  };
}

export function normalizeHomeReport(value: unknown): HomeReport | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const fields = {
    weekIndex: whole(raw.weekIndex, 127),
    lessonsTotal: whole(raw.lessonsTotal, 1023),
    lessonsThisWeek: whole(raw.lessonsThisWeek, 7),
    knows: whole(raw.knows, 63),
    practicing: whole(raw.practicing, 63),
    week: whole(raw.week, 1023),
  };
  if (Object.values(fields).some((item) => item === null)) return undefined;
  if (!Array.isArray(raw.practicedDays) || raw.practicedDays.length !== 7) return undefined;
  if (typeof raw.entered !== "string" || !DATE_KEY.test(raw.entered)) return undefined;
  return {
    ...(fields as Record<keyof typeof fields, number>),
    practicedDays: raw.practicedDays.map(Boolean),
    entered: raw.entered,
  };
}
