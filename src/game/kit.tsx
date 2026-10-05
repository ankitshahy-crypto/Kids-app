import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { playEffect } from "../audio/manager";
import { promptCue, type Cue } from "../audio/player";
import { Avatar } from "../avatars";
import { Hero } from "../components/Hero";
import { SpeakerIcon } from "../components/icons";
import type { AnimalId } from "../data/animals";
import type { Outfit } from "../data/wardrobe";
import { useSpeaker } from "../hooks/useSpeaker";
import type { Settings } from "../settings";

/**
 * The game kit: one frame, one voice and one set of manners for every game.
 *
 * After the first phone test the Explore games read as a prototype: text
 * buttons a child had to read ("Nickel", "Tidy toys", "Need"), art a few
 * pixels wide, one tap and the game was over, and no word of help. Each
 * game had also grown its own layout, its own "Hear it" button and its own
 * idea of what a wrong tap does.
 *
 * Every game built on this kit meets the same bar, which is the one the
 * well-made children's apps hold (and the Sesame Workshop design guide
 * spells out):
 *
 *  1. Say it and show it. The instruction is spoken when a round opens, and
 *     the round speaker button says it again. No instruction is text only.
 *  2. Pictures, not words. A choice is a big picture that says its name.
 *  3. A right answer pays off: a chime, the child's animal cheers, and the
 *     answer is named.
 *  4. A wrong answer is gentle: a soft sound and a wiggle. Nothing ends.
 *  5. Help steps in: the instruction repeats when the child waits, and
 *     after the third miss the answer glows with a pointing hand on it.
 *  6. Several rounds, with dots that fill as they are done.
 *  7. A place, not a page: a drawn scene with the child's animal in it.
 *  8. An ending: the animal celebrates, then the star is given.
 */

/** How long a child may sit before the instruction is said again. */
export const IDLE_MS = 8000;
/** The miss on which the answer is shown. */
export const REVEAL_AT = 3;
/** The shortest and longest a right answer stays on screen before the next round. */
const SOLVED_MIN_MS = 900;
const SOLVED_MAX_MS = 3200;
/** How long the ending plays before the star is given. */
const FINISH_MS = 1700;

export type Mood = "idle" | "cheer" | "think";

/**
 * For the tests only, and only in a development build: do not wait for a line to be said before the
 * next round. A test that plays a whole game through would otherwise spend most of its time listening.
 */
function quick(): boolean {
  try {
    return import.meta.env.DEV && window.localStorage.getItem("littlenest-quick-rounds") === "1";
  } catch {
    return false;
  }
}

function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The game's voice and its manners. `line` is what the round asks; `round`
 * changes when a new round opens, which says the new line and forgets the
 * misses of the last one.
 */
