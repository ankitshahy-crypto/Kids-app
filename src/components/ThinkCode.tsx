import { useEffect, useRef, useState } from "react";
import { playOnDevice, playPrompt } from "../audio/player";
import type { AnimalId } from "../data/animals";
import {
  birdRounds,
  gardenRounds,
  logicLevel,
  morningDeal,
  morningFits,
  morningOrder,
  onGrid,
  patternRounds,
  program,
  reachesNest,
  sameCell,
  stepCell,
  type BirdRound,
  type Dir,
  type LogicLevel,
} from "../data/logic";
import type { AgeRange } from "../data/profiles";
import type { Outfit } from "../data/wardrobe";
import type { Settings } from "../settings";
import { Hero } from "./Hero";

const DIRS: Dir[] = ["up", "down", "left", "right"];

function useSpeaker(settingsRef: { current: Settings }) {
  const playRef = useRef<AbortController | null>(null);
  useEffect(() => () => playRef.current?.abort(), []);
  const run = (task: (signal: AbortSignal) => Promise<void>) => {
    playRef.current?.abort();
    const controller = new AbortController();
    playRef.current = controller;
    void task(controller.signal).catch(() => undefined);
  };
  return {
    prompt(id: string, fallback: string) {
      run((signal) => playPrompt(id, settingsRef.current, signal, fallback));
    },
    words(text: string) {
      run((signal) => playOnDevice(text, settingsRef.current, signal));
    },
  };
}

