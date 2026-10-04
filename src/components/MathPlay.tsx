import { useEffect, useMemo, useRef, useState, type JSX, type PointerEvent } from "react";
import { numberCue, promptCue, type Cue } from "../audio/player";
import type { AnimalId } from "../data/animals";
import { logicLevel } from "../data/logic";
import { THEMES, type ThemeId } from "../data/themes";
import type { AgeRange } from "../data/profiles";
import type { Outfit } from "../data/wardrobe";
import { GameFrame, newSalt, Pick, useCoach, useFinish, useRounds, useRoundState, useWiggle } from "../game/kit";
import { Illustration, illustrations } from "../illustrations";
import { themeArt } from "../themeArt";
import { PathTrace } from "./PathTrace";
import { shapeTitles, tracePoints, type MathGame, type MathLesson, type ShapeId } from "../data/math";
import {
  addLineId,
  addRounds,
  countRounds,
  knowRounds,
  moreAnswer,
  moreRounds,
  numberLine,
  shapeRounds,
  tenFrame,
  type CountThing,
} from "../data/numberGames";
import { memoryPrompt, shapeItemId, writingLevel, type WritingMap, type WritingOutcome } from "../data/scaffold";
import { shapeStrokes } from "../data/shapeStrokes";
import { useSpeaker } from "../hooks/useSpeaker";
import type { Settings } from "../settings";
import { LockBadge } from "./LockBadge";
import { Ladybug, Strawberry } from "./mathArt";

/**
 * LittleNest Numbers, rebuilt on the game kit (src/game/kit.tsx).
 *
 * After the first phone test each of these was one question at the top of an
 * empty screen. Now each is a few rounds in a scene with the child's animal:
 * things to count that say their number, a number to hear, a block for the
 * hole in a toy box, two plates to compare, two groups that come together.
 * The first round is always this week's lesson; see src/data/numberGames.ts.
 *
 * Tracing a number keeps its own board (TraceActivity), and a shape is still
 * traced after it is found.
 */

function Apple() {
  return (
    <svg className="math-apple" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 14c2-6 8-8 12-6-2 6-6 8-10 8" fill="none" stroke="#6e9a74" strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="38" r="16" fill="#e07a5f" />
      <ellipse cx="26" cy="32" rx="4" ry="3" fill="#f4c7b8" opacity="0.8" />
    </svg>
  );
}

type GameProps = {
  lesson: MathLesson;
  ageRange: AgeRange | string;
  animal: AnimalId;
  outfit: Outfit;
  settingsRef: { current: Settings };
  onDone: (label: string) => void;
};

const say = (id: string): Cue => promptCue(id, numberLine(id));

/**
 * How much bigger each drawing is shown, and how far it is moved up, as a thing to count.
 *
 * The app's drawings sit in a wide box with air around them, and not all the same: the bee is a small
 * thing low in its box, the butterfly nearly fills it. Shown as they are, a bee was a speck and four
 * butterflies ran into each other. Each is fitted to its slot: `scale` from the drawing's own width and
 * height, `up` (a share of its height) to bring its middle to the middle.
 */
const THING_FIT: Record<Exclude<CountThing, "apple">, { scale: number; up: number }> = {
  star: { scale: 1.38, up: 7 },
  duck: { scale: 1.39, up: 17 },
  bee: { scale: 1.8, up: 27 },
  egg: { scale: 1.33, up: 7 },
  flower: { scale: 1.5, up: 4 },
  butterfly: { scale: 1.18, up: 8 },
};

/** One of the things to count: the app's drawing of it, or the apple. */
function Thing({ thing }: { thing: CountThing }) {
  if (thing === "apple") return <Apple />;
  const fit = THING_FIT[thing];
  return (
    <span className="thing-fit" style={{ transform: `translateY(-${fit.up}%) scale(${fit.scale})` }}>
      <Illustration name={thing} />
    </span>
  );
}

/** The day's theme object, when a theme is picked: the first group to count is made of it. */
function themeThing(theme?: ThemeId): { name: string; Art: () => JSX.Element } | null {
  if (!theme) return null;
  const Art = theme === "ocean" ? illustrations.fish : themeArt[theme];
  return {
    name: THEMES[theme].object,
    Art: () => (
      <span className="thing-fit" style={{ transform: "scale(1.25)" }}>
        <Art />
      </span>
    ),
  };
}