export function useCoach(settingsRef: { current: Settings }, line: Cue[], round: string | number) {
  const speak = useSpeaker(settingsRef);
  const [misses, setMisses] = useState(0);
  const [nudge, setNudge] = useState(false);
  const [mood, setMood] = useState<Mood>("idle");
  const lineRef = useRef(line);
  lineRef.current = line;
  const missRef = useRef(0);
  const idle = useRef<number | null>(null);
  const moodTimer = useRef<number | null>(null);
  const after = useRef<number | null>(null);
  const quiet = useRef(false);

  const stopIdle = useCallback(() => {
    if (idle.current !== null) window.clearTimeout(idle.current);
    idle.current = null;
  }, []);

  /** Start waiting again. If the child does nothing, the line is said once more and the choices pulse. */
  const arm = useCallback(() => {
    stopIdle();
    if (quiet.current) return;
    idle.current = window.setTimeout(() => {
      setNudge(true);
      speak.line(lineRef.current);
    }, IDLE_MS);
  }, [speak, stopIdle]);

  const feel = useCallback((next: Mood) => {
    setMood(next);
    if (moodTimer.current !== null) window.clearTimeout(moodTimer.current);
    moodTimer.current = window.setTimeout(() => setMood("idle"), 1000);
  }, []);

  useEffect(() => {
    quiet.current = false;
    missRef.current = 0;
    setMisses(0);
    setNudge(false);
    speak.line(lineRef.current);
    arm();
    return stopIdle;
    // A new round is a new line; the words themselves are read from the ref.
  }, [round, speak, arm, stopIdle]);

  useEffect(
    () => () => {
      if (moodTimer.current !== null) window.clearTimeout(moodTimer.current);
      if (after.current !== null) window.clearTimeout(after.current);
    },
    [],
  );

  return {
    speak,
    mood,
    misses,
    /** The child has waited: the choices pulse to show what can be tapped. */
    nudge,
    /** Three misses: the answer is shown. */
    reveal: misses >= REVEAL_AT,
    /** Say the round's line again (the speaker button). */
    again() {
      setNudge(false);
      speak.line(lineRef.current);
      arm();
    },
    /** A tap that is neither right nor wrong (picking something up, a step on the way). */
    touch(said?: Cue[]) {
      setNudge(false);
      if (said) speak.line(said);
      arm();
    },
    /**
     * Something to find out, neither right nor wrong: the answer is said and the game moves on. (Sink or
     * float: a guess that was wrong is still a child finding out what happens.)
     */
    tell(said: Cue[], then: () => void) {
      quiet.current = true;
      stopIdle();
      setNudge(false);
      if (quick()) {
        speak.line(said);
        after.current = window.setTimeout(then, 150);
        return;
      }
      let ran = false;
      const go = () => {
        if (ran) return;
        ran = true;
        if (after.current !== null) window.clearTimeout(after.current);
        after.current = window.setTimeout(then, SOLVED_MIN_MS);
      };
      after.current = window.setTimeout(go, SOLVED_MAX_MS);
      speak.line(said, go);
    },
    /**
     * A wrong tap. It names what was tapped, so the miss still teaches. From the second miss it
     * also says the instruction again.
     */
    miss(said: Cue[] = []) {
      missRef.current += 1;
      setMisses(missRef.current);
      setNudge(false);
      playEffect("boop", settingsRef.current);
      feel("think");
      const again = missRef.current >= 2 ? lineRef.current : [];
      if (said.length + again.length > 0) speak.line([...said, ...again]);
      arm();
    },
    /**
     * A right answer. It is named aloud, the animal cheers, and `then` runs when the words are done
     * (never sooner than a moment, never later than a few seconds).
     *
     * `hold` is that moment. A game whose answer is something that happens in the scene (the animal
     * walking over the bridge, a lever lifting the rock) passes how long that takes, so it is seen to
     * the end even with the voice off, when there are no words to wait for.
     */
    right(said: Cue[] = [], then?: () => void, hold: number = SOLVED_MIN_MS) {
      quiet.current = true;
      stopIdle();
      setNudge(false);
      playEffect("chime", settingsRef.current);
      feel("cheer");
      if (!then) {
        if (said.length > 0) speak.line(said);
        return;
      }
      const started = Date.now();
      let ran = false;
      const go = () => {
        if (ran) return;
        ran = true;
        if (after.current !== null) window.clearTimeout(after.current);
        const wait = Math.max(0, (reducedMotion() ? 300 : hold) - (Date.now() - started));
        after.current = window.setTimeout(then, wait);
      };
      if (quick()) {
        if (said.length > 0) speak.line(said);
        after.current = window.setTimeout(then, 150);
        return;
      }
      after.current = window.setTimeout(go, Math.max(SOLVED_MAX_MS, hold));
      if (said.length > 0) speak.line(said, go);
      else go();
    },
  };
}

export type Coach = ReturnType<typeof useCoach>;

/** A wiggle for the thing just tapped wrongly. The count lets the same thing wiggle twice in a row. */
export function useWiggle() {
  const [state, setState] = useState({ id: "", count: 0 });
  return {
    id: state.id,
    count: state.count,
    shake: (id: string) => setState((current) => ({ id, count: current.count + 1 })),
    still: () => setState((current) => ({ id: "", count: current.count })),
  };
}

/** What a round keeps while it is played: starts over, by itself, when the next round opens. */
export function useRoundState<T>(round: number, initial: T): [T, (next: T | ((current: T) => T)) => void] {
  const [state, setState] = useState({ round, value: initial });
  const value = state.round === round ? state.value : initial;
  const set = (next: T | ((current: T) => T)) =>
    setState((current) => {
      const base = current.round === round ? current.value : initial;
      return { round, value: typeof next === "function" ? (next as (current: T) => T)(base) : next };
    });
  return [value, set];
}

