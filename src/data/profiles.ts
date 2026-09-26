import { PROFILES_KEY, readStored, writeStored } from "../storage";
import { animalById, isAnimalId, type AnimalId } from "./animals";
import { READING, isSubjectKey, readingSteps, subjectDefinition, type SubjectId } from "./subject";
import { deviceTimeZone, localDateKey, utcTimestamp, weekDateKeys } from "./time";
import { emptyOutfit, itemForSlot, type Outfit } from "./wardrobe";

export const ageRanges = ["3", "4", "5", "6-7"] as const;
export type AgeRange = (typeof ageRanges)[number];

export const lessonSteps = readingSteps;
export type LessonStep = (typeof lessonSteps)[number];

/** Today's reading steps. Other subjects keep their own step map on the day. */
export type DayProgress = Record<LessonStep, boolean>;

/** Subject id → step id → finished. One day can hold reading and, later, another subject. */
export type DayRecord = Record<string, Record<string, boolean>>;

export type Sticker = {
  subject: SubjectId;
  kind: "letter" | "word" | "number" | "color";
  /** Lowercase letter, word, numeral, or color. Stored once per subject. */
  label: string;
};

export type StickerInput = {
  subject?: SubjectId;
  kind: Sticker["kind"];
  label: string;
};

export type NestPiece = {
  /** Local date the daily lesson was finished. Never removed. */
  date: string;
  piece: "twig" | "egg";
};

export type ChildProfile = {
  id: string;
  /** First name, or one initial. Never a last name. */
  name: string;
  ageRange: AgeRange;
  animal: AnimalId;
  /** UTC instant, ISO-8601. */
  createdAt: string;
  /** Lifetime effort stars. Only ever increases. */
  stars: number;
  /**
   * Progress keyed by the local calendar date (`YYYY-MM-DD`) in the device
   * zone when the star was awarded. The same date is never awarded twice.
   */
  days: Record<string, DayRecord>;
  /** What the animal is wearing. Empty until the child picks something already earned. */
  outfit: Outfit;
  /** Letters and words learned. Only added, never removed. */
  stickers: Sticker[];
  /** One twig or egg for each day the whole lesson was finished. */
  nest: NestPiece[];
  /** Star totals already celebrated, such as 10 and 20. */
  celebrated: number[];
  /** Active reading milliseconds, keyed by local date. Mirror of `practiceMs.reading`. */
  readingMs: Record<string, number>;
  /** Dates whose reading goal already gave the one bonus star. Mirror of `practiceAwarded.reading`. */
  readingAwarded: string[];
  /** Active milliseconds by subject, then local date. Reading is `practiceMs.reading`. */
  practiceMs: Record<string, Record<string, number>>;
  /** Dates whose goal already gave the one bonus star, per subject. */
  practiceAwarded: Record<string, string[]>;
};

type ProfileStore = {
  activeId: string | null;
  profiles: ChildProfile[];
};

const STORAGE_KEY = PROFILES_KEY;

/** Local calendar date in the device zone. The lesson day resets at local midnight. */
export function todayKey(now = new Date(), timeZone = deviceTimeZone()): string {
  return localDateKey(now, timeZone);
}

export function isAgeRange(value: string): value is AgeRange {
  return (ageRanges as readonly string[]).includes(value);
}

/**
 * Keep a first name or a single initial. A second word is dropped so a last
 * name is not stored. Returns null when nothing usable is left.
 */