function ShapePath({ id, fill }: { id: ShapeId; fill: string }) {
  if (id === "circle") return <circle cx="40" cy="40" r="26" fill={fill} />;
  if (id === "square") return <rect x="16" y="16" width="48" height="48" rx="8" fill={fill} />;
  if (id === "triangle") return <path d="M40 14 68 64H12Z" fill={fill} />;
  if (id === "rectangle") return <rect x="10" y="24" width="60" height="34" rx="8" fill={fill} />;
  if (id === "star") return <path d="M40 12 48 32h22L54 46l6 22-20-12-20 12 6-22L10 32h22Z" fill={fill} />;
  return <path d="M40 68c-16-10-24-20-24-32a12 12 0 0 1 24-4 12 12 0 0 1 24 4c0 12-8 22-24 32Z" fill={fill} />;
}

const SHAPE_FILL: Record<ShapeId, string> = { circle: "#f4a4b4", square: "#f6c445", triangle: "#8fcb7a", rectangle: "#8eb8d8", star: "#f2c14e", heart: "#e07a8a" };

/** A shape as a picture. `tint` gives it another color, so a game can ask for the shape and not its color. */
export function ShapeGlyph({ id, tint }: { id: ShapeId; tint?: string }) {
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <ShapePath id={id} fill={tint ?? SHAPE_FILL[id]} />
    </svg>
  );
}

/**
 * The Numbers page, in the order a child meets the skills: count, see a few at a glance, count out a
 * set, then numerals, shapes, comparing and adding. Count stays first: it is the free one.
 */
const board: { id: MathGame; label: string; name: string }[] = [
  { id: "count", label: "Count", name: "Count objects" },
  { id: "peek", label: "Peek", name: "How many did you see" },
  { id: "bakery", label: "Bakery", name: "Give that many" },
  { id: "know", label: "Numbers", name: "Hear a number" },
  { id: "shape", label: "Shapes", name: "Match a shape" },
  { id: "more", label: "More", name: "Which has more" },
  { id: "add", label: "Add", name: "Add the groups" },
  { id: "trace", label: "Trace", name: "Trace a number" },
];

/** Two plates, one fuller: the More tile. */
function MoreTileArt() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <ellipse cx="15" cy="52" rx="13" ry="5" fill="#e6dccf" />
      <circle cx="15" cy="42" r="8" fill="#e07a5f" />
      <ellipse cx="46" cy="52" rx="17" ry="5" fill="#e6dccf" />
      <circle cx="38" cy="42" r="8" fill="#e07a5f" />
      <circle cx="54" cy="42" r="8" fill="#e07a5f" />
      <circle cx="46" cy="28" r="8" fill="#e07a5f" />
    </svg>
  );
}

/** One and one with a plus: the Add tile. */
function AddTileArt() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <circle cx="11" cy="32" r="10" fill="#e07a5f" />
      <path d="M32 22v20M22 32h20" stroke="#3d6b86" strokeWidth="6" strokeLinecap="round" />
      <circle cx="53" cy="32" r="10" fill="#e07a5f" />
    </svg>
  );
}

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
  onOpen: (step: MathGame) => void;
}) {
  return (
    <div className="math-board is-even" data-stage={lesson.stageId} data-week={lesson.weekIndex}>
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
            {stop.id === "count" ? <Apple /> : null}
            {stop.id === "more" ? <MoreTileArt /> : null}
            {stop.id === "add" ? <AddTileArt /> : null}
            {stop.id === "peek" ? <Ladybug /> : null}
            {stop.id === "bakery" ? <Strawberry /> : null}
            {stop.id === "know" || stop.id === "trace" ? <span className="math-numeral">{stop.id === "trace" ? lesson.digit : lesson.hear}</span> : null}
            {stop.id === "shape" ? <ShapeGlyph id={lesson.shape} /> : null}
          </span>
          <span>{stop.label}</span>
        </button>
      ))}
    </div>
  );
}

/** How many columns a group of this many is laid out in, so ten still fit the scene on a phone. */
function columnsFor(count: number): number {
  if (count <= 3) return count;
  if (count <= 6) return 3;
  return count <= 8 ? 4 : 5;
}

/**
 * A group of things that count aloud when tapped: the first one tapped is "one", the next "two".
 * Each keeps its number on it, so the child can see which are counted.
 */
