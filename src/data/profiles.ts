import { PROFILES_KEY, corruptKey, readStored, stashCorrupt, writeStored, type KeyValueStore } from "../storage";
import { animalById, isAnimalId, type AnimalId } from "./animals";
import { READING, isSubjectKey, readingSteps, subjectDefinition, type SubjectId } from "./subject";
import { deviceTimeZone, localDateKey, utcTimestamp, weekDateKeys } from "./time";
import { emptyGames, normalizeGames, type GameProgress } from "./games";
import { emptyLadder, normalizeLadder, type LadderProgress } from "./ladder";
import { normalizeWriting, type WritingMap } from "./scaffold";
import { emptyOutfit, isWardrobeId, itemForSlot, type Outfit } from "./wardrobe";

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
  kind: "letter" | "word" | "number" | "color" | "shape" | "animal" | "time" | "coin";
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
  /** Tracing help for each letter, shape, word, or name. Missing items start at a full guide. */
  writing: WritingMap;
  /** Hatch the Egg grows here. Missing saves start at the first sound. */
  games: GameProgress;
  /** Word length for blending, tracing, and word games. Missing saves start at one letter. */
  ladder: LadderProgress;
  /** Dress-up items from the wheel. They can be worn before their star cost. */
  gifts: string[];
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

/**
 * Activity steps that are not part of a subject's daily lesson.
 * Spin & Say uses this closed set. `spin-1`, `spin-2`, and any other generated
 * id are refused, so replaying the wheel cannot mint a new star each time.
 */
export const activitySteps = [
  "spin-sound",
  "spin-word",
  "spin-count",
  "spin-color",
  "spin-trace",
  "spin-bonus",
  "word",
  "name",
  "game-hatch",
  "game-pop",
  "game-feed",
  "game-rhyme",
  "game-memory",
  "game-bird",
  "game-pattern",
  "game-morning",
  "game-garden",
  "jars",
  "lemonade",
  "choose",
  "needs",
  "cards",
] as const;

const activityStepSet = new Set<string>(activitySteps);

export function stepAllowed(subject: SubjectId, step: string): boolean {
  const definition = subjectDefinition(subject);
  if (!definition || !isSubjectKey(step)) return false;
  return definition.steps.includes(step) || activityStepSet.has(step);
}

/** One star for a finished step of a known subject. The same step on that day is not awarded twice. */
export function awardStar(
  profile: ChildProfile,
  step: string,
  now = new Date(),
  timeZone = deviceTimeZone(),
  subject: SubjectId = READING,
): ChildProfile {
  if (!stepAllowed(subject, step)) return profile;
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
    writing: {},
    games: emptyGames(),
    ladder: emptyLadder(),
    gifts: [],
    ...emptyRewards(),
  };
}

function isSticker(value: unknown): value is Sticker {
  if (!value || typeof value !== "object") return false;
  const sticker = value as Partial<Sticker>;
  return (
    (sticker.kind === "letter" ||
      sticker.kind === "word" ||
      sticker.kind === "number" ||
      sticker.kind === "color" ||
      sticker.kind === "shape" ||
      sticker.kind === "animal" ||
      sticker.kind === "time" ||
      sticker.kind === "coin") &&
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
    writing: normalizeWriting((profile as { writing?: unknown }).writing),
    games: normalizeGames((profile as { games?: unknown }).games),
    ladder: normalizeLadder((profile as { ladder?: unknown }).ladder),
    gifts: normalizeGifts((profile as { gifts?: unknown }).gifts),
  };
}

function normalizeGifts(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const gifts: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !isWardrobeId(item) || seen.has(item)) continue;
    seen.add(item);
    gifts.push(item);
  }
  return gifts;
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
  if (!profile.days || typeof profile.days !== "object" || Array.isArray(profile.days)) return false;
  return true;
}

const emptyStore = (): ProfileStore => ({ activeId: null, profiles: [] });

