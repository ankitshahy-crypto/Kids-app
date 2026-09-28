import { describe, expect, it } from "vitest";
import { codeKind, familyCode, HOME_NOTES, progressCode, readFamilyCode, readProgressCode, stampLabel, weekStamp } from "./linkCodes";

const zone = "America/New_York";

describe("family codes", () => {
  it("round-trip a placement and a note", () => {
    const code = familyCode({ weekIndex: 8, ladderStep: 3, note: 2, week: 38 });
    expect(code).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    expect(readFamilyCode(code)).toEqual({ weekIndex: 8, ladderStep: 3, note: 2, week: 38 });
  });

  it("can carry a note without moving the child", () => {
    const code = familyCode({ weekIndex: null, ladderStep: null, note: 5, week: 1 });
    expect(readFamilyCode(code)).toEqual({ weekIndex: null, ladderStep: null, note: 5, week: 1 });
  });

  it("forgives spaces, lowercase, and O for zero", () => {
    const code = familyCode({ weekIndex: 0, ladderStep: 1, note: 0, week: 0 });
    const typed = ` ${code.toLowerCase().replace("-", " ")} `.replace(/0/g, "o");
    expect(readFamilyCode(typed)).not.toBeNull();
  });

  it("rejects a typo", () => {
    const code = familyCode({ weekIndex: 12, ladderStep: 4, note: 3, week: 40 }).replace("-", "");
    const swapped = code.slice(0, 3) + (code[3] === "A" ? "B" : "A") + code.slice(4);
    expect(readFamilyCode(swapped)).toBeNull();
  });

  it("every note is friendly and says nothing about health", () => {
    for (const note of HOME_NOTES) {
      expect(note).not.toMatch(/adhd|autis|dyslex|therap|delay|diagnos|behind|below/i);
    }
  });
});

describe("progress codes", () => {
  it("round-trip home completion", () => {
    const input = {
      weekIndex: 9,
      lessonsTotal: 37,
      lessonsThisWeek: 4,
      practicedDays: [true, true, false, true, true, false, false],
      knows: 14,
      practicing: 3,
      week: 38,
    };
    const code = progressCode(input);
    expect(code).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    expect(readProgressCode(code)).toEqual(input);
  });

  it("is never mistaken for a family code", () => {
    const progress = progressCode({ weekIndex: 1, lessonsTotal: 1, lessonsThisWeek: 1, practicedDays: Array(7).fill(false), knows: 0, practicing: 0, week: 1 });
    expect(codeKind(progress)).toBe("progress");
    expect(codeKind(familyCode({ weekIndex: 1, ladderStep: 2, note: 1, week: 1 }))).toBe("family");
    expect(codeKind("HELLO")).toBeNull();
  });
});

describe("week stamps", () => {
  it("count Monday-to-Sunday weeks", () => {
    const monday = new Date("2026-09-28T15:00:00Z");
    const sunday = new Date("2026-10-04T15:00:00Z");
    expect(weekStamp(monday, zone)).toBe(weekStamp(sunday, zone));
    expect(stampLabel(weekStamp(monday, zone), sunday, zone)).toBe("This week");
    expect(stampLabel(weekStamp(monday, zone) - 1, monday, zone)).toBe("Last week");
  });
});
