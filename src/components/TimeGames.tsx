import { useMemo, useState } from "react";
import { numberCue, promptCue, type Cue } from "../audio/player";
import type { AnimalId } from "../data/animals";
import { clockRounds, dayRounds, DOTS_TO_NEXT, ROUTINE_ART, routineRounds } from "../data/timeGames";
import { clockCue, type DayPartId, type MoneyGame, type RoutineId, type TimeLesson, type TimeStep } from "../data/timeMoney";
import type { Outfit } from "../data/wardrobe";
import { DrawnBackdrop, GameFrame, Hand, newSalt, Pick, useCoach, useFinish, useRounds, useRoundState, useWiggle } from "../game/kit";
import { Coin, Good, Jar, sayLine, sayWord } from "../game/money";
import { Illustration } from "../illustrations";
import type { Settings } from "../settings";
import { LockBadge } from "./LockBadge";

/**
 * The time games, rebuilt on the game kit.
 *
 * Parts of the day was the words "Morning", "Afternoon" and "Night" to read.
 * The daily routine was five words. The clock was run by four text buttons
 * ("Hour hand", "Minute hand", "Next hour", "Next minute") that ran off the
 * bottom of a phone. Now the skies and the parts of a day are pictures, and a
 * tap on a number moves the clock's hand to it.
 */

type GameProps = {
  lesson: TimeLesson;
  animal: AnimalId;
  outfit?: Outfit;
  settingsRef: { current: Settings };
  onDone: (label: string) => void;
};

const title = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

type Hand = "hour" | "minute";

/**
 * A clock face: twelve numbers, the minute dots between them, a short hand and a long hand.
 *
 * With `onNumber`, each number is something to tap. With `onHand`, each hand is. `lit` lights the
 * minute dots the long hand has passed, so minutes can be seen being counted.
 */