function CountGroup({
  count,
  cols,
  first,
  numbers,
  art,
  name,
  onCount,
}: {
  count: number;
  /** How many to a row, when the group has less room than the whole scene. */
  cols?: number;
  /** The place of this group's first thing among everything on screen (a second group goes on counting). */
  first?: number;
  /** For each thing counted so far, the number it was given. */
  numbers: Record<number, number>;
  art: JSX.Element;
  name: string;
  onCount: (index: number) => void;
}) {
  const start = first ?? 0;
  return (
    <span className="count-group" data-count={count} style={{ ["--cols" as string]: cols ?? columnsFor(count) }}>
      {Array.from({ length: count }, (_, at) => {
        const index = start + at;
        const number = numbers[index];
        return (
          <button
            key={index}
            type="button"
            className="count-thing"
            data-object={index}
            data-counted={number ? "true" : "false"}
            aria-label={number ? `${name} ${number}, counted` : name}
            onClick={() => onCount(index)}
          >
            {art}
            {number ? <span className="count-badge">{number}</span> : null}
          </button>
        );
      })}
    </span>
  );
}

/** The numbers given to things in the order they were tapped: { thing: 1, another: 2 }. */
function numbered(counted: number[]): Record<number, number> {
  return Object.fromEntries(counted.map((index, at) => [index, at + 1]));
}

/** The things counted so far, in order; with `finish`, the rest are counted too, after the child's own. */
function countedOut(counted: number[], total: number, finish: boolean): number[] {
  if (!finish) return counted;
  const rest = Array.from({ length: total }, (_, index) => index).filter((index) => !counted.includes(index));
  return [...counted, ...rest];
}

/** A number to tap. */
function NumberPick({ value, size, wiggle, reveal, onPick, attr }: { value: number; size?: "big" | "mid"; wiggle: number; reveal: boolean; onPick: () => void; attr: string }) {
  return (
    <Pick
      id={String(value)}
      name={String(value)}
      size={size}
      art={<span className="pick-number is-numeral">{value}</span>}
      wiggle={wiggle}
      reveal={reveal}
      onPick={onPick}
      attrs={{ [attr]: value }}
    />
  );
}

/** Count: a group of things in the garden. Each says its number when tapped; then the child taps how many there are. */
export function CountActivity({ lesson, ageRange, animal, outfit, settingsRef, onDone, theme }: GameProps & { theme?: ThemeId }) {
  const level = logicLevel(ageRange);
  const [salt] = useState(newSalt);
  const list = useMemo(() => countRounds(lesson, level, salt), [lesson, level, salt]);
  const rounds = useRounds(list);
  const round = rounds.round;
  const [counted, setCounted] = useRoundState<number[]>(rounds.index, []);
  const [solved, setSolved] = useRoundState(rounds.index, false);
  const wiggle = useWiggle();
  const all = counted.length >= round.count;
  // Once every one is counted, what is left to do is tap the number, so that is what waiting repeats.
  const coach = useCoach(settingsRef, [say(all ? "num-count-pick" : "num-count")], rounds.index);
  useFinish(rounds.finished, settingsRef, coach, () => onDone(String(lesson.count)));
  // The first group is made of the day's theme object when a theme is picked.
  const themed = rounds.index === 0 ? themeThing(theme) : null;

  const countOne = (index: number) => {
    if (solved || counted.includes(index)) return;
    const next = [...counted, index];
    setCounted(next);
    coach.touch(next.length >= round.count ? [numberCue(next.length), say("num-count-pick")] : [numberCue(next.length)]);
  };

  const choose = (value: number) => {
    if (solved) return;
    if (value !== round.count) {
      wiggle.shake(String(value));
      coach.miss([numberCue(value)]);
      return;
    }
    wiggle.still();
    setSolved(true);
    coach.right([numberCue(value)], rounds.next);
  };

  // After three misses the group is counted for the child, and the hand points at the number.
  const shown = countedOut(counted, round.count, coach.reveal || solved);
  return (
    <GameFrame
      screen="count"
      title="Count"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="field"
      attrs={{
        "data-target": round.count,
        "data-answer": round.count,
        "data-counted": counted.length,
        "data-thing": themed ? themed.name : round.thing,
        "data-theme": theme ?? "",
        "data-level": level,
        "data-solved": solved ? "true" : "false",
      }}
      stage={
        <CountGroup
          count={round.count}
          numbers={numbered(shown)}
          art={themed ? <themed.Art /> : <Thing thing={round.thing} />}
          name={themed ? themed.name : round.thing}
          onCount={countOne}
        />
      }
    >
      {round.choices.map((value) => (
        <NumberPick
          key={value}
          value={value}
          wiggle={wiggle.id === String(value) ? wiggle.count : 0}
          reveal={coach.reveal && value === round.count}
          onPick={() => choose(value)}
          attr="data-number"
        />
      ))}
    </GameFrame>
  );
}

