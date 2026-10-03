import { useEffect, useMemo, useRef, useState } from "react";
import { colorCue, promptCue, type Cue } from "../audio/player";
import type { AnimalId } from "../data/animals";
import { animalById } from "../data/animals";
import { colorLine, mixLineId, mixResult, mixRounds, mixTable, MIXES, nameRounds, paintPots, wantLineId } from "../data/colorGames";
import { colorFill, colorPattern, colorPatternLabel, colorTitle, type ColorLesson, type ColorStep } from "../data/colors";
import { logicLevel } from "../data/logic";
import type { AgeRange } from "../data/profiles";
import type { Outfit } from "../data/wardrobe";
import { GameFrame, newSalt, Pick, useCoach, useFinish, useRounds, useRoundState, useWiggle } from "../game/kit";
import type { Settings } from "../settings";
import { Hero } from "./Hero";
import { LockBadge } from "./LockBadge";

/**
 * LittleNest Colors, rebuilt on the game kit (src/game/kit.tsx).
 *
 * After the first phone test: hearing a color was one question; mixing was a
 * written instruction, a dashed box and a button that said "Keep this color";
 * and painting, opened before mixing, said "Mix two colors first." in writing
 * with nothing to tap. Now a color found fills a balloon, two paints tapped
 * pour into a bowl and are named ("Red and yellow make orange."), and there
 * is always a paint for the animal. See src/data/colorGames.ts.
 *
 * Every paint keeps its pattern (stripes for red, dots for blue), so a color
 * can be told apart without seeing the color itself.
 */

export function ColorSwatch({ name }: { name: string }) {
  const fill = colorFill(name) ?? "var(--paper)";
  const pattern = colorPattern(name);
  return (
    <span className={`color-swatch pattern-${pattern}`} data-color={name} data-pattern={pattern} style={{ backgroundColor: fill }}>
      <span className="color-word">{colorTitle(name)}</span>
      <span className="color-pattern">{colorPatternLabel(name)}</span>
    </span>
  );
}

const board: { id: ColorStep; label: string; name: string }[] = [
  { id: "name", label: "Names", name: "Hear a color" },
  { id: "mix", label: "Mix", name: "Mix paints" },
  { id: "paint", label: "Paint", name: "Paint your animal" },
];

export function ColorBoard({
  lesson,
  done,
  locked,
  onOpen,
}: {
  lesson: ColorLesson;
  done: Record<string, boolean>;
  /** Tiles that open with the full app. */
  locked?: (id: string) => boolean;
  onOpen: (step: ColorStep) => void;
}) {
  return (
    <div className="color-board" data-stage={lesson.stageId} data-week={lesson.weekIndex}>
      {board.map((stop) => (
        <button
          key={stop.id}
          type="button"
          className={`color-activity${done[stop.id] ? " is-done" : ""}${locked?.(stop.id) ? " is-locked" : ""}`}
          data-activity={stop.id}
          data-locked={locked?.(stop.id) ? "true" : undefined}
          aria-label={stop.name}
          onClick={() => onOpen(stop.id)}
        >
          {locked?.(stop.id) ? <LockBadge /> : null}
          <span className="color-activity-art" aria-hidden="true">
            {stop.id === "name" ? <ColorSwatch name={lesson.hear} /> : null}
            {stop.id === "mix" ? <ColorSwatch name="orange" /> : null}
            {stop.id === "paint" ? <ColorSwatch name="blue" /> : null}
          </span>
          <span>{stop.label}</span>
        </button>
      ))}
    </div>
  );
}

const say = (id: string): Cue => promptCue(id, colorLine(id));

/** A pot of paint: the color, with the pattern that tells it apart without seeing the color. */
function PaintPot({ name }: { name: string }) {
  return <span className={`paint-pot pattern-${colorPattern(name)}`} data-color={name} data-pattern={colorPattern(name)} style={{ backgroundColor: colorFill(name) }} />;
}

function Balloon({ color, state }: { color?: string; state: "done" | "now" | "todo" }) {
  const fill = color ? colorFill(color) : undefined;
  return (
    <svg className="color-balloon" viewBox="0 0 60 96" data-state={state} data-color={color ?? ""} aria-hidden="true" focusable="false">
      <path d="M30 70c2 8-6 12 0 24" fill="none" stroke="#8a6a4a" strokeWidth="2" strokeLinecap="round" />
      <path d="M26 68h8l-4-6Z" fill={fill ?? "#c9b8a6"} />
      <ellipse cx="30" cy="34" rx="24" ry="30" fill={fill ?? "#fffdfb"} stroke={fill ? "#1c241f" : "#c9b8a6"} strokeWidth={fill ? 2 : 3} strokeDasharray={fill ? undefined : "6 6"} />
      {fill ? <ellipse cx="21" cy="22" rx="6" ry="9" fill="#ffffff" opacity="0.45" /> : null}
    </svg>
  );
}