/**
 * A number that is new each time a game opens: it picks the rounds, so no two plays are alike.
 * For the tests only, in a development build, `littlenest-salt` pins it, so a test can play the
 * one board it is about (one kind of bug, say).
 */
export function newSalt(): number {
  try {
    const pinned = import.meta.env.DEV ? window.localStorage.getItem("littlenest-salt") : null;
    if (pinned !== null && /^\d+$/.test(pinned)) return Number(pinned);
  } catch {
    // No storage (a private window, say): a fresh number, as ever.
  }
  return Math.floor(Math.random() * 100000);
}

/** Rounds played one after another. `next` opens the following round, or ends the game after the last. */
export function useRounds<T>(rounds: T[]) {
  const [index, setIndex] = useState(0);
  const finished = index >= rounds.length;
  return {
    index: Math.min(index, rounds.length - 1),
    total: rounds.length,
    round: rounds[Math.min(index, rounds.length - 1)],
    finished,
    next: () => setIndex((current) => current + 1),
  };
}

/** The ending: "You did it!", the animal celebrates, and then the star is given. */
export function useFinish(finished: boolean, settingsRef: { current: Settings }, coach: Coach, onDone: () => void) {
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (!finished) return;
    playEffect("celebrate", settingsRef.current);
    coach.speak.line([promptCue("kit-done", "You did it!")]);
    const timer = window.setTimeout(() => done.current(), quick() ? 200 : reducedMotion() ? 700 : FINISH_MS);
    return () => window.clearTimeout(timer);
    // Runs once, when the last round is done.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);
}

/** Dots for the rounds: filled when done, ringed for the one being played. */
export function Pips({ total, done }: { total: number; done: number }) {
  if (total <= 1) return null;
  return (
    <ol className="game-pips" aria-label={`Round ${Math.min(done + 1, total)} of ${total}`}>
      {Array.from({ length: total }, (_, index) => (
        <li key={index} data-pip={index < done ? "done" : index === done ? "now" : "todo"} />
      ))}
    </ol>
  );
}

