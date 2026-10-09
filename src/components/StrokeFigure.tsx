import { directionArrow, letterForm, numberSpot, strokePath, type LetterCase, type TracePoint } from "../data/handwriting";
import { strokeStations } from "../data/trace";

/** How far a number keeps from the other numbers. */
const NUMBER_GAP = 9;
/** How far a number keeps from a stroke's start dot (the dot's radius is 4.2, a digit's half-width about 3). */
const DOT_GAP = 8;

/**
 * Strokes that start at the same point get their numbers moved apart, so M reads 1 2, not 21. The
 * second number goes beside its start dot, on the side away from the letter's middle (left of M's
 * top-left corner, right of A's apex), where it is clear of the dot, the other numbers and the
 * strokes. It used to be pushed straight down, onto the dot and the first stroke's line, so on M the
 * 1 and the 2 read as one mark at the top of the letter.
 */
export function spreadSpots(spots: TracePoint[], gap = NUMBER_GAP, starts: TracePoint[] = []): TracePoint[] {
  const placed: TracePoint[] = [];
  const inside = (point: TracePoint) => point.x >= 6 && point.x <= 94 && point.y >= 8 && point.y <= 96;
  const clear = (point: TracePoint) =>
    inside(point) &&
    placed.every((other) => Math.hypot(other.x - point.x, other.y - point.y) >= gap) &&
    starts.every((start) => Math.hypot(start.x - point.x, start.y - point.y) >= DOT_GAP);
  spots.forEach((spot, index) => {
    if (clear(spot) || placed.every((other) => Math.hypot(other.x - spot.x, other.y - spot.y) >= gap)) {
      placed.push({ ...spot });
      return;
    }
    const start = starts[index] ?? spot;
    const away = start.x < 50 ? -1 : 1;
    const candidates: TracePoint[] = [
      { x: start.x + away * (gap + 1), y: start.y },
      { x: start.x - away * (gap + 1), y: start.y },
      { x: spot.x, y: spot.y + gap },
      { x: spot.x + gap, y: spot.y },
      { x: spot.x, y: spot.y + 2 * gap },
    ];
    const next = candidates.find(clear) ?? candidates.find((point) => inside(point) && placed.every((other) => Math.hypot(other.x - point.x, other.y - point.y) >= gap)) ?? spot;
    placed.push({ x: Math.round(next.x * 10) / 10, y: Math.round(next.y * 10) / 10 });
  });
  return placed;
}

function inkPath(stroke: TracePoint[], covered: number): TracePoint[] {
  if (covered <= 0) return [];
  return strokeStations(stroke).slice(0, covered);
}

/**
 * The same stroke model the child traces: numbered starts, direction arrows, and the path.
 * `progress` is how many stations of each stroke are already filled. Omit it on a printable.
 */
export function StrokeFigure({
  letter,
  casing = "lower",
  strokes,
  label,
  ruled = true,
  progress,
  activeIndex = -1,
  demoIndex = -1,
  guide = "full",
  guideOpacity = 1,
}: {
  letter?: string;
  casing?: LetterCase;
  strokes?: TracePoint[][];
  label?: string;
  ruled?: boolean;
  progress?: number[];
  activeIndex?: number;
  demoIndex?: number;
  /** full guide, fading guide, start dot only, a copy model, or an empty page. */
  guide?: "full" | "fade" | "start" | "model" | "none";
  guideOpacity?: number;
}) {
  const form = strokes ? { letter: label ?? "", strokes } : letterForm(letter ?? "a", casing);
  const glyph = label || form.letter;
  const spots = spreadSpots(
    form.strokes.map(numberSpot),
    NUMBER_GAP,
    form.strokes.flatMap((stroke) => (stroke[0] ? [stroke[0]] : [])),
  );
  const caption = glyph.length === 1 ? glyph : "";
  return (
    <svg className="trace-glyph" viewBox="0 0 100 100" data-case={strokes ? undefined : casing} role="img" aria-label={glyph || "shape"}>
      {caption ? (
        <text className="stroke-caption" x="8" y="10">
          {caption}
        </text>
      ) : null}
      {ruled ? (
        <g className="paper-lines" aria-hidden="true">
          <line x1="14" y1="18" x2="86" y2="18" />
          <line x1="14" y1="52" x2="86" y2="52" />
          <line x1="14" y1="84" x2="86" y2="84" />
        </g>
      ) : null}
      {form.strokes.map((stroke, index) => {
        const arrow = directionArrow(stroke);
        const spot = spots[index];
        const start = stroke[0];
        const covered = guide === "model" || guide === "none" ? 0 : (progress?.[index] ?? 0);
        const ink = inkPath(stroke, covered);
        const showPath = guide === "full" || guide === "fade" || guide === "model";
        const showStart = showPath || (guide === "start" && index === 0);
        const chrome = guide === "fade" ? guideOpacity : 1;
        return (
          <g key={`${glyph}-${index}`} className={index === activeIndex || index === demoIndex ? "is-current" : undefined}>
            {showPath || showStart ? (
              <g opacity={chrome}>
                {showPath ? <path className="stroke-guide" d={strokePath(stroke)} /> : null}
                {demoIndex === index && showPath ? <path className="stroke-demo" pathLength={1} d={strokePath(stroke)} /> : null}
                {showStart && arrow ? (
                  <polygon className="stroke-arrow" points={arrow.map((point) => `${point.x},${point.y}`).join(" ")} />
                ) : null}
                {showStart && start ? <circle className="stroke-start" cx={start.x} cy={start.y} r="4.2" /> : null}
                {showPath ? (
                  <text className="stroke-number" x={spot.x} y={spot.y} textAnchor="middle" dominantBaseline="central">
                    {index + 1}
                  </text>
                ) : null}
              </g>
            ) : null}
            {ink.length >= 2 ? <path className="stroke-ink" d={strokePath(ink)} /> : null}
            {ink.length === 1 ? <circle className="stroke-ink-dot" cx={ink[0].x} cy={ink[0].y} r="3.2" /> : null}
          </g>
        );
      })}
    </svg>
  );
}
