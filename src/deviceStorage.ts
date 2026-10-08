/**
 * The device's own storage (localStorage), or, where the browser will not hand it over, a store
 * kept in memory for this visit.
 *
 * Safari with "Block All Cookies" on throws at the very mention of `localStorage`, before any read
 * or write that a try could catch: a function whose storage defaulted to `localStorage` threw as
 * it was called, in the app's first render, and the app opened on its error screen and stayed
 * there. With this the app runs. Nothing is kept once the page closes, which is what that setting
 * asks for, and the Grown-ups page says so (`storageRefusedNotice`).
 *
 * This module knows no keys and reads nothing: it only hands over the store.
 */
export type DeviceStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

let memory: DeviceStore | null = null;

function memoryStore(): DeviceStore {
  const kept = new Map<string, string>();
  return {
    getItem: (key) => kept.get(key) ?? null,
    setItem: (key, value) => {
      kept.set(key, String(value));
    },
    removeItem: (key) => {
      kept.delete(key);
    },
  };
}

export function deviceStorage(): DeviceStore {
  try {
    const store = globalThis.localStorage;
    if (store) return store;
  } catch {
    // Refused. The store in memory stands in.
  }
  memory ??= memoryStore();
  return memory;
}

/** For the Grown-ups page: said once the browser has refused its storage, so a lost visit is not a surprise. */
export function storageRefusedNotice(): string | null {
  return memory ? "This browser is not letting LittleNest save anything (it may be set to block all cookies and site data). Today's progress will be gone when this page closes." : null;
}

/** For tests: forget the store kept in memory. */
export function resetDeviceStorage(): void {
  memory = null;
}
