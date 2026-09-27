import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { playEffect } from "../audio/manager";
import { playPrompt } from "../audio/player";
import { letterForm, type LetterCase, type TracePoint } from "../data/handwriting";
import { pairLine, pairPromptId } from "../data/letterPairs";
import {
  fadeOpacity,
  guideFor,
  letterItemId,
  memoryPrompt,
  recordWritingAttempt,
  writingLevel,
  writingState,
  type ScaffoldLevel,
  type WritingMap,
  type WritingOutcome,
} from "../data/scaffold";
import {
  followStroke,
  traceTolerance,
  matchDistractor,
  reversalPartner,
  stationsAttribute,
  strokeComplete,
} from "../data/trace";
import type { Settings } from "../settings";
import { StrokeFigure } from "./StrokeFigure";
import { WritingBox } from "./WritingBox";

type Phase = "demo" | "trace" | "write" | "cheer" | "match" | "reversal";

function openingPhase(level: ScaffoldLevel): Phase {
  if (level >= 4) return "write";
  if (level === 3) return "trace";
  return "demo";
}

function lessonLetters(letters: string[]): string[] {
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const letter of letters) {
    const lower = letter.toLowerCase();
    if (!/^[a-z]$/.test(lower) || seen.has(lower)) continue;
    seen.add(lower);
    cleaned.push(lower);
  }
  return cleaned.length > 0 ? cleaned : ["a"];
}

function shuffled(letters: string[], salt: number): string[] {
  const copy = [...letters];
  let seed = salt + 3;
  for (let index = copy.length - 1; index > 0; index -= 1) {
    seed = (seed * 17 + 11) % 97;
    const swap = seed % (index + 1);
    const next = copy[swap];
    const current = copy[index];
    if (next === undefined || current === undefined) continue;
    copy[index] = next;
    copy[swap] = current;
  }
  return copy;
}