/** A pointing hand. It shows on the answer after three misses, and on the first thing to tap in a new kind of round. */
export function Hand() {
  return (
    <svg className="game-hand" viewBox="0 0 48 56" aria-hidden="true" focusable="false">
      <path
        d="M18 4c3 0 5 2 5 5v14l11 2c5 1 8 5 8 10v6c0 8-6 13-14 13h-5c-5 0-9-3-11-7L6 34c-2-3 2-7 5-4l2 2V9c0-3 2-5 5-5Z"
        fill="#fffdfb"
        stroke="#243056"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A drawn place for a game to happen in. Each is a wide picture that fills the top of the game. */
export type SceneKind = "shop" | "room" | "garden" | "stand" | "morning" | "afternoon" | "night" | "pond" | "table" | "field" | "rainy" | "snowy" | "windy" | "sky";

export function Backdrop({ kind }: { kind: SceneKind }) {
  return (
    <svg className="game-backdrop" viewBox="0 0 360 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      {kind === "shop" ? (
        <>
          <rect width="360" height="200" fill="#fdf1e2" />
          {/* shelves */}
          <rect x="150" y="34" width="196" height="8" rx="4" fill="#e7c9a5" />
          <rect x="150" y="78" width="196" height="8" rx="4" fill="#e7c9a5" />
          {/* awning */}
          <path d="M0 0h360v22c-15 12-30 12-45 0-15 12-30 12-45 0-15 12-30 12-45 0-15 12-30 12-45 0-15 12-30 12-45 0-15 12-30 12-45 0-15 12-30 12-45 0-15 12-30 12-45 0Z" fill="#f3a9a0" />
          <path d="M45 0h45v22c-15 12-30 12-45 0ZM135 0h45v22c-15 12-30 12-45 0ZM225 0h45v22c-15 12-30 12-45 0ZM315 0h45v22c-15 12-30 12-45 0Z" fill="#fffdfb" />
          {/* counter */}
          <rect y="150" width="360" height="50" fill="#d9a877" />
          <rect y="150" width="360" height="10" fill="#c48f5c" />
        </>
      ) : null}
      {kind === "room" ? (
        <>
          <rect width="360" height="200" fill="#eaf1f8" />
          <rect x="230" y="26" width="92" height="74" rx="10" fill="#cfe6f7" stroke="#fffdfb" strokeWidth="8" />
          <path d="M276 26v74M230 63h92" stroke="#fffdfb" strokeWidth="6" />
          <rect y="150" width="360" height="50" fill="#e9cfae" />
          <rect y="150" width="360" height="8" fill="#d9b98f" />
        </>
      ) : null}
      {kind === "table" ? (
        <>
          <rect width="360" height="200" fill="#f3ecf8" />
          <rect y="128" width="360" height="72" fill="#e6c79f" />
          <rect y="128" width="360" height="10" fill="#d4ae7f" />
        </>
      ) : null}
      {kind === "garden" || kind === "field" ? (
        <>
          <rect width="360" height="200" fill="#dcedf9" />
          <circle cx="310" cy="42" r="24" fill="#f9d976" />
          <path d="M0 132c60-26 120-26 180-6s120 14 180-10v84H0Z" fill="#b8dfb4" />
          <path d="M0 152c70-16 150-12 220 0s100 8 140-4v52H0Z" fill="#9bd1a0" />
          {kind === "garden" ? <rect x="70" y="164" width="270" height="36" rx="14" fill="#b98a5e" /> : null}
          <ellipse cx="70" cy="44" rx="30" ry="12" fill="#fffdfb" />
          <ellipse cx="96" cy="38" rx="22" ry="12" fill="#fffdfb" />
        </>
      ) : null}
      {kind === "stand" ? (
        <>
          <rect width="360" height="200" fill="#dcedf9" />
          <path d="M0 150c80-14 200-14 360 0v50H0Z" fill="#9bd1a0" />
          <rect x="150" y="20" width="10" height="150" fill="#d9b98f" />
          <rect x="320" y="20" width="10" height="150" fill="#d9b98f" />
          <path d="M138 14h204v26c-17 12-34 12-51 0-17 12-34 12-51 0-17 12-34 12-51 0-17 12-34 12-51 0Z" fill="#f9d976" />
          <path d="M189 14h51v26c-17 12-34 12-51 0ZM291 14h51v26c-17 12-34 12-51 0Z" fill="#fffdfb" />
          <rect x="138" y="118" width="204" height="62" rx="8" fill="#e6c79f" />
          <rect x="138" y="118" width="204" height="12" rx="6" fill="#d4ae7f" />
        </>
      ) : null}
      {kind === "morning" ? (
        <>
          <rect width="360" height="200" fill="#fde7d4" />
          <rect y="0" width="360" height="90" fill="#fdf3dc" opacity="0.7" />
          <circle cx="180" cy="150" r="46" fill="#f9c96a" />
          <path d="M0 150c80-20 200-20 360 0v50H0Z" fill="#a9d7a6" />
        </>
      ) : null}
      {kind === "afternoon" ? (
        <>
          <rect width="360" height="200" fill="#cfe6f9" />
          <circle cx="180" cy="48" r="30" fill="#f9d35f" />
          <ellipse cx="70" cy="64" rx="34" ry="13" fill="#fffdfb" />
          <ellipse cx="296" cy="84" rx="30" ry="12" fill="#fffdfb" />
          <path d="M0 150c80-20 200-20 360 0v50H0Z" fill="#9bd1a0" />
        </>
      ) : null}
      {kind === "night" ? (
        <>
          <rect width="360" height="200" fill="#2f3f73" />
          <circle cx="250" cy="52" r="26" fill="#fbf1c8" />
          <circle cx="262" cy="44" r="24" fill="#2f3f73" />
          <path d="M60 40l3 7 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1ZM140 70l2 5 5 1-4 4 1 5-4-3-4 3 1-5-4-4 5-1ZM320 110l2 5 5 1-4 4 1 5-4-3-4 3 1-5-4-4 5-1Z" fill="#fbf1c8" />
          <path d="M0 150c80-20 200-20 360 0v50H0Z" fill="#4f7a6b" />
        </>
      ) : null}
      {/* Only a sky: a game that builds its own ground (a river to bridge, a track to roll along). */}
      {kind === "sky" ? (
        <>
          <rect width="360" height="200" fill="#dcedf9" />
          <circle cx="306" cy="40" r="22" fill="#f9d976" />
          <ellipse cx="96" cy="46" rx="34" ry="12" fill="#fffdfb" />
          <ellipse cx="124" cy="40" rx="24" ry="12" fill="#fffdfb" />
        </>
      ) : null}
      {kind === "rainy" ? (
        <>
          <rect width="360" height="200" fill="#c9d6e3" />
          <ellipse cx="90" cy="44" rx="64" ry="24" fill="#9fb1c4" />
          <ellipse cx="150" cy="36" rx="50" ry="22" fill="#aebdcd" />
          <ellipse cx="270" cy="48" rx="66" ry="24" fill="#9fb1c4" />
          <path
            className="scene-rain"
            d="M40 80l-8 22M80 96l-8 22M124 78l-8 22M166 98l-8 22M210 80l-8 22M252 100l-8 22M296 82l-8 22M336 98l-8 22M60 130l-8 22M146 136l-8 22M230 132l-8 22M316 134l-8 22"
            stroke="#6f95bd"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path d="M0 150c80-14 200-14 360 0v50H0Z" fill="#8fbf95" />
          <ellipse cx="250" cy="182" rx="40" ry="8" fill="#9ccbe8" />
        </>
      ) : null}
      {kind === "snowy" ? (
        <>
          <rect width="360" height="200" fill="#dfeaf4" />
          <ellipse cx="100" cy="40" rx="60" ry="20" fill="#f7fafc" />
          <ellipse cx="260" cy="46" rx="64" ry="22" fill="#f7fafc" />
          <g className="scene-snow" fill="#fffdfb">
            <circle cx="40" cy="80" r="5" />
            <circle cx="92" cy="104" r="4" />
            <circle cx="140" cy="76" r="5" />
            <circle cx="186" cy="110" r="4" />
            <circle cx="230" cy="84" r="5" />
            <circle cx="276" cy="112" r="4" />
            <circle cx="322" cy="86" r="5" />
            <circle cx="66" cy="136" r="4" />
            <circle cx="160" cy="140" r="5" />
            <circle cx="250" cy="138" r="4" />
            <circle cx="336" cy="134" r="5" />
          </g>
          <path d="M0 148c80-18 200-18 360 0v52H0Z" fill="#f7fafc" />
          <path d="M0 168c90-10 210-10 360 0v32H0Z" fill="#e9f1f8" />
        </>
      ) : null}
      {kind === "windy" ? (
        <>
          <rect width="360" height="200" fill="#dcedf9" />
          <ellipse cx="290" cy="40" rx="44" ry="15" fill="#fffdfb" />
          <g className="scene-wind" fill="none" stroke="#9db9d3" strokeWidth="5" strokeLinecap="round">
            <path d="M30 60h90c18 0 18-22 2-22" />
            <path d="M120 100h110c20 0 20-24 2-24" />
            <path d="M40 126h70c14 0 14-18 2-18" />
            <path d="M230 132h90c16 0 16-20 2-20" />
          </g>
          <path d="M0 150c80-14 200-14 360 0v50H0Z" fill="#9bd1a0" />
          <path d="M300 150c-6-22 8-34 16-40M316 150c-2-18 10-28 20-30" fill="none" stroke="#6e9a74" strokeWidth="5" strokeLinecap="round" />
        </>
      ) : null}
      {kind === "pond" ? (
        <>
          <rect width="360" height="200" fill="#dcedf9" />
          <circle cx="320" cy="36" r="22" fill="#f9d976" />
          <path d="M0 96c80-18 220-18 360 0v104H0Z" fill="#b8dfb4" />
          {/* the water, with a bank on the left for the animal to stand on */}
          <path d="M96 116h264v84H96Z" fill="#9ccbe8" />
          <path d="M96 116h264v10H96Z" fill="#bfe0f4" />
          <path d="M0 118c40-8 80-6 104 2 10 30 8 56 0 80H0Z" fill="#9bd1a0" />
        </>
      ) : null}
    </svg>
  );
}

