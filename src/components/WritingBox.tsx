import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { playOnDevice } from "../audio/player";
import { strokePath, type TracePoint } from "../data/handwriting";
import { recognizeWriting } from "../data/recognize";
import type { Settings } from "../settings";

/**
 * An empty page for copy and memory writing.
 * Done checks the drawing against the manuscript. A miss can be tried again.
 */
export function WritingBox({
  template,
  partner,
  prompt,
  speak,
  showModel,
  model,
  ruled = true,
  hint,
  settingsRef,
  onJudge,
}: {
  template: TracePoint[][];
  partner?: TracePoint[][];
  prompt: string;
  speak: boolean;
  showModel: boolean;
  model?: ReactNode;
  ruled?: boolean;
  hint?: string;
  settingsRef: { current: Settings };
  onJudge: (ok: boolean) => void;
}) {
  const strokes = useRef<TracePoint[][]>([]);
  const current = useRef<TracePoint[]>([]);
  const drawing = useRef(false);
  const [ink, setInk] = useState<TracePoint[][]>([]);
  const [recognized, setRecognized] = useState("");
  const stations = template
    .flat()
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  useEffect(() => {
    if (!speak) return undefined;
    const controller = new AbortController();
    void playOnDevice(prompt, settingsRef.current, controller.signal).catch(() => undefined);
    return () => controller.abort();
  }, [prompt, settingsRef, speak]);

  const pointFrom = (event: ReactPointerEvent<HTMLDivElement>): TracePoint | null => {
    const svg = event.currentTarget.querySelector("svg");
    const rect = svg?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    };
  };

  const publish = (live: TracePoint[]) => {
    setInk(live.length > 1 ? [...strokes.current, live] : [...strokes.current]);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // A pencil can still draw without capture.
    }
    const point = pointFrom(event);
    if (!point) return;
    drawing.current = true;
    current.current = [point];
    publish(current.current);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drawing.current) return;
    const point = pointFrom(event);
    const last = current.current[current.current.length - 1];
    if (!point || !last) return;
    if (Math.hypot(point.x - last.x, point.y - last.y) < 1.2) return;
    current.current = [...current.current, point];
    publish(current.current);
  };

  const onPointerUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (current.current.length > 1) strokes.current = [...strokes.current, current.current];
    current.current = [];
    setInk([...strokes.current]);
  };

  const done = () => {
    const result = recognizeWriting(strokes.current, template, partner);
    setRecognized(result.ok ? "yes" : result.reversed ? "reversed" : "no");
    onJudge(result.ok);
  };

  return (
    <div className={`copy-row${showModel ? "" : " is-memory"}`} data-recognized={recognized || undefined}>
      {showModel ? (
        <div className="copy-model" aria-hidden="true">
          {model}
        </div>
      ) : null}
      <div className="writing-column">
        <p className="letter-prompt">{prompt}</p>
        {hint ? <p className="writing-hint">{hint}</p> : null}
        <div
          className="letter-board"
          data-stations={stations}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <svg className="trace-glyph" viewBox="0 0 100 100" aria-hidden="true">
            {ruled ? (
              <g className="paper-lines">
                <line x1="14" y1="18" x2="86" y2="18" />
                <line x1="14" y1="52" x2="86" y2="52" />
                <line x1="14" y1="84" x2="86" y2="84" />
              </g>
            ) : null}
            {ink.map((stroke, index) =>
              stroke.length > 1 ? <path key={index} className="stroke-ink" d={strokePath(stroke)} /> : null,
            )}
          </svg>
        </div>
        <button type="button" className="letter-next" onClick={done}>
          Done
        </button>
      </div>
    </div>
  );
}
