import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { playEffect } from "../audio/manager";
import { playColor, playLetter, playNumber, playOnDevice, playWord } from "../audio/player";
import { Illustration } from "../illustrations";
import { colorFill } from "../data/colors";
import {
  bonusPrize,
  colorChoices,
  countChoices,
  kindAtRotation,
  letterTile,
  snapForward,
  soundChoices,
  SPIN_KINDS,
  spinTurn,
  traceLetter,
  wheelRotation,
  wordBlank,
  type HatchLevel,
  type SpinKind,
  type SpinPrize,
} from "../data/games";
import { letterForm, type TracePoint } from "../data/handwriting";
import { wordsForStep, type LadderStep } from "../data/ladder";
import type { StickerInput } from "../data/profiles";
import { guideFor, letterItemId, writingLevel, type WritingMap } from "../data/scaffold";
import { followStroke, stationsAttribute, strokeComplete, traceTolerance } from "../data/trace";
import type { Settings } from "../settings";
import { StrokeFigure } from "./StrokeFigure";

const pastel = ["#F6C3CB", "#B7D7F2", "#C9E6D4", "#F6E3B4", "#E4D4F2", "#F6D56B"];
const labels = ["Sound", "Word", "Count", "Color", "Trace", "Bonus"];

export function SpinSay({
  knownLetters,
  hatchLevel,
  ladderStep,
  spins,
  stars,
  writing,
  count,
  color,
  colorOptions,
  gifts,
  babies,
  settingsRef,
  onAttempt,
}: {
  knownLetters: string[];
  hatchLevel: HatchLevel;
  ladderStep: LadderStep;
  spins: number;
  stars: number;
  writing?: WritingMap;
  count: number;
  color: string;
  colorOptions: string[];
  gifts: string[];
  babies: string[];
  settingsRef: { current: Settings };
  onAttempt: (attempt: { step: string; stickers: StickerInput[]; gift?: string; ladder?: boolean }) => void;
}) {
  const [index, setIndex] = useState(spins);
  const [rotation, setRotation] = useState(0);
  const [phase, setPhase] = useState<"ready" | "spinning" | "challenge">("ready");
  const [kind, setKind] = useState<SpinKind | "">("");
  const [flick, setFlick] = useState(false);
  const [hint, setHint] = useState("");
  const [glow, setGlow] = useState(false);
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const rotationRef = useRef(0);
  const lock = useRef(false);
  const drag = useRef<{ angle: number; time: number; moved: number; velocity: number } | null>(null);

  useEffect(() => setIndex(spins), [spins]);
  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const finishSpin = useCallback((next: number, flicked: boolean) => {
    const landed = kindAtRotation(next);
    setRotation(next);
    rotationRef.current = next;
    setKind(landed);
    setFlick(flicked);
    setHint("");
    setGlow(false);
    if (reduced) {
      setPhase("challenge");
      return;
    }
    window.setTimeout(() => setPhase("challenge"), 900);
  }, [reduced]);

  const begin = (flicked: boolean, raw?: number) => {
    if (lock.current || phase !== "ready") return;
    lock.current = true;
    setPhase("spinning");
    const from = rotationRef.current;
    const next = flicked && raw !== undefined ? snapForward(raw, from) : wheelRotation(index, from);
    finishSpin(next, flicked);
  };

  const angleOf = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    return (Math.atan2(dx, -dy) * 180) / Math.PI;
  };

  const onDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (phase !== "ready") return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // A tap can still spin when capture is unavailable.
    }
    drag.current = { angle: angleOf(event), time: performance.now(), moved: 0, velocity: 0 };
  };

  const onMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const info = drag.current;
    if (!info || phase !== "ready") return;
    const angle = angleOf(event);
    let delta = angle - info.angle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    const now = performance.now();
    const dt = Math.max(16, now - info.time);
    info.velocity = delta / dt;
    info.moved += Math.abs(delta);
    info.angle = angle;
    info.time = now;
    setRotation((current) => current + delta);
  };

  const onUp = () => {
    const info = drag.current;
    drag.current = null;
    if (!info || phase !== "ready") return;
    const flicked = info.moved > 12 || Math.abs(info.velocity) > 0.08;
    if (!flicked) {
      begin(false);
      return;
    }
    const coast = Math.min(1400, Math.max(360, Math.abs(info.velocity) * 800));
    const raw = rotationRef.current + Math.sign(info.velocity || 1) * coast;
    begin(true, raw);
  };

  const collect = (stickers: StickerInput[] = [], gift?: string) => {
    const shown = kind || spinTurn(index);
    const step = (SPIN_KINDS as readonly string[]).includes(shown) ? `spin-${shown}` : "spin-sound";
    onAttempt({ step, stickers, gift, ladder: shown === "word" });
    setIndex((current) => current + 1);
    setPhase("ready");
    setKind("");
    lock.current = false;
  };

  return (
    <div
      className="game-board spin-board"
      data-phase={phase}
      data-kind={kind}
      data-spin={index}
      data-flick={flick ? "true" : "false"}
      data-reduced={reduced ? "true" : "false"}
      data-hint={hint}
      data-rotation={Math.round(rotation)}
    >
      <h1>Spin & Say</h1>
      {phase !== "challenge" ? (
        <div className="spin-stage">
          <div className="spin-pointer" aria-hidden="true" />
          <button
            type="button"
            className="spin-wheel"
            data-wheel
            aria-label="Spin the wheel"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: phase === "spinning" && !reduced ? "transform 0.9s cubic-bezier(0.12, 0.55, 0.08, 1)" : "none",
            }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={() => {
              drag.current = null;
            }}
          >
            <WheelFace />
          </button>
        </div>
      ) : (
        <Challenge
          kind={kind || spinTurn(index)}
          knownLetters={knownLetters}
          hatchLevel={hatchLevel}
          ladderStep={ladderStep}
          writing={writing}
          count={count}
          color={color}
          colorOptions={colorOptions}
          gifts={gifts}
          babies={babies}
          stars={stars}
          spinIndex={index}
          glow={glow}
          settingsRef={settingsRef}
          onMiss={() => {
            setHint("Try again.");
            setGlow(true);
          }}
          onDone={collect}
        />
      )}
    </div>
  );
}

