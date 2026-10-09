import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { playEffect } from "../audio/manager";
import { playLine, playWord, promptCue, spellCue, wordCue, type Cue } from "../audio/player";
import { useOpeningLine, useSpeaker } from "../hooks/useSpeaker";
import type { DeckWord } from "../data/deck";
import type { TracePoint } from "../data/handwriting";
import {
  fadeOpacity,
  guideFor,
  memoryPrompt,
  nameItemId,
  recordWritingAttempt,
  wordItemId,
  writingLevel,
  writingState,
  type ScaffoldLevel,
  type WritingMap,
  type WritingOutcome,
} from "../data/scaffold";
import { nameLetters } from "../data/letterNames";
import { nameGlyphs, nameToTrace, wordGlyphs, type TraceGlyph } from "../data/tracePractice";
import { followStroke, stationsAttribute, strokeComplete, traceTolerance } from "../data/trace";
import type { Settings } from "../settings";
import { StrokeFigure } from "./StrokeFigure";
import { WritingBox } from "./WritingBox";

type Phase = "demo" | "trace" | "write" | "cheer";

function openingPhase(level: ScaffoldLevel): Phase {
  if (level >= 4) return "write";
  if (level === 3) return "trace";
  return "demo";
}

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
  level = 1,
  writing,
  itemId,
  memoryLine,
  memoryCues,
  onSpeak,
  onAttempt,
  onDone,
}: {
  screen: string;
  title: string;
  glyphs: TraceGlyph[];
  settingsRef: { current: Settings };
  ruled?: boolean;
  marker?: Record<string, string>;
  level?: ScaffoldLevel;
  writing?: WritingMap;
  itemId?: string;
  memoryLine?: string;
  /** Recorded clips that say the memory prompt, for a screen that must not use the device voice (a name). */
  memoryCues?: Cue[];
  onSpeak?: () => void;
  onAttempt?: (success: boolean) => WritingOutcome;
  onDone: () => void;
}) {
  const [glyphIndex, setGlyphIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(() => openingPhase(level));
  const [hint, setHint] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [strokeIndex, setStrokeIndex] = useState(0);
  const [covered, setCovered] = useState(0);
  const [spoken, setSpoken] = useState("");
  const coveredRef = useRef(0);
  const tracing = useRef(false);
  const advanceTimer = useRef<number | null>(null);
  const finished = useRef(false);
  const reported = useRef(false);
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

  // The memory prompt from recorded clips, where there are some: the copy box then says nothing itself.
  const memoryKey = memoryCues?.map((cue) => cue.text).join("|");
  useEffect(() => {
    if (phase !== "write" || level !== 5 || !memoryCues || memoryCues.length === 0) return undefined;
    const controller = new AbortController();
    void playLine(memoryCues, settingsRef.current, controller.signal).catch(() => undefined);
    return () => controller.abort();
    // The cues are rebuilt each render; their words decide when to say them again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, level, memoryKey, attempt, settingsRef]);

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

  const celebrate = () => {
    if (finished.current) return;
    finished.current = true;
    setHint("");
    setPhase("cheer");
    setSpoken(title);
    playEffect("cheer", settingsRef.current);
    onSpeak?.();
    advanceTimer.current = window.setTimeout(leave, 700);
  };

  const judge = (success: boolean) => {
    const outcome = onAttempt?.(success) ?? recordWritingAttempt(writing, itemId ?? title, success);
    if (!success && !outcome.steppedBack) {
      setHint("Almost. Try again.");
      setAttempt((current) => current + 1);
      return;
    }
    reported.current = true;
    celebrate();
  };

  const advanceStroke = () => {
    if (strokeIndex + 1 < strokes.length) {
      setStrokeIndex((current) => current + 1);
      resetCovered();
      return;
    }
    if (glyphIndex + 1 < glyphs.length) {
      setGlyphIndex((current) => current + 1);
      setPhase(level >= 3 ? "trace" : "demo");
      setStrokeIndex(0);
      resetCovered();
      return;
    }
    if (!reported.current) {
      reported.current = true;
      onAttempt?.(true);
    }
    celebrate();
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
    const next = followStroke(stroke, coveredRef.current, point, traceTolerance(settingsRef.current));
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
      data-level={level}
      data-guide={guideFor(level)}
      data-item={itemId}
      data-hint={hint || undefined}
      data-fade={level === 2 ? String(fadeOpacity(writingState(writing, itemId ?? "").successes)) : undefined}
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
      {phase === "write" ? (
        <WritingBox
          key={`${itemId ?? title}-${attempt}`}
          template={glyphs.flatMap((item) => item.strokes)}
          prompt={level === 5 ? (memoryLine ?? memoryPrompt("word", title)) : `Copy ${title}.`}
          speak={level === 5 && !memoryCues}
          showModel={level === 4}
          ruled={ruled}
          hint={hint}
          settingsRef={settingsRef}
          model={
            <div className="copy-model-row">
              {glyphs.map((item, index) => (
                <StrokeFigure key={`${item.label}-${index}`} strokes={item.strokes} label={item.label} ruled={ruled} guide="model" />
              ))}
            </div>
          }
          onJudge={judge}
        />
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
              demoIndex={phase === "demo" && level < 3 ? strokeIndex : -1}
              guide={level <= 2 ? (level === 2 ? "fade" : "full") : "start"}
              guideOpacity={level === 2 ? fadeOpacity(writingState(writing, itemId ?? "").successes) : 1}
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
  writing,
  onAttempt,
  onDone,
}: {
  words: DeckWord[];
  settingsRef: { current: Settings };
  writing?: WritingMap;
  onAttempt?: (id: string, success: boolean) => WritingOutcome;
  onDone: (word: string) => void;
}) {
  const [picked, setPicked] = useState<DeckWord | null>(words.length === 1 ? (words[0] ?? null) : null);
  const speak = useSpeaker(settingsRef);
  useOpeningLine(speak, picked ? [promptCue("trace-word", "Trace the word."), wordCue(picked.id, picked.word)] : []);
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
  const id = wordItemId(picked.word);
  return (
    <PathTrace
      screen="word"
      title={picked.word}
      glyphs={wordGlyphs(picked.word)}
      settingsRef={settingsRef}
      marker={{ word: picked.word }}
      level={writingLevel(writing, id)}
      writing={writing}
      itemId={id}
      memoryLine={memoryPrompt("word", picked.word)}
      onAttempt={onAttempt ? (success) => onAttempt(id, success) : undefined}
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
  writing,
  onAttempt,
  onDone,
}: {
  name: string;
  settingsRef: { current: Settings };
  writing?: WritingMap;
  onAttempt?: (id: string, success: boolean) => WritingOutcome;
  onDone: () => void;
}) {
  const title = nameToTrace(name) ?? name;
  const id = nameItemId(title);
  const speak = useSpeaker(settingsRef);
  // The name is spelled out, a recorded clip a letter ("em", "eye", "ay"), in the same voice as the
  // rest of the app. A name has no clip of its own and is never sent anywhere, and the device voice
  // is not used for it: on the phone it was a different voice from the lesson's, and a robotic one.
  const letters = nameLetters(title).map(spellCue);
  useOpeningLine(speak, [promptCue("trace-name", "Trace your name."), ...letters]);
  return (
    <PathTrace
      screen="my-name"
      title={title}
      glyphs={nameGlyphs(name)}
      settingsRef={settingsRef}
      marker={{ name: title }}
      level={writingLevel(writing, id)}
      writing={writing}
      itemId={id}
      memoryLine={memoryPrompt("name", title)}
      memoryCues={[promptCue("trace-name", "Trace your name."), ...letters]}
      onAttempt={onAttempt ? (success) => onAttempt(id, success) : undefined}
      onSpeak={() => {
        // Traced: the name spelled out once more, in the recorded voice.
        const controller = new AbortController();
        void playLine(letters, settingsRef.current, controller.signal).catch(() => undefined);
      }}
      onDone={onDone}
    />
  );
}
