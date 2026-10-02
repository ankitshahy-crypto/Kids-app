/**
 * Ball-and-stick manuscript strokes, in the order used by preschool
 * handwriting (Zaner-Bloser style: straight lines and circles, not cursive).
 * Coordinates sit in a 0–100 box. y grows downward.
 * Top line 18, midline 52, baseline 84, descender 98.
 */

export type TracePoint = { x: number; y: number };
export type LetterForm = { letter: string; strokes: TracePoint[][] };
export type LetterCase = "upper" | "lower";

const PI = Math.PI;

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export function line(x1: number, y1: number, x2: number, y2: number, steps = 12): TracePoint[] {
  const points: TracePoint[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    points.push({ x: round(x1 + (x2 - x1) * t), y: round(y1 + (y2 - y1) * t) });
  }
  return points;
}

export function arc(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  start: number,
  end: number,
  steps?: number,
): TracePoint[] {
  const count = steps ?? Math.max(10, Math.round(Math.abs(end - start) * 9));
  const points: TracePoint[] = [];
  for (let index = 0; index <= count; index += 1) {
    const angle = start + ((end - start) * index) / count;
    points.push({
      x: round(cx + rx * Math.cos(angle)),
      y: round(cy + ry * Math.sin(angle)),
    });
  }
  return points;
}

export function join(parts: TracePoint[][]): TracePoint[] {
  const points: TracePoint[] = [];
  for (const part of parts) {
    for (const point of part) {
      const last = points[points.length - 1];
      if (last && last.x === point.x && last.y === point.y) continue;
      points.push(point);
    }
  }
  return points;
}

/**
 * Full circle, made the way children are taught: start near one o'clock and circle back
 * (counterclockwise on screen, so the angle decreases).
 */
function ring(cx: number, cy: number, rx: number, ry: number): TracePoint[] {
  const start = -PI / 3;
  return arc(cx, cy, rx, ry, start, start - PI * 2);
}

/** A tiny dot, for i and j. Direction does not matter. */
function dot(cx: number, cy: number): TracePoint[] {
  return arc(cx, cy, 2.4, 2.4, -PI / 2, -PI / 2 + PI * 2);
}

/** Circle that begins on the left, where a stick meets the ball. */
function ringFromLeft(cx: number, cy: number, rx: number, ry: number): TracePoint[] {
  return arc(cx, cy, rx, ry, PI, PI + PI * 2);
}

/** Open curve like C: starts upper-right and travels counterclockwise. */
function openCurve(cx: number, cy: number, rx: number, ry: number): TracePoint[] {
  return arc(cx, cy, rx, ry, -0.75, -PI * 2 + 0.75);
}

/** Arch for n, m, h, r: from the stick, over the top, then down. */
function archDown(cx: number, cy: number, rx: number, ry: number, base: number): TracePoint[] {
  return join([arc(cx, cy, rx, ry, PI, PI * 2), line(cx + rx, cy, cx + rx, base, 8)]);
}

/** U shape: straight down from `top` on the left, around the bottom, and straight back up on the right. */
function underCurve(cx: number, cy: number, rx: number, ry: number, top: number): TracePoint[] {
  return join([line(cx - rx, top, cx - rx, cy, 6), arc(cx, cy, rx, ry, PI, 0), line(cx + rx, cy, cx + rx, top, 6)]);
}

function through(points: TracePoint[]): TracePoint[] {
  if (points.length < 2) return points;
  const out: TracePoint[] = [];
  const steps = 6;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[Math.max(0, index - 1)];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[Math.min(points.length - 1, index + 2)];
    for (let step = 0; step < steps; step += 1) {
      const t = step / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push({
        x: round(0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3)),
        y: round(0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)),
      });
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