/** Stars that burst over the scene when a round, or the game, is won. */
function Sparkles() {
  return (
    <span className="game-sparkles" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <svg key={index} viewBox="0 0 24 24" data-spark={index}>
          <path d="M12 1l3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z" fill="#f2c14e" />
        </svg>
      ))}
    </span>
  );
}

/**
 * The frame every game sits in: its name (for the grown-up), the speaker button, the round dots, the
 * scene with the child's animal, and the tray of things to tap.
 */
export function GameFrame({
  screen,
  title,
  animal,
  outfit,
  coach,
  rounds,
  scene,
  stage,
  hostAt,
  children,
  attrs,
}: {
  /** The activity id. Tests and the app find the game by it. */
  screen: string;
  title: string;
  animal: AnimalId;
  outfit?: Outfit;
  coach: Coach;
  rounds: { index: number; total: number; finished: boolean };
  scene: SceneKind;
  /** What the round is about, drawn in the scene beside the animal. */
  stage?: ReactNode;
  /**
   * Where the animal stands, as shares of the scene, when a game places it (on a river bank, say).
   * With `walk` it glides to the new place; without, it is simply there. A bridge sets `walk` only
   * while the animal crosses, so the next round does not show it sliding backwards over the water.
   */
  hostAt?: { left: number; bottom: number; walk?: boolean };
  /** The things to tap. */
  children?: ReactNode;
  attrs?: Record<string, string | number | undefined>;
}) {
  const mood = rounds.finished ? "cheer" : coach.mood;
  return (
    <div
      className="game-frame"
      data-screen={screen}
      data-round={rounds.index}
      data-rounds={rounds.total}
      data-finished={rounds.finished ? "true" : "false"}
      data-misses={coach.misses}
      data-reveal={coach.reveal ? "true" : "false"}
      data-nudge={coach.nudge ? "true" : "false"}
      {...attrs}
    >
      <div className="game-top">
        <h1>{title}</h1>
        <Pips total={rounds.total} done={rounds.finished ? rounds.total : rounds.index} />
      </div>
      <div className="game-scene" data-scene={scene}>
        <Backdrop kind={scene} />
        {/* The animal is the one asking. Its speaker says the question again. */}
        <button type="button" className="game-hear" data-hear="true" aria-label="Hear it again" onClick={() => coach.again()}>
          <SpeakerIcon />
        </button>
        <span className="game-host" data-mood={mood} data-walks={hostAt?.walk ? "true" : undefined} style={hostAt ? { left: `${hostAt.left}%`, bottom: `${hostAt.bottom}%` } : undefined}>
          {/* The jump and the tilt are on the inner one, so they do not fight with the walk. */}
          <span className="game-host-body">{outfit ? <Hero animal={animal} outfit={outfit} /> : <Avatar animal={animal} />}</span>
        </span>
        <div className="game-stage">{stage}</div>
        {mood === "cheer" ? <Sparkles /> : null}
      </div>
      <div className="game-tray" data-nudge={coach.nudge ? "true" : "false"}>
        {children}
      </div>
    </div>
  );
}

