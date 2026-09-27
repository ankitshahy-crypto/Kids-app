import type { TracePoint } from "./handwriting";

/**
 * A $1-style check for ages 3–5.
 * Strokes are resampled, centered, and scaled. A small rotation is allowed.
 * Stroke direction is kept, so a backwards stroke or a mirror such as d for b does not pass.
 */
const SAMPLES = 64;
const ROTATION_STEPS = 15;
const ROTATION_LIMIT = (28 * Math.PI) / 180;
/** Mean point distance in the normalized box. Wide on purpose. */
export const ACCEPT_DISTANCE = 0.28;
const PARTNER_MARGIN = 0.05;
const MIN_PATH = 16;

export type RecognizeResult = {
  ok: boolean;
  reversed: boolean;
  score: number;
};

function hypot(x: number, y: number): number {
  return Math.hypot(x, y);
}

function flatten(strokes: TracePoint[][]): TracePoint[] {
  const points: TracePoint[] = [];
  for (const stroke of strokes) {
    for (const point of stroke) {
      const last = points[points.length - 1];
      if (last && last.x === point.x && last.y === point.y) continue;
      points.push(point);
    }
  }
  return points;
}

function pathLength(points: TracePoint[]): number {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const next = points[index];
    if (!previous || !next) continue;
    length += hypot(next.x - previous.x, next.y - previous.y);
  }
  return length;
}

/** Evenly spaced points so a slow finger and a quick one look the same. */
export function resample(points: TracePoint[], count = SAMPLES): TracePoint[] {
  if (points.length === 0) return [];
  const first = points[0];
  if (!first || count <= 1) return first ? [first] : [];
  const length = pathLength(points);
  if (length === 0) return Array.from({ length: count }, () => ({ ...first }));
  const interval = length / (count - 1);
  const out: TracePoint[] = [{ ...first }];
  let walked = 0;
  let previous = first;
  for (let index = 1; index < points.length && out.length < count; index += 1) {
    const next = points[index];
    if (!next) continue;
    const span = hypot(next.x - previous.x, next.y - previous.y);
    if (span === 0) continue;
    if (walked + span >= interval) {
      const t = (interval - walked) / span;
      const point = {
        x: previous.x + (next.x - previous.x) * t,
        y: previous.y + (next.y - previous.y) * t,
      };
      out.push(point);
      previous = point;
      walked = 0;
      index -= 1;
    } else {
      walked += span;
      previous = next;
    }
  }
  const last = points[points.length - 1] ?? first;
  while (out.length < count) out.push({ ...last });
  return out;
}

function normalize(points: TracePoint[]): TracePoint[] {
  let cx = 0;
  let cy = 0;
  for (const point of points) {
    cx += point.x;
    cy += point.y;
  }
  cx /= points.length;
  cy /= points.length;
  const shifted = points.map((point) => ({ x: point.x - cx, y: point.y - cy }));
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of shifted) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  const scale = Math.max(maxX - minX, maxY - minY) || 1;
  return shifted.map((point) => ({ x: point.x / scale, y: point.y / scale }));
}

function rotate(points: TracePoint[], angle: number): TracePoint[] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return points.map((point) => ({
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  }));
}

function meanDistance(left: TracePoint[], right: TracePoint[]): number {
  const count = Math.min(left.length, right.length);
  if (count === 0) return 1;
  let total = 0;
  for (let index = 0; index < count; index += 1) {
    const a = left[index];
    const b = right[index];
    if (!a || !b) continue;
    total += hypot(a.x - b.x, a.y - b.y);
  }
  return total / count;
}

function heading(points: TracePoint[]): { x: number; y: number } {
  const start = points[0];
  const ahead = points[Math.min(8, points.length - 1)];
  if (!start || !ahead) return { x: 1, y: 0 };
  const length = hypot(ahead.x - start.x, ahead.y - start.y) || 1;
  return { x: (ahead.x - start.x) / length, y: (ahead.y - start.y) / length };
}

function prepare(strokes: TracePoint[][]): { points: TracePoint[]; flat: TracePoint[]; length: number; strokes: number } | null {
  const flat = flatten(strokes);
  if (flat.length < 2) return null;
  const length = pathLength(flat);
  if (length < MIN_PATH) return null;
  const used = strokes.filter((stroke) => stroke.length > 1).length;
  return { points: normalize(resample(flat)), flat, length, strokes: used };
}

function aspectRatio(points: TracePoint[]): number {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return Math.max(1, maxX - minX) / Math.max(1, maxY - minY);
}

function radialSpread(points: TracePoint[]): number {
  const radii = points.map((point) => hypot(point.x, point.y));
  const mean = radii.reduce((total, radius) => total + radius, 0) / radii.length;
  const variance = radii.reduce((total, radius) => total + (radius - mean) ** 2, 0) / radii.length;
  return Math.sqrt(variance) / (mean || 1);
}

/**
 * Extra checks that point distance misses.
 * A circle and a square can land near each other after scaling, and a wide rectangle
 * should not pass as a square. Letter wobble stays inside the limits.
 */
function adjustedScore(
  score: number,
  drawn: { points: TracePoint[]; flat: TracePoint[]; strokes: number },
  template: { points: TracePoint[]; flat: TracePoint[]; strokes: number },
): number {
  let next = score + Math.abs(drawn.strokes - template.strokes) * 0.05;
  const ratio = aspectRatio(drawn.flat) / (aspectRatio(template.flat) || 1);
  if (ratio > 1.38 || ratio < 1 / 1.38) next += 0.2;
  const drawnSpread = radialSpread(drawn.points);
  const templateSpread = radialSpread(template.points);
  if (drawnSpread < 0.22 && templateSpread < 0.22) {
    const gap = Math.abs(drawnSpread - templateSpread);
    if (gap > 0.05) next += (gap - 0.05) * 2.5;
  }
  return next;
}

function shapeScore(drawn: TracePoint[], template: TracePoint[]): number {
  let best = meanDistance(drawn, template);
  for (let step = 1; step <= ROTATION_STEPS; step += 1) {
    const angle = (ROTATION_LIMIT * step) / ROTATION_STEPS;
    best = Math.min(best, meanDistance(rotate(drawn, angle), template), meanDistance(rotate(drawn, -angle), template));
  }
  return best;
}

function sameDirection(drawn: TracePoint[], template: TracePoint[]): boolean {
  const left = heading(drawn);
  const right = heading(template);
  return left.x * right.x + left.y * right.y > 0.2;
}

/**
 * Compare a freehand drawing to the manuscript template.
 * `partner` is the reversal, such as d when the child was asked for b.
 */
export function recognizeWriting(
  drawn: TracePoint[][],
  template: TracePoint[][],
  partner?: TracePoint[][],
): RecognizeResult {
  const ink = prepare(drawn);
  const model = prepare(template);
  if (!ink || !model) return { ok: false, reversed: false, score: 1 };
  const score = adjustedScore(shapeScore(ink.points, model.points), ink, model);
  const directed = sameDirection(ink.points, model.points);
  let reversed = false;
  if (partner && partner.length > 0) {
    const other = prepare(partner);
    if (other) {
      const partnerScore = adjustedScore(shapeScore(ink.points, other.points), ink, other);
      reversed = partnerScore <= ACCEPT_DISTANCE && partnerScore + PARTNER_MARGIN < score;
    }
  }
  return {
    ok: directed && !reversed && score <= ACCEPT_DISTANCE,
    reversed,
    score,
  };
}
