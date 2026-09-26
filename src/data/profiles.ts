import { animalById, isAnimalId, type AnimalId } from "./animals";
import { deviceTimeZone, localDateKey, utcTimestamp, weekDateKeys } from "./time";
import { emptyOutfit, itemForSlot, type Outfit } from "./wardrobe";

export const ageRanges = ["3", "4", "5", "6-7"] as const;
export type AgeRange = (typeof ageRanges)[number];

export const lessonSteps = ["letter", "draw", "story", "moment"] as const;
export type LessonStep = (typeof lessonSteps)[number];

export type DayProgress = Record<LessonStep, boolean>;

export type Sticker = {
  kind: "letter" | "word";
  /** Lowercase letter or word. Stored once. */
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
  days: Record<string, DayProgress>;
  /** What the animal is wearing. Empty until the child picks something already earned. */
  outfit: Outfit;
  /** Letters and words learned. Only added, never removed. */
  stickers: Sticker[];
  /** One twig or egg for each day the whole lesson was finished. */
  nest: NestPiece[];
  /** Star totals already celebrated, such as 10 and 20. */
  celebrated: number[];
  /** Active reading milliseconds, keyed by local date. Only increases. */
  readingMs: Record<string, number>;
  /** Dates whose reading goal already gave the one bonus star. */
  readingAwarded: string[];
};

type ProfileStore = {
  activeId: string | null;
  profiles: ChildProfile[];
};

const STORAGE_KEY = "kids-app-profiles-v1";

const emptyDay = (): DayProgress => ({
  letter: false,
  draw: false,
  story: false,
  moment: false,
});

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

export function dayProgress(profile: ChildProfile, now = new Date(), timeZone = deviceTimeZone()): DayProgress {
  return profile.days[todayKey(now, timeZone)] ?? emptyDay();
}

export function awardStar(
  profile: ChildProfile,
  step: LessonStep,
  now = new Date(),
  timeZone = deviceTimeZone(),
): ChildProfile {
  const key = todayKey(now, timeZone);
  const day = profile.days[key] ?? emptyDay();
  if (day[step]) return profile;
  return {
    ...profile,
    stars: profile.stars + 1,
    days: {
      ...profile.days,
      [key]: { ...day, [step]: true },
    },
  };
}

/** Stars whose local dates fall in the current Monday–Sunday week. */
export function starsThisWeek(profile: ChildProfile, now = new Date(), timeZone = deviceTimeZone()): number {
  const keys = new Set(weekDateKeys(now, timeZone));
  let stars = 0;
  for (const [key, day] of Object.entries(profile.days)) {
    if (!keys.has(key)) continue;
    stars += lessonSteps.filter((step) => day[step]).length;
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

function emptyRewards(): Pick<ChildProfile, "outfit" | "stickers" | "nest" | "celebrated" | "readingMs" | "readingAwarded"> {
  return { outfit: emptyOutfit(), stickers: [], nest: [], celebrated: [], readingMs: {}, readingAwarded: [] };
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

function isDayProgress(value: unknown): value is DayProgress {
  if (!value || typeof value !== "object") return false;
  const day = value as Partial<DayProgress>;
  return lessonSteps.every((step) => typeof day[step] === "boolean");
}

function isSticker(value: unknown): value is Sticker {
  if (!value || typeof value !== "object") return false;
  const sticker = value as Partial<Sticker>;
  return (sticker.kind === "letter" || sticker.kind === "word") && typeof sticker.label === "string" && sticker.label.length > 0;
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
    stickers: Array.isArray(profile.stickers) ? profile.stickers.filter(isSticker) : [],
    nest: Array.isArray(profile.nest) ? profile.nest.filter(isNestPiece) : [],
    celebrated: Array.isArray(profile.celebrated)
      ? profile.celebrated.filter((value) => typeof value === "number" && value > 0 && value % 10 === 0)
      : [],
    readingMs: readingMap(profile.readingMs),
    readingAwarded: Array.isArray(profile.readingAwarded)
      ? profile.readingAwarded.filter((value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
      : [],
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
  return Object.values(profile.days).every(isDayProgress);
}

export function loadStore(): ProfileStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
}
