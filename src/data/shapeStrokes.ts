import { arc, join, line, type TracePoint } from "./handwriting";
import { shapeIds, type ShapeId } from "./math";

/**
 * Outline strokes in the same 0–100 box as letters.
 * Square, rectangle, and triangle are separate sides so each side has a start dot.
 * Circle, star, and heart are one continuous stroke.
 */
const shapes: Record<ShapeId, TracePoint[][]> = {
  circle: [arc(50, 50, 28, 28, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2)],
  square: [line(24, 24, 76, 24), line(76, 24, 76, 76), line(76, 76, 24, 76), line(24, 76, 24, 24)],
  triangle: [line(50, 18, 22, 80), line(22, 80, 78, 80), line(78, 80, 50, 18)],
  rectangle: [line(18, 30, 82, 30), line(82, 30, 82, 74), line(82, 74, 18, 74), line(18, 74, 18, 30)],
  star: [starOutline()],
  heart: [heartOutline()],
};

function starOutline(): TracePoint[] {
  const cx = 50;
  const cy = 52;
  const outer = 32;
  const inner = 13;
  const points: TracePoint[] = [];
  for (let index = 0; index < 5; index += 1) {
    const outerAngle = -Math.PI / 2 + (index * 2 * Math.PI) / 5;
    const innerAngle = outerAngle + Math.PI / 5;
    points.push({
      x: cx + outer * Math.cos(outerAngle),
      y: cy + outer * Math.sin(outerAngle),
    });
    points.push({
      x: cx + inner * Math.cos(innerAngle),
      y: cy + inner * Math.sin(innerAngle),
    });
  }
  const sides: TracePoint[][] = [];
  for (let index = 0; index < points.length; index += 1) {
    const next = points[(index + 1) % points.length];
    const current = points[index];
    if (!current || !next) continue;
    sides.push(line(current.x, current.y, next.x, next.y, 6));
  }
  return join(sides);
}

function heartOutline(): TracePoint[] {
  const cleft = Math.atan2(4, 16);
  return join([
    arc(34, 36, 16, 16, cleft, (-3 * Math.PI) / 2),
    line(34, 52, 50, 84, 10),
    line(50, 84, 66, 52, 10),
    arc(66, 36, 16, 16, Math.PI / 2, Math.atan2(4, -16) - Math.PI * 2),
  ]);
}

export function shapeStrokes(id: ShapeId): TracePoint[][] {
  return shapes[id] ?? shapes.circle;
}

export function everyShape(): ShapeId[] {
  return [...shapeIds];
}
