import { directionArrow, letterForm, numberSpot, strokePath, type LetterCase, type TracePoint } from "../data/handwriting";
import { strokeStations } from "../data/trace";

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
}: {
  letter?: string;
  casing?: LetterCase;
  strokes?: TracePoint[][];
  label?: string;
  ruled?: boolean;
  progress?: number[];
  activeIndex?: number;
  demoIndex?: number;
}) {
  const form = strokes ? { letter: label ?? "", strokes } : letterForm(letter ?? "a", casing);
  const glyph = label || form.letter;
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
        const spot = numberSpot(stroke);
        const start = stroke[0];
        const covered = progress?.[index] ?? 0;
        const ink = inkPath(stroke, covered);
        return (
          <g key={`${glyph}-${index}`} className={index === activeIndex || index === demoIndex ? "is-current" : undefined}>
            <path className="stroke-guide" d={strokePath(stroke)} />
            {ink.length >= 2 ? <path className="stroke-ink" d={strokePath(ink)} /> : null}
            {ink.length === 1 ? <circle className="stroke-ink-dot" cx={ink[0].x} cy={ink[0].y} r="3.2" /> : null}
            {demoIndex === index ? <path className="stroke-demo" pathLength={1} d={strokePath(stroke)} /> : null}
            {arrow ? <polygon className="stroke-arrow" points={arrow.map((point) => `${point.x},${point.y}`).join(" ")} /> : null}
            {start ? <circle className="stroke-start" cx={start.x} cy={start.y} r="4.2" /> : null}
            <text className="stroke-number" x={spot.x} y={spot.y} textAnchor="middle" dominantBaseline="central">
              {index + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