function WheelFace() {
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true">
      {SPIN_KINDS.map((kind, index) => {
        const start = ((index * 60 - 90) * Math.PI) / 180;
        const end = start + (60 * Math.PI) / 180;
        const radius = 92;
        const x1 = 100 + radius * Math.cos(start);
        const y1 = 100 + radius * Math.sin(start);
        const x2 = 100 + radius * Math.cos(end);
        const y2 = 100 + radius * Math.sin(end);
        const mid = start + (30 * Math.PI) / 180;
        const lx = 100 + 58 * Math.cos(mid);
        const ly = 100 + 58 * Math.sin(mid);
        return (
          <g key={kind}>
            <path d={`M 100 100 L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`} fill={pastel[index]} stroke="#fffdfb" strokeWidth="2" />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="#243056" fontSize="13" fontWeight="700">
              {labels[index]}
            </text>
          </g>
        );
      })}
      <circle cx="100" cy="100" r="22" fill="#fffdfb" stroke="#E4C7A4" strokeWidth="3" />
    </svg>
  );
}

function Challenge({
  kind,
  knownLetters,
  hatchLevel,
  ladderStep,
  writing,
  count,
  color,
  colorOptions,
  gifts,
  babies,
  stars,
  spinIndex,
  glow,
  settingsRef,
  onMiss,
  onDone,
}: {
  kind: SpinKind;
  knownLetters: string[];
  hatchLevel: HatchLevel;
  ladderStep: LadderStep;
  writing?: WritingMap;
  count: number;
  color: string;
  colorOptions: string[];
  gifts: string[];
  babies: string[];
  stars: number;
  spinIndex: number;
  glow: boolean;
  settingsRef: { current: Settings };
  onMiss: () => void;
  onDone: (stickers?: StickerInput[], gift?: string) => void;
}) {
  const play = useCue();
  if (kind === "sound") {
    const round = soundChoices(knownLetters, spinIndex);
    return (
      <ChoiceChallenge
        prompt="Tap the letter you hear."
        target={round.target}
        choices={round.choices.map((letter) => ({ id: letter, label: letter.toUpperCase() }))}
        glow={glow}
        onHear={() => play((signal) => playLetter(letterTile(round.target), settingsRef.current, signal))}
        onCorrect={() => {
          play((signal) => playLetter(letterTile(round.target), settingsRef.current, signal));
          onDone();
        }}
        onMiss={() => {
          play((signal) => playOnDevice("Try again.", settingsRef.current, signal));
          onMiss();
        }}
      />
    );
  }
  if (kind === "word") {
    const round = wordBlank(knownLetters, hatchLevel, wordsForStep(ladderStep));
    const answer = round.word.letters[round.blank]?.char.toLowerCase() ?? "a";
    return (
      <div className="spin-challenge" data-target={answer} data-word={round.word.word}>
        <p className="game-prompt">Fill the missing letter.</p>
        <div className="hatch-picture">
          <Illustration name={round.word.illustration} />
        </div>
        <p className="hatch-blanks" aria-label="Word">
          {round.word.letters.map((letter, letterIndex) => (
            <span key={`${letter.char}-${letterIndex}`} data-blank={letterIndex === round.blank ? "open" : "shown"}>
              {letterIndex === round.blank ? "" : letter.char}
            </span>
          ))}
        </p>
        <Choices
          target={answer}
          choices={round.choices.map((letter) => ({ id: letter, label: letter.toUpperCase() }))}
          glow={glow}
          onCorrect={() => {
            play((signal) => playWord(round.word, settingsRef.current, signal));
            onDone([{ kind: "word", label: round.word.word }]);
          }}
          onMiss={() => {
            play((signal) => playOnDevice("Try again.", settingsRef.current, signal));
            onMiss();
          }}
        />
      </div>
    );
  }
  if (kind === "count") {
    const round = countChoices(count);
    return (
      <div className="spin-challenge" data-target={String(round.total)}>
        <p className="game-prompt">How many?</p>
        <div className="spin-objects" aria-hidden="true">
          {Array.from({ length: round.total }, (_, dot) => (
            <span key={dot} className="spin-object" />
          ))}
        </div>
        <Choices
          target={String(round.total)}
          choices={round.choices.map((value) => ({ id: String(value), label: String(value) }))}
          glow={glow}
          onCorrect={() => {
            play((signal) => playNumber(round.total, settingsRef.current, signal));
            onDone();
          }}
          onMiss={() => {
            play((signal) => playOnDevice("Try again.", settingsRef.current, signal));
            onMiss();
          }}
        />
      </div>
    );
  }
  if (kind === "color") {
    const round = colorChoices(color, colorOptions);
    return (
      <ChoiceChallenge
        prompt="Find the color."
        target={round.target}
        choices={round.choices.map((name) => ({ id: name, label: name, fill: colorFill(name) }))}
        glow={glow}
        onHear={() => play((signal) => playColor(round.target, settingsRef.current, signal))}
        onCorrect={() => {
          play((signal) => playColor(round.target, settingsRef.current, signal));
          onDone();
        }}
        onMiss={() => {
          play((signal) => playOnDevice("Try again.", settingsRef.current, signal));
          onMiss();
        }}
      />
    );
  }
  if (kind === "trace") {
    return (
      <MiniTrace
        letter={traceLetter(knownLetters)}
        writing={writing}
        hinted={glow}
        settingsRef={settingsRef}
        onMiss={() => {
          play((signal) => playOnDevice("Try again.", settingsRef.current, signal));
          onMiss();
        }}
        onDone={() => onDone()}
      />
    );
  }
  const prize: SpinPrize = bonusPrize(spinIndex, gifts, babies, stars);
  return (
    <div className="spin-challenge" data-prize-kind={prize.kind} data-prize={prize.kind === "outfit" ? prize.id : prize.label}>
      <p className="game-prompt">Bonus</p>
      <p className="spin-prize">{prize.kind === "outfit" ? prize.name : prize.label}</p>
      <button
        type="button"
        className="start-button"
        onClick={() => {
          playEffect("celebrate", settingsRef.current);
          if (prize.kind === "outfit") onDone([], prize.id);
          else onDone([{ kind: "animal", label: prize.label }]);
        }}
      >
        Done
      </button>
    </div>
  );
}

