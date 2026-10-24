import { describe, expect, it } from "vitest";
import { createChild, type ChildProfile } from "./profiles";
import { mondayKey, parentSummary, summaryText, weeksCompleted } from "./summary";
import { markReviewAsked, REVIEW_ASKED_KEY, shouldAskForReview } from "./reviewPrompt";

function child(patch: Partial<ChildProfile> = {}): ChildProfile {
  return { ...createChild({ name: "Mia", ageRange: "4", animal: "fox" }), ...patch };
}

function nest(dates: string[]): ChildProfile["nest"] {
  return dates.map((date) => ({ date, piece: "twig" as const }));
}

function memory() {
  const map = new Map<string, string>();
  return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v), removeItem: (k: string) => void map.delete(k) };
}

const FULL_WEEK = ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"];

describe("weeks completed", () => {
  it("finds Monday", () => {
    expect(mondayKey("2026-10-04")).toBe("2026-09-28");
    expect(mondayKey("2026-09-28")).toBe("2026-09-28");
  });
  it("counts a week with five finished lessons, not four", () => {
    expect(weeksCompleted(child({ nest: nest(FULL_WEEK) }))).toBe(1);
    expect(weeksCompleted(child({ nest: nest(FULL_WEEK.slice(1)) }))).toBe(0);
  });
});

describe("parent summary", () => {
  it("uses only the initial unless the name is chosen", () => {
    const mia = child({ nest: nest(FULL_WEEK), stars: 7 });
    expect(parentSummary(mia).label).toBe("M.");
    expect(summaryText(parentSummary(mia), "LittleNest")).not.toContain("Mia");
    expect(parentSummary(mia, true).label).toBe("Mia");
    expect(summaryText(parentSummary(mia), "LittleNest")).toContain("Weeks completed: 1");
  });
});

describe("rating prompt", () => {
  it("waits for a finished week and asks once per version", () => {
    const storage = memory();
    expect(shouldAskForReview([child()], "1.0", storage)).toBe(false);
    const done = child({ nest: nest(FULL_WEEK) });
    expect(shouldAskForReview([done], "1.0", storage)).toBe(true);
    markReviewAsked("1.0", storage);
    expect(storage.getItem(REVIEW_ASKED_KEY)).toBe("1.0");
    expect(shouldAskForReview([done], "1.0", storage)).toBe(false);
    expect(shouldAskForReview([done], "1.1", storage)).toBe(true);
  });
});