export function LetterTrace({
  letters,
  settingsRef,
  writing,
  onAttempt = (id, success) => recordWritingAttempt(writing, id, success),
  onDone,
}: {
  letters: string[];
  settingsRef: { current: Settings };
  writing?: WritingMap;
  onAttempt?: (id: string, success: boolean) => WritingOutcome;
  onDone: () => void;
}) {
  const plan = lessonLetters(letters);
  const [index, setIndex] = useState(0);
  const [casing, setCasing] = useState<LetterCase>("upper");
  const [phase, setPhase] = useState<Phase>(() => openingPhase(writingLevel(writing, letterItemId(plan[0] ?? "a", "upper"))));
  const [hint, setHint] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [strokeIndex, setStrokeIndex] = useState(0);
  const [covered, setCovered] = useState(0);
  const [paired, setPaired] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ letter: string; x: number; y: number } | null>(null);
  const [misses, setMisses] = useState(0);
  const coveredRef = useRef(0);
  const tracing = useRef(false);
  const moved = useRef(false);
  const dragOrigin = useRef({ x: 0, y: 0 });
  const advanceTimer = useRef<number | null>(null);
  const finished = useRef(false);
  const letter = plan[index] ?? "a";
  const form = letterForm(letter, casing);
  const stroke = form.strokes[strokeIndex] ?? form.strokes[0];
  const partner = reversalPartner(letter);
  const cards = shuffled([letter, matchDistractor(letter, plan)], letter.charCodeAt(0));
  const uppers = shuffled(cards.map((item) => item.toUpperCase()), letter.charCodeAt(0) + 1);
  const lowers = shuffled(cards, letter.charCodeAt(0) + 2);
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
    const controller = new AbortController();
    void playPrompt(pairPromptId(letter), settingsRef.current, controller.signal, pairLine(letter)).catch(() => undefined);
    return () => controller.abort();
  }, [letter, settingsRef]);

  useEffect(() => {
    if (phase !== "demo") return undefined;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      if (strokeIndex + 1 < form.strokes.length) setStrokeIndex((current) => current + 1);
      else {
        setPhase("trace");
        setStrokeIndex(0);
        resetCovered();
      }
    }, reduce ? 240 : 900);
    return () => window.clearTimeout(timer);
  }, [phase, strokeIndex, form.strokes.length]);

  const beginTrace = () => {
    clearTimer();
    setPhase("trace");
    setStrokeIndex(0);
    resetCovered();
  };

  const finishCasing = (success: boolean) => {
    const id = letterItemId(letter, casing);
    const outcome = onAttempt(id, success);
    if (!success && !outcome.steppedBack) {
      setHint("Almost. Try again.");
      setAttempt((current) => current + 1);
      return;
    }
    setHint("");
    if (casing === "upper") {
      const nextLevel = writingLevel(writing, letterItemId(letter, "lower"));
      setCasing("lower");
      setPhase(openingPhase(nextLevel));
      setStrokeIndex(0);
      resetCovered();
      return;
    }
    setPhase("cheer");
    playEffect("cheer", settingsRef.current);
  };

  const advanceStroke = () => {
    const strokes = letterForm(letter, casing).strokes;
    if (strokeIndex + 1 < strokes.length) {
      setStrokeIndex((current) => current + 1);
      resetCovered();
      return;
    }
    finishCasing(true);
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

  const hear = () => {
    const controller = new AbortController();
    void playPrompt(pairPromptId(letter), settingsRef.current, controller.signal, pairLine(letter)).catch(() => undefined);
  };

  const goNext = () => {
    if (finished.current) return;
    if (index + 1 < plan.length) {
      const next = plan[index + 1] ?? letter;
      setIndex((current) => current + 1);
      setCasing("upper");
      setPhase(openingPhase(writingLevel(writing, letterItemId(next, "upper"))));
      setStrokeIndex(0);
      setPaired([]);
      setSelected(null);
      setMisses(0);
      setHint("");
      resetCovered();
      return;
    }
    finished.current = true;
    onDone();
  };

  const markPair = (upper: string) => {
    if (paired.includes(upper)) return;
    const next = [...paired, upper];
    setPaired(next);
    setSelected(null);
    setDrag(null);
    if (next.length >= cards.length) {
      window.setTimeout(() => {
        if (reversalPartner(letter)) setPhase("reversal");
        else goNext();
      }, 240);
    }
  };

  const chooseLower = (lower: string) => {
    if (!selected) return;
    if (selected.toLowerCase() !== lower) {
      setMisses((count) => count + 1);
      return;
    }
    markPair(selected);
  };

  const onDragStart = (upper: string, event: ReactPointerEvent<HTMLButtonElement>) => {
    moved.current = false;
    dragOrigin.current = { x: event.clientX, y: event.clientY };
    setSelected(upper);
    setDrag({ letter: upper, x: event.clientX, y: event.clientY });
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Tap still selects the card when capture is unavailable.
    }
  };

  const onDragMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    if (Math.hypot(event.clientX - dragOrigin.current.x, event.clientY - dragOrigin.current.y) > 10) moved.current = true;
    setDrag({ letter: drag.letter, x: event.clientX, y: event.clientY });
  };

  const onDragEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const dragging = drag;
    setDrag(null);
    if (!dragging || !moved.current) return;
    const target = document.elementsFromPoint(event.clientX, event.clientY).find((node) => {
      return node instanceof HTMLElement && Boolean(node.dataset.matchLower);
    });
    const lower = target instanceof HTMLElement ? target.dataset.matchLower : undefined;
    if (!lower) return;
    if (dragging.letter.toLowerCase() !== lower) {
      setMisses((count) => count + 1);
      setSelected(null);
      return;
    }
    markPair(dragging.letter);
  };

  const progress = form.strokes.map((_, strokeNumber) => {
    if (phase === "demo") return strokeNumber < strokeIndex ? 999 : 0;
    if (strokeNumber < strokeIndex) return 999;
    if (strokeNumber === strokeIndex) return covered;
    return 0;
  });

  const caseLabel = casing === "upper" ? `Big ${letter.toUpperCase()}` : `Little ${letter}`;
  const itemId = letterItemId(letter, casing);
  const level = writingLevel(writing, itemId);
  const guide = guideFor(level);
  const opacity = level === 2 ? fadeOpacity(writingState(writing, itemId).successes) : 1;
  const partnerStrokes = partner ? letterForm(partner, casing).strokes : undefined;

  return (
    <div
      className="letter-trace"
      data-screen="draw"
      data-phase={phase}
      data-letter={letter}
      data-letters={plan.join("")}
      data-casing={casing}
      data-stroke={strokeIndex}
      data-covered={covered}
      data-stroke-done={doneStroke ? "true" : "false"}
      data-level={level}
      data-guide={guide}
      data-item={itemId}
      data-hint={hint || undefined}
      data-fade={level === 2 ? String(opacity) : undefined}
      data-reversal={phase === "reversal" ? letter : undefined}
      data-reversal-misses={misses}
    >
      <h1>Big {letter.toUpperCase()}, little {letter}</h1>
      {phase === "demo" || phase === "trace" ? (
        <p className="letter-prompt">{phase === "demo" ? `Watch ${caseLabel}.` : `Trace ${caseLabel}.`}</p>
      ) : null}
      {phase === "cheer" ? <p className="letter-prompt">You traced both letters.</p> : null}
      {phase === "match" ? <p className="letter-prompt">Match the big letter to the little letter.</p> : null}
      {phase === "reversal" ? <p className="letter-prompt">Tap little {letter}.</p> : null}
      <button type="button" className="letter-hear" onClick={hear}>
        Hear it
      </button>
      {phase === "demo" ? (
        <button type="button" className="letter-next" onClick={beginTrace}>
          Your turn
        </button>
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
          <StrokeFigure
            letter={letter}
            casing={casing}
            progress={progress}
            activeIndex={phase === "trace" ? strokeIndex : -1}
            demoIndex={phase === "demo" && level < 3 ? strokeIndex : -1}
            guide={level <= 2 ? (level === 2 ? "fade" : "full") : "start"}
            guideOpacity={opacity}
          />
        </div>
      ) : null}
      {phase === "write" ? (
        <WritingBox
          key={`${itemId}-${attempt}`}
          template={form.strokes}
          partner={partnerStrokes}
          prompt={level === 5 ? memoryPrompt("letter", letter, casing) : `Copy ${caseLabel}.`}
          speak={level === 5}
          showModel={level === 4}
          hint={hint}
          settingsRef={settingsRef}
          model={<StrokeFigure letter={letter} casing={casing} guide="model" />}
          onJudge={finishCasing}
        />
      ) : null}
      {phase === "cheer" ? (
        <div className="letter-cheer" data-traced={letter}>
          <p className="letter-star" aria-hidden="true">
            ★
          </p>
          <button type="button" className="letter-next" onClick={() => setPhase("match")}>
            Match
          </button>
        </div>
      ) : null}
      {phase === "match" ? (
        <div className="letter-match" data-misses={misses}>
          <div className="match-row" role="group" aria-label="Big letters">
            {uppers.map((upper) => (
              <button
                key={upper}
                type="button"
                className="match-card"
                data-match-upper={upper}
                data-paired={paired.includes(upper) ? "true" : "false"}
                aria-pressed={selected === upper}
                onPointerDown={(event) => onDragStart(upper, event)}
                onPointerMove={onDragMove}
                onPointerUp={onDragEnd}
                onClick={() => {
                  if (moved.current || paired.includes(upper)) return;
                  setSelected(upper);
                }}
              >
                {upper}
              </button>
            ))}
          </div>
          <div className="match-row" role="group" aria-label="Little letters">
            {lowers.map((lower) => (
              <button
                key={lower}
                type="button"
                className="match-card"
                data-match-lower={lower}
                data-paired={paired.includes(lower.toUpperCase()) ? "true" : "false"}
                onClick={() => chooseLower(lower)}
              >
                {lower}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {phase === "reversal" && partner ? (
        <div className="match-row" role="group" aria-label={`Little ${letter} or little ${partner}`}>
          {shuffled([letter, partner], misses + 5).map((choice) => (
            <button
              key={choice}
              type="button"
              className="match-card"
              data-reversal-choice={choice}
              onClick={() => {
                if (choice === letter) goNext();
                else setMisses((count) => count + 1);
              }}
            >
              {choice}
            </button>
          ))}
        </div>
      ) : null}
      {drag ? (
        <span className="match-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">
          {drag.letter}
        </span>
      ) : null}
    </div>
  );
}