type GameProps = {
  ageRange: AgeRange | string;
  animal: AnimalId;
  outfit: Outfit;
  settingsRef: { current: Settings };
};

/** Names: a color is said, and the child finds its paint. Each one found fills a balloon for their animal. */
export function NameActivity({
  lesson,
  ageRange,
  animal,
  outfit,
  settingsRef,
  brief,
  onDone,
}: GameProps & {
  lesson: ColorLesson;
  /** Two colors and no more: for the color moment inside the day's reading lesson. */
  brief?: boolean;
  onDone: (label: string) => void;
}) {
  const level = logicLevel(ageRange);
  const [salt] = useState(newSalt);
  const list = useMemo(() => {
    const all = nameRounds(lesson, level, salt);
    return brief ? all.slice(0, 2) : all;
  }, [lesson, level, salt, brief]);
  const rounds = useRounds(list);
  const round = rounds.round;
  const [solved, setSolved] = useRoundState(rounds.index, false);
  const wiggle = useWiggle();
  const coach = useCoach(settingsRef, [promptCue("name", "Tap the color you hear."), colorCue(round.hear)], rounds.index);
  useFinish(rounds.finished, settingsRef, coach, () => onDone(lesson.hear));

  const choose = (name: string) => {
    if (solved) return;
    if (name !== round.hear) {
      wiggle.shake(name);
      // The wrong paint says its own color, so the miss still teaches a color's name.
      coach.miss([colorCue(name)]);
      return;
    }
    wiggle.still();
    setSolved(true);
    coach.right([colorCue(name)], rounds.next, 1100);
  };

  const filled = rounds.finished ? list.length : rounds.index + (solved ? 1 : 0);
  return (
    <GameFrame
      screen="name"
      title="Colors"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="field"
      attrs={{ "data-hear": round.hear, "data-answer": round.hear, "data-level": level, "data-solved": solved ? "true" : "false" }}
      stage={
        // One balloon for each color to find. A found color fills the next one.
        <span className="color-balloons" data-filled={filled}>
          {list.map((item, index) => (
            <Balloon key={index} color={index < filled ? item.hear : undefined} state={index < filled ? "done" : index === filled ? "now" : "todo"} />
          ))}
        </span>
      }
    >
      {round.choices.map((name) => (
        <Pick
          key={name}
          id={name}
          name={colorTitle(name)}
          size={round.choices.length > 3 ? "mid" : "big"}
          art={<PaintPot name={name} />}
          label={colorTitle(name)}
          wiggle={wiggle.id === name ? wiggle.count : 0}
          reveal={coach.reveal && name === round.hear}
          onPick={() => choose(name)}
          attrs={{ "data-color": name, "data-pattern": colorPattern(name) }}
        />
      ))}
    </GameFrame>
  );
}

/** A jar of a color that has been mixed. */
function Jar({ color, want }: { color: string; want?: boolean }) {
  return (
    <svg className="mix-jar" viewBox="0 0 40 52" data-jar={color} data-want={want ? "true" : undefined} aria-hidden="true" focusable="false">
      <rect x="6" y="12" width="28" height="36" rx="8" fill={colorFill(color)} stroke="#1c241f" strokeWidth="2" strokeDasharray={want ? "5 4" : undefined} />
      <rect x="9" y="4" width="22" height="10" rx="4" fill="#c9b8a6" stroke="#1c241f" strokeWidth="2" />
      <rect x="11" y="18" width="5" height="16" rx="2.5" fill="#ffffff" opacity="0.4" />
    </svg>
  );
}

/** The bowl: empty, with the first paint in it, or with two paints turning into what they make. */
function Bowl({ first, second, result }: { first?: string; second?: string; result?: string }) {
  return (
    <svg className="mix-bowl" viewBox="0 0 160 110" data-first={first ?? ""} data-second={second ?? ""} data-result={result ?? ""} aria-hidden="true" focusable="false">
      <ellipse cx="80" cy="100" rx="52" ry="7" fill="rgba(36, 48, 86, 0.12)" />
      <path d="M14 38c0 36 28 62 66 62s66-26 66-62Z" fill="#fffdfb" stroke="#c9b8a6" strokeWidth="4" />
      <ellipse cx="80" cy="38" rx="66" ry="16" fill="#f1e8dc" stroke="#c9b8a6" strokeWidth="4" />
      <clipPath id="bowl-left">
        <rect x="0" y="0" width="80" height="110" />
      </clipPath>
      <clipPath id="bowl-right">
        <rect x="80" y="0" width="80" height="110" />
      </clipPath>
      {first ? <ellipse className="bowl-paint" cx="80" cy="39" rx="56" ry="11" fill={colorFill(first)} clipPath={second ? "url(#bowl-left)" : undefined} /> : null}
      {second ? <ellipse className="bowl-paint" cx="80" cy="39" rx="56" ry="11" fill={colorFill(second)} clipPath="url(#bowl-right)" /> : null}
      {result ? (
        <g className="bowl-mixed">
          <ellipse cx="80" cy="39" rx="56" ry="11" fill={colorFill(result)} />
          <path d="M52 39c10-7 22 6 30-1s18-4 24 1" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
        </g>
      ) : null}
    </svg>
  );
}

