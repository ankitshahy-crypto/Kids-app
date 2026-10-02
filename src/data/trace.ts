import type { TracePoint } from "./handwriting";

/** How far a finger may stray, in the 0–100 letter box. Wide on purpose for ages 3–5. */
export const TRACE_TOLERANCE = 16;

/** Wider still, for calm mode or the "Easier tracing" switch. */
export const EASY_TRACE_TOLERANCE = 24;

/** The lane width a lesson uses. Calm mode is always the easier lane. */
export function traceTolerance(settings: { calm: boolean; easierTracing: boolean }): number {
  return settings.calm || settings.easierTracing ? EASY_TRACE_TOLERANCE : TRACE_TOLERANCE;
}

/** Distance between stations along a stroke. Small, so the ink grows in short, even steps. */
const STATION_SPACING = 2;

/** How far ahead of the ink a finger may land and still pull it forward, in stations (20 units). */
const LOOK_AHEAD = 10;

/** A finger this close to the end of a stroke (8 units of path) finishes it. */
const END_SNAP = 4;

/** How much nearer the next station must be than the last inked one before the ink moves. */
const PASSED_MARGIN = 0.5;

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function distance(a: TracePoint, b: TracePoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Points spaced along a stroke, including both ends. */
export function strokeStations(stroke: TracePoint[], spacing = STATION_SPACING): TracePoint[] {
  if (stroke.length === 0) return [];
  const stations: TracePoint[] = [{ x: round(stroke[0].x), y: round(stroke[0].y) }];
  let carry = 0;
  for (let index = 1; index < stroke.length; index += 1) {
    const previous = stroke[index - 1];
    const next = stroke[index];
    const span = distance(previous, next);
    if (span === 0) continue;
    let walked = spacing - carry;
    while (walked <= span + 0.001) {
      const t = Math.min(1, walked / span);
      stations.push({
        x: round(previous.x + (next.x - previous.x) * t),
        y: round(previous.y + (next.y - previous.y) * t),
      });
      walked += spacing;
    }
    carry = span - (walked - spacing);
    if (carry < 0) carry = 0;
  }
  const last = stroke[stroke.length - 1];
  const end = stations[stations.length - 1];
  if (distance(end, last) > 0.6) stations.push({ x: round(last.x), y: round(last.y) });
  return stations;
}

/**
 * Move the ink to the station nearest the finger, so the line ends under the fingertip.
 * Only the next stretch of the stroke counts (LOOK_AHEAD), and only while it stays within
 * `tolerance` of the finger: a finger at the middle of a round letter is near all of it,
 * and must not fill it in one touch. A point that has not reached the start, or that jumps
 * off the path, does not move coverage. A finger resting behind the ink, or the same
 * distance from everything, leaves it where it is. Coverage never goes back.
 */
export function followStroke(
  stroke: TracePoint[],
  covered: number,
  point: TracePoint,
  tolerance = TRACE_TOLERANCE,
): number {
  const stations = strokeStations(stroke);
  if (covered >= stations.length) return covered;
  const from = Math.max(0, covered);
  const limit = Math.min(stations.length, from + LOOK_AHEAD);
  let nearest = -1;
  // The finger has to be past the last inked station, not merely near the next one.
  let best = from > 0 ? distance(point, stations[from - 1]) - PASSED_MARGIN : Infinity;
  for (let index = from; index < limit; index += 1) {
    const away = distance(point, stations[index]);
    if (away > tolerance) break;
    if (away < best) {
      best = away;
      nearest = index;
    }
  }
  if (nearest < 0) return covered;
  const next = nearest + 1;
  const last = stations[stations.length - 1];
  if (stations.length - next <= END_SNAP && distance(point, last) <= tolerance) return stations.length;
  return next;
}

export function strokeComplete(stroke: TracePoint[], covered: number): boolean {
  const total = strokeStations(stroke).length;
  return total > 0 && covered >= total;
}

/** Feed a whole gesture. Used by tests and by anything that replays a path. */
export function traceProgress(stroke: TracePoint[], points: TracePoint[], tolerance = TRACE_TOLERANCE): number {
  let covered = 0;
  for (const point of points) covered = followStroke(stroke, covered, point, tolerance);
  return covered;
}

export function stationsAttribute(stroke: TracePoint[]): string {
  return strokeStations(stroke)
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
}

/** Letters children most often flip. Each pair is practiced together. */
export const reversalPairs = [
  ["b", "d"],
  ["p", "q"],
  ["n", "u"],
  ["m", "w"],
] as const;

export function reversalPartner(letter: string): string | null {
  const key = letter.toLowerCase();
  for (const [left, right] of reversalPairs) {
    if (left === key) return right;
    if (right === key) return left;
  }
  return null;
}

export function matchDistractor(letter: string, company: readonly string[] = []): string {
  const key = letter.toLowerCase();
  const partner = reversalPartner(key);
  if (partner) return partner;
  const other = company.find((item) => item.toLowerCase() !== key);
  if (other) return other.toLowerCase();
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const index = alphabet.indexOf(key);
  return alphabet[(index + 1) % alphabet.length] ?? "a";
}