/** A frame of two rows of five, with a dot for each one: what a number looks like as a group. */
function TenFrame({ value }: { value: number }) {
  const frames = Math.max(1, Math.ceil(value / 10));
  return (
    <span className="ten-frames" data-value={value}>
      {Array.from({ length: frames }, (_, frame) => {
        const dots = tenFrame(Math.min(10, value - frame * 10));
        return (
          <svg key={frame} className="ten-frame" viewBox="0 0 110 48" aria-hidden="true" focusable="false">
            <rect x="1" y="1" width="108" height="46" rx="8" fill="#fffdfb" stroke="#c9b8a6" strokeWidth="2" />
            <path d="M22.6 1v46M44.2 1v46M65.8 1v46M87.4 1v46M1 24h108" stroke="#e6dccf" strokeWidth="1.5" />
            {dots.map((dot, index) => (
              <circle key={index} className="ten-dot" style={{ animationDelay: `${index * 60}ms` }} cx={11.8 + dot.column * 21.6} cy={12.5 + dot.row * 23} r="7" fill="#e07a5f" />
            ))}
          </svg>
        );
      })}
    </span>
  );
}

/** Numbers: a number is said, and the child finds it. Found, it is shown big, with that many dots. */
export function KnowActivity({ lesson, ageRange, animal, outfit, settingsRef, onDone }: GameProps) {
  const level = logicLevel(ageRange);
  const [salt] = useState(newSalt);
  const list = useMemo(() => knowRounds(lesson, level, salt), [lesson, level, salt]);
  const rounds = useRounds(list);
  const round = rounds.round;
  const [solved, setSolved] = useRoundState(rounds.index, false);
  const wiggle = useWiggle();
  const coach = useCoach(settingsRef, [promptCue("know", "Tap the number you hear."), numberCue(round.hear)], rounds.index);
  useFinish(rounds.finished, settingsRef, coach, () => onDone(String(lesson.hear)));

  const choose = (value: number) => {
    if (solved) return;
    if (value !== round.hear) {
      wiggle.shake(String(value));
      coach.miss([numberCue(value)]);
      return;
    }
    wiggle.still();
    setSolved(true);
    coach.right([numberCue(value)], rounds.next, 1300);
  };

  return (
    <GameFrame
      screen="know"
      title="Numbers"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="room"
      attrs={{ "data-hear": round.hear, "data-answer": round.hear, "data-level": level, "data-solved": solved ? "true" : "false" }}
      stage={
        <span className="hear-card" data-shown={solved ? "true" : "false"}>
          {solved ? (
            <>
              <span className="hear-numeral">{round.hear}</span>
              <TenFrame value={round.hear} />
            </>
          ) : (
            // Nothing here gives the number away: it is heard. The waves say "listen".
            <svg className="hear-waves" viewBox="0 0 120 90" aria-hidden="true" focusable="false">
              <path d="M24 34h16l20-16v54L40 56H24Z" fill="#c48f5c" />
              <path d="M72 30c8 8 8 22 0 30M84 20c14 14 14 36 0 50M96 10c20 20 20 50 0 70" fill="none" stroke="#c48f5c" strokeWidth="6" strokeLinecap="round" />
            </svg>
          )}
        </span>
      }
    >
      {round.choices.map((value) => (
        <NumberPick
          key={value}
          value={value}
          size={round.choices.length > 3 ? "mid" : "big"}
          wiggle={wiggle.id === String(value) ? wiggle.count : 0}
          reveal={coach.reveal && value === round.hear}
          onPick={() => choose(value)}
          attr="data-number"
        />
      ))}
    </GameFrame>
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

  useEffect(() => {
    speak.line([promptCue("trace", "Trace the number."), numberCue(lesson.digit)]);
  }, [speak, lesson.digit]);

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

/** Shapes: a toy box with a hole, and three blocks. The block that fits drops in. Then this week's shape is traced. */
export function ShapeActivity({
  lesson,
  ageRange,
  animal,
  outfit,
  settingsRef,
  writing,
  onAttempt,
  onDone,
}: GameProps & {
  writing?: WritingMap;
  onAttempt?: (id: string, success: boolean) => WritingOutcome;
}) {
  const level = logicLevel(ageRange);
  const speak = useSpeaker(settingsRef);
  const [salt] = useState(newSalt);
  const list = useMemo(() => shapeRounds(lesson, level, salt), [lesson, level, salt]);
  const rounds = useRounds(list);
  const round = rounds.round;
  const [fitted, setFitted] = useRoundState<string | null>(rounds.index, null);
  const [tries, setTries] = useState(0);
  const wiggle = useWiggle();
  const coach = useCoach(settingsRef, [promptCue("shape", "Find the same shape."), promptCue(round.shape, shapeTitles[round.shape])], rounds.index);

  const choose = (choice: { shape: ShapeId; tint: string }) => {
    if (fitted) return;
    if (choice.shape !== round.shape) {
      wiggle.shake(choice.shape);
      setTries((count) => count + 1);
      // The wrong block says what it is, so the miss still teaches a shape's name.
      coach.miss([promptCue(choice.shape, shapeTitles[choice.shape])]);
      return;
    }
    wiggle.still();
    setFitted(choice.tint);
    coach.right([promptCue(choice.shape, shapeTitles[choice.shape])], rounds.next, 1200);
  };

  // The blocks are all found: this week's shape is traced, as it was before.
  if (rounds.finished) {
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
    <GameFrame
      screen="shape"
      title="Shapes"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="room"
      attrs={{ "data-phase": "match", "data-prompt": round.shape, "data-answer": round.shape, "data-tries": tries, "data-level": level, "data-solved": fitted ? "true" : "false" }}
      stage={
        // A shape sorter: the hole is the shape asked for, and the block that fits is seen in it.
        <svg className="sorter-art" viewBox="0 0 160 150" data-fitted={fitted ? "true" : "false"} aria-hidden="true" focusable="false">
          <rect x="14" y="26" width="132" height="116" rx="18" fill="#9ccbe8" />
          <rect x="14" y="26" width="132" height="30" rx="14" fill="#b9dcf1" />
          <rect x="8" y="16" width="144" height="24" rx="12" fill="#f6d56b" />
          <g transform="translate(40 52)">
            <ShapePath id={round.shape} fill="#3d6b86" />
            {fitted ? (
              <g className="sorter-block">
                <ShapePath id={round.shape} fill={fitted} />
              </g>
            ) : null}
          </g>
        </svg>
      }
    >
      {round.choices.map((choice) => (
        <Pick
          key={choice.shape}
          id={choice.shape}
          name={shapeTitles[choice.shape]}
          art={<ShapeGlyph id={choice.shape} tint={choice.tint} />}
          wiggle={wiggle.id === choice.shape ? wiggle.count : 0}
          reveal={coach.reveal && choice.shape === round.shape}
          onPick={() => choose(choice)}
          attrs={{ "data-shape": choice.shape }}
        />
      ))}
    </GameFrame>
  );
}

/** A plate with a group of things on it. */
function Plate({ count, thing }: { count: number; thing: CountThing }) {
  return (
    <span className="plate" data-count={count} style={{ ["--cols" as string]: count <= 4 ? 2 : 3 }}>
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className="plate-thing">
          <Thing thing={thing} />
        </span>
      ))}
    </span>
  );
}

