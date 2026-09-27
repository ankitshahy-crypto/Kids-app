import { emptyDesk, type SchoolDesk } from "./school";

/** Local copy only. The school documents are written to Firestore when sign-in is on. */
export const SCHOOL_CACHE_KEY = "littlenest-school-cache-v1";

type CacheStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function writeSchoolCache(desk: SchoolDesk, storage: CacheStore = localStorage): void {
  storage.setItem(SCHOOL_CACHE_KEY, JSON.stringify(desk));
}

export function readSchoolCache(storage: CacheStore = localStorage): SchoolDesk | null {
  try {
    const raw = storage.getItem(SCHOOL_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SchoolDesk>;
    if (!parsed || !Array.isArray(parsed.classes) || !Array.isArray(parsed.members) || !Array.isArray(parsed.invites)) {
      return null;
    }
    return {
      school: parsed.school ?? null,
      members: parsed.members,
      invites: parsed.invites,
      classes: parsed.classes,
      deviceLink: parsed.deviceLink ?? null,
    };
  } catch {
    return null;
  }
}

export function deskOrCache(previewDesk: SchoolDesk | null, storage: CacheStore = localStorage): SchoolDesk {
  if (previewDesk) return previewDesk;
  return readSchoolCache(storage) ?? emptyDesk();
}
