export type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

/**
 * New keys, with the previous `kids-app-*` copies still read and written.
 * A device that already has progress keeps it. A newer save updates both
 * so an older page on this device does not look empty.
 */
const LEGACY_KEYS: Record<string, string> = {
  "littlenest-profiles-v1": "kids-app-profiles-v1",
  "littlenest-settings-v1": "kids-app-settings-v1",
  "littlenest-placement-v1": "kids-app-placement-v1",
  "littlenest-silent-hint-v1": "kids-app-silent-hint-v1",
  "littlenest-outbox-v1": "kids-app-outbox-v1",
};

export const PROFILES_KEY = "littlenest-profiles-v1";
export const SETTINGS_KEY = "littlenest-settings-v1";
export const PLACEMENT_KEY = "littlenest-placement-v1";
export const SILENT_HINT_KEY = "littlenest-silent-hint-v1";
export const OUTBOX_KEY = "littlenest-outbox-v1";

export function readStored(storage: KeyValueStore, key: string): string | null {
  const current = storage.getItem(key);
  if (current !== null) return current;
  const legacy = LEGACY_KEYS[key];
  if (!legacy) return null;
  const old = storage.getItem(legacy);
  if (old === null) return null;
  try {
    storage.setItem(key, old);
  } catch {
    // The old copy is still returned below.
  }
  return old;
}

/** A copy of a document that could not be trusted. The original key is not replaced. */
export function corruptKey(key: string): string {
  return `${key}-corrupt`;
}

/**
 * Keep the first unreadable copy. A later failure must not overwrite it, and a
 * quota error must not throw into React.
 */
export function stashCorrupt(storage: KeyValueStore, key: string, raw: string): void {
  if (!raw) return;
  const dest = corruptKey(key);
  try {
    if (storage.getItem(dest) !== null) return;
    storage.setItem(dest, raw);
  } catch {
    // The original key is left unchanged.
  }
}

export function writeStored(storage: KeyValueStore, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    return;
  }
  const legacy = LEGACY_KEYS[key];
  if (!legacy) return;
  try {
    storage.setItem(legacy, value);
  } catch {
    // The new key already holds the save.
  }
}
