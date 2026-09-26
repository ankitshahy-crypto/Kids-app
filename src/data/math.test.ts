import { describe, expect, it } from "vitest";
import { createChild } from "./profiles";
import { applyReadingCredit } from "./reading";
import { applyEffort } from "./rewards";
import { sheetsFor } from "./sheets";
import {
  MATH,
  firstMathWeekForStage,
  lessonForWeek,
  mathIntroduced,
  shapeIds,
  tracePoints,
} from "./math";
import { learningPlace } from "./path";
import { placeForStage, resolvePlacement, weekLabel, withClassPlace, emptyPlacement } from "./placement";

const now = new Date("2026-09-26T15:00:00.000Z");
const zone = "UTC";

describe("numbers and math", () => {
  it("orders Counting, Numbers, Shapes, then Adding", () => {
    expect(learningPlace(MATH, 0).currentId).toBe("counting");
    expect(learningPlace(MATH, 10).currentId).toBe("numbers");
    expect(learningPlace(MATH, 20).currentId).toBe("shapes");
    expect(learningPlace(MATH, 26).currentId).toBe("adding");
    expect(firstMathWeekForStage("counting")).toBe(0);
    expect(mathIntroduced(firstMathWeekForStage("numbers"))).toBeGreaterThan(10);
    expect(placeForStage("shapes", MATH).subject).toBe("math");
    expect(placeForStage("shapes", MATH).stageId).toBe("shapes");
    expect(weekLabel(0, MATH)).toContain("Counting");
  });

  it("keeps every activity inside the ages 3–5 range", () => {
    for (let week = 0; week < 11; week += 1) {
      const lesson = lessonForWeek(week);
      expect(lesson.count).toBeGreaterThanOrEqual(1);
      expect(lesson.count).toBeLessThanOrEqual(10);
      expect(lesson.hear).toBeGreaterThanOrEqual(1);
      expect(lesson.hear).toBeLessThanOrEqual(20);
      expect(lesson.hearChoices).toContain(lesson.hear);
      expect(lesson.digit).toBeGreaterThanOrEqual(0);
      expect(lesson.digit).toBeLessThanOrEqual(9);
      expect(tracePoints[lesson.digit].length).toBeGreaterThanOrEqual(4);
      expect(shapeIds).toContain(lesson.shape);
      expect(lesson.shapeChoices).toContain(lesson.shape);
      expect(lesson.moreLeft).not.toBe(lesson.moreRight);
      expect(lesson.addLeft + lesson.addRight).toBeLessThanOrEqual(5);
      expect(lesson.addChoices).toContain(lesson.addLeft + lesson.addRight);
    }
    expect(lessonForWeek(0).addLeft).toBe(2);
    expect(lessonForWeek(0).addRight).toBe(1);
  });

  it("counts the daily goal across reading and numbers once", () => {
    const child = createChild({ name: "Mia", ageRange: "4", animal: "fox" });
    const reading = applyReadingCredit(child, { "2026-09-26": 6 * 60_000 }, 10, now, zone);
    expect(reading.awardedNow).toBe(false);
    const math = applyReadingCredit(reading.profile, { "2026-09-26": 4 * 60_000 }, 10, now, zone, MATH);
    expect(math.awardedNow).toBe(true);
    expect(math.profile.stars).toBe(1);
    expect(math.profile.practiceMs.math["2026-09-26"]).toBe(4 * 60_000);
    expect(math.profile.readingMs["2026-09-26"]).toBe(6 * 60_000);
    const again = applyReadingCredit(math.profile, { "2026-09-26": 8 * 60_000 }, 10, now, zone, MATH);
    expect(again.awardedNow).toBe(false);
    expect(again.profile.stars).toBe(1);
  });

  it("stores a number sticker on the math subject and keeps reading placement", () => {
    const child = createChild({ name: "Mia", ageRange: "4", animal: "fox" });
    const effort = applyEffort(child, "count", [{ kind: "number", label: "3" }], now, zone, MATH);
    expect(effort.awarded).toBe(true);
    expect(effort.profile.stickers).toEqual([{ subject: "math", kind: "number", label: "3" }]);
    expect(effort.profile.days["2026-09-26"]?.math?.count).toBe(true);
    const placed = withClassPlace(emptyPlacement(), placeForStage("adding", MATH), now, MATH);
    expect(placed.subjects.reading.classDefault).toBeNull();
    expect(placed.subjects.math.classDefault?.stageId).toBe("adding");
    const resolved = resolvePlacement(placed, child.id, child.createdAt, now, zone, MATH);
    expect(resolved.subject).toBe("math");
    expect(resolved.letters).toEqual([]);
    expect(sheetsFor(MATH).map((sheet) => sheet.id)).toEqual(["trace", "count", "shape"]);
  });
});