function promptFor(round: BirdRound): [string, string] {
  if (round.mode === "plan") return ["code-plan", "Line up the arrows, then press go."];
  if (round.mode === "loop") return ["code-loop", "Do this move three times."];
  if (round.mode === "bug") return ["code-bug", "One arrow is wrong. Tap it, then press go."];
  return ["code-bird", "Take your animal home to the nest."];
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function ThinkGame({
  kind,
  ageRange,
  animal,
  outfit,
  settingsRef,
  onDone,
}: {
  kind: "bird" | "pattern" | "morning" | "garden";
  ageRange: AgeRange;
  animal: AnimalId;
  outfit: Outfit;
  settingsRef: { current: Settings };
  onDone: () => void;
}) {
  const level = logicLevel(ageRange);
  if (kind === "bird") return <BirdGame level={level} animal={animal} outfit={outfit} settingsRef={settingsRef} onDone={onDone} />;
  if (kind === "pattern") return <PatternGame settingsRef={settingsRef} onDone={onDone} />;
  if (kind === "morning") return <MorningGame level={level} settingsRef={settingsRef} onDone={onDone} />;
  return <GardenGame settingsRef={settingsRef} onDone={onDone} />;
}

function BirdGame({
  level,
  animal,
  outfit,
  settingsRef,
  onDone,
}: {
  level: LogicLevel;
  animal: AnimalId;
  outfit: Outfit;
  settingsRef: { current: Settings };
  onDone: () => void;
}) {
  const rounds = birdRounds(level);
  const speak = useSpeaker(settingsRef);
  const [index, setIndex] = useState(0);
  const round = rounds[index] ?? rounds[0];
  const [pos, setPos] = useState(round.start);
  const [queue, setQueue] = useState<Dir[]>([]);
  const [fixed, setFixed] = useState(false);
  const [home, setHome] = useState(false);
  const [wiggle, setWiggle] = useState("");
  const [again, setAgain] = useState(false);
  const runId = useRef(0);
  const finished = useRef(false);

  useEffect(() => {
    const next = rounds[index] ?? rounds[0];
    setPos(next.start);
    setQueue([]);
    setFixed(false);
    setHome(false);
    setAgain(false);
    setWiggle("");
    runId.current += 1;
    const [id, fallback] = promptFor(next);
    speak.prompt(id, fallback);
  }, [index]);

  const miss = (which: string) => {
    setWiggle(which);
    setAgain(true);
    speak.prompt("code-again", "Try again.");
  };

  const tapMove = (dir: Dir) => {
    if (home) return;
    const next = stepCell(pos, dir);
    if (!onGrid(next, round.width, round.height)) {
      miss(dir);
      return;
    }
    setWiggle("");
    setAgain(false);
    setPos(next);
    if (sameCell(next, round.nest)) setHome(true);
  };

  const queueDir = (dir: Dir) => {
    if (home) return;
    setAgain(false);
    setWiggle("");
    if (round.mode === "loop") {
      setQueue([dir]);
      return;
    }
    if (round.mode === "bug") return;
    setQueue((current) => (current.length >= round.path.length + 2 ? current : [...current, dir]));
  };

  const go = () => {
    if (home) return;
    const dirs = program(round, queue, fixed);
    if (dirs.length === 0) {
      miss("go");
      return;
    }
    const id = ++runId.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    void (async () => {
      let cell = round.start;
      setPos(cell);
      for (const dir of dirs) {
        if (runId.current !== id) return;
        const next = stepCell(cell, dir);
        if (!onGrid(next, round.width, round.height)) {
          setPos(round.start);
          miss("go");
          return;
        }
        cell = next;
        setPos(cell);
        if (!reduce) await sleep(120);
      }
      if (runId.current !== id) return;
      if (reachesNest(round, dirs)) {
        setAgain(false);
        setHome(true);
        return;
      }
      setPos(round.start);
      miss("go");
    })();
  };

  const arrows = round.mode === "bug" ? program(round, [], fixed) : queue;
  const last = index >= rounds.length - 1;

  return (
    <div
      className="game-board"
      data-level={level}
      data-mode={round.mode}
      data-path={round.path.join(",")}
      data-home={home ? "true" : "false"}
      data-again={again ? "true" : "false"}
      data-repeat={round.repeat}
      data-fixed={round.mode === "bug" && fixed ? "true" : "false"}
      data-x={pos.x}
      data-y={pos.y}
    >
      <h1>Bird home</h1>
      <div
        className="code-grid"
        style={{ gridTemplateColumns: `repeat(${round.width}, minmax(0, 1fr))` }}
        data-width={round.width}
        data-height={round.height}
      >
        {Array.from({ length: round.width * round.height }, (_, cell) => {
          const x = cell % round.width;
          const y = Math.floor(cell / round.width);
          const here = pos.x === x && pos.y === y;
          const nest = round.nest.x === x && round.nest.y === y;
          return (
            <div key={`${x}-${y}`} className="code-cell" data-cell={`${x}-${y}`} data-animal={here ? "true" : "false"} data-nest={nest ? "true" : "false"}>
              {nest ? <NestMark /> : null}
              {here ? <Hero animal={animal} outfit={outfit} /> : null}
            </div>
          );
        })}
      </div>
      {round.mode === "loop" ? <p className="code-loop">3 times</p> : null}
      {arrows.length > 0 ? (
        <div className="code-queue" aria-label="Arrows">
          {arrows.map((dir, arrowIndex) => (
            <button
              key={`${dir}-${arrowIndex}`}
              type="button"
              className="code-chip"
              data-queued={arrowIndex}
              data-dir={dir}
              data-bug={round.mode === "bug" && arrowIndex === round.bugIndex ? "true" : "false"}
              aria-label={round.mode === "bug" && arrowIndex === round.bugIndex ? "Wrong arrow" : dir}
              onClick={() => {
                if (round.mode === "bug" && arrowIndex === round.bugIndex) setFixed(true);
                else if (round.mode !== "bug" && arrowIndex === arrows.length - 1) setQueue((current) => current.slice(0, -1));
              }}
            >
              <ArrowIcon dir={dir} />
            </button>
          ))}
        </div>
      ) : null}
      <div className="code-arrows" role="group" aria-label="Move">
        {DIRS.map((dir) => (
          <button
            key={dir}
            type="button"
            className="code-arrow"
            data-arrow={dir}
            data-wiggle={wiggle === dir ? "true" : "false"}
            aria-label={dir}
            onClick={() => (round.mode === "tap" ? tapMove(dir) : queueDir(dir))}
          >
            <ArrowIcon dir={dir} />
          </button>
        ))}
      </div>
      {round.mode !== "tap" ? (
        <button type="button" className="start-button" data-go="run" data-wiggle={wiggle === "go" ? "true" : "false"} onClick={go}>
          Go
        </button>
      ) : null}
      {home && !last ? (
        <button type="button" className="start-button" data-next="round" onClick={() => setIndex((current) => current + 1)}>
          Next
        </button>
      ) : null}
      {home && last ? (
        <button
          type="button"
          className="start-button"
          data-finish="bird"
          onClick={() => {
            if (finished.current) return;
            finished.current = true;
            onDone();
          }}
        >
          Done
        </button>
      ) : null}
    </div>
  );
}

function PatternGame({
  settingsRef,
  onDone,
}: {
  settingsRef: { current: Settings };
  onDone: () => void;
}) {
  const rounds = patternRounds();
  const speak = useSpeaker(settingsRef);
  const [index, setIndex] = useState(0);
  const [wiggle, setWiggle] = useState("");
  const [solved, setSolved] = useState(0);
  const finished = useRef(false);
  const round = rounds[index] ?? rounds[0];

  useEffect(() => {
    speak.prompt("code-pattern", "What comes next?");
  }, [index]);

  const choose = (choice: string) => {
    if (solved >= rounds.length) return;
    if (choice !== round.answer) {
      setWiggle(choice);
      speak.prompt("code-again", "Try again.");
      return;
    }
    setWiggle("");
    const nextSolved = solved + 1;
    setSolved(nextSolved);
    if (index < rounds.length - 1) setIndex((current) => current + 1);
  };

  const done = solved >= rounds.length;

  return (
    <div className="game-board" data-rule={round.rule} data-kind={round.kind} data-answer={round.answer} data-solved={solved}>
      <h1>What next</h1>
      <div className="pattern-row" aria-label="Pattern">
        {round.shown.map((token, tokenIndex) => (
          <span key={`${token}-${tokenIndex}`} className="pattern-token" data-token={token}>
            <TokenArt kind={round.kind} token={token} />
          </span>
        ))}
        <span className="pattern-token pattern-missing" data-token="missing">
          ?
        </span>
      </div>
      <div className="pattern-choices">
        {round.choices.map((choice) => (
          <button
            key={choice}
            type="button"
            className="pattern-choice"
            data-choice={choice}
            data-wiggle={wiggle === choice ? "true" : "false"}
            aria-label={choice}
            onClick={() => choose(choice)}
          >
            <TokenArt kind={round.kind} token={choice} />
          </button>
        ))}
      </div>
      {done ? (
        <button
          type="button"
          className="start-button"
          data-finish="pattern"
          onClick={() => {
            if (finished.current) return;
            finished.current = true;
            onDone();
          }}
        >
          Done
        </button>
      ) : null}
    </div>
  );
}

function MorningGame({
  level,
  settingsRef,
  onDone,
}: {
  level: LogicLevel;
  settingsRef: { current: Settings };
  onDone: () => void;
}) {
  const order = morningOrder(level).map((card) => card.id);
  const titles = Object.fromEntries(morningOrder(level).map((card) => [card.id, card.title]));
  const deal = morningDeal(level);
  const speak = useSpeaker(settingsRef);
  const [placed, setPlaced] = useState<string[]>([]);
  const [wiggle, setWiggle] = useState("");
  const drag = useRef<{ id: string; x: number; y: number; moved: boolean } | null>(null);
  const finished = useRef(false);
  const done = placed.length === order.length;

  useEffect(() => {
    speak.prompt("code-morning", "Put the morning pictures in order.");
  }, []);

  const place = (card: string, slot: number) => {
    if (placed.includes(card) || done) return;
    if (!morningFits(order, placed, card, slot)) {
      setWiggle(card);
      speak.prompt("code-again", "Try again.");
      return;
    }
    setWiggle("");
    setPlaced((current) => [...current, card]);
    speak.words(titles[card] ?? card);
  };

  return (
    <div className="game-board" data-level={level} data-order={order.join(",")} data-placed={placed.join(",")} data-sorted={placed.length}>
      <h1>Morning</h1>
      <div className="morning-slots">
        {order.map((id, slot) => (
          <div key={id} className="morning-slot" data-slot={slot} data-filled={placed[slot] ?? ""}>
            {placed[slot] ? <StepArt id={placed[slot]} /> : <span>{slot + 1}</span>}
          </div>
        ))}
      </div>
      <div className="morning-cards">
        {deal.map((id) => (
          <button
            key={id}
            type="button"
            className="morning-card"
            data-card={id}
            data-used={placed.includes(id) ? "true" : "false"}
            data-wiggle={wiggle === id ? "true" : "false"}
            aria-label={titles[id] ?? id}
            onPointerDown={(event) => {
              if (placed.includes(id)) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              drag.current = { id, x: event.clientX, y: event.clientY, moved: false };
            }}
            onPointerMove={(event) => {
              const info = drag.current;
              if (!info || info.id !== id) return;
              if (Math.hypot(event.clientX - info.x, event.clientY - info.y) > 8) info.moved = true;
            }}
            onPointerUp={(event) => {
              const info = drag.current;
              drag.current = null;
              if (!info || info.id !== id || placed.includes(id)) return;
              if (!info.moved) {
                place(id, placed.length);
                return;
              }
              const slots = event.currentTarget.closest(".game-board")?.querySelectorAll("[data-slot]");
              if (!slots) return;
              for (const slot of slots) {
                const box = slot.getBoundingClientRect();
                const over =
                  event.clientX >= box.left &&
                  event.clientX <= box.right &&
                  event.clientY >= box.top &&
                  event.clientY <= box.bottom;
                if (!over) continue;
                place(id, Number(slot.getAttribute("data-slot") ?? "-1"));
                return;
              }
            }}
          >
            <StepArt id={id} />
            <span>{titles[id]}</span>
          </button>
        ))}
      </div>
      {done ? (
        <button
          type="button"
          className="start-button"
          data-finish="morning"
          onClick={() => {
            if (finished.current) return;
            finished.current = true;
            onDone();
          }}
        >
          Done
        </button>
      ) : null}
    </div>
  );
}

function GardenGame({
  settingsRef,
  onDone,
}: {
  settingsRef: { current: Settings };
  onDone: () => void;
}) {
  const rounds = gardenRounds();
  const speak = useSpeaker(settingsRef);
  const [index, setIndex] = useState(0);
  const [grown, setGrown] = useState(false);
  const [wiggle, setWiggle] = useState("");
  const finished = useRef(false);
  const round = rounds[index] ?? rounds[0];

  useEffect(() => {
    setGrown(false);
    setWiggle("");
    speak.prompt(round.prompt, round.cause === "rain" ? "If it rains, the flower grows." : "If the sun comes out, the ice melts.");
  }, [index]);

  const tap = (cause: "rain" | "sun") => {
    if (grown) return;
    if (cause !== round.cause) {
      setWiggle(cause);
      speak.prompt("code-again", "Try again.");
      return;
    }
    setWiggle("");
    setGrown(true);
  };

  const last = index >= rounds.length - 1;

  return (
    <div className="game-board" data-cause={round.cause} data-effect={grown ? round.effect : "wait"} data-round={index}>
      <h1>If then</h1>
      <div className="garden-scene" data-scene={round.effect}>
        {round.effect === "flower" ? <Flower grown={grown} /> : <Ice melted={grown} />}
      </div>
      <div className="garden-causes">
        {(["rain", "sun"] as const).map((cause) => (
          <button
            key={cause}
            type="button"
            className="garden-cause"
            data-cause={cause}
            data-wiggle={wiggle === cause ? "true" : "false"}
            aria-label={cause === "rain" ? "Rain" : "Sun"}
            onClick={() => tap(cause)}
          >
            {cause === "rain" ? <CloudArt /> : <SunArt />}
          </button>
        ))}
      </div>
      {grown && !last ? (
        <button type="button" className="start-button" data-next="garden" onClick={() => setIndex((current) => current + 1)}>
          Next
        </button>
      ) : null}
      {grown && last ? (
        <button
          type="button"
          className="start-button"
          data-finish="garden"
          onClick={() => {
            if (finished.current) return;
            finished.current = true;
            onDone();
          }}
        >
          Done
        </button>
      ) : null}
    </div>
  );
}

function ArrowIcon({ dir }: { dir: Dir }) {
  const turn = dir === "right" ? 90 : dir === "down" ? 180 : dir === "left" ? 270 : 0;
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" style={{ transform: `rotate(${turn}deg)` }}>
      <path d="M32 8 L52 34 H40 V56 H24 V34 H12 Z" fill="#6d8f78" />
    </svg>
  );
}

