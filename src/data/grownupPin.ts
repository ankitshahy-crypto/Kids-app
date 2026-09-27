const PIN_KEY = "littlenest-grownup-pin-v1";

type PinStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export function isPin(value: string): boolean {
  return /^\d{4}$/.test(value);
}

/** Not the PIN itself. A short digest is enough to avoid storing the digits. */
export function pinDigest(pin: string): string {
  let hash = 2166136261;
  for (const char of pin) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

export function readPinDigest(storage: PinStore = localStorage): string | null {
  try {
    return storage.getItem(PIN_KEY);
  } catch {
    return null;
  }
}

export function hasGrownupPin(storage: PinStore = localStorage): boolean {
  return Boolean(readPinDigest(storage));
}

export function savePin(pin: string, storage: PinStore = localStorage): boolean {
  if (!isPin(pin)) return false;
  try {
    storage.setItem(PIN_KEY, pinDigest(pin));
    return true;
  } catch {
    return false;
  }
}

export function pinMatches(pin: string, storage: PinStore = localStorage): boolean {
  const saved = readPinDigest(storage);
  return Boolean(saved && isPin(pin) && saved === pinDigest(pin));
}

/** Removes the PIN only. Profiles and progress stay where they are. */
export function clearPin(storage: PinStore = localStorage): void {
  try {
    storage.removeItem(PIN_KEY);
  } catch {
    // The PIN stays until a later successful clear.
  }
}
