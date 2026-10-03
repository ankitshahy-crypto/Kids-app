import { useEffect, useMemo, useRef, useState } from "react";
import { playEffect } from "../audio/manager";
import { playPrompt, playWordId } from "../audio/player";
import type { AnimalId } from "../data/animals";
import {
  birdRounds,
  logicLevel,
  onGrid,
  orderFits,
  orderRounds,
  patternRounds,
  program,
  reachesNest,
  ruleRounds,
  sameCell,
  stepCell,
  type BirdRound,
  type Cell,
  type Dir,
  type LogicLevel,
  type PictureCard,
} from "../data/logic";
import { Illustration, type IllustrationName } from "../illustrations";
import type { AgeRange } from "../data/profiles";
import type { Outfit } from "../data/wardrobe";
import { clickWithoutPointer } from "../input/keyboardClick";
import type { Settings } from "../settings";
import { Hero } from "./Hero";

/**
 * The four coding games. See src/data/logic.ts for what each one teaches and
 * why they were rewritten after the first phone test.
 *
 * What changed on screen:
 *  - Pictures are the app's own drawings at a size a child can see, not dots.
 *  - A plan is laid out in numbered places under the board, and each arrow
 *    lights as the animal takes that step, slowly enough to follow (it ran
 *    at 120 ms a step, faster than a child can watch).
 *  - Every word the games say is a recorded clip. Two lines used the phone's
 *    own voice.
 */

const DIRS: Dir[] = ["up", "down", "left", "right"];

