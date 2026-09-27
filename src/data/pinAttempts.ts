export const PIN_ATTEMPT_LIMIT = 5;
export const PIN_COOLDOWN_MS = 30_000;
/** First lock, then the next, then every lock after that. */
export const PIN_COOLDOWNS_MS = [30_000, 120_000, 600_000] as const;

const ATTEMPT_KEY = "littlenest-grownup-pin-attempts-v1";

type AttemptStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type PinAttempts = {
  fails: number;
  lockedUntil: number;
  /** How many lockouts have already been served. The next one waits longer. */
  strikes: number;
};

const open: PinAttempts = { fails: 0, lockedUntil: 0, strikes: 0 };

function cooldownFor(strikes: number): number {
  const index = Math.min(Math.max(0, strikes), PIN_COOLDOWNS_MS.length - 1);
  return PIN_COOLDOWNS_MS[index];
}

function readRaw(storage: AttemptStore): PinAttempts {
  try {
    const raw = storage.getItem(ATTEMPT_KEY);
    if (!raw) return open;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return open;
    const record = parsed as Partial<PinAttempts>;
    const fails = typeof record.fails === "number" && record.fails > 0 ? Math.floor(record.fails) : 0;
    const lockedUntil = typeof record.lockedUntil === "number" && record.lockedUntil > 0 ? record.lockedUntil : 0;
    const strikes = typeof record.strikes === "number" && record.strikes > 0 ? Math.floor(record.strikes) : 0;
    return { fails, lockedUntil, strikes };
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

/** A lock that has already ended keeps its strike count and clears the miss tally. */
export function readPinAttempts(now = Date.now(), storage: AttemptStore = localStorage): PinAttempts {
  const current = readRaw(storage);
  if (current.lockedUntil > 0 && current.lockedUntil <= now) {
    return { fails: 0, lockedUntil: 0, strikes: current.strikes };
  }
  return current;
}

export function pinLocked(attempts: PinAttempts, now = Date.now()): boolean {
  return attempts.lockedUntil > now;
}

/** Count a wrong answer. The fifth miss locks the gate, longer each time it happens. */
export function noteWrongPin(now = Date.now(), storage: AttemptStore = localStorage): PinAttempts {
  const current = readPinAttempts(now, storage);
  if (pinLocked(current, now)) return current;
  const fails = current.fails + 1;
  const locked = fails >= PIN_ATTEMPT_LIMIT;
  const next: PinAttempts = {
    fails,
    strikes: locked ? current.strikes + 1 : current.strikes,
    lockedUntil: locked ? now + cooldownFor(current.strikes) : 0,
  };
  write(storage, next);
  return next;
}

export function clearPinAttempts(storage: AttemptStore = localStorage): void {
  try {
    storage.removeItem(ATTEMPT_KEY);
  } catch {
    // A successful unlock still closes the gate.
  }
}
