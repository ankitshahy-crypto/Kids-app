import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { playEffect } from "../audio/manager";
import { playOnDevice, playWord } from "../audio/player";
import type { DeckWord } from "../data/deck";
import type { TracePoint } from "../data/handwriting";
import { nameGlyphs, nameToTrace, wordGlyphs, type TraceGlyph } from "../data/tracePractice";
import { followStroke, stationsAttribute, strokeComplete } from "../data/trace";
import type { Settings } from "../settings";
import { StrokeFigure } from "./StrokeFigure";

type Phase = "demo" | "trace" | "cheer";

/**
 * Demo, then finger tracing, for any list of glyphs that share the letter stroke engine.
 * A glyph is one shape or one letter of a word.
 */
export function PathTrace({
  screen,
  title,
  glyphs,
  settingsRef,
  ruled = true,
  marker,
  onSpeak,
  onDone,
}: {
  screen: string;
  title: string;
  glyphs: TraceGlyph[];
  settingsRef: { current: Settings };
  ruled?: boolean;
  marker?: Record<string, string>;
  onSpeak?: () => void;
  onDone: () => void;
}) {
  const [glyphIndex, setGlyphIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("demo");
  const [strokeIndex, setStrokeIndex] = useState(0);
  const [covered, setCovered] = useState(0);
  const [spoken, setSpoken] = useState("");
  const coveredRef = useRef(0);
  const tracing = useRef(false);
  const advanceTimer = useRef<number | null>(null);
  const finished = useRef(false);
  const left = useRef(false);
  const glyph = glyphs[glyphIndex] ?? glyphs[0];
  const strokes = glyph?.strokes ?? [];
  const stroke = strokes[strokeIndex] ?? strokes[0];
  const doneStroke = stroke ? strokeComplete(stroke, covered) : false;

  const resetCovered = () => {
    coveredRef.current = 0;
    setCovered(0);
  };

  const clearTimer = () => {
    if (advanceTimer.current !== null) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  };

  useEffect(() => () => clearTimer(), []);

  useEffect(() => {
    if (phase !== "demo") return undefined;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      if (strokeIndex + 1 < strokes.length) setStrokeIndex((current) => current + 1);
      else {
        setPhase("trace");
        setStrokeIndex(0);
        resetCovered();
      }
    }, reduce ? 240 : 900);
    return () => window.clearTimeout(timer);
  }, [phase, strokeIndex, strokes.length]);

  const beginTrace = () => {
    clearTimer();
    setPhase("trace");
    setStrokeIndex(0);
    resetCovered();
  };

  const leave = () => {
    if (left.current) return;
    left.current = true;
    clearTimer();
    onDone();
  };

  const finishAll = () => {
    if (finished.current) return;
    finished.current = true;
    setPhase("cheer");
    setSpoken(title);
    playEffect("cheer", settingsRef.current);
    onSpeak?.();
    advanceTimer.current = window.setTimeout(leave, 700);
  };

  const advanceStroke = () => {
    if (strokeIndex + 1 < strokes.length) {
      setStrokeIndex((current) => current + 1);
      resetCovered();
      return;
    }
    if (glyphIndex + 1 < glyphs.length) {
      setGlyphIndex((current) => current + 1);
      setPhase("demo");
      setStrokeIndex(0);
      resetCovered();
      return;
    }
    finishAll();
  };

  const completeStroke = () => {
    if (advanceTimer.current !== null) return;
    tracing.current = false;
    playEffect("chime", settingsRef.current);
    advanceTimer.current = window.setTimeout(() => {
      advanceTimer.current = null;
      advanceStroke();
    }, 220);
  };

  const pointFrom = (event: ReactPointerEvent<HTMLDivElement>): TracePoint | null => {
    const svg = event.currentTarget.querySelector("svg");
    const rect = svg?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    };
  };

  const follow = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (phase !== "trace" || !tracing.current || !stroke || doneStroke) return;
    const point = pointFrom(event);
    if (!point) return;
    const next = followStroke(stroke, coveredRef.current, point);
    if (next === coveredRef.current) return;
    coveredRef.current = next;
    setCovered(next);
    if (strokeComplete(stroke, next)) completeStroke();
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (phase !== "trace") return;
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // A pencil or a replayed event can still draw without capture.
    }
    tracing.current = true;
    follow(event);
  };

  const progress = strokes.map((_, index) => {
    if (phase === "demo") return index < strokeIndex ? 999 : 0;
    if (index < strokeIndex) return 999;
    if (index === strokeIndex) return covered;
    return 0;
  });

  const markerProps = Object.fromEntries(Object.entries(marker ?? {}).map(([key, value]) => [`data-${key}`, value]));

  return (
    <div
      className="letter-trace"
      data-screen={screen}
      data-phase={phase}
      data-title={title}
      data-glyph={glyphIndex}
      data-stroke={strokeIndex}
      data-covered={covered}
      data-stroke-done={doneStroke ? "true" : "false"}
      data-spoken={spoken || undefined}
      {...markerProps}
    >
      <h1>{title}</h1>
      {glyphs.length > 1 ? (
        <p className="glyph-row" aria-label={title}>
          {glyphs.map((item, index) => (
            <span key={`${item.label}-${index}`} data-glyph-label={item.label} data-current={index === glyphIndex ? "true" : "false"}>
              {item.label}
            </span>
          ))}
        </p>
      ) : null}
      {phase === "demo" || phase === "trace" ? (
        <p className="letter-prompt">{phase === "demo" ? `Watch ${glyph?.label ?? title}.` : `Trace ${glyph?.label ?? title}.`}</p>
      ) : null}
      {phase === "cheer" ? <p className="letter-prompt">You traced {title}.</p> : null}
      {phase === "demo" ? (
        <button type="button" className="letter-next" onClick={beginTrace}>
          Your turn
        </button>
      ) : null}
      {phase === "cheer" ? (
        <div className="letter-cheer">
          <p className="letter-star" aria-hidden="true">
            ★
          </p>
          <button type="button" className="letter-next" onClick={leave}>
            Done
          </button>
        </div>
      ) : null}
      {phase === "demo" || phase === "trace" ? (
        <div
          className="letter-board"
          data-stations={stroke ? stationsAttribute(stroke) : ""}
          onPointerDown={onPointerDown}
          onPointerMove={follow}
          onPointerUp={() => {
            tracing.current = false;
          }}
          onPointerCancel={() => {
            tracing.current = false;
          }}
        >
          {glyph ? (
            <StrokeFigure
              strokes={strokes}
              label={glyph.label}
              ruled={ruled}
              progress={progress}
              activeIndex={phase === "trace" ? strokeIndex : -1}
              demoIndex={phase === "demo" ? strokeIndex : -1}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function WordTrace({
  words,
  settingsRef,
  onDone,
}: {
  words: DeckWord[];
  settingsRef: { current: Settings };
  onDone: (word: string) => void;
}) {
  const [picked, setPicked] = useState<DeckWord | null>(words.length === 1 ? (words[0] ?? null) : null);
  if (!picked) {
    return (
      <div className="letter-trace" data-screen="word" data-phase="pick">
        <h1>Trace a word</h1>
        <p className="letter-prompt">Pick a word you have blended.</p>
        <div className="match-row">
          {words.map((word) => (
            <button key={word.id} type="button" className="match-card" data-word={word.word} onClick={() => setPicked(word)}>
              {word.word}
            </button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <PathTrace
      screen="word"
      title={picked.word}
      glyphs={wordGlyphs(picked.word)}
      settingsRef={settingsRef}
      marker={{ word: picked.word }}
      onSpeak={() => {
        const controller = new AbortController();
        void playWord(picked, settingsRef.current, controller.signal).catch(() => undefined);
      }}
      onDone={() => onDone(picked.word)}
    />
  );
}

export function NameTrace({
  name,
  settingsRef,
  onDone,
}: {
  name: string;
  settingsRef: { current: Settings };
  onDone: () => void;
}) {
  const title = nameToTrace(name) ?? name;
  return (
    <PathTrace
      screen="name"
      title={title}
      glyphs={nameGlyphs(name)}
      settingsRef={settingsRef}
      marker={{ name: title }}
      onSpeak={() => {
        const controller = new AbortController();
        void playOnDevice(title, settingsRef.current, controller.signal).catch(() => undefined);
      }}
      onDone={onDone}
    />
  );
}