/** How long the animal takes over one step of a plan. */
const STEP_MS = 480;
/** How long a solved round stays on screen before the next one. */
const SOLVED_MS = 1100;

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
    /** The name of a picture, from its recorded word clip. */
    word(name: string) {
      run((signal) => playWordId(name, name, settingsRef.current, signal));
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

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function Picture({ art }: { art: IllustrationName }) {
  return (
    <span className="code-pic" data-art={art}>
      <Illustration name={art} />
    </span>
  );
}

function FinishButton({ id, onDone }: { id: string; onDone: () => void }) {
  const finished = useRef(false);
  return (
    <button
      type="button"
      className="start-button"
      data-finish={id}
      onClick={() => {
        if (finished.current) return;
        finished.current = true;
        onDone();
      }}
    >
      Done
    </button>
  );
}

export function ThinkGame({
  kind,
  ageRange,
  animal,
  outfit,
  salt,
  settingsRef,
  onDone,
}: {
  kind: "bird" | "pattern" | "morning" | "garden";
  ageRange: AgeRange;
  animal: AnimalId;
  outfit: Outfit;
  /** New each time a game opens: it picks and arranges the rounds. */
  salt: number;
  settingsRef: { current: Settings };
  onDone: () => void;
}) {
  const level = logicLevel(ageRange);
  if (kind === "bird") return <BirdGame level={level} salt={salt} animal={animal} outfit={outfit} settingsRef={settingsRef} onDone={onDone} />;
  if (kind === "pattern") return <PatternGame salt={salt} settingsRef={settingsRef} onDone={onDone} />;
  if (kind === "morning") return <OrderGame level={level} salt={salt} settingsRef={settingsRef} onDone={onDone} />;
  return <RuleGame level={level} salt={salt} animal={animal} outfit={outfit} settingsRef={settingsRef} onDone={onDone} />;
}

/** Take me home: move the animal to its nest, first by taps, then by a plan made before it moves. */
function BirdGame({
  level,
  salt,
  animal,
  outfit,
  settingsRef,
  onDone,
}: {
  level: LogicLevel;
  salt: number;
  animal: AnimalId;
  outfit: Outfit;
  settingsRef: { current: Settings };
  onDone: () => void;
}) {
  const rounds = useMemo(() => birdRounds(level, salt), [level, salt]);
  const speak = useSpeaker(settingsRef);
  const [index, setIndex] = useState(0);
  const round = rounds[index] ?? rounds[0];
  const [pos, setPos] = useState(round.start);
  const [queue, setQueue] = useState<Dir[]>([]);
  const [fixed, setFixed] = useState(false);
  const [home, setHome] = useState(false);
  const [wiggle, setWiggle] = useState("");
  const [again, setAgain] = useState(false);
  /** Which arrow of the plan is being walked, and the cells walked so far. */
  const [running, setRunning] = useState(-1);
  const [walked, setWalked] = useState<Cell[]>([]);
  const runId = useRef(0);

  useEffect(() => {
    const next = rounds[index] ?? rounds[0];
    setPos(next.start);
    setQueue([]);
    setFixed(false);
    setHome(false);
    setAgain(false);
    setWiggle("");
    setRunning(-1);
    setWalked([]);
    runId.current += 1;
    const [id, fallback] = promptFor(next);
    speak.prompt(id, fallback);
  }, [index]);

  const miss = (which: string) => {
    setWiggle(which);
    setAgain(true);
    speak.prompt("code-again", "Try again.");
  };

  const arrive = () => {
    setAgain(false);
    setHome(true);
    playEffect("chime", settingsRef.current);
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
    setWalked((cells) => [...cells, pos]);
    setPos(next);
    if (sameCell(next, round.nest)) arrive();
  };

  const queueDir = (dir: Dir) => {
    if (home || running >= 0) return;
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
    if (home || running >= 0) return;
    const dirs = program(round, queue, fixed);
    if (dirs.length === 0) {
      miss("go");
      return;
    }
    const id = ++runId.current;
    const pace = reducedMotion() ? 0 : STEP_MS;
    setAgain(false);
    setWiggle("");
    void (async () => {
      let cell = round.start;
      setPos(cell);
      setWalked([]);
      for (const [step, dir] of dirs.entries()) {
        if (runId.current !== id) return;
        // A loop has one arrow on the page, walked three times.
        setRunning(round.mode === "loop" ? 0 : step);
        const next = stepCell(cell, dir);
        if (!onGrid(next, round.width, round.height)) {
          if (pace) await sleep(pace);
          if (runId.current !== id) return;
          setRunning(-1);
          setWalked([]);
          setPos(round.start);
          miss("go");
          return;
        }
        const from = cell;
        cell = next;
        setWalked((cells) => [...cells, from]);
        setPos(cell);
        if (pace) await sleep(pace);
      }
      if (runId.current !== id) return;
      setRunning(-1);
      if (reachesNest(round, dirs)) {
        arrive();
        return;
      }
      setWalked([]);
      setPos(round.start);
      miss("go");
    })();
  };

  const planned = round.mode !== "tap";
  const arrows = round.mode === "bug" ? program(round, [], fixed) : queue;
  // Empty places show how long the plan is: one for each step it takes to get home.
  const places = round.mode === "loop" ? 1 : Math.max(round.path.length, arrows.length);
  const last = index >= rounds.length - 1;

  return (
    <div
      className="game-board code-board"
      data-level={level}
      data-mode={round.mode}
      data-path={round.path.join(",")}
      data-home={home ? "true" : "false"}
      data-again={again ? "true" : "false"}
      data-repeat={round.repeat}
      data-fixed={round.mode === "bug" && fixed ? "true" : "false"}
      data-running={running >= 0 ? "true" : "false"}
      data-x={pos.x}
      data-y={pos.y}
    >
      <h1>Take me home</h1>
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
          const passed = walked.some((step) => step.x === x && step.y === y);
          return (
            <div
              key={`${x}-${y}`}
              className="code-cell"
              data-cell={`${x}-${y}`}
              data-animal={here ? "true" : "false"}
              data-nest={nest ? "true" : "false"}
              data-walked={passed && !here ? "true" : "false"}
            >
              {nest ? <NestMark /> : null}
              {here ? <Hero animal={animal} outfit={outfit} /> : null}
            </div>
          );
        })}
      </div>
      {planned ? (
        <div className="code-plan" data-plan={round.mode}>
          <div className="code-queue" aria-label="Your plan">
            {Array.from({ length: places }, (_, place) => {
              const dir = arrows[place];
              if (!dir) {
                return (
                  <span key={`place-${place}`} className="code-place" data-place={place}>
                    {place + 1}
                  </span>
                );
              }
              const bug = round.mode === "bug" && place === round.bugIndex;
              return (
                <button
                  key={`${dir}-${place}`}
                  type="button"
                  className="code-chip"
                  data-queued={place}
                  data-dir={dir}
                  data-on={running === place ? "true" : "false"}
                  data-bug={bug ? "true" : "false"}
                  data-mended={bug && fixed ? "true" : "false"}
                  aria-label={bug && !fixed ? "Wrong arrow" : dir}
                  onClick={() => {
                    if (running >= 0) return;
                    if (bug) setFixed(true);
                    else if (round.mode !== "bug" && place === arrows.length - 1) setQueue((current) => current.slice(0, -1));
                  }}
                >
                  <ArrowIcon dir={dir} />
                </button>
              );
            })}
            {round.mode === "loop" ? (
              <span className="code-loop" aria-label="3 times">
                × 3
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
      {round.mode !== "bug" ? (
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
      ) : null}
      {planned && !home ? (
        <button type="button" className="start-button" data-go="run" data-wiggle={wiggle === "go" ? "true" : "false"} onClick={go}>
          Go
        </button>
      ) : null}
      {home && !last ? (
        <button type="button" className="start-button" data-next="round" onClick={() => setIndex((current) => current + 1)}>
          Next
        </button>
      ) : null}
      {home && last ? <FinishButton id="bird" onDone={onDone} /> : null}
    </div>
  );
}

/** What comes next: a row of pictures follows a rule, and the child picks the picture that continues it. */
function PatternGame({
  salt,
  settingsRef,
  onDone,
}: {
  salt: number;
  settingsRef: { current: Settings };
  onDone: () => void;
}) {
  const rounds = useMemo(() => patternRounds(salt), [salt]);
  const speak = useSpeaker(settingsRef);
  const [index, setIndex] = useState(0);
  const [wiggle, setWiggle] = useState("");
  const [solved, setSolved] = useState(0);
  /** The round just answered shows its answer in the row for a moment before the next one. */
  const [filled, setFilled] = useState(false);
  const round = rounds[index] ?? rounds[0];
  const timer = useRef(0);

  useEffect(() => {
    speak.prompt("code-pattern", "What comes next?");
  }, [index]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const choose = (choice: IllustrationName) => {
    if (filled || solved >= rounds.length) return;
    if (choice !== round.answer) {
      setWiggle(choice);
      speak.prompt("code-again", "Try again.");
      return;
    }
    setWiggle("");
    setFilled(true);
    playEffect("chime", settingsRef.current);
    const nextSolved = solved + 1;
    timer.current = window.setTimeout(
      () => {
        setSolved(nextSolved);
        if (index < rounds.length - 1) {
          setIndex((current) => current + 1);
          setFilled(false);
        }
      },
      reducedMotion() ? 0 : SOLVED_MS,
    );
  };

  const done = solved >= rounds.length;

  return (
    <div className="game-board code-board" data-rule={round.rule} data-answer={round.answer} data-solved={solved} data-filled={filled ? "true" : "false"}>
      <h1>What comes next?</h1>
      <div className="pattern-row" aria-label="Pattern">
        {round.shown.map((token, tokenIndex) => (
          <span key={`${token}-${tokenIndex}`} className="pattern-token" data-token={token}>
            <Picture art={token} />
          </span>
        ))}
        <span className={`pattern-token pattern-missing${filled ? " is-filled" : ""}`} data-token="missing">
          {filled ? <Picture art={round.answer} /> : "?"}
        </span>
      </div>
      {done ? null : (
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
              <Picture art={choice} />
            </button>
          ))}
        </div>
      )}
      {done ? <FinishButton id="pattern" onDone={onDone} /> : null}
    </div>
  );
}