/** How long two paints that did not finish the round stay in the bowl. */
const MIX_SHOW_MS = 2200;

/**
 * Mix: tap two paints. They pour into the bowl, turn into what they make, and the voice says it
 * ("Red and yellow make orange."). Each new color goes on the shelf. Ages 5 to 7 are then asked to
 * make a color by name.
 */
export function MixActivity({ ageRange, animal, outfit, settingsRef, onDone }: GameProps & { onDone: (made: string[]) => void }) {
  const level = logicLevel(ageRange);
  const [salt] = useState(newSalt);
  const list = useMemo(() => mixRounds(level, salt), [level, salt]);
  const rounds = useRounds(list);
  const round = rounds.round;
  const paints = mixTable(level);
  const [made, setMade] = useState<string[]>([]);
  const [first, setFirst] = useRoundState<string | null>(rounds.index, null);
  const [bowl, setBowl] = useRoundState<{ first: string; second: string; result: string; turn: number } | null>(rounds.index, null);
  const [solved, setSolved] = useRoundState(rounds.index, false);
  const [repeats, setRepeats] = useRoundState(rounds.index, 0);
  const turn = useRef(0);
  const clear = useRef<number | null>(null);
  const wiggle = useWiggle();
  const coach = useCoach(settingsRef, [say(round.kind === "make" ? wantLineId(round.want) : "color-mix")], rounds.index);
  useFinish(rounds.finished, settingsRef, coach, () => onDone(made));
  useEffect(
    () => () => {
      if (clear.current !== null) window.clearTimeout(clear.current);
    },
    [],
  );

  // The two paints to point at: for a color asked for, after three misses; for "find", after the same
  // color has been made twice over, two paints that make one not made yet.
  const hint: readonly string[] =
    round.kind === "make"
      ? coach.reveal
        ? MIXES[round.want]
        : []
      : repeats >= 2
        ? (Object.entries(MIXES).find(([result, pair]) => !made.includes(result) && pair.every((paint) => paints.includes(paint)))?.[1] ?? [])
        : [];

  const tap = (color: string) => {
    if (solved || bowl) return;
    if (!first) {
      setFirst(color);
      coach.touch([colorCue(color)]);
      return;
    }
    if (first === color) {
      // The same pot again puts it back.
      setFirst(null);
      coach.touch();
      return;
    }
    const result = mixResult(first, color);
    if (!result) return;
    turn.current += 1;
    setBowl({ first, second: color, result, turn: turn.current });
    setFirst(null);
    const said = [say(mixLineId(result))];
    const good = round.kind === "make" ? result === round.want : !made.includes(result);
    if (good) {
      wiggle.still();
      setSolved(true);
      if (!made.includes(result)) setMade([...made, result]);
      coach.right(said, rounds.next, 1800);
      return;
    }
    if (round.kind === "make") {
      // Not the color asked for. What it did make is still said: it is a mix worth knowing.
      wiggle.shake(color);
      coach.miss(said);
    } else {
      // A color already on the shelf is not a miss; it just is not a new one.
      setRepeats((count) => count + 1);
      coach.touch([...said, say("color-again")]);
    }
    if (clear.current !== null) window.clearTimeout(clear.current);
    clear.current = window.setTimeout(() => setBowl(null), MIX_SHOW_MS);
  };

  return (
    <GameFrame
      screen="mix"
      title="Mix"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="table"
      attrs={{
        "data-task": round.kind,
        "data-want": round.kind === "make" ? round.want : "",
        "data-first": first ?? "",
        "data-result": bowl ? bowl.result : "",
        "data-made": made.join(","),
        "data-busy": bowl ? "true" : "false",
        "data-level": level,
        "data-solved": solved ? "true" : "false",
      }}
      stage={
        <span className="mix-scene">
          <span className="mix-shelf" data-made={made.length}>
            {made.map((color) => (
              <Jar key={color} color={color} />
            ))}
            {/* The color asked for is shown too, as an empty-looking jar with a dashed edge, for a child who does not know its name yet. */}
            {round.kind === "make" && !solved ? <Jar color={round.want} want /> : null}
          </span>
          <Bowl key={bowl ? bowl.turn : "open"} first={bowl ? bowl.first : (first ?? undefined)} second={bowl?.second} result={bowl?.result} />
        </span>
      }
    >
      {paints.map((color) => (
        <Pick
          key={color}
          id={color}
          name={colorTitle(color)}
          size={paints.length > 3 ? "mid" : "big"}
          art={<PaintPot name={color} />}
          label={colorTitle(color)}
          chosen={first === color}
          wiggle={wiggle.id === color ? wiggle.count : 0}
          reveal={!bowl && !solved && hint.includes(color)}
          onPick={() => tap(color)}
          attrs={{ "data-blob": color, "data-pattern": colorPattern(color) }}
        />
      ))}
    </GameFrame>
  );
}

