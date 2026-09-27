import { describe, expect, it } from "vitest";
import { COPYRIGHT, MAKER, MAKER_CREDIT, TAGLINE } from "../brand";
import { alphabetForms, numberSpot, spreadNumberSpots } from "./handwriting";
import { storyLines } from "./story";

describe("maker credit", () => {
  it("uses the legal name and the parent tagline", () => {
    expect(MAKER).toBe("TriageDesk AI LLC");
    expect(MAKER_CREDIT).toBe("LittleNest Learning by TriageDesk AI LLC");
    expect(TAGLINE).toBe("Made by a parent, for parents");
    expect(COPYRIGHT).toBe("© 2026 TriageDesk AI LLC");
  });
});

describe("story lines", () => {
  it("stars the animal and leaves the child's name out", () => {
    const lines = storyLines("fox");
    expect(lines.join(" ")).toContain("fox");
    expect(lines.join(" ").toLowerCase()).not.toContain("mia");
  });
});

describe("stroke numbers", () => {
  it("separates stacked stroke numbers", () => {
    const spread = spreadNumberSpots([
      { x: 40, y: 40 },
      { x: 40, y: 40 },
    ]);
    expect(Math.hypot(spread[0].x - spread[1].x, spread[0].y - spread[1].y)).toBeGreaterThanOrEqual(14);
  });

  it("keeps every letter's stroke numbers apart", () => {
    for (const form of alphabetForms()) {
      const spots = spreadNumberSpots(form.strokes.map((stroke) => numberSpot(stroke)));
      for (let left = 0; left < spots.length; left += 1) {
        for (let right = left + 1; right < spots.length; right += 1) {
          const gap = Math.hypot(spots[left].x - spots[right].x, spots[left].y - spots[right].y);
          expect(gap, `${form.letter} ${left + 1} and ${right + 1}`).toBeGreaterThanOrEqual(12);
        }
      }
    }
  });
});
