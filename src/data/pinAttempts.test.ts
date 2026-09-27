import { describe, expect, it } from "vitest";
import { clearPin, pinDigest, pinMatches, savePin } from "./grownupPin";
import { clearPinAttempts, noteWrongPin, PIN_ATTEMPT_LIMIT, PIN_COOLDOWN_MS, pinLocked, readPinAttempts } from "./pinAttempts";

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

describe("grown-up PIN", () => {
  it("stores a digest and unlocks only the matching PIN", () => {
    const storage = memory();
    expect(savePin("1234", storage)).toBe(true);
    expect(storage.getItem("littlenest-grownup-pin-v1")).toBe(pinDigest("1234"));
    expect(storage.getItem("littlenest-grownup-pin-v1")).not.toBe("1234");
    expect(pinMatches("1234", storage)).toBe(true);
    expect(pinMatches("0000", storage)).toBe(false);
    clearPin(storage);
    expect(pinMatches("1234", storage)).toBe(false);
  });

  it("locks after five wrong tries and ignores further misses until the cooldown ends", () => {
    const storage = memory();
    const start = 1_000_000;
    for (let attempt = 1; attempt < PIN_ATTEMPT_LIMIT; attempt += 1) {
      const next = noteWrongPin(start + attempt, storage);
      expect(next.fails).toBe(attempt);
      expect(pinLocked(next, start + attempt)).toBe(false);
    }
    const locked = noteWrongPin(start + PIN_ATTEMPT_LIMIT, storage);
    expect(locked.fails).toBe(PIN_ATTEMPT_LIMIT);
    expect(locked.lockedUntil).toBe(start + PIN_ATTEMPT_LIMIT + PIN_COOLDOWN_MS);
    expect(pinLocked(locked, start + PIN_ATTEMPT_LIMIT)).toBe(true);
    expect(noteWrongPin(start + PIN_ATTEMPT_LIMIT + 10, storage)).toEqual(locked);
    expect(readPinAttempts(locked.lockedUntil, storage).fails).toBe(0);
    const again = noteWrongPin(locked.lockedUntil + 1, storage);
    expect(again.fails).toBe(1);
    expect(again.strikes).toBe(1);
    expect(pinLocked(again, locked.lockedUntil + 1)).toBe(false);
    clearPinAttempts(storage);
    expect(readPinAttempts(locked.lockedUntil + 1, storage).fails).toBe(0);
  });

  it("keeps the lock in the same store after a reload and waits longer the next time", () => {
    const storage = memory();
    const start = 5_000_000;
    let locked = noteWrongPin(start, storage);
    for (let attempt = 1; attempt < PIN_ATTEMPT_LIMIT; attempt += 1) locked = noteWrongPin(start + attempt, storage);
    expect(pinLocked(readPinAttempts(start + PIN_ATTEMPT_LIMIT, storage), start + PIN_ATTEMPT_LIMIT)).toBe(true);
    expect(locked.lockedUntil - (start + PIN_ATTEMPT_LIMIT - 1)).toBe(30_000);
    const after = locked.lockedUntil + 5;
    for (let attempt = 0; attempt < PIN_ATTEMPT_LIMIT; attempt += 1) locked = noteWrongPin(after + attempt, storage);
    expect(locked.strikes).toBe(2);
    expect(locked.lockedUntil - (after + PIN_ATTEMPT_LIMIT - 1)).toBe(120_000);
    const later = locked.lockedUntil + 5;
    for (let attempt = 0; attempt < PIN_ATTEMPT_LIMIT; attempt += 1) locked = noteWrongPin(later + attempt, storage);
    expect(locked.strikes).toBe(3);
    expect(locked.lockedUntil - (later + PIN_ATTEMPT_LIMIT - 1)).toBe(600_000);
  });
});