function ChoiceChallenge({
  prompt,
  target,
  choices,
  glow,
  onHear,
  onCorrect,
  onMiss,
}: {
  prompt: string;
  target: string;
  choices: { id: string; label: string; fill?: string }[];
  glow: boolean;
  onHear: () => void;
  onCorrect: () => void;
  onMiss: () => void;
}) {
  useEffect(() => {
    onHear();
  }, [onHear]);
  return (
    <div className="spin-challenge" data-target={target}>
      <p className="game-prompt">{prompt}</p>
      <button type="button" className="hear-button" onClick={onHear}>
        Hear it
      </button>
      <Choices target={target} choices={choices} glow={glow} onCorrect={onCorrect} onMiss={onMiss} />
    </div>
  );
}

function Choices({
  target,
  choices,
  glow,
  onCorrect,
  onMiss,
}: {
  target: string;
  choices: { id: string; label: string; fill?: string }[];
  glow: boolean;
  onCorrect: () => void;
  onMiss: () => void;
}) {
  return (
    <div className="letter-tiles">
      {choices.map((choice) => {
        const answer = choice.id === target;
        return (
          <button
            key={choice.id}
            type="button"
            className="letter-tile"
            data-choice={choice.id}
            data-answer={answer ? "true" : "false"}
            data-glow={glow && answer ? "true" : "false"}
            onClick={() => (answer ? onCorrect() : onMiss())}
          >
            {choice.fill ? <span className="spin-swatch" style={{ background: choice.fill }} aria-hidden="true" /> : null}
            {choice.label}
          </button>
        );
      })}
    </div>
  );
}