/** What `saveStore` writes. Used to skip a save when nothing the child did has changed. */
export function storeSnapshot(store: ProfileStore): string {
  const safe: ProfileStore = {
    activeId: store.profiles.some((profile) => profile.id === store.activeId) ? store.activeId : null,
    profiles: store.profiles,
  };
  return JSON.stringify(safe);
}

/**
 * Read profiles. A document that cannot be parsed, or that contains a record
 * this version does not understand, is copied to `littlenest-profiles-v1-corrupt`
 * and the original key is left as it was. This function never writes an empty
 * store over that key.
 */
export function loadStore(storage: KeyValueStore = localStorage): ProfileStore {
  let raw: string | null;
  try {
    raw = readStored(storage, STORAGE_KEY);
  } catch {
    return emptyStore();
  }
  if (!raw) return adoptCorruptStash(storage, emptyStore());
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    stashCorrupt(storage, STORAGE_KEY, raw);
    return adoptCorruptStash(storage, emptyStore());
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    stashCorrupt(storage, STORAGE_KEY, raw);
    return adoptCorruptStash(storage, emptyStore());
  }
  const store = parsed as Partial<ProfileStore>;
  if (!Array.isArray(store.profiles)) {
    stashCorrupt(storage, STORAGE_KEY, raw);
    return adoptCorruptStash(storage, emptyStore());
  }
  if (store.profiles.some((profile) => !isProfile(profile))) {
    stashCorrupt(storage, STORAGE_KEY, raw);
  }
  const profiles = store.profiles.filter(isProfile).map(withRewards);
  const activeId = profiles.some((profile) => profile.id === store.activeId) ? (store.activeId ?? null) : null;
  return adoptCorruptStash(storage, { activeId, profiles });
}

const CORRUPT_NOTICE = "A saved profile on this device could not be read.";

/** Profiles this version understands, or null when the stash is still unreadable. */
function parseCurrentStore(raw: string): ProfileStore | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const store = parsed as Partial<ProfileStore>;
  if (!Array.isArray(store.profiles) || store.profiles.some((profile) => !isProfile(profile))) return null;
  const profiles = store.profiles.map(withRewards);
  const activeId = profiles.some((profile) => profile.id === store.activeId) ? (store.activeId ?? null) : null;
  return { activeId, profiles };
}

/**
 * If the corrupt copy is readable in this version, fold its children back in
 * and delete the copy. Anything this version still cannot read stays put.
 */
function adoptCorruptStash(storage: KeyValueStore, loaded: ProfileStore): ProfileStore {
  let raw: string | null = null;
  try {
    raw = storage.getItem(corruptKey(STORAGE_KEY));
  } catch {
    return loaded;
  }
  if (!raw) return loaded;
  const recovered = parseCurrentStore(raw);
  if (!recovered) return loaded;
  const seen = new Set(loaded.profiles.map((profile) => profile.id));
  const extra = recovered.profiles.filter((profile) => !seen.has(profile.id));
  const merged: ProfileStore =
    extra.length === 0
      ? loaded
      : {
          activeId: loaded.activeId ?? (extra.some((profile) => profile.id === recovered.activeId) ? recovered.activeId : extra[0]?.id ?? null),
          profiles: [...loaded.profiles, ...extra],
        };
  try {
    storage.removeItem?.(corruptKey(STORAGE_KEY));
  } catch {
    // The merged children are still returned below.
  }
  if (extra.length > 0) saveStore(merged, storage);
  return merged;
}

/** One line for Grown-ups when the corrupt copy still cannot be read. */
export function corruptProfileNotice(storage: KeyValueStore = localStorage): string | null {
  try {
    const raw = storage.getItem(corruptKey(STORAGE_KEY));
    if (!raw || parseCurrentStore(raw)) return null;
    return CORRUPT_NOTICE;
  } catch {
    return null;
  }
}

export function saveStore(store: ProfileStore, storage: KeyValueStore = localStorage): void {
  writeStored(storage, STORAGE_KEY, storeSnapshot(store));
}