const upper: Record<string, TracePoint[][]> = {
  a: [line(50, 18, 30, 84), line(50, 18, 70, 84), line(36, 58, 64, 58)],
  b: [line(34, 18, 34, 84), arc(34, 36, 22, 16, -PI / 2, PI / 2), arc(34, 66, 22, 16, -PI / 2, PI / 2)],
  c: [openCurve(52, 51, 22, 30)],
  d: [line(32, 18, 32, 84), arc(32, 51, 34, 32, -PI / 2, PI / 2)],
  e: [line(32, 18, 32, 84), line(32, 20, 68, 20), line(32, 50, 60, 50), line(32, 82, 68, 82)],
  f: [line(32, 18, 32, 84), line(32, 20, 68, 20), line(32, 50, 60, 50)],
  g: [join([arc(50, 51, 22, 30, -0.75, -PI * 2), line(72, 51, 52, 51, 6)])],
  h: [line(30, 18, 30, 84), line(70, 18, 70, 84), line(30, 51, 70, 51)],
  i: [line(50, 22, 50, 80), line(36, 20, 64, 20), line(36, 82, 64, 82)],
  j: [join([line(56, 20, 56, 68, 8), arc(46, 68, 10, 14, 0, PI * 0.85)]), line(36, 20, 66, 20)],
  k: [line(32, 18, 32, 84), line(66, 20, 32, 52), line(40, 46, 68, 84)],
  l: [line(34, 18, 34, 84), line(34, 82, 68, 82)],
  m: [line(22, 18, 22, 84), line(22, 18, 50, 84), line(50, 84, 78, 18), line(78, 18, 78, 84)],
  n: [line(30, 18, 30, 84), line(30, 18, 70, 84), line(70, 84, 70, 18)],
  o: [ring(50, 51, 22, 32)],
  p: [line(34, 18, 34, 84), arc(34, 38, 24, 18, -PI / 2, PI / 2)],
  q: [ring(46, 50, 20, 30), line(58, 62, 74, 90)],
  r: [line(32, 18, 32, 84), arc(32, 38, 24, 18, -PI / 2, PI / 2), line(44, 52, 70, 84)],
  s: [through([
    { x: 66, y: 26 },
    { x: 40, y: 20 },
    { x: 32, y: 38 },
    { x: 50, y: 51 },
    { x: 68, y: 64 },
    { x: 60, y: 82 },
    { x: 34, y: 76 },
  ])],
  t: [line(28, 20, 72, 20), line(50, 20, 50, 84)],
  u: [underCurve(50, 62, 20, 22, 18)],
  v: [line(28, 18, 50, 84), line(50, 84, 72, 18)],
  w: [line(16, 18, 32, 84), line(32, 84, 50, 36), line(50, 36, 68, 84), line(68, 84, 84, 18)],
  x: [line(28, 18, 72, 84), line(72, 18, 28, 84)],
  y: [line(28, 18, 50, 50), join([line(72, 18, 50, 50, 6), line(50, 50, 50, 84, 6)])],
  z: [line(28, 20, 72, 20), line(72, 20, 28, 82), line(28, 82, 72, 82)],
};

const lower: Record<string, TracePoint[][]> = {
  a: [ring(44, 69, 14, 14), line(58, 55, 58, 84)],
  b: [line(36, 18, 36, 84), ringFromLeft(50, 69, 14, 14)],
  c: [openCurve(52, 69, 14, 14)],
  d: [ring(44, 69, 14, 14), line(58, 18, 58, 84)],
  e: [join([line(36, 69, 64, 69, 6), arc(50, 69, 14, 14, 0, -PI * 1.72)])],
  f: [join([arc(48, 30, 12, 12, -0.2, -PI), line(36, 30, 36, 84, 10)]), line(26, 52, 54, 52)],
  g: [ring(44, 69, 14, 14), join([line(58, 55, 58, 92, 8), arc(48, 92, 10, 8, 0, PI * 0.9)])],
  h: [line(36, 18, 36, 84), archDown(50, 62, 14, 12, 84)],
  i: [line(50, 58, 50, 84), dot(50, 46)],
  j: [join([line(54, 58, 54, 92, 8), arc(44, 92, 10, 8, 0, PI * 0.9)]), dot(54, 46)],
  k: [line(36, 18, 36, 84), line(58, 56, 36, 70), line(42, 66, 60, 84)],
  l: [line(50, 18, 50, 84)],
  m: [line(26, 54, 26, 84), archDown(40, 62, 14, 12, 84), archDown(68, 62, 14, 12, 84)],
  n: [line(36, 54, 36, 84), archDown(50, 62, 14, 12, 84)],
  o: [ring(50, 69, 14, 14)],
  p: [line(36, 56, 36, 100), ringFromLeft(50, 69, 14, 14)],
  q: [ring(44, 69, 14, 14), join([line(58, 55, 58, 98, 8), line(58, 98, 68, 92, 3)])],
  r: [line(40, 56, 40, 84), arc(54, 68, 14, 12, PI, PI * 1.8)],
  s: [through([
    { x: 62, y: 58 },
    { x: 42, y: 54 },
    { x: 36, y: 64 },
    { x: 50, y: 69 },
    { x: 64, y: 76 },
    { x: 56, y: 86 },
    { x: 38, y: 82 },
  ])],
  t: [line(50, 30, 50, 84), line(34, 52, 66, 52)],
  u: [underCurve(46, 70, 14, 14, 54), line(60, 54, 60, 84)],
  v: [line(34, 54, 50, 84), line(50, 84, 66, 54)],
  w: [line(24, 54, 36, 84), line(36, 84, 50, 60), line(50, 60, 64, 84), line(64, 84, 76, 54)],
  x: [line(34, 54, 66, 84), line(66, 54, 34, 84)],
  y: [line(34, 54, 50, 82), join([line(66, 54, 50, 82, 6), line(50, 82, 40, 100, 5)])],
  z: [line(34, 56, 66, 56), line(66, 56, 34, 82), line(34, 82, 66, 82)],
};