/** More: two plates. The child taps the one with more (or, for ages 5 to 7, fewer), and it is counted aloud. */
export function MoreActivity({ lesson, ageRange, animal, outfit, settingsRef, onDone }: GameProps) {
  const level = logicLevel(ageRange);
  const [salt] = useState(newSalt);
  const list = useMemo(() => moreRounds(lesson, level, salt), [lesson, level, salt]);
  const rounds = useRounds(list);
  const round = rounds.round;
  const [solved, setSolved] = useRoundState(rounds.index, false);
  const wiggle = useWiggle();
  const coach = useCoach(settingsRef, [round.ask === "more" ? promptCue("more", "Which has more?") : say("num-fewer")], rounds.index);
  useFinish(rounds.finished, settingsRef, coach, () => onDone(String(Math.max(lesson.moreLeft, lesson.moreRight))));
  const answer = moreAnswer(round);
  const answerCount = answer === "left" ? round.left : round.right;

  const choose = (side: "left" | "right", count: number) => {
    if (solved) return;
    if (side !== answer) {
      wiggle.shake(side);
      // The other plate is named for what it is: "Two is fewer."
      coach.miss([numberCue(count), say(round.ask === "more" ? "num-is-fewer" : "num-is-more")]);
      return;
    }
    wiggle.still();
    setSolved(true);
    coach.right([numberCue(count), say(round.ask === "more" ? "num-is-more" : "num-is-fewer")], rounds.next, 1300);
  };

  return (
    <GameFrame
      screen="more"
      title={round.ask === "more" ? "More" : "Fewer"}
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="table"
      attrs={{ "data-ask": round.ask, "data-answer": answer, "data-level": level, "data-solved": solved ? "true" : "false" }}
      stage={
        // The plate chosen is set down in front of the animal, with its number.
        <span className="more-won" data-shown={solved ? "true" : "false"}>
          {solved ? (
            <>
              <Plate count={answerCount} thing={round.thing} />
              <span className="hear-numeral">{answerCount}</span>
            </>
          ) : (
            <span className="plate is-empty" />
          )}
        </span>
      }
    >
      {(["left", "right"] as const).map((side) => {
        const count = side === "left" ? round.left : round.right;
        return (
          <Pick
            key={side}
            id={side}
            name={`${count} on the ${side}`}
            art={<Plate count={count} thing={round.thing} />}
            wiggle={wiggle.id === side ? wiggle.count : 0}
            reveal={coach.reveal && side === answer}
            onPick={() => choose(side, count)}
            attrs={{ "data-side": side, "data-count": count }}
          />
        );
      })}
    </GameFrame>
  );
}