function ClockFace({
  hour,
  minute,
  onNumber,
  onHand,
  wiggle,
  turn,
  reveal,
  active,
  glow,
  shake,
  lit = false,
}: {
  hour: number;
  minute: number;
  onNumber?: (value: number) => void;
  onHand?: (hand: Hand) => void;
  /** The number that was just tapped wrongly, and how many wrong taps there have been. */
  wiggle?: number;
  turn?: number;
  /** The number to show after three misses. */
  reveal?: number;
  /** Which hand a tap on a number will move. */
  active?: Hand;
  /** The hand to show: the answer after three misses, or the one just found. */
  glow?: Hand;
  /** The hand that was just tapped wrongly. */
  shake?: Hand;
  lit?: boolean;
}) {
  const hourAngle = ((hour % 12) + minute / 60) * 30;
  const minuteAngle = minute * 6;
  const hand = (id: Hand, angle: number, tip: number, color: string, width: number) => (
    <g
      className="clock-hand"
      data-hand={id}
      data-active={active === id ? "true" : "false"}
      data-glow={glow === id ? "true" : "false"}
      data-shake={shake === id ? "true" : "false"}
      transform={`rotate(${angle} 50 50)`}
      role={onHand ? "button" : undefined}
      aria-label={onHand ? (id === "hour" ? "short hand" : "long hand") : undefined}
      tabIndex={onHand ? 0 : undefined}
      onClick={onHand ? () => onHand(id) : undefined}
      onKeyDown={
        onHand
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") onHand(id);
            }
          : undefined
      }
    >
      <line className="clock-hand-glow" x1="50" y1="50" x2="50" y2={tip} strokeWidth={width + 5} strokeLinecap="round" />
      <line x1="50" y1="50" x2="50" y2={tip} stroke={color} strokeWidth={width} strokeLinecap="round" />
      {/* A wide strip over the hand: a small finger does not have to land on a thin line. */}
      {onHand ? <rect x="43.5" y={tip - 3} width="13" height={50 - tip + 3} rx="6" fill="transparent" /> : null}
    </g>
  );
  return (
    <svg className="clock-face" viewBox="0 0 100 100" role="img" aria-label="Clock" data-hour={hour} data-minute={minute}>
      <circle cx="50" cy="50" r="48" fill="#6d5b86" />
      <circle cx="50" cy="50" r="44" fill="#fffaf3" />
      {/* The minute dots: sixty round the edge, a bigger one at each number. */}
      {Array.from({ length: 60 }, (_, index) => {
        const angle = (index * 6 - 90) * (Math.PI / 180);
        const five = index % 5 === 0;
        const on = lit && index > 0 && index <= minute;
        return (
          <circle
            key={index}
            className="clock-dot"
            data-dot={index}
            data-lit={on ? "true" : "false"}
            cx={50 + Math.cos(angle) * 41}
            cy={50 + Math.sin(angle) * 41}
            r={on ? 1.5 : five ? 1.3 : 0.95}
            fill={on ? "#5f8f86" : five ? "#6d5b86" : "#b9aecb"}
          />
        );
      })}
      {Array.from({ length: 12 }, (_, index) => {
        const value = index + 1;
        const angle = ((value % 12) * 30 - 90) * (Math.PI / 180);
        const x = 50 + Math.cos(angle) * 31.5;
        const y = 50 + Math.sin(angle) * 31.5;
        return (
          <g
            key={value}
            className="clock-number"
            data-number={value}
            data-wiggle={wiggle === value ? "true" : "false"}
            data-turn={wiggle === value ? turn : undefined}
            data-reveal={reveal === value ? "true" : "false"}
            role={onNumber ? "button" : undefined}
            aria-label={onNumber ? String(value) : undefined}
            tabIndex={onNumber ? 0 : undefined}
            onClick={onNumber ? () => onNumber(value) : undefined}
            onKeyDown={
              onNumber
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") onNumber(value);
                  }
                : undefined
            }
          >
            {/* A wide circle to tap, bigger than the number it holds. */}
            <circle cx={x} cy={y} r="7.6" className="clock-spot" />
            <text x={x} y={y + 3.3} textAnchor="middle" fontSize="9.2" fontWeight="800" fill="#243056">
              {value}
            </text>
          </g>
        );
      })}
      {/* The short hand is drawn first, so the long one can be tapped where they cross. */}
      {/* Both stop short of the numbers, so a hand never hides the number it points at. */}
      {hand("hour", hourAngle, 35, "#e07a8a", 4.6)}
      {hand("minute", minuteAngle, 25.5, "#5f8f86", 3)}
      <circle cx="50" cy="50" r="3.2" fill="#6d5b86" />
    </svg>
  );
}

/** One hand on its own, for a button: the short pink one or the long green one. */
function HandArt({ hand }: { hand: Hand }) {
  return (
    <svg className="hand-art" viewBox="0 0 60 70" aria-hidden="true" focusable="false">
      <line x1="30" y1="60" x2="30" y2={hand === "hour" ? 34 : 10} stroke={hand === "hour" ? "#e07a8a" : "#5f8f86"} strokeWidth={hand === "hour" ? 9 : 6} strokeLinecap="round" />
      <circle cx="30" cy="60" r="6" fill="#6d5b86" />
    </svg>
  );
}

