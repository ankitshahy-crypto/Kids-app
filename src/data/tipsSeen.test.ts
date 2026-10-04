import { describe, expect, it } from "vitest";
import { markTipSeen, tipSeen } from "./tipsSeen";

function memory() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  };
}

describe("tips seen", () => {
  it("is per child and per tip", () => {
    const store = memory();
    expect(tipSeen("mia", "math-count-start", store)).toBe(false);
    markTipSeen("mia", "math-count-start", store);
    expect(tipSeen("mia", "math-count-start", store)).toBe(true);
    expect(tipSeen("mia", "math-add-start", store)).toBe(false);
    expect(tipSeen("leo", "math-count-start", store)).toBe(false);
  });

  it("survives a damaged record", () => {
    const store = memory();
    store.setItem("littlenest-tips-seen-v1", "{not json");
    expect(tipSeen("mia", "draw-start", store)).toBe(false);
    markTipSeen("mia", "draw-start", store);
    expect(tipSeen("mia", "draw-start", store)).toBe(true);
  });
});
