type KeyValueStore = {
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
export const ACCOUNT_KEY = "littlenest-account-v1";
export const CLASS_LINK_KEY = "littlenest-class-link-v1";
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

export function writeStored(storage: KeyValueStore, key: string, value: string): void {
  storage.setItem(key, value);
  const legacy = LEGACY_KEYS[key];
  if (!legacy) return;
  try {
    storage.setItem(legacy, value);
  } catch {
    // The new key already holds the save.
  }
}