function formFor(letter: string, casing: LetterCase): LetterForm {
  const key = letter.toLowerCase();
  const strokes = (casing === "upper" ? upper[key] : lower[key]) ?? [line(50, 18, 50, 84)];
  return { letter: casing === "upper" ? key.toUpperCase() : key, strokes };
}

export function letterForm(letter: string, casing: LetterCase): LetterForm {
  return formFor(letter, casing);
}

export function alphabetForms(): LetterForm[] {
  const letters = "abcdefghijklmnopqrstuvwxyz".split("");
  return letters.flatMap((letter) => [formFor(letter, "upper"), formFor(letter, "lower")]);
}

export function pathLength(stroke: TracePoint[]): number {
  let length = 0;
  for (let index = 1; index < stroke.length; index += 1) {
    length += Math.hypot(stroke[index].x - stroke[index - 1].x, stroke[index].y - stroke[index - 1].y);
  }
  return length;
}

function pointAlong(stroke: TracePoint[], distance: number): { point: TracePoint; tangent: TracePoint } | null {
  if (stroke.length === 0) return null;
  if (stroke.length === 1 || distance <= 0) {
    const next = stroke[1] ?? stroke[0];
    return { point: stroke[0], tangent: { x: next.x - stroke[0].x, y: next.y - stroke[0].y } };
  }
  let walked = 0;
  for (let index = 1; index < stroke.length; index += 1) {
    const previous = stroke[index - 1];
    const next = stroke[index];
    const span = Math.hypot(next.x - previous.x, next.y - previous.y);
    if (walked + span >= distance || index === stroke.length - 1) {
      const remain = span === 0 ? 0 : Math.min(1, (distance - walked) / span);
      return {
        point: { x: previous.x + (next.x - previous.x) * remain, y: previous.y + (next.y - previous.y) * remain },
        tangent: { x: next.x - previous.x, y: next.y - previous.y },
      };
    }
    walked += span;
  }
  return null;
}

/** A small triangle pointing along the stroke, just past the start dot. */
export function directionArrow(stroke: TracePoint[]): [TracePoint, TracePoint, TracePoint] | null {
  const length = pathLength(stroke);
  if (length < 16) return null;
  const at = Math.min(16, length * 0.45);
  const head = pointAlong(stroke, at);
  const tail = pointAlong(stroke, Math.max(0, at - 7));
  if (!head || !tail) return null;
  const len = Math.hypot(head.tangent.x, head.tangent.y) || 1;
  const ux = head.tangent.x / len;
  const uy = head.tangent.y / len;
  const px = -uy;
  const py = ux;
  const back = tail.point;
  return [
    { x: round(head.point.x), y: round(head.point.y) },
    { x: round(back.x + px * 3.2), y: round(back.y + py * 3.2) },
    { x: round(back.x - px * 3.2), y: round(back.y - py * 3.2) },
  ];
}

/** Where the stroke number sits, just behind the start so stacked strokes stay readable. */
export function numberSpot(stroke: TracePoint[]): TracePoint {
  const start = stroke[0] ?? { x: 50, y: 50 };
  const sample = pointAlong(stroke, 10);
  const tangent = sample?.tangent ?? { x: 0, y: 1 };
  const len = Math.hypot(tangent.x, tangent.y) || 1;
  return {
    x: Math.min(94, Math.max(6, round(start.x - (tangent.x / len) * 8))),
    y: Math.min(96, Math.max(8, round(start.y - (tangent.y / len) * 8))),
  };
}

export function strokePath(stroke: TracePoint[]): string {
  return stroke.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ");
}