/** First, then: three pictures of something that happens in one order, to be put in that order. */
function OrderGame({
  level,
  salt,
  settingsRef,
  onDone,
}: {
  level: LogicLevel;
  salt: number;
  settingsRef: { current: Settings };
  onDone: () => void;
}) {
  const rounds = useMemo(() => orderRounds(level, salt), [level, salt]);
  const speak = useSpeaker(settingsRef);
  const [index, setIndex] = useState(0);
  const [placed, setPlaced] = useState<IllustrationName[]>([]);
  const [wiggle, setWiggle] = useState("");
  const [finishedRounds, setFinishedRounds] = useState(0);
  const drag = useRef<{ id: string; x: number; y: number; moved: boolean } | null>(null);
  const timer = useRef(0);
  const round = rounds[index] ?? rounds[0];
  const order = round.cards.map((card) => card.art);
  const cards: Record<string, PictureCard> = Object.fromEntries(round.cards.map((card) => [card.art, card]));
  const sorted = placed.length === order.length;
  const done = finishedRounds >= rounds.length;

  useEffect(() => {
    speak.prompt("code-order", "What comes first? Put the pictures in order.");
  }, [index]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const place = (card: IllustrationName, slot: number) => {
    if (placed.includes(card) || sorted) return;
    if (!orderFits(order, placed, card, slot)) {
      setWiggle(card);
      speak.prompt("code-again", "Try again.");
      return;
    }
    setWiggle("");
    const next = [...placed, card];
    setPlaced(next);
    speak.word(cards[card]?.name ?? card);
    if (next.length < order.length) return;
    playEffect("chime", settingsRef.current);
    timer.current = window.setTimeout(
      () => {
        setFinishedRounds((count) => count + 1);
        if (index < rounds.length - 1) {
          setIndex((current) => current + 1);
          setPlaced([]);
        }
      },
      reducedMotion() ? 0 : SOLVED_MS + 400,
    );
  };

  return (
    <div
      className="game-board code-board"
      data-level={level}
      data-set={round.id}
      data-order={order.join(",")}
      data-placed={placed.join(",")}
      data-sorted={placed.length}
      data-rounds={finishedRounds}
    >
      <h1>First, then</h1>
      <div className="order-slots">
        {order.map((_, slot) => (
          <div key={`${round.id}-${slot}`} className="order-slot" data-slot={slot} data-filled={placed[slot] ?? ""}>
            {placed[slot] ? <Picture art={placed[slot]} /> : <span className="order-number">{slot + 1}</span>}
          </div>
        ))}
      </div>
      {done ? null : (
        <div className="order-cards">
          {round.deal.map((id) => (
            <button
              key={`${round.id}-${id}`}
              type="button"
              className="order-card"
              data-card={id}
              data-used={placed.includes(id) ? "true" : "false"}
              data-wiggle={wiggle === id ? "true" : "false"}
              aria-label={cards[id]?.name ?? id}
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
                  const over = event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
                  if (!over) continue;
                  place(id, Number(slot.getAttribute("data-slot") ?? "-1"));
                  return;
                }
              }}
              // A keyboard sends no pointer events, only a click. Without this, Enter on a card
              // placed nothing and the round could never be finished. Like a tap, it goes in the next place.
              onClick={(event) => {
                if (clickWithoutPointer(event)) place(id, placed.length);
              }}
            >
              <Picture art={id} />
            </button>
          ))}
        </div>
      )}
      {done ? <FinishButton id="morning" onDone={onDone} /> : null}
    </div>
  );
}