/** Add: two groups. Each thing counts aloud when tapped. The number that is both together brings them together. */
export function AddActivity({ lesson, ageRange, animal, outfit, settingsRef, onDone }: GameProps) {
  const level = logicLevel(ageRange);
  const [salt] = useState(newSalt);
  const list = useMemo(() => addRounds(lesson, level, salt), [lesson, level, salt]);
  const rounds = useRounds(list);
  const round = rounds.round;
  const [counted, setCounted] = useRoundState<number[]>(rounds.index, []);
  const [solved, setSolved] = useRoundState(rounds.index, false);
  const wiggle = useWiggle();
  const coach = useCoach(settingsRef, [promptCue("add", "How many altogether?")], rounds.index);
  useFinish(rounds.finished, settingsRef, coach, () => onDone(String(lesson.addLeft + lesson.addRight)));

  const countOne = (index: number) => {
    if (solved || counted.includes(index)) return;
    const next = [...counted, index];
    setCounted(next);
    coach.touch([numberCue(next.length)]);
  };

  const choose = (value: number) => {
    if (solved) return;
    if (value !== round.sum) {
      wiggle.shake(String(value));
      coach.miss([numberCue(value)]);
      return;
    }
    wiggle.still();
    setSolved(true);
    // The whole sum is said: "Two and one make three."
    coach.right([say(addLineId(round.left, round.right))], rounds.next, 1500);
  };

  // Solved, or shown after three misses: every one carries its number, counted across both groups.
  const shown = countedOut(counted, round.sum, coach.reveal || solved);
  const art = <Thing thing={round.thing} />;
  return (
    <GameFrame
      screen="add"
      title="Add"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="table"
      attrs={{
        "data-left": round.left,
        "data-right": round.right,
        "data-answer": round.sum,
        "data-counted": counted.length,
        "data-level": level,
        "data-solved": solved ? "true" : "false",
      }}
      stage={
        <span className="add-row" data-joined={solved ? "true" : "false"}>
          <CountGroup count={round.left} cols={Math.min(2, round.left)} numbers={numbered(shown)} art={art} name={round.thing} onCount={countOne} />
          <span className="add-plus" aria-hidden="true">
            +
          </span>
          <CountGroup count={round.right} cols={Math.min(2, round.right)} first={round.left} numbers={numbered(shown)} art={art} name={round.thing} onCount={countOne} />
        </span>
      }
    >
      {round.choices.map((value) => (
        <NumberPick
          key={value}
          value={value}
          wiggle={wiggle.id === String(value) ? wiggle.count : 0}
          reveal={coach.reveal && value === round.sum}
          onPick={() => choose(value)}
          attr="data-sum"
        />
      ))}
    </GameFrame>
  );
}
