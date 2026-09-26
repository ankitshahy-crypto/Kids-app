import { describe, expect, it } from "vitest";
import { everyShape, shapeStrokes } from "./shapeStrokes";
import { strokeComplete, strokeStations, traceProgress } from "./trace";
import { blendedCvcWords, nameGlyphs, nameToTrace, wordGlyphs } from "./tracePractice";

describe("shape strokes", () => {
  it("has a traceable outline for every shape", () => {
    expect(everyShape()).toEqual(["circle", "square", "triangle", "rectangle", "star", "heart"]);
    for (const id of everyShape()) {
      const strokes = shapeStrokes(id);
      expect(strokes.length).toBeGreaterThan(0);
      for (const stroke of strokes) {
        expect(stroke.length).toBeGreaterThan(1);
        const covered = traceProgress(stroke, strokeStations(stroke));
        expect(strokeComplete(stroke, covered)).toBe(true);
        const corner = [
          { x: 2, y: 2 },
          { x: 6, y: 4 },
          { x: 4, y: 8 },
        ];
        expect(traceProgress(stroke, corner)).toBe(0);
        for (const point of stroke) {
          expect(point.x).toBeGreaterThanOrEqual(2);
          expect(point.x).toBeLessThanOrEqual(98);
          expect(point.y).toBeGreaterThanOrEqual(2);
          expect(point.y).toBeLessThanOrEqual(104);
        }
      }
    }
  });
});

describe("word and name tracing", () => {
  it("traces a blended CVC word letter by letter", () => {
    const words = blendedCvcWords([
      { kind: "word", label: "Cat" },
      { kind: "word", label: "apple" },
      { kind: "letter", label: "m" },
    ]);
    expect(words.map((word) => word.word)).toEqual(["cat"]);
    const glyphs = wordGlyphs("cat");
    expect(glyphs.map((glyph) => glyph.label)).toEqual(["c", "a", "t"]);
    expect(glyphs.every((glyph) => glyph.strokes.length > 0)).toBe(true);
  });

  it("writes a first name with a capital and lowercase letters", () => {
    expect(nameToTrace("Mia")).toBe("Mia");
    expect(nameGlyphs("Mia").map((glyph) => glyph.label)).toEqual(["M", "i", "a"]);
    expect(nameToTrace("A")).toBeNull();
    expect(nameGlyphs("Jo-Ann").map((glyph) => glyph.label).join("")).toBe("Joann");
  });
});