/** If, then: the picture shows what is so (it is raining), and the child picks what that calls for. */
function RuleGame({
  level,
  salt,
  animal,
  outfit,
  settingsRef,
  onDone,
}: {
  level: LogicLevel;
  salt: number;
  animal: AnimalId;
  outfit: Outfit;
  settingsRef: { current: Settings };
  onDone: () => void;
}) {
  const rounds = useMemo(() => ruleRounds(level, salt), [level, salt]);
  const speak = useSpeaker(settingsRef);
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [wiggle, setWiggle] = useState("");
  const round = rounds[index] ?? rounds[0];
  const last = index >= rounds.length - 1;

  useEffect(() => {
    setAnswered(false);
    setWiggle("");
    speak.prompt(round.ask, "What do you need?");
  }, [index]);

  const tap = (choice: PictureCard) => {
    if (answered) return;
    if (choice.art !== round.need.art) {
      setWiggle(choice.art);
      speak.prompt("code-again", "Try again.");
      return;
    }
    setWiggle("");
    setAnswered(true);
    // The whole rule, said back: "If it rains, take an umbrella."
    speak.prompt(round.rule, "");
  };

  return (
    <div className="game-board code-board" data-rule={round.id} data-need={round.need.art} data-answered={answered ? "true" : "false"} data-round={index}>
      <h1>If, then</h1>
      <div className="rule-stage">
        <span className="rule-when" data-when={round.when.art}>
          <Picture art={round.when.art} />
        </span>
        <span className="rule-arrow" aria-hidden="true">
          <ArrowIcon dir="right" />
        </span>
        <span className={`rule-then${answered ? " is-filled" : ""}`} data-then={answered ? round.need.art : ""}>
          {answered ? <Picture art={round.need.art} /> : "?"}
        </span>
      </div>
      <div className="rule-who" aria-hidden="true">
        <Hero animal={animal} outfit={outfit} />
      </div>
      {answered ? null : (
        <div className="rule-choices">
          {round.choices.map((choice) => (
            <button
              key={choice.art}
              type="button"
              className="pattern-choice"
              data-choice={choice.art}
              data-wiggle={wiggle === choice.art ? "true" : "false"}
              aria-label={choice.name}
              onClick={() => tap(choice)}
            >
              <Picture art={choice.art} />
            </button>
          ))}
        </div>
      )}
      {answered && !last ? (
        <button type="button" className="start-button" data-next="garden" onClick={() => setIndex((current) => current + 1)}>
          Next
        </button>
      ) : null}
      {answered && last ? <FinishButton id="garden" onDone={onDone} /> : null}
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

/** A small picture for each game's tile in the Coding list. */
export function CodeTileArt({ id }: { id: "bird" | "pattern" | "morning" | "garden" }) {
  if (id === "bird") {
    return (
      <span className="code-tile-art" aria-hidden="true">
        <ArrowIcon dir="right" />
        <NestMark />
      </span>
    );
  }
  const arts: IllustrationName[] = id === "pattern" ? ["cat", "dog", "cat"] : id === "morning" ? ["egg", "chick", "hen"] : ["rain", "umbrella"];
  return (
    <span className="code-tile-art" aria-hidden="true">
      {arts.map((art, index) => (
        <Picture key={`${art}-${index}`} art={art} />
      ))}
    </span>
  );
}