function MiniTrace({
  letter,
  writing,
  hinted,
  settingsRef,
  onMiss,
  onDone,
}: {
  letter: string;
  writing?: WritingMap;
  hinted: boolean;
  settingsRef: { current: Settings };
  onMiss: () => void;
  onDone: () => void;
}) {
  const form = letterForm(letter, "lower");
  const level = writingLevel(writing, letterItemId(letter, "lower"));
  const planned = guideFor(level);
  const guide = hinted || planned === "copy" || planned === "memory" || planned === "full" ? "full" : planned === "fade" ? "fade" : "start";
  const [strokeIndex, setStrokeIndex] = useState(0);
  const [covered, setCovered] = useState(0);
  const coveredRef = useRef(0);
  const tracing = useRef(false);
  const finished = useRef(false);
  const stroke = form.strokes[strokeIndex];
  const done = strokeIndex >= form.strokes.length;

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
    if (!tracing.current || !stroke || done) return;
    const point = pointFrom(event);
    if (!point) return;
    const next = followStroke(stroke, coveredRef.current, point, traceTolerance(settingsRef.current));
    if (next === coveredRef.current) return;
    coveredRef.current = next;
    setCovered(next);
    if (strokeComplete(stroke, next)) {
      tracing.current = false;
      playEffect("chime", settingsRef.current);
      coveredRef.current = 0;
      setCovered(0);
      if (strokeIndex + 1 >= form.strokes.length) {
        if (!finished.current) {
          finished.current = true;
          onDone();
        }
        return;
      }
      setStrokeIndex((current) => current + 1);
    }
  };

  const progress = form.strokes.map((_, number) => {
    if (number < strokeIndex) return 999;
    if (number === strokeIndex) return covered;
    return 0;
  });

  return (
    <div className="spin-challenge" data-letter={letter} data-trace={done ? "done" : "play"} data-stroke={strokeIndex} data-guide={guide}>
      <p className="game-prompt">Trace little {letter}.</p>
      <div
        className="spin-trace"
        data-stations={stroke ? stationsAttribute(stroke) : ""}
        onPointerDown={(event) => {
          if (done) return;
          tracing.current = true;
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            // The stroke can still follow the pointer.
          }
          follow(event);
        }}
        onPointerMove={follow}
        onPointerUp={() => {
          const missed = tracing.current && coveredRef.current === 0;
          tracing.current = false;
          if (missed) onMiss();
        }}
      >
        <StrokeFigure letter={letter} casing="lower" progress={progress} activeIndex={strokeIndex} guide={guide} />
      </div>
    </div>
  );
}

function useCue() {
  const audio = useRef<AbortController | null>(null);
  useEffect(() => () => audio.current?.abort(), []);
  return useCallback((run: (signal: AbortSignal) => Promise<void>) => {
    audio.current?.abort();
    const controller = new AbortController();
    audio.current = controller;
    void run(controller.signal).catch(() => undefined);
  }, []);
}