function NestMark() {
  return (
    <svg className="nest-mark" viewBox="0 0 64 40" aria-hidden="true">
      <ellipse cx="32" cy="24" rx="22" ry="12" fill="#e4c7a4" />
      <ellipse cx="32" cy="22" rx="14" ry="7" fill="#f6e3b4" />
      <circle cx="24" cy="20" r="4" fill="#f7f1e8" />
      <circle cx="32" cy="18" r="4" fill="#d7f3ea" />
      <circle cx="40" cy="20" r="4" fill="#f6c3cb" />
    </svg>
  );
}

const FILLS: Record<string, string> = {
  red: "#e07a8a",
  blue: "#8eb4d6",
  yellow: "#f6d56b",
  circle: "#f6c3cb",
  square: "#b7d7f2",
  triangle: "#c9e6d4",
};

function TokenArt({ kind, token }: { kind: string; token: string }) {
  if (kind === "animal") {
    if (token === "bird") {
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <ellipse cx="30" cy="36" rx="16" ry="12" fill="#f4a4b4" />
          <circle cx="44" cy="28" r="8" fill="#f4a4b4" />
          <path d="M50 28 h10 l-6 4 z" fill="#f6d56b" />
        </svg>
      );
    }
    if (token === "nest") return <NestMark />;
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="30" r="14" fill="#e07a5f" />
        <ellipse cx="32" cy="48" rx="16" ry="10" fill="#e07a5f" />
        <circle cx="26" cy="28" r="2" fill="#2c3a4f" />
        <circle cx="36" cy="28" r="2" fill="#2c3a4f" />
      </svg>
    );
  }
  const fill = FILLS[token] ?? "#f6e3b4";
  if (token === "square") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <rect x="14" y="14" width="36" height="36" rx="6" fill={fill} />
      </svg>
    );
  }
  if (token === "triangle") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M32 12 L54 52 H10 Z" fill={fill} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="18" fill={fill} />
    </svg>
  );
}

