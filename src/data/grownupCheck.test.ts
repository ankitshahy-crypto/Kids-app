import { describe, expect, it } from "vitest";
import { createGrownupCheck, createPinRecovery } from "./grownupCheck";
import { clearPin, pinMatches, savePin } from "./grownupPin";

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
    keys: () => [...data.keys()],
  };
}

describe("createGrownupCheck", () => {
  it("asks a one-digit multiplication until a PIN is set", () => {
    for (let i = 0; i < 20; i += 1) {
      const check = createGrownupCheck();
      expect(check.kind).toBe("product");
      expect(check.choices).toHaveLength(4);
      expect(new Set(check.choices).size).toBe(4);
      const parts = check.prompt.match(/^(\d+) × (\d+)$/);
      expect(parts).toBeTruthy();
      expect(Number(parts?.[1])).toBeLessThan(10);
      expect(Number(parts?.[1]) * Number(parts?.[2])).toBe(check.answer);
      expect(check.prompt).not.toMatch(/Tap the number/);
    }
  });

  it("uses a two-digit multiplication to recover a PIN", () => {
    const check = createPinRecovery(() => 0.5);
    const parts = check.prompt.match(/^(\d+) × (\d+)$/);
    expect(Number(parts?.[1])).toBeGreaterThanOrEqual(12);
    expect(Number(parts?.[2])).toBeGreaterThanOrEqual(12);
    expect(Number(parts?.[1]) * Number(parts?.[2])).toBe(check.answer);
  });
});

describe("grown-up PIN", () => {
  it("replaces the PIN without touching profiles", () => {
    const storage = memory();
    storage.setItem("littlenest-profiles-v1", "{\"profiles\":[{\"name\":\"Mia\"}]}");
    expect(savePin("1234", storage)).toBe(true);
    expect(pinMatches("1234", storage)).toBe(true);
    expect(pinMatches("0000", storage)).toBe(false);
    clearPin(storage);
    expect(pinMatches("1234", storage)).toBe(false);
    expect(savePin("9876", storage)).toBe(true);
    expect(pinMatches("9876", storage)).toBe(true);
    expect(storage.getItem("littlenest-profiles-v1")).toContain("Mia");
    expect(storage.keys().some((key) => key.includes("profiles"))).toBe(true);
  });
});