/**
 * Paint: the child's animal, and pots of paint: the colors they have mixed, and red, yellow and blue to
 * make up three, so there is always something to paint with. A tap colors the animal; the check keeps it.
 */
export function PaintActivity({
  animal,
  outfit,
  made,
  settingsRef,
  onDone,
}: {
  animal: AnimalId;
  outfit: Outfit;
  made: string[];
  settingsRef: { current: Settings };
  onDone: (label: string) => void;
}) {
  const rounds = useRounds(useMemo(() => ["paint"], []));
  const pots = useMemo(() => paintPots(made), [made]);
  const [picked, setPicked] = useState("");
  const [kept, setKept] = useState(false);
  const name = animalById(animal).name;
  // Before a paint is chosen the voice asks for one; after, it asks for the check.
  const coach = useCoach(settingsRef, [say(picked ? "color-keep" : "color-paint")], rounds.index);
  useFinish(rounds.finished, settingsRef, coach, () => onDone(`${picked} ${name.toLowerCase()}`));

  const paint = (color: string) => {
    if (kept) return;
    // The check is asked for once, the first time; after that a tap just names the color.
    coach.touch(picked ? [colorCue(color)] : [colorCue(color), say("color-keep")]);
    setPicked(color);
  };

  const keep = () => {
    if (kept || !picked) return;
    setKept(true);
    coach.right([], rounds.next);
  };

  return (
    <GameFrame
      screen="paint"
      title="Paint"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="room"
      attrs={{ "data-made": made.length, "data-tint": picked, "data-kept": kept ? "true" : "false" }}
      stage={
        // The paint colors the animal itself, not a patch laid over it: the filter multiplies the color into
        // the animal's own drawing and nowhere else. (It was a see-through oval, which showed as a halo.)
        <span className="painted-hero" data-animal={animal} data-tint={picked}>
          <svg className="paint-filter" width="0" height="0" aria-hidden="true" focusable="false">
            <filter id="paint-tint" colorInterpolationFilters="sRGB">
              <feFlood floodColor={picked ? colorFill(picked) : "#ffffff"} floodOpacity="0.6" result="paint" />
              <feComposite in="paint" in2="SourceAlpha" operator="in" result="coat" />
              <feBlend in="coat" in2="SourceGraphic" mode="multiply" />
            </filter>
          </svg>
          {picked ? <span key={`splash-${picked}`} className="paint-splash" style={{ backgroundColor: colorFill(picked) }} aria-hidden="true" /> : null}
          <Hero animal={animal} outfit={outfit} />
          {/* The paint in use, with its pattern, beside the animal: the color alone cannot show a pattern. */}
          {picked ? (
            <span key={picked} className="painted-badge" aria-hidden="true">
              <PaintPot name={picked} />
            </span>
          ) : null}
        </span>
      }
    >
      {pots.map((color) => (
        <Pick
          key={color}
          id={color}
          name={`${colorTitle(color)}, ${colorPatternLabel(color)}`}
          size={pots.length > 3 ? "small" : "mid"}
          art={<PaintPot name={color} />}
          chosen={picked === color}
          onPick={() => paint(color)}
          attrs={{ "data-color": color, "data-pattern": colorPattern(color) }}
        />
      ))}
      <Pick
        id="keep"
        name="Keep it"
        size={pots.length > 3 ? "small" : "mid"}
        used={!picked}
        demo={Boolean(picked) && coach.nudge}
        art={
          <svg className="keep-art" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
            <circle cx="32" cy="32" r="26" fill="#7fb28a" />
            <path d="M20 33l9 9 16-18" fill="none" stroke="#fffdfb" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        }
        onPick={keep}
        attrs={{ "data-keep": "true" }}
      />
    </GameFrame>
  );
}