function StepArt({ id }: { id: string }) {
  if (id === "brush") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <rect x="28" y="8" width="8" height="28" rx="3" fill="#8eb4d6" />
        <rect x="24" y="34" width="16" height="16" rx="4" fill="#f7f1e8" />
      </svg>
    );
  }
  if (id === "eat") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <ellipse cx="32" cy="40" rx="18" ry="10" fill="#f6d56b" />
        <circle cx="32" cy="28" r="8" fill="#e07a8a" />
      </svg>
    );
  }
  if (id === "school") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M8 28 L32 14 L56 28 V50 H8 Z" fill="#c9e6d4" />
        <rect x="28" y="34" width="8" height="16" fill="#e4c7a4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="12" fill="#f6d56b" />
      <path d="M32 8 v8 M32 48 v8 M8 32 h8 M48 32 h8" stroke="#f6d56b" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function Flower({ grown }: { grown: boolean }) {
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <rect x="36" y="40" width="8" height={grown ? 28 : 10} fill="#6e9a74" />
      {grown ? (
        <>
          <circle cx="40" cy="28" r="8" fill="#f6d56b" />
          <circle cx="28" cy="34" r="8" fill="#f4a4b4" />
          <circle cx="52" cy="34" r="8" fill="#f4a4b4" />
          <circle cx="34" cy="18" r="8" fill="#f4a4b4" />
          <circle cx="48" cy="18" r="8" fill="#f4a4b4" />
        </>
      ) : (
        <circle cx="40" cy="36" r="6" fill="#c9e6d4" />
      )}
    </svg>
  );
}

function Ice({ melted }: { melted: boolean }) {
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      {melted ? <ellipse cx="40" cy="58" rx="22" ry="8" fill="#b7d7f2" /> : <rect x="24" y="28" width="32" height="28" rx="6" fill="#d7eef8" stroke="#8eb4d6" strokeWidth="3" />}
    </svg>
  );
}

function CloudArt() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <ellipse cx="32" cy="28" rx="16" ry="10" fill="#d7eef8" />
      <path d="M24 36 v10 M32 34 v14 M40 36 v10" stroke="#8eb4d6" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function SunArt() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="12" fill="#f6d56b" />
      <path d="M32 8 v8 M32 48 v8 M8 32 h8 M48 32 h8 M14 14 l6 6 M44 44 l6 6 M50 14 l-6 6 M20 44 l-6 6" stroke="#f6d56b" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
