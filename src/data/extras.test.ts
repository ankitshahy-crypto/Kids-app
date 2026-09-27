import { describe, expect, it } from "vitest";
import { EXTRAS_KEY } from "../storage";
import { extraAllowed, extrasUsed, noteExtra, readExtras } from "./extras";

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

describe("one more? limit", () => {
  it("counts extras per child for today only", () => {
    const store = memory();
    expect(extrasUsed(store, "mia", "2026-09-27")).toBe(0);
    expect(extraAllowed(store, "mia", "2026-09-27", 1)).toBe(true);
    expect(noteExtra(store, "mia", "2026-09-27")).toBe(1);
    expect(extraAllowed(store, "mia", "2026-09-27", 1)).toBe(false);
    expect(extraAllowed(store, "mia", "2026-09-27", 2)).toBe(true);
    expect(extraAllowed(store, "sam", "2026-09-27", 1)).toBe(true);
    expect(extrasUsed(store, "mia", "2026-09-28")).toBe(0);
    expect(extraAllowed(store, "mia", "2026-09-27", 0)).toBe(false);
  });

  it("drops yesterday's counts and ignores a broken record", () => {
    const store = memory();
    noteExtra(store, "mia", "2026-09-27");
    noteExtra(store, "sam", "2026-09-28");
    expect(readExtras(store)).toEqual({ sam: { day: "2026-09-28", count: 1 } });
    store.setItem(EXTRAS_KEY, "{oops");
    expect(readExtras(store)).toEqual({});
    store.setItem(EXTRAS_KEY, JSON.stringify({ mia: { day: "soon", count: 2 }, sam: { day: "2026-09-28", count: -1 }, ok: { day: "2026-09-28", count: 2.7 } }));
    expect(readExtras(store)).toEqual({ ok: { day: "2026-09-28", count: 2 } });
  });
});
