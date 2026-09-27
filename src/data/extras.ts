import { EXTRAS_KEY, readStored, writeStored, type KeyValueStore } from "../storage";

/**
 * How many "One more?" chunks a child has taken today. Kept on the device in
 * its own small record so a day's count resets by itself at the next local
 * day and never touches the profile's progress.
 */
export type ExtrasRecord = Record<string, { day: string; count: number }>;

export function readExtras(store: KeyValueStore): ExtrasRecord {
  try {
    const raw = readStored(store, EXTRAS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const record: ExtrasRecord = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== "object") continue;
      const { day, count } = value as { day?: unknown; count?: unknown };
      if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
      if (typeof count !== "number" || !Number.isFinite(count) || count < 0) continue;
      record[id] = { day, count: Math.floor(count) };
    }
    return record;
  } catch {
    return {};
  }
}

/** Extras taken by this child today. Yesterday's count is gone. */
export function extrasUsed(store: KeyValueStore, childId: string, day: string): number {
  const entry = readExtras(store)[childId];
  return entry && entry.day === day ? entry.count : 0;
}

/** Count one more extra for today, and return the new total. */
export function noteExtra(store: KeyValueStore, childId: string, day: string): number {
  const record = readExtras(store);
  const count = extrasUsed(store, childId, day) + 1;
  record[childId] = { day, count };
  // Only today's counts are worth keeping.
  for (const [id, entry] of Object.entries(record)) if (entry.day !== day) delete record[id];
  writeStored(store, EXTRAS_KEY, JSON.stringify(record));
  return count;
}

/** True when the parent's limit still allows another "One more?". */
export function extraAllowed(store: KeyValueStore, childId: string, day: string, limit: number): boolean {
  return extrasUsed(store, childId, day) < limit;
}
