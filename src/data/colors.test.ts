import { describe, expect, it } from "vitest";
import {
  COLORS,
  colorIds,
  colorIntroduced,
  colorLessonForWeek,
  firstColorWeekForStage,
  mixPaints,
} from "./colors";
import { learningPlace } from "./path";
import { emptyPlacement, placeForStage, resolvePlacement, weekLabel, withClassPlace } from "./placement";
import { createChild } from "./profiles";
import { applyEffort } from "./rewards";
import { sheetsFor } from "./sheets";

const now = new Date("2026-09-26T15:00:00.000Z");
const zone = "UTC";

describe("colors", () => {
  it("orders Color names, then Mixing", () => {
    expect(learningPlace(COLORS, 0).currentId).toBe("names");
    expect(learningPlace(COLORS, 10).currentId).toBe("mixing");
    expect(firstColorWeekForStage("names")).toBe(0);
    expect(colorIntroduced(firstColorWeekForStage("mixing"))).toBeGreaterThan(10);
    expect(placeForStage("mixing", COLORS).subject).toBe("colors");
    expect(placeForStage("mixing", COLORS).stageId).toBe("mixing");
    expect(weekLabel(0, COLORS)).toContain("Color names");
  });

  it("hears one of the ten color names", () => {
    for (let week = 0; week < 7; week += 1) {
      const lesson = colorLessonForWeek(week);
      expect(colorIds).toContain(lesson.hear);
      expect(lesson.choices).toContain(lesson.hear);
      expect(new Set(lesson.choices).size).toBe(lesson.choices.length);
    }
  });

  it("mixes paints the way children are taught", () => {
    expect(mixPaints("red", "yellow")).toBe("orange");
    expect(mixPaints("yellow", "red")).toBe("orange");
    expect(mixPaints("blue", "yellow")).toBe("green");
    expect(mixPaints("red", "blue")).toBe("purple");
    expect(mixPaints("red", "white")).toBe("light red");
    expect(mixPaints("white", "blue")).toBe("light blue");
    expect(mixPaints("white", "yellow")).toBe("light yellow");
    expect(mixPaints("red", "red")).toBeNull();
    expect(mixPaints("pink", "brown")).toBeNull();
  });

  it("stores a color sticker and a coloring page without moving reading", () => {
    const child = createChild({ name: "Mia", ageRange: "4", animal: "fox" });
    const effort = applyEffort(child, "mix", [{ kind: "color", label: "orange" }], now, zone, COLORS);
    expect(effort.awarded).toBe(true);
    expect(effort.profile.stickers).toEqual([{ subject: "colors", kind: "color", label: "orange" }]);
    const placed = withClassPlace(emptyPlacement(), placeForStage("mixing", COLORS), now, COLORS);
    expect(placed.subjects.reading.classDefault).toBeNull();
    expect(placed.subjects.colors.classDefault?.stageId).toBe("mixing");
    const resolved = resolvePlacement(placed, child.id, child.createdAt, now, zone, COLORS);
    expect(resolved.subject).toBe("colors");
    expect(resolved.letters).toEqual([]);
    expect(sheetsFor(COLORS).map((sheet) => sheet.id)).toEqual(["coloring"]);
  });
});
