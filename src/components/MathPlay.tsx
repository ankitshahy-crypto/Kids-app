import { useEffect, useRef, useState, type JSX, type PointerEvent } from "react";
import { playNumber, playPrompt } from "../audio/player";
import { THEMES, type ThemeId } from "../data/themes";
import { illustrations } from "../illustrations";
import { themeArt } from "../themeArt";
import { PathTrace } from "./PathTrace";
import {
  numberWord,
  shapeTitles,
  tracePoints,
  type MathLesson,
  type MathStep,
  type ShapeId,
} from "../data/math";
import { memoryPrompt, shapeItemId, writingLevel, type WritingMap, type WritingOutcome } from "../data/scaffold";
import { shapeStrokes } from "../data/shapeStrokes";
import type { Settings } from "../settings";
import { LockBadge } from "./LockBadge";

function useSpeaker(settingsRef: { current: Settings }) {
  const playRef = useRef<AbortController | null>(null);
  useEffect(() => () => playRef.current?.abort(), []);
  return {
    number(value: number) {
      playRef.current?.abort();
      const controller = new AbortController();
      playRef.current = controller;
      void playNumber(value, settingsRef.current, controller.signal).catch(() => undefined);
    },
    prompt(id: string) {
      playRef.current?.abort();
      const controller = new AbortController();
      playRef.current = controller;
      void playPrompt(id, settingsRef.current, controller.signal).catch(() => undefined);
    },
  };
}

function Apple() {
  return (
    <svg className="math-apple" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 14c2-6 8-8 12-6-2 6-6 8-10 8" fill="none" stroke="#6e9a74" strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="38" r="16" fill="#e07a5f" />
      <ellipse cx="26" cy="32" rx="4" ry="3" fill="#f4c7b8" opacity="0.8" />
    </svg>
  );
}

/** What the child counts: an apple, or the day's theme object when a theme is picked. */
function countObject(theme?: ThemeId): { name: string; Art: () => JSX.Element } {
  if (!theme) return { name: "apple", Art: Apple };
  const Art = theme === "ocean" ? illustrations.fish : themeArt[theme];
  return { name: THEMES[theme].object, Art: () => <span className="math-theme-object"><Art /></span> };
}

function titleCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function ShapeGlyph({ id }: { id: ShapeId }) {
  if (id === "circle") return <svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="26" fill="#f4a4b4" /></svg>;
  if (id === "square") return <svg viewBox="0 0 80 80" aria-hidden="true"><rect x="16" y="16" width="48" height="48" rx="8" fill="#f6c445" /></svg>;
  if (id === "triangle") return <svg viewBox="0 0 80 80" aria-hidden="true"><path d="M40 14 68 64H12Z" fill="#8fcb7a" /></svg>;
  if (id === "rectangle") return <svg viewBox="0 0 80 80" aria-hidden="true"><rect x="10" y="24" width="60" height="34" rx="8" fill="#8eb8d8" /></svg>;
  if (id === "star") {
    return (
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <path d="M40 12 48 32h22L54 46l6 22-20-12-20 12 6-22L10 32h22Z" fill="#f2c14e" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <path d="M40 68c-16-10-24-20-24-32a12 12 0 0 1 24-4 12 12 0 0 1 24 4c0 12-8 22-24 32Z" fill="#e07a8a" />
    </svg>
  );
}

const board: { id: MathStep; label: string; name: string }[] = [
  { id: "count", label: "Count", name: "Count objects" },
  { id: "know", label: "Numbers", name: "Hear a number" },
  { id: "trace", label: "Trace", name: "Trace a number" },
  { id: "shape", label: "Shapes", name: "Match a shape" },
  { id: "more", label: "More", name: "Which has more" },
  { id: "add", label: "Add", name: "Add the groups" },
];

export function MathBoard({
  lesson,
  done,
  locked,
  onOpen,
}: {
  lesson: MathLesson;
  done: Record<string, boolean>;
  /** Tiles that open with the full app. */
  locked?: (id: string) => boolean;
  onOpen: (step: MathStep) => void;
}) {
  return (
    <div className="math-board" data-stage={lesson.stageId} data-week={lesson.weekIndex}>
      {board.map((stop) => (
        <button
          key={stop.id}
          type="button"
          className={`math-activity${done[stop.id] ? " is-done" : ""}${locked?.(stop.id) ? " is-locked" : ""}`}
          data-activity={stop.id}
          data-locked={locked?.(stop.id) ? "true" : undefined}
          aria-label={stop.name}
          onClick={() => onOpen(stop.id)}
        >
          {locked?.(stop.id) ? <LockBadge /> : null}
          <span className="math-activity-art" aria-hidden="true">
            {stop.id === "count" || stop.id === "more" || stop.id === "add" ? <Apple /> : null}
            {stop.id === "know" || stop.id === "trace" ? <span className="math-numeral">{stop.id === "trace" ? lesson.digit : lesson.hear}</span> : null}
            {stop.id === "shape" ? <ShapeGlyph id={lesson.shape} /> : null}
          </span>
          <span>{stop.label}</span>
        </button>
      ))}
    </div>
  );
}

export function CountActivity({
  lesson,
  settingsRef,
  onDone,
  theme,
}: {
  lesson: MathLesson;
  settingsRef: { current: Settings };
  onDone: (label: string) => void;
  theme?: ThemeId;
}) {
  const speak = useSpeaker(settingsRef);
  const { name: objectName, Art: CountArt } = countObject(theme);
  const seen = useRef(new Set<number>());
  const [counted, setCounted] = useState<number[]>([]);
  const finished = useRef(false);

  const countOne = (index: number) => {
    if (finished.current || seen.current.has(index)) return;
    seen.current.add(index);
    const next = seen.current.size;
    setCounted([...seen.current]);
    speak.number(next);
    if (next >= lesson.count) {
      finished.current = true;
      onDone(String(lesson.count));
    }
  };

  return (
    <div className="math-play" data-screen="count" data-target={lesson.count} data-counted={counted.length} data-theme={theme ?? ""}>
      <h1>Count</h1>
      <p className="math-prompt">Tap each {objectName}, or drag it.</p>
      <div className="math-objects" role="group" aria-label={`${titleCase(objectName)}s to count`}>
        {Array.from({ length: lesson.count }, (_, index) => {
          const on = counted.includes(index);
          return (
            <button
              key={index}
              type="button"
              className={`math-object${on ? " is-counted" : ""}`}
              data-object={index}
              data-counted={on ? "true" : "false"}
              aria-label={on ? `${titleCase(objectName)} ${index + 1}, counted` : `${titleCase(objectName)} ${index + 1}`}
              onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
              onPointerUp={() => countOne(index)}
              onClick={() => countOne(index)}
            >
              <CountArt />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function KnowActivity({
  lesson,
  settingsRef,
  onDone,
}: {
  lesson: MathLesson;
  settingsRef: { current: Settings };
  onDone: (label: string) => void;
}) {
  const speak = useSpeaker(settingsRef);
  const [tries, setTries] = useState(0);
  const finished = useRef(false);

  const choose = (value: number) => {
    if (finished.current) return;
    speak.number(value);
    if (value !== lesson.hear) {
      setTries((count) => count + 1);
      return;
    }
    finished.current = true;
    onDone(String(value));
  };

  return (
    <div className="math-play" data-screen="know" data-hear={lesson.hear} data-tries={tries}>
      <h1>Numbers</h1>
      <button type="button" className="math-hear" onClick={() => speak.number(lesson.hear)}>
        Hear it
      </button>
      <div className="math-choices" role="group" aria-label="Numbers">
        {lesson.hearChoices.map((value) => (
          <button key={value} type="button" data-number={value} onClick={() => choose(value)}>
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TraceActivity({
  lesson,
  settingsRef,
  onDone,
}: {
  lesson: MathLesson;
  settingsRef: { current: Settings };
  onDone: (label: string) => void;
}) {
  const speak = useSpeaker(settingsRef);
  const points = tracePoints[lesson.digit] ?? tracePoints[0];
  const [cursor, setCursor] = useState(0);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const finished = useRef(false);
  const cursorRef = useRef(0);

  const advance = () => {
    if (finished.current) return;
    const next = cursorRef.current + 1;
    cursorRef.current = next;
    setCursor(next);
    if (next >= points.length) {
      finished.current = true;
      speak.number(lesson.digit);
      onDone(String(lesson.digit));
    }
  };

  const hit = (index: number) => {
    if (index === cursorRef.current) advance();
  };

  const follow = (event: PointerEvent<HTMLDivElement>) => {
    if (finished.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const boardBox = boardRef.current?.getBoundingClientRect();
    const point = points[cursorRef.current];
    if (!boardBox || !point) return;
    const x = ((event.clientX - boardBox.left) / boardBox.width) * 100;
    const y = ((event.clientY - boardBox.top) / boardBox.height) * 100;
    const dx = point.x - x;
    const dy = point.y - y;
    if (dx * dx + dy * dy <= 16 * 16) advance();
  };

  return (
    <div className="math-play" data-screen="trace" data-digit={lesson.digit}>
      <h1>Trace {lesson.digit}</h1>
      <p className="math-prompt">Follow the dots.</p>
      <div
        className="trace-board"
        ref={boardRef}
        data-digit={lesson.digit}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          follow(event);
        }}
        onPointerMove={follow}
      >
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <text x="50" y="78" textAnchor="middle" className="trace-ghost">
            {lesson.digit}
          </text>
        </svg>
        {points.map((point, index) => (
          <button
            key={`${lesson.digit}-${index}`}
            type="button"
            className={`trace-dot${index < cursor ? " is-done" : ""}`}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            data-trace-dot={index}
            data-next={index === cursor ? "true" : "false"}
            aria-label={`Dot ${index + 1}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => hit(index)}
          />
        ))}
      </div>
    </div>
  );
}

export function ShapeActivity({
  lesson,
  settingsRef,
  writing,
  onAttempt,
  onDone,
}: {
  lesson: MathLesson;
  settingsRef: { current: Settings };
  writing?: WritingMap;
  onAttempt?: (id: string, success: boolean) => WritingOutcome;
  onDone: (label: string) => void;
}) {
  const speak = useSpeaker(settingsRef);
  const [tries, setTries] = useState(0);
  const [tracing, setTracing] = useState(false);
  const finished = useRef(false);

  const choose = (id: ShapeId) => {
    if (finished.current) return;
    speak.prompt(id);
    if (id !== lesson.shape) {
      setTries((count) => count + 1);
      return;
    }
    finished.current = true;
    setTracing(true);
  };

  if (tracing) {
    const id = shapeItemId(lesson.shape);
    return (
      <PathTrace
        screen="shape"
        title={shapeTitles[lesson.shape]}
        glyphs={[{ label: shapeTitles[lesson.shape], strokes: shapeStrokes(lesson.shape) }]}
        settingsRef={settingsRef}
        ruled={false}
        marker={{ prompt: lesson.shape, tries: String(tries) }}
        level={writingLevel(writing, id)}
        writing={writing}
        itemId={id}
        memoryLine={memoryPrompt("shape", shapeTitles[lesson.shape])}
        onAttempt={onAttempt ? (success) => onAttempt(id, success) : undefined}
        onSpeak={() => speak.prompt(lesson.shape)}
        onDone={() => onDone(lesson.shape)}
      />
    );
  }

  return (
    <div className="math-play" data-screen="shape" data-phase="match" data-prompt={lesson.shape} data-tries={tries}>
      <h1>Shapes</h1>
      <button type="button" className="math-hear" onClick={() => speak.prompt(lesson.shape)}>
        <ShapeGlyph id={lesson.shape} />
        <span>{shapeTitles[lesson.shape]}</span>
      </button>
      <div className="math-choices" role="group" aria-label="Shapes">
        {lesson.shapeChoices.map((id) => (
          <button key={id} type="button" data-shape={id} aria-label={shapeTitles[id]} onClick={() => choose(id)}>
            <ShapeGlyph id={id} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function MoreActivity({
  lesson,
  settingsRef,
  onDone,
}: {
  lesson: MathLesson;
  settingsRef: { current: Settings };
  onDone: (label: string) => void;
}) {
  const speak = useSpeaker(settingsRef);
  const [tries, setTries] = useState(0);
  const finished = useRef(false);
  const answer = lesson.moreLeft > lesson.moreRight ? "left" : "right";
  const answerCount = Math.max(lesson.moreLeft, lesson.moreRight);

  const choose = (side: "left" | "right", count: number) => {
    if (finished.current) return;
    speak.number(count);
    if (side !== answer) {
      setTries((countTries) => countTries + 1);
      return;
    }
    finished.current = true;
    onDone(String(answerCount));
  };

  return (
    <div className="math-play" data-screen="more" data-answer={answer} data-tries={tries}>
      <h1>Which has more?</h1>
      <div className="math-sides">
        {(["left", "right"] as const).map((side) => {
          const count = side === "left" ? lesson.moreLeft : lesson.moreRight;
          return (
            <button
              key={side}
              type="button"
              data-side={side}
              data-count={count}
              aria-label={`${side} group of ${numberWord(count)}`}
              onClick={() => choose(side, count)}
            >
              <span className="math-cluster">
                {Array.from({ length: count }, (_, index) => (
                  <Apple key={index} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AddActivity({
  lesson,
  settingsRef,
  onDone,
}: {
  lesson: MathLesson;
  settingsRef: { current: Settings };
  onDone: (label: string) => void;
}) {
  const speak = useSpeaker(settingsRef);
  const [tries, setTries] = useState(0);
  const finished = useRef(false);
  const sum = lesson.addLeft + lesson.addRight;

  const choose = (value: number) => {
    if (finished.current) return;
    speak.number(value);
    if (value !== sum) {
      setTries((count) => count + 1);
      return;
    }
    finished.current = true;
    onDone(String(sum));
  };

  return (
    <div className="math-play" data-screen="add" data-left={lesson.addLeft} data-right={lesson.addRight} data-answer={sum} data-tries={tries}>
      <h1>Add</h1>
      <div className="math-sum" aria-hidden="true">
        <span className="math-cluster">
          {Array.from({ length: lesson.addLeft }, (_, index) => (
            <Apple key={`l-${index}`} />
          ))}
        </span>
        <span className="math-plus">+</span>
        <span className="math-cluster">
          {Array.from({ length: lesson.addRight }, (_, index) => (
            <Apple key={`r-${index}`} />
          ))}
        </span>
      </div>
      <div className="math-choices" role="group" aria-label="How many altogether">
        {lesson.addChoices.map((value) => (
          <button key={value} type="button" data-sum={value} onClick={() => choose(value)}>
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}
