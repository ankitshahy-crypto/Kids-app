export const PIN_ATTEMPT_LIMIT = 5;
export const PIN_COOLDOWN_MS = 30_000;

const ATTEMPT_KEY = "littlenest-grownup-pin-attempts-v1";

type AttemptStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type PinAttempts = {
  fails: number;
  lockedUntil: number;
};

const open: PinAttempts = { fails: 0, lockedUntil: 0 };

function readRaw(storage: AttemptStore): PinAttempts {
  try {
    const raw = storage.getItem(ATTEMPT_KEY);
    if (!raw) return open;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return open;
    const record = parsed as Partial<PinAttempts>;
    const fails = typeof record.fails === "number" && record.fails > 0 ? Math.floor(record.fails) : 0;
    const lockedUntil = typeof record.lockedUntil === "number" && record.lockedUntil > 0 ? record.lockedUntil : 0;
    return { fails, lockedUntil };
  } catch {
    return open;
  }
}

function write(storage: AttemptStore, attempts: PinAttempts): void {
  try {
    storage.setItem(ATTEMPT_KEY, JSON.stringify(attempts));
  } catch {
    // The gate still locks in memory for this open dialog.
  }
}

/** A lock that has already ended counts as a fresh start. */
export function readPinAttempts(now = Date.now(), storage: AttemptStore = sessionStorage): PinAttempts {
  const current = readRaw(storage);
  if (current.lockedUntil > 0 && current.lockedUntil <= now) return open;
  return current;
}

export function pinLocked(attempts: PinAttempts, now = Date.now()): boolean {
  return attempts.lockedUntil > now;
}

/** Count a wrong PIN. The fifth miss locks the gate until the cooldown ends. */
export function noteWrongPin(now = Date.now(), storage: AttemptStore = sessionStorage): PinAttempts {
  const current = readPinAttempts(now, storage);
  if (pinLocked(current, now)) return current;
  const fails = current.fails + 1;
  const next: PinAttempts = {
    fails,
    lockedUntil: fails >= PIN_ATTEMPT_LIMIT ? now + PIN_COOLDOWN_MS : 0,
  };
  write(storage, next);
  return next;
}

export function clearPinAttempts(storage: AttemptStore = sessionStorage): void {
  try {
    storage.removeItem(ATTEMPT_KEY);
  } catch {
    // A successful unlock still closes the gate.
  }
}