/** "One dot on": the long hand, a dot, and an arrow to it. */
function StepArt() {
  return (
    <svg className="hand-art" viewBox="0 0 60 70" aria-hidden="true" focusable="false">
      <line x1="22" y1="60" x2="22" y2="14" stroke="#5f8f86" strokeWidth="6" strokeLinecap="round" />
      <circle cx="22" cy="60" r="6" fill="#6d5b86" />
      <circle cx="46" cy="14" r="5" fill="#5f8f86" />
      <path d="M28 14h10M34 9l5 5-5 5" fill="none" stroke="#243056" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * A small sky: sunrise, the sun high, or the moon. Always drawn, never the scene's painting: at
 * this size the sun and the moon are what tell the three apart.
 */
function Sky({ part }: { part: DayPartId }) {
  return (
    <span className="sky-art" data-sky={part}>
      <DrawnBackdrop kind={part} />
    </span>
  );
}

// ------------------------------------------------------------------ day and night

/** Parts of the day: something we do, and the sky it goes with. Ages 5 to 7 later count the hours between two clocks. */
export function DayActivity({ lesson, animal, outfit, settingsRef, onDone }: GameProps) {
  const [salt] = useState(newSalt);
  const list = useMemo(() => dayRounds(lesson, salt), [lesson, salt]);
  const rounds = useRounds(list);
  const round = rounds.round;
  const [solved, setSolved] = useRoundState(rounds.index, false);
  const wiggle = useWiggle();
  const time = (hour: number) => {
    const cue = clockCue(hour, 0);
    return promptCue(cue.id, cue.say);
  };
  const line: Cue[] =
    round.kind === "part"
      ? [sayLine(`day-${round.scene.id}`), promptCue("time-day", "Is it morning, afternoon, or night?")]
      : [sayLine("day-from"), time(round.from), sayLine("day-until"), time(round.to), sayLine("day-hours")];
  const coach = useCoach(settingsRef, line, rounds.index);
  const answer = round.kind === "part" ? round.scene.part : String(round.hours);
  useFinish(rounds.finished, settingsRef, coach, () => onDone(answer));

  const tap = (id: string, said: Cue[]) => {
    if (solved) return;
    if (id !== answer) {
      wiggle.shake(id);
      coach.miss(said);
      return;
    }
    wiggle.still();
    setSolved(true);
    coach.right(said, rounds.next);
  };

  return (
    <GameFrame
      screen="day"
      title="Day and night"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="table"
      attrs={{ "data-task": round.kind === "part" ? "parts" : "until", "data-answer": answer, "data-solved": solved ? "true" : "false" }}
      stage={
        round.kind === "part" ? (
          <span className="day-scene" data-scene-id={round.scene.id}>
            <Illustration name={round.scene.art} />
          </span>
        ) : (
          <span className="day-clocks" data-from={round.from} data-to={round.to}>
            <ClockFace hour={round.from} minute={0} />
            <svg className="day-arrow" viewBox="0 0 40 24" aria-hidden="true">
              <path d="M4 12h28M24 4l8 8-8 8" fill="none" stroke="#243056" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <ClockFace hour={round.to} minute={0} />
          </span>
        )
      }
    >
      {round.kind === "part"
        ? round.choices.map((part) => (
            <Pick
              key={part}
              id={part}
              name={part}
              art={<Sky part={part} />}
              label={title(part)}
              wiggle={wiggle.id === part ? wiggle.count : 0}
              reveal={coach.reveal && part === answer}
              onPick={() => tap(part, [sayWord(part)])}
              attrs={{ "data-part": part }}
            />
          ))
        : round.choices.map((hours) => (
            <Pick
              key={hours}
              id={String(hours)}
              name={`${hours} hours`}
              art={<span className="pick-number">{hours}</span>}
              wiggle={wiggle.id === String(hours) ? wiggle.count : 0}
              reveal={coach.reveal && String(hours) === answer}
              onPick={() => tap(String(hours), [numberCue(hours)])}
              attrs={{ "data-hours": hours }}
            />
          ))}
    </GameFrame>
  );
}

// ------------------------------------------------------------------ my day

/** My day: the parts of a day as pictures, tapped in the order they happen. Three first, then all five. */
export function RoutineActivity({ animal, outfit, settingsRef, onDone }: Omit<GameProps, "lesson">) {
  const [salt] = useState(newSalt);
  const list = useMemo(() => routineRounds(salt), [salt]);
  const rounds = useRounds(list);
  const round = rounds.round;
  const [placed, setPlaced] = useRoundState(rounds.index, 0);
  // The question changes once the first picture is in: "first", then "next".
  const [asked, setAsked] = useRoundState(rounds.index, 0);
  const wiggle = useWiggle();
  const line = asked === 0 ? [sayLine("routine-first")] : [promptCue("time-routine", "What comes next?")];
  const coach = useCoach(settingsRef, line, `${rounds.index}-${asked}`);
  useFinish(rounds.finished, settingsRef, coach, () => onDone("routine"));
  const next = round.order[placed] as RoutineId | undefined;

  const tap = (id: RoutineId) => {
    if (!next || round.order.indexOf(id) < placed) return;
    if (id !== next) {
      wiggle.shake(id);
      coach.miss([sayWord(id)]);
      return;
    }
    wiggle.still();
    const count = placed + 1;
    setPlaced(count);
    if (count >= round.order.length) coach.right([sayWord(id)], rounds.next);
    else coach.right([sayWord(id)], () => setAsked(count));
  };

  return (
    <GameFrame
      screen="routine"
      title="My day"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="room"
      attrs={{ "data-next": next ?? "done", "data-placed": placed, "data-order": round.order.join(",") }}
      stage={
        <ol className="routine-line" aria-label="The day so far">
          {round.order.map((id, index) => (
            <li key={id} data-slot={index} data-filled={index < placed ? "true" : "false"}>
              {index < placed ? <Illustration name={ROUTINE_ART[id]} /> : <span>{index + 1}</span>}
            </li>
          ))}
        </ol>
      }
    >
      {round.cards.map((id) => (
        <Pick
          key={id}
          id={id}
          name={id}
          size={round.cards.length > 4 ? "small" : "big"}
          art={<Illustration name={ROUTINE_ART[id]} />}
          used={round.order.indexOf(id) < placed}
          wiggle={wiggle.id === id ? wiggle.count : 0}
          reveal={coach.reveal && id === next}
          onPick={() => tap(id)}
          attrs={{ "data-routine": id }}
        />
      ))}
    </GameFrame>
  );
}

// ------------------------------------------------------------------ clock

/**
 * The clock, from the beginning.
 *
 *  1. The hands. "Find the short hand. It tells the hour." Then the long hand, which tells the minutes.
 *  2. The dots. The long hand steps from the 12 to the next number, one dot at a time, and each step
 *     is counted: five dots, five minutes.
 *  3. Setting a time. The voice says a time; a tap on a number moves the hand to it. On the hour that
 *     is one tap. With minutes, the short hand goes first, then the voice asks for the long hand.
 *
 * (It began at step 3, as if a child already knew which hand was which and what the marks were for.)
 */
export function ClockActivity({ lesson, animal, outfit, settingsRef, onDone }: GameProps) {
  const [salt] = useState(newSalt);
  const list = useMemo(() => clockRounds(lesson, salt), [lesson, salt]);
  const rounds = useRounds(list);
  const round = rounds.round;
  const start = round.kind === "set" ? { hour: 12, minute: 0 } : { hour: round.hour, minute: 0 };
  const [hands, setHands] = useRoundState(rounds.index, start);
  const [hand, setHand] = useRoundState<Hand>(rounds.index, "hour");
  const [solved, setSolved] = useRoundState(rounds.index, false);
  const wiggle = useWiggle();
  const target = round.kind === "set" ? clockCue(round.hour, round.minute) : clockCue(round.hour, 0);
  const said = promptCue(target.id, target.say);
  const line: Cue[] =
    round.kind === "hand"
      ? [sayLine(round.hand === "hour" ? "clock-find-short" : "clock-find-long")]
      : round.kind === "dots"
        ? [sayLine("clock-dots")]
        : hand === "minute" && !solved
          ? [sayLine("clock-long"), said]
          : [sayLine("clock-make"), said];
  const coach = useCoach(settingsRef, line, `${rounds.index}-${hand}`);
  useFinish(rounds.finished, settingsRef, coach, () => onDone(target.say));

  // The number the long hand points at for these minutes: 12 on the hour, 6 at half past.
  const minuteNumber = round.kind === "set" ? (round.minute === 0 ? 12 : round.minute / 5) : 12;
  const wanted = round.kind === "set" ? (hand === "hour" ? round.hour : minuteNumber) : 0;

  const tapHand = (which: Hand) => {
    if (solved) return;
    if (round.kind === "dots") {
      // The long hand is also the thing that moves it.
      if (which === "minute") stepDot();
      return;
    }
    if (round.kind !== "hand") return;
    const name = sayLine(which === "hour" ? "clock-is-short" : "clock-is-long");
    if (which !== round.hand) {
      wiggle.shake(which);
      coach.miss([name]);
      return;
    }
    wiggle.still();
    setSolved(true);
    coach.right([name], rounds.next);
  };

  const stepDot = () => {
    if (solved || round.kind !== "dots") return;
    const minute = hands.minute + 1;
    setHands({ hour: hands.hour, minute });
    if (minute >= DOTS_TO_NEXT) {
      setSolved(true);
      coach.right([numberCue(minute), sayLine("clock-dots-done")], rounds.next);
    } else coach.touch([numberCue(minute)]);
  };

  const tapNumber = (value: number) => {
    if (solved || round.kind !== "set") return;
    if (value !== wanted) {
      wiggle.shake(String(value));
      coach.miss([numberCue(value)]);
      return;
    }
    wiggle.still();
    if (hand === "hour") {
      setHands({ hour: value, minute: hands.minute });
      if (round.minute === 0) {
        setSolved(true);
        coach.right([said], rounds.next);
        return;
      }
      // The short hand is right. Now the long one.
      coach.right([numberCue(value)], () => setHand("minute"));
      return;
    }
    setHands({ hour: hands.hour, minute: round.minute });
    setSolved(true);
    coach.right([said], rounds.next);
  };

  const shown = `${hands.hour}:${String(hands.minute).padStart(2, "0")}`;
  const digital = round.kind === "set" ? `${round.hour}:${String(round.minute).padStart(2, "0")}` : shown;
  // The hand to light up: the answer after three misses, or the one just found.
  const glow = round.kind === "hand" && (coach.reveal || solved) ? round.hand : round.kind === "dots" ? "minute" : undefined;
  const hint = round.kind === "set" && coach.reveal ? wanted : 0;
  return (
    <GameFrame
      screen="clock"
      title="Clock"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="room"
      attrs={{
        "data-task": round.kind,
        "data-mode": lesson.clockMode,
        "data-hour": hands.hour,
        "data-minute": hands.minute,
        "data-target-hour": round.kind === "set" ? round.hour : undefined,
        "data-target-minute": round.kind === "set" ? round.minute : undefined,
        "data-hand": hand,
        "data-answer": round.kind === "hand" ? round.hand : round.kind === "dots" ? "minute" : String(wanted),
        "data-want": round.kind === "set" ? wanted : undefined,
        "data-matched": solved ? "true" : "false",
        "data-solved": solved ? "true" : "false",
      }}
      stage={
        <div className="clock-stage">
          <ClockFace
            hour={hands.hour}
            minute={hands.minute}
            onNumber={round.kind === "set" ? tapNumber : undefined}
            onHand={round.kind === "set" ? undefined : tapHand}
            wiggle={round.kind === "set" ? Number(wiggle.id) || undefined : undefined}
            turn={wiggle.count}
            reveal={hint || undefined}
            active={round.kind === "set" ? hand : undefined}
            glow={glow}
            shake={round.kind === "hand" && (wiggle.id === "hour" || wiggle.id === "minute") ? wiggle.id : undefined}
            lit={round.kind !== "hand"}
          />
          {hint ? (
            // The hand points at the number to tap.
            <span
              className="clock-hint"
              data-point={hint}
              style={{
                left: `${50 + Math.cos((((hint % 12) * 30 - 90) * Math.PI) / 180) * 31.5}%`,
                top: `${50 + Math.sin((((hint % 12) * 30 - 90) * Math.PI) / 180) * 31.5}%`,
              }}
            >
              <Hand />
            </span>
          ) : null}
        </div>
      }
    >
      {round.kind === "hand"
        ? // The two hands again as big pictures, for a finger that finds the ones on the clock too thin.
          (["hour", "minute"] as const).map((which) => (
            <Pick
              key={which}
              id={which}
              name={which === "hour" ? "short hand" : "long hand"}
              art={<HandArt hand={which} />}
              wiggle={wiggle.id === which ? wiggle.count : 0}
              reveal={coach.reveal && which === round.hand}
              onPick={() => tapHand(which)}
              attrs={{ "data-hand-pick": which }}
            />
          ))
        : null}
      {round.kind === "dots" ? (
        <>
          <Pick id="step" name="move the long hand one dot" art={<StepArt />} demo={hands.minute === 0} used={solved} onPick={stepDot} attrs={{ "data-step": hands.minute }} />
          <span className="clock-digital" data-digital={shown} data-counting="true">
            {hands.minute}
          </span>
        </>
      ) : null}
      {round.kind === "set" ? (
        // The time in numbers, for a child who is learning to read a digital clock. The voice says it for everyone.
        <span className="clock-digital" data-digital={digital}>
          {digital}
        </span>
      ) : null}
    </GameFrame>
  );
}

// ------------------------------------------------------------------ the section's tiles

const TIME_TILES: { id: TimeStep; label: string; name: string }[] = [
  { id: "day", label: "Day and night", name: "Day and night" },
  { id: "routine", label: "My day", name: "My day" },
  { id: "clock", label: "Clock", name: "Clock" },
];

const MONEY_TILES: { id: TimeStep | MoneyGame; label: string; name: string }[] = [
  { id: "coins", label: "Coins", name: "Coins" },
  { id: "shop", label: "Shop", name: "Shop" },
  { id: "jars", label: "Three jars", name: "Three jars" },
  { id: "lemonade", label: "Lemonade", name: "Lemonade stand" },
  { id: "choose", label: "What can I buy?", name: "What can I buy?" },
  { id: "needs", label: "Need or want", name: "Need or want" },
  { id: "cards", label: "Cards", name: "Pretend cards" },
];

function TileArt({ id, lesson }: { id: string; lesson: TimeLesson }) {
  if (id === "day") return <Sky part="morning" />;
  if (id === "routine") return <Illustration name="wake" />;
  if (id === "clock") return <ClockFace hour={lesson.targetHour} minute={0} />;
  if (id === "coins") return <Coin id="nickel" />;
  if (id === "shop") return <Good id="apple" />;
  if (id === "jars") return <Jar label={<Coin id="penny" />} />;
  if (id === "lemonade") return <Illustration name="lemonade" />;
  if (id === "choose") return <Coin id="dime" />;
  if (id === "needs") return <Good id="bed" />;
  return <Coin id="one" />;
}

const MONEY_GAMES = new Set<string>(["jars", "lemonade", "choose", "needs", "cards"]);

/**
 * The Time & Money page: every game on one page, under "Time" and "Money", each tile a picture. (The
 * five money games sat behind a tile called "Play", as five words on a second page.)
 */
export function TimeBoard({
  lesson,
  done,
  locked,
  moneyLocked,
  onOpen,
  onMoney,
}: {
  lesson: TimeLesson;
  done: Record<string, boolean>;
  /** Tiles that open with the full app. */
  locked?: (id: string) => boolean;
  moneyLocked?: (id: string) => boolean;
  onOpen: (step: TimeStep) => void;
  onMoney: (game: MoneyGame) => void;
}) {
  const tile = (stop: { id: string; label: string; name: string }) => {
    const money = MONEY_GAMES.has(stop.id);
    const shut = money ? moneyLocked?.(stop.id) : locked?.(stop.id);
    return (
      <button
        key={stop.id}
        type="button"
        className={`math-activity time-tile${done[stop.id] ? " is-done" : ""}${shut ? " is-locked" : ""}`}
        data-activity={stop.id}
        data-locked={shut ? "true" : undefined}
        aria-label={stop.name}
        onClick={() => (money ? onMoney(stop.id as MoneyGame) : onOpen(stop.id as TimeStep))}
      >
        {shut ? <LockBadge /> : null}
        <span className="math-activity-art" aria-hidden="true">
          <TileArt id={stop.id} lesson={lesson} />
        </span>
        <span>{stop.label}</span>
      </button>
    );
  };
  // Cards are for late in the course. Until then the tile is not shown at all.
  const money = MONEY_TILES.filter((stop) => stop.id !== "cards" || lesson.cardsOpen);
  return (
    <div className="time-boards" data-stage={lesson.stageId} data-week={lesson.weekIndex}>
      <section className="time-group" data-time-group="time">
        <h2>Time</h2>
        <div className="math-board">{TIME_TILES.map(tile)}</div>
      </section>
      <section className="time-group" data-time-group="money">
        <h2>Money</h2>
        <div className="math-board">{money.map(tile)}</div>
      </section>
    </div>
  );
}