export function normalizeChildName(raw: string): string | null {
  const firstWord = raw.trim().split(/\s+/)[0] ?? "";
  const cleaned = firstWord.replace(/[^A-Za-z'-]/g, "");
  if (!/^[A-Za-z](?:[A-Za-z'-]{0,15})$/.test(cleaned)) return null;
  if (cleaned.length === 1) return cleaned.toUpperCase();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/** Name lessons use the animal when the profile is only an initial. */
export function lessonName(profile: Pick<ChildProfile, "name" | "animal">): string {
  if (profile.name.trim().length <= 1) return animalById(profile.animal).name;
  return profile.name.trim();
}

export function dayProgress(
  profile: ChildProfile,
  now = new Date(),
  timeZone = deviceTimeZone(),
  subject: SubjectId = READING,
): DayProgress {
  const steps = profile.days[todayKey(now, timeZone)]?.[subject] ?? {};
  return {
    letter: Boolean(steps.letter),
    draw: Boolean(steps.draw),
    story: Boolean(steps.story),
    moment: Boolean(steps.moment),
  };
}

/** One star for a finished step of a known subject. The same step on that day is not awarded twice. */
export function awardStar(
  profile: ChildProfile,
  step: string,
  now = new Date(),
  timeZone = deviceTimeZone(),
  subject: SubjectId = READING,
): ChildProfile {
  if (!subjectDefinition(subject) || !isSubjectKey(step)) return profile;
  const key = todayKey(now, timeZone);
  const day = profile.days[key] ?? {};
  const steps = day[subject] ?? {};
  if (steps[step]) return profile;
  return {
    ...profile,
    stars: profile.stars + 1,
    days: {
      ...profile.days,
      [key]: { ...day, [subject]: { ...steps, [step]: true } },
    },
  };
}

/** Stars whose local dates fall in the current Monday–Sunday week, across every subject. */
export function starsThisWeek(profile: ChildProfile, now = new Date(), timeZone = deviceTimeZone()): number {
  const keys = new Set(weekDateKeys(now, timeZone));
  let stars = 0;
  for (const [key, day] of Object.entries(profile.days)) {
    if (!keys.has(key)) continue;
    for (const steps of Object.values(day)) {
      stars += Object.values(steps).filter(Boolean).length;
    }
  }
  return stars;
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `child-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Change name, age, or animal. Stars and daily progress stay as they are. */
export function editChild(
  profile: ChildProfile,
  input: { name: string; ageRange: AgeRange; animal: AnimalId },
): ChildProfile {
  const name = normalizeChildName(input.name);
  if (!name) throw new Error("A first name or initial is required");
  return {
    ...profile,
    name,
    ageRange: input.ageRange,
    animal: input.animal,
  };
}

function emptyRewards(): Pick<
  ChildProfile,
  "outfit" | "stickers" | "nest" | "celebrated" | "readingMs" | "readingAwarded" | "practiceMs" | "practiceAwarded"
> {
  return {
    outfit: emptyOutfit(),
    stickers: [],
    nest: [],
    celebrated: [],
    readingMs: {},
    readingAwarded: [],
    practiceMs: { [READING]: {} },
    practiceAwarded: { [READING]: [] },
  };
}

export function createChild(input: { name: string; ageRange: AgeRange; animal: AnimalId }): ChildProfile {
  const name = normalizeChildName(input.name);
  if (!name) throw new Error("A first name or initial is required");
  return {
    id: newId(),
    name,
    ageRange: input.ageRange,
    animal: input.animal,
    createdAt: utcTimestamp(),
    stars: 0,
    days: {},
    ...emptyRewards(),
  };
}

function isStoredDay(value: unknown): boolean {
  return normalizeDay(value) !== null;
}

function isSticker(value: unknown): value is Sticker {
  if (!value || typeof value !== "object") return false;
  const sticker = value as Partial<Sticker>;
  return (
    (sticker.kind === "letter" || sticker.kind === "word" || sticker.kind === "number" || sticker.kind === "color") &&
    typeof sticker.label === "string" &&
    sticker.label.length > 0
  );
}

function isNestPiece(value: unknown): value is NestPiece {
  if (!value || typeof value !== "object") return false;
  const piece = value as Partial<NestPiece>;
  return typeof piece.date === "string" && (piece.piece === "twig" || piece.piece === "egg");
}

/** Older saves have stars and days only. Rewards start empty and are never required to load. */
function withRewards(profile: ChildProfile): ChildProfile {
  const raw = profile as ChildProfile & { outfit?: Partial<Outfit> };
  return {
    ...profile,
    outfit: {
      hat: itemForSlot(raw.outfit?.hat ?? null, "hat"),
      scarf: itemForSlot(raw.outfit?.scarf ?? null, "scarf"),
      glasses: itemForSlot(raw.outfit?.glasses ?? null, "glasses"),
      color: itemForSlot(raw.outfit?.color ?? null, "color"),
    },
    stickers: Array.isArray(profile.stickers) ? profile.stickers.filter(isSticker).map(withStickerSubject) : [],
    days: normalizeDays(profile.days),
    nest: Array.isArray(profile.nest) ? profile.nest.filter(isNestPiece) : [],
    celebrated: Array.isArray(profile.celebrated)
      ? profile.celebrated.filter((value) => typeof value === "number" && value > 0 && value % 10 === 0)
      : [],
    ...practiceTime(profile),
  };
}

function withStickerSubject(sticker: Sticker): Sticker {
  const subject = typeof sticker.subject === "string" && isSubjectKey(sticker.subject) ? sticker.subject : READING;
  return { ...sticker, subject };
}

function normalizeDays(value: unknown): Record<string, DayRecord> {
  if (!value || typeof value !== "object") return {};
  const days: Record<string, DayRecord> = {};
  for (const [key, day] of Object.entries(value as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
    const normalized = normalizeDay(day);
    if (normalized) days[key] = normalized;
  }
  return days;
}

/** Older saves store reading steps on the day itself. Newer saves nest them under `reading`. */
function normalizeDay(value: unknown): DayRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (lessonSteps.every((step) => typeof record[step] === "boolean")) {
    const steps: Record<string, boolean> = {};
    for (const step of lessonSteps) steps[step] = Boolean(record[step]);
    return { [READING]: steps };
  }
  const next: DayRecord = {};
  for (const [subject, steps] of Object.entries(record)) {
    if (!isSubjectKey(subject) || !steps || typeof steps !== "object" || Array.isArray(steps)) continue;
    const flags: Record<string, boolean> = {};
    for (const [step, done] of Object.entries(steps as Record<string, unknown>)) {
      if (typeof done === "boolean" && isSubjectKey(step)) flags[step] = done;
    }
    if (Object.keys(flags).length > 0) next[subject] = flags;
  }
  return Object.keys(next).length > 0 ? next : null;
}

function dateList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item));
}

function practiceTime(profile: ChildProfile): Pick<ChildProfile, "readingMs" | "readingAwarded" | "practiceMs" | "practiceAwarded"> {
  const readingMs = readingMap(profile.readingMs);
  const readingAwarded = dateList(profile.readingAwarded);
  const practiceMs: Record<string, Record<string, number>> = {};
  const rawMs = profile.practiceMs;
  if (rawMs && typeof rawMs === "object") {
    for (const [subject, days] of Object.entries(rawMs)) {
      if (!isSubjectKey(subject)) continue;
      practiceMs[subject] = readingMap(days);
    }
  }
  practiceMs[READING] = { ...readingMs, ...(practiceMs[READING] ?? {}) };
  for (const [key, ms] of Object.entries(readingMs)) {
    practiceMs[READING][key] = Math.max(practiceMs[READING][key] ?? 0, ms);
  }
  const practiceAwarded: Record<string, string[]> = {};
  const rawAwarded = profile.practiceAwarded;
  if (rawAwarded && typeof rawAwarded === "object") {
    for (const [subject, dates] of Object.entries(rawAwarded)) {
      if (!isSubjectKey(subject)) continue;
      practiceAwarded[subject] = dateList(dates);
    }
  }
  const readingDates = new Set([...(practiceAwarded[READING] ?? []), ...readingAwarded]);
  practiceAwarded[READING] = [...readingDates];
  return {
    readingMs: practiceMs[READING],
    readingAwarded: practiceAwarded[READING],
    practiceMs,
    practiceAwarded,
  };
}

function readingMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const next: Record<string, number> = {};
  for (const [key, ms] of Object.entries(value as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || typeof ms !== "number" || !Number.isFinite(ms) || ms < 0) continue;
    next[key] = Math.floor(ms);
  }
  return next;
}

function isProfile(value: unknown): value is ChildProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<ChildProfile>;
  if (typeof profile.id !== "string" || typeof profile.name !== "string") return false;
  if (typeof profile.createdAt !== "string" || typeof profile.stars !== "number") return false;
  if (!isAgeRange(String(profile.ageRange)) || !isAnimalId(String(profile.animal))) return false;
  if (profile.stars < 0 || !Number.isFinite(profile.stars)) return false;
  if (!profile.days || typeof profile.days !== "object") return false;
  return Object.values(profile.days).every(isStoredDay);
}

export function loadStore(): ProfileStore {
  try {
    const raw = readStored(localStorage, STORAGE_KEY);
    if (!raw) return { activeId: null, profiles: [] };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { activeId: null, profiles: [] };
    const store = parsed as Partial<ProfileStore>;
    const profiles = Array.isArray(store.profiles) ? store.profiles.filter(isProfile).map(withRewards) : [];
    const activeId = profiles.some((profile) => profile.id === store.activeId) ? store.activeId ?? null : null;
    return { activeId, profiles };
  } catch {
    return { activeId: null, profiles: [] };
  }
}

export function saveStore(store: ProfileStore): void {
  const safe: ProfileStore = {
    activeId: store.profiles.some((profile) => profile.id === store.activeId) ? store.activeId : null,
    profiles: store.profiles,
  };
  writeStored(localStorage, STORAGE_KEY, JSON.stringify(safe));
}
