import { describe, expect, it } from "vitest";
import { letterForm } from "./handwriting";
import { recognizeWriting } from "./recognize";
import { shapeStrokes } from "./shapeStrokes";
import type { TracePoint } from "./handwriting";

function shift(strokes: TracePoint[][], dx: number, dy: number, scale = 1): TracePoint[][] {
  return strokes.map((stroke) => stroke.map((point) => ({ x: 15 + point.x * scale + dx, y: 8 + point.y * scale + dy })));
}

function jitter(strokes: TracePoint[][], amount: number): TracePoint[][] {
  let seed = 4;
  return strokes.map((stroke) =>
    stroke.map((point) => {
      seed = (seed * 17 + 5) % 997;
      const dx = ((seed % 100) / 100 - 0.5) * 2 * amount;
      seed = (seed * 17 + 5) % 997;
      const dy = ((seed % 100) / 100 - 0.5) * 2 * amount;
      return { x: point.x + dx, y: point.y + dy };
    }),
  );
}

function reverseStrokes(strokes: TracePoint[][]): TracePoint[][] {
  return strokes.map((stroke) => [...stroke].reverse());
}

describe("freehand recognition", () => {
  const littleB = letterForm("b", "lower").strokes;
  const littleD = letterForm("d", "lower").strokes;

  it("accepts little b, including a smaller moved copy", () => {
    const exact = recognizeWriting(littleB, littleB, littleD);
    expect(exact.ok).toBe(true);
    expect(exact.reversed).toBe(false);
    const messy = recognizeWriting(jitter(shift(littleB, 6, -4, 0.75), 3.5), littleB, littleD);
    expect(messy.ok, JSON.stringify(messy)).toBe(true);
  });

  it("rejects d and a backwards b when the child was asked for b", () => {
    const dee = recognizeWriting(littleD, littleB, littleD);
    expect(dee.ok).toBe(false);
    expect(dee.reversed, JSON.stringify(dee)).toBe(true);
    const backwards = recognizeWriting(reverseStrokes(littleB), littleB, littleD);
    expect(backwards.ok, JSON.stringify(backwards)).toBe(false);
  });

  it("rejects a scribble and tells a square from a circle", () => {
    const scribble = recognizeWriting(
      [
        [
          { x: 4, y: 6 },
          { x: 30, y: 10 },
          { x: 18, y: 16 },
        ],
      ],
      littleB,
      littleD,
    );
    expect(scribble.ok).toBe(false);
    expect(scribble.reversed).toBe(false);

    const square = shapeStrokes("square");
    const circle = shapeStrokes("circle");
    expect(recognizeWriting(square, square).ok).toBe(true);
    const round = recognizeWriting(circle, square);
    expect(round.ok, JSON.stringify(round)).toBe(false);
    const wide = recognizeWriting(shapeStrokes("rectangle"), square);
    expect(wide.ok, JSON.stringify(wide)).toBe(false);
  });
});
