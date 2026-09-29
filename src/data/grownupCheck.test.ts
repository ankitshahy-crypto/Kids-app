import { describe, expect, it } from "vitest";
import { createGrownupCheck, createPinRecovery } from "./grownupCheck";

const WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
};

describe("createGrownupCheck", () => {
  it("offers four different buttons and hides the answer's position", () => {
    const positions = new Set<number>();
    for (let i = 0; i < 40; i += 1) {
      const check = createGrownupCheck();
      expect(check.choices).toHaveLength(4);
      expect(new Set(check.choices).size).toBe(4);
      expect(check.choices).toContain(check.answer);
      positions.add(check.choices.indexOf(check.answer));
    }
    expect(positions.size).toBeGreaterThan(1);
  });

  it("writes a number as a word, or asks for a small sum", () => {
    const kinds = new Set<string>();
    for (let i = 0; i < 40; i += 1) {
      const check = createGrownupCheck();
      kinds.add(check.kind);
      if (check.kind === "word") {
        const word = check.prompt.match(/^Type the number ([a-z]+)$/)?.[1];
        expect(word).toBeTruthy();
        expect(WORDS[word ?? ""]).toBe(check.answer);
        expect(check.prompt).not.toMatch(/\d/);
      } else {
        const parts = check.prompt.match(/^(\d+) \+ (\d+)$/);
        expect(parts).toBeTruthy();
        expect(Number(parts?.[1]) + Number(parts?.[2])).toBe(check.answer);
      }
    }
    expect(kinds).toEqual(new Set(["word", "sum"]));
  });

  it("asks for a typed product when the PIN is forgotten", () => {
    const check = createPinRecovery(() => 0);
    expect(check.kind).toBe("recover");
    expect(check.choices).toEqual([]);
    expect(check.prompt).toBe("12 × 12");
    expect(check.answer).toBe(144);
  });
});
