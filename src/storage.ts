export type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
};

const QUOTA_NOTICE = "This device is full, so a change could not be saved.";
let quotaNotice: string | null = null;

function isQuotaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = (error as { name?: string }).name;
  return name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED";
}

/** The first quota failure, shown once in Grown-ups. Later failures stay quiet. */
export function storageQuotaNotice(): string | null {
  return quotaNotice;
}

export function resetStorageQuotaNotice(): void {
  quotaNotice = null;
}

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
/** The last answer from the App Store about the one-time unlock, for a launch with no network. */
export const UNLOCK_KEY = "littlenest-unlock-v1";
/** Web only: "1" shows the free-and-locked app, with a pretend unlock, for previews and tests. */
export const PAYWALL_PREVIEW_KEY = "littlenest-paywall-preview-v1";
/** "One more?" chunks taken today, per child. Nothing else is kept here. */
export const EXTRAS_KEY = "littlenest-extras-v1";
export const OUTBOX_KEY = "littlenest-outbox-v1";
/** "1" once the PIN offer after the first child has been shown, so it never nags. */
export const PIN_OFFERED_KEY = "littlenest-pin-offered-v1";
/**
 * "1" once Shared class iPad has been set, by a grown-up in Settings or by the
 * Teacher screen turning it on the first time. After that the Teacher screen
 * leaves it alone, so a grown-up who turned it off keeps it off.
 */
export const SHARED_CHOSEN_KEY = "littlenest-shared-chosen-v1";

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
  } catch (error) {
    if (!quotaNotice && isQuotaError(error)) quotaNotice = QUOTA_NOTICE;
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