/** A choice: a big picture that says its name when tapped. A word under it is for the grown-up; the picture carries the meaning. */
export function Pick({
  id,
  name,
  art,
  label,
  wiggle,
  reveal,
  demo,
  used,
  chosen,
  size,
  onPick,
  attrs,
}: {
  id: string;
  /** What a screen reader says. */
  name: string;
  art: ReactNode;
  label?: ReactNode;
  /** The wiggle count while this one is wiggling, or 0. */
  wiggle?: number;
  /** The answer, shown after three misses. */
  reveal?: boolean;
  /** The first thing to tap in a round that has not been shown before. */
  demo?: boolean;
  /** Already placed or spent. */
  used?: boolean;
  /** Picked up, waiting for where it goes. */
  chosen?: boolean;
  /** Big: three to a row on a phone. Mid: four. Small: five. */
  size?: "big" | "mid" | "small";
  onPick: () => void;
  attrs?: Record<string, string | number | undefined>;
}) {
  return (
    <button
      type="button"
      className={`pick${size === "small" ? " is-small" : size === "mid" ? " is-mid" : ""}`}
      data-pick={id}
      // Two names for the same wiggle, turn about, so a second wrong tap on the same thing wiggles again.
      data-wiggle={wiggle ? (wiggle % 2 === 1 ? "a" : "b") : "false"}
      data-reveal={reveal ? "true" : "false"}
      data-used={used ? "true" : "false"}
      data-chosen={chosen ? "true" : "false"}
      aria-label={name}
      disabled={used}
      onClick={onPick}
      {...attrs}
    >
      <span className="pick-art">{art}</span>
      {label ? <span className="pick-label">{label}</span> : null}
      {reveal || demo ? <Hand /> : null}
    </button>
  );
}
