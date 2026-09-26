import { animalById, isAnimalId, type AnimalId } from "./animals";

export const ageRanges = ["3", "4", "5", "6-7"] as const;
export type AgeRange = (typeof ageRanges)[number];

export const lessonSteps = ["letter", "draw", "story", "moment"] as const;
export type LessonStep = (typeof lessonSteps)[number];

export type DayProgress = Record<LessonStep, boolean>;

export type ChildProfile = {
  id: string;
  /** First name, or one initial. Never a last name. */
  name: string;
  ageRange: AgeRange;
  animal: AnimalId;
  createdAt: string;
  /** Lifetime effort stars. Only ever increases. */
  stars: number;
  days: Record<string, DayProgress>;
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

export function todayKey(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
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

export function dayProgress(profile: ChildProfile, now = new Date()): DayProgress {
  return profile.days[todayKey(now)] ?? emptyDay();
}

export function awardStar(profile: ChildProfile, step: LessonStep, now = new Date()): ChildProfile {
  const key = todayKey(now);
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

function localDayNumber(year: number, monthIndex: number, day: number): number {
  return Math.floor(Date.UTC(year, monthIndex, day) / 86400000);
}

export function starsThisWeek(profile: ChildProfile, now = new Date()): number {
  const created = new Date(profile.createdAt);
  if (Number.isNaN(created.getTime())) return 0;
  const createdNum = localDayNumber(created.getFullYear(), created.getMonth(), created.getDate());
  const nowNum = localDayNumber(now.getFullYear(), now.getMonth(), now.getDate());
  const index = Math.max(0, Math.floor((nowNum - createdNum) / 7));
  const start = createdNum + index * 7;
  const end = start + 7;
  let stars = 0;
  for (const [key, day] of Object.entries(profile.days)) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
    if (!match) continue;
    const num = localDayNumber(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (num < start || num >= end) continue;
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

export function createChild(input: { name: string; ageRange: AgeRange; animal: AnimalId }): ChildProfile {
  const name = normalizeChildName(input.name);
  if (!name) throw new Error("A first name or initial is required");
  return {
    id: newId(),
    name,
    ageRange: input.ageRange,
    animal: input.animal,
    createdAt: new Date().toISOString(),
    stars: 0,
    days: {},
  };
}

function isDayProgress(value: unknown): value is DayProgress {
  if (!value || typeof value !== "object") return false;
  const day = value as Partial<DayProgress>;
  return lessonSteps.every((step) => typeof day[step] === "boolean");
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
    const profiles = Array.isArray(store.profiles) ? store.profiles.filter(isProfile) : [];
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
