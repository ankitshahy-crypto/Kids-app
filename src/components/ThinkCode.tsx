import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { playEffect } from "../audio/manager";
import { playPrompt, playWordId, promptCue, type Cue } from "../audio/player";
import type { AnimalId } from "../data/animals";
import {
  birdRounds,
  bugPlan,
  checkPlan,
  chipSteps,
  logicLevel,
  logicManifestEntries,
  nextStepHome,
  onGrid,
  orderFits,
  orderRounds,
  patternRounds,
  program,
  reusePlaces,
  reuseRound,
  routineAt,
  routineFits,
  ruleRounds,
  sameCell,
  stepCell,
  type BirdRound,
  type Cell,
  type Chip,
  type Dir,
  type LogicLevel,
  type PictureCard,
} from "../data/logic";
import { GameFrame, Hand, lookOf, Pick, useCoach, useFinish, useRoundState, useRounds, useWiggle, type Mood, type SceneKind } from "../game/kit";
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
/** How long the animal rests where a wrong plan took it, before walking back. */
const BACK_MS = 1400;
/** How long the animal cheers at the nest before the next round. */
const HOME_MS = 1300;
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

/**
 * Take me home: move the animal to its nest, first by taps, then by a plan made
 * before it moves.
 *
 * Built on the game kit, like the other Explore games: a drawn place with the
 * child's animal in it, the instruction spoken and said again on request, help
 * that steps in, dots for the rounds, and the kit's ending.
 *
 * What a child sees when a plan runs is the lesson: the animal takes one step
 * for each arrow, and the arrow it is on lights up as it goes. A wrong plan is
 * walked too, as far as the wrong arrow: the animal stops right there, looks
 * puzzled, and that arrow is marked so the child can tap it off. A plan that
 * stops short is walked to its end and the empty place the next arrow belongs
 * in is shown. Nothing is scored and nothing ends: after a moment the animal
 * walks back along its own trail, and the plan is there to try again.
 *
 * At ages 5–7 one short plan is kept: when it gets home its arrows become one
 * chip, the child's routine, and the next board is a longer way home that the
 * routine chip is part of. The chip does all its steps as one, and opens to show
 * them as they are walked. A thing you made, used again as one piece: the first
 * function.
 */
const PLACES: SceneKind[] = ["garden", "field", "pond", "morning"];

function codeSay(id: string): Cue {
  return promptCue(id, CODE_LINES[id] ?? "");
}

const CODE_LINES: Record<string, string> = Object.fromEntries(logicManifestEntries().map((entry) => [entry.id, entry.say]));

/**
 * What the round asks, as things stand: said when the round opens, again when the child waits or
 * presses the speaker, and from the second miss. It follows the plan, so it never asks for what is
 * already done: in a bug round an empty place is to be filled, one arrow too many is to be tapped
 * off, else a wrong one is to be tapped off (and its place filled); a plan ready to run, in any
 * round, is to be run.
 */
function lineFor(round: BirdRound, plan: (Dir | null)[], queue: Chip[]): Cue[] {
  if (round.mode === "bug") {
    if (plan.includes(null)) return [codeSay("code-bug-missing")];
    if (plan.length > round.path.length) return [codeSay("code-bug-extra")];
    return [codeSay(checkPlan(round, program(round, plan)).ok ? "code-go" : "code-bug")];
  }
  if (round.mode === "plan" || round.mode === "keep") return [codeSay(queue.length >= round.path.length ? "code-go" : "code-plan")];
  if (round.mode === "reuse") {
    if (queue.length >= reusePlaces(round)) return [codeSay("code-go")];
    return [codeSay(queue.length === 0 ? "code-routine-use" : "code-plan")];
  }
  if (round.mode === "predict") return [codeSay(queue.length > 0 ? "code-go" : "code-predict")];
  if (round.mode === "loop") return [codeSay(queue.length > 0 ? "code-go" : "code-loop")];
  return [codeSay("code-bird")];
}

/**
 * After an arrow comes off a bug round's plan the row closes up, and the arrow next to it slides
 * under the finger: a second tap (a double tap, or a tap that was a touch late) would take that one
 * too. Taps on the row are let go for this long after.
 */
const REFLOW_MS = 400;

type Walk = { step: number; cell: Cell };

/**
 * The animal's one movement at a time, for the CSS: a hop with a step, or a bump at the edge (with
 * the way it bumped). The count gives each one a new name (a/b), so the same movement twice over
 * is seen twice (an animation only starts over when its name changes).
 */
type Move = { kind: "hop" | "bump"; count: number; dir: Dir };

/**
 * The arrow chip lights this long before the hop it starts: the cause is seen before the effect.
 * It is part of the step (STEP_MS), not added to it: the chip lights, and the hop takes the rest.
 */
const LEAD_MS = 80;
/** A bump at the edge: a lean toward it and back, shorter than a step. */
const BUMP_MS = 300;

/** Where a plan leaves the animal, stopping at the edge. */
function walkTo(round: BirdRound, dirs: Dir[]): Cell {
  let cell = round.start;
  for (const dir of dirs) {
    const next = stepCell(cell, dir);
    if (!onGrid(next, round.width, round.height)) break;
    cell = next;
  }
  return cell;
}

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
  const list = useMemo(() => birdRounds(level, salt), [level, salt]);
  const rounds = useRounds(list);
  /**
   * The child's routine: the plan that got home in the keep round, once it has (any shortest way
   * counts, so it is not always the board's own path). The reuse round's board is made for it then.
   */
  const [kept, setKept] = useState<Dir[] | null>(null);
  const round = useMemo(
    () => (rounds.round.mode === "reuse" && kept && kept.join() !== rounds.round.routine.join() ? reuseRound(kept, salt) : rounds.round),
    [rounds.round, kept, salt],
  );
  const [queue, setQueue] = useRoundState<Chip[]>(rounds.index, []);
  /**
   * Bug: the plan as the child has it, with `null` for an empty place. It starts as the plan shown
   * (an arrow wrong, one too many, or one missing) and is mended on the page: a tapped arrow leaves
   * an empty place, or comes off when there are too many, and a tapped arrow key fills an empty
   * place.
   */
  const [plan, setPlan] = useRoundState<(Dir | null)[]>(rounds.index, bugPlan(round));
  /** Bug: the empty place an arrow key fills, when the child has chosen one (by tapping it, or by making it). */
  const [target, setTarget] = useRoundState<number | null>(rounds.index, null);
  /** Bug: the empty place an arrow key fills: the chosen one while it is empty, else the first. */
  const fillAt = round.mode === "bug" ? (target !== null && plan[target] === null ? target : plan.indexOf(null)) : -1;
  const line = lineFor(round, plan, queue);
  const coach = useCoach(settingsRef, line, rounds.index);
  useFinish(rounds.finished, settingsRef, coach, onDone);
  const [pos, setPos] = useRoundState<Cell>(rounds.index, round.start);
  const [home, setHome] = useRoundState(rounds.index, false);
  /** Where the last run went wrong: the arrow's place and why, until the plan is changed. */
  const [wrong, setWrong] = useRoundState<{ at: number; why: "off" | "away" | "short" } | null>(rounds.index, null);
  /** The step being walked (its arrow lights), and the cells walked so far. */
  const [walking, setWalking] = useRoundState<Walk | null>(rounds.index, null);
  const [trailCells, setTrail] = useRoundState<Cell[]>(rounds.index, []);
  /** The animal's last movement (see Move), and which way it faces (its last left or right). */
  const [move, setMove] = useRoundState<Move | null>(rounds.index, null);
  const [facing, setFacing] = useRoundState<"left" | "right">(rounds.index, "right");
  /** One movement after another: `setMove` with a new count, keeping the kind's name fresh. */
  const moveTo = (kind: Move["kind"], dir: Dir) => {
    setMove((current) => ({ kind, count: (current?.count ?? 0) + 1, dir }));
    if (dir === "left" || dir === "right") setFacing(dir);
  };
  const wiggle = useWiggle();
  const runId = useRef(0);
  const later = useLater();
  /** When an arrow last came off the plan and the row closed up (see REFLOW_MS). */
  const reflowed = useRef(0);
  useEffect(() => () => void (runId.current += 1), []);

  // The tests' quick setting walks fast, but not so fast that a step cannot be seen. Reduced motion
  // keeps the step time: the walk is the lesson, and only the hop is left out (CSS: a glide instead).
  const pace = () => (quickRounds() ? 160 : STEP_MS);
  const lead = () => (quickRounds() ? 20 : LEAD_MS);
  /** How long the hop (and the glide with it) takes: the step less the moment the chip has first. */
  const hop = () => pace() - lead();

  const arrive = () => {
    setHome(true);
    setWalking(null);
    if (round.mode === "keep") {
      // The plan that got home is the child's routine now: its arrows close up into one chip on
      // the page while the line says so, and the next board is made for it.
      setKept(program(round, queue));
      coach.right([codeSay("code-routine-kept")], rounds.next, HOME_MS);
      return;
    }
    coach.right([codeSay("code-home")], rounds.next, HOME_MS);
  };

  /** A tap moves the animal one step: the first rounds at ages 3–4, before any plan. */
  const tapMove = (dir: Dir) => {
    if (home || walking) return;
    const next = stepCell(pos, dir);
    if (!onGrid(next, round.width, round.height)) {
      wiggle.shake(dir);
      moveTo("bump", dir);
      coach.miss([codeSay("code-off")]);
      return;
    }
    wiggle.still();
    coach.touch();
    setTrail((cells) => [...cells, pos]);
    moveTo("hop", dir);
    setPos(next);
    if (sameCell(next, round.nest)) {
      // Home, once the hop has landed there (not at push-off): until then no tap moves it on.
      const id = ++runId.current;
      setWalking({ step: -1, cell: next });
      later.run(() => {
        if (runId.current === id) arrive();
      }, pace());
    }
  };

  /** The plan is being changed: the animal comes back to the start right away, if it was away. */
  const settle = () => {
    later.cancel();
    runId.current += 1;
    setWalking(null);
    setMove(null);
    setTrail([]);
    setPos(round.start);
    setWrong(null);
  };

  /** The animal is in the middle of running a plan (not walking back from one, which a tap may cut short). */
  const running = walking !== null && walking.step >= 0;

  /** Predict: an ending is picked whole, and fills the empty places. Picking another changes it. */
  const pickEnding = (ending: Dir[]) => {
    if (home || running) return;
    wiggle.still();
    if (queue.join() === ending.join()) {
      // Already picked: what is left is Go.
      wiggle.shake("go");
      coach.touch();
      return;
    }
    settle();
    coach.touch();
    setQueue(ending);
  };

  const queueDir = (dir: Dir) => {
    if (home || running) return;
    wiggle.still();
    if (round.mode === "predict") return;
    if (round.mode === "bug") {
      if (fillAt < 0) {
        // Every place has an arrow: what is left is Go (and, if there is one too many, the run
        // shows which).
        wiggle.shake("go");
        coach.touch();
        return;
      }
      settle();
      coach.touch();
      setPlan((current) => current.map((step, at) => (at === fillAt ? dir : step)));
      return;
    }
    if (round.mode === "loop") {
      settle();
      coach.touch();
      setQueue([dir]);
      return;
    }
    queueChip(dir);
  };

  /**
   * An arrow, or the routine, into the next place. The plan has one place for each step home (one
   * for the routine's steps together), and no more: a plan can be wrong, but it cannot run past its
   * places. A tap with every place full is not a dead tap: Go wiggles, since Go is what is left to
   * press.
   */
  const queueChip = (chip: Chip) => {
    if (queue.length >= places) {
      wiggle.shake("go");
      coach.touch();
      return;
    }
    settle();
    coach.touch();
    setQueue((current) => [...current, chip]);
  };

  /**
   * Tapping an arrow in the plan takes it off, and every arrow after it. In a bug round only that
   * arrow goes: it leaves an empty place to fill, or, when the plan has one arrow too many, comes
   * off altogether.
   */
  const tapChip = (place: number) => {
    if (running || home) return;
    if (round.mode === "predict") {
      // The given start stays: a tap on it wiggles it and asks the question again. A tap on the
      // picked ending puts it back among the choices.
      if (place < round.shown.length) {
        wiggle.shake(`chip-${place}`);
        coach.touch(line);
        return;
      }
      settle();
      coach.touch();
      setQueue([]);
      return;
    }
    if (round.mode === "bug") {
      if (Date.now() - reflowed.current < REFLOW_MS) return;
      settle();
      coach.touch();
      if (plan.length > round.path.length) {
        reflowed.current = Date.now();
        setPlan((current) => current.filter((_, at) => at !== place));
        // The chosen place, if it was after this arrow, has moved up one.
        setTarget((current) => (current !== null && current > place ? current - 1 : current));
        return;
      }
      setPlan((current) => current.map((step, at) => (at === place ? null : step)));
      setTarget(place);
      return;
    }
    settle();
    coach.touch();
    setQueue((current) => current.slice(0, place));
  };

  /**
   * Bug: a tap on an empty place. Another empty place than the one an arrow key would fill: this
   * one is chosen instead. The one it would fill (or the only one): a miss, with the line that says
   * what goes there, so that the hand comes to the arrow after three.
   */
  const tapPlace = (place: number) => {
    if (home || running) return;
    if (Date.now() - reflowed.current < REFLOW_MS) return;
    wiggle.shake(`place-${place}`);
    if (place !== fillAt) {
      setTarget(place);
      coach.touch();
      return;
    }
    coach.miss([codeSay("code-bug-missing")]);
  };

  const planned = round.mode !== "tap";
  /**
   * The plan as it is on the page, one entry per place: a bug round's plan (with its empty places),
   * a predict round's given start and picked ending, or the queue. Go runs it only with no empty
   * place in it, so a step's number is its chip's (in a reuse round, by `chipSteps`: the routine
   * chip is several steps).
   */
  const steps: (Chip | null)[] = round.mode === "bug" ? plan : round.mode === "predict" ? [...round.shown, ...queue] : queue;
  /** Which chip each step of the plan is from, and which step inside the routine (see chipSteps). */
  const stepChips = chipSteps(round, steps);
  /** Reuse: the routine chip is in the plan. */
  const routineUsed = round.mode === "reuse" && queue.includes("routine");
  // Empty places show how long the plan is: one for each step it takes to get home (a bug round
  // with one arrow too many shows them all; a reuse round's routine chip takes one place for all
  // its steps).
  const places = round.mode === "loop" ? 1 : round.mode === "reuse" ? reusePlaces(round) : Math.max(round.path.length, steps.length);

  const go = () => {
    if (home || running) return;
    if (fillAt >= 0) {
      // A plan with an empty place in it is not run (even one with every place empty): the place an
      // arrow key fills is pointed at, and the line says what goes there.
      wiggle.shake("go");
      setWrong({ at: fillAt, why: "short" });
      coach.miss([codeSay("code-bug-missing")]);
      return;
    }
    // (A predict round's given start is in `steps` for the page; `program` puts it before the ending.)
    const dirs = program(round, round.mode === "predict" ? queue : steps);
    if (dirs.length === 0) {
      // Nothing to run yet: the instruction again, with the wiggle.
      wiggle.shake("go");
      coach.miss(line);
      return;
    }
    const check = checkPlan(round, dirs);
    // A rest from the last wrong run may still be waiting to walk the animal back: this run takes over.
    later.cancel();
    const id = ++runId.current;
    wiggle.still();
    setWrong(null);
    // Pressed while the animal is still walking back from the last run: it goes to the start first,
    // and is seen there for a step, so the walk is seen to begin at the beginning.
    const away = !sameCell(pos, round.start);
    void (async () => {
      let cell = round.start;
      const walked: Cell[] = [];
      setPos(cell);
      setTrail([]);
      if (away) {
        setWalking(null);
        await sleep(pace());
        if (runId.current !== id) return;
      }
      // Walk every step up to and including the wrong one, so the child sees where it goes.
      const walkedSteps = check.ok || check.why === "short" ? dirs.length : check.at + 1;
      for (let step = 0; step < walkedSteps; step += 1) {
        if (runId.current !== id) return;
        const dir = dirs[step];
        // The arrow lights first, a moment before the step it makes: the cause, then the effect. (A
        // loop has one arrow on the page, walked three times.)
        setWalking({ step: round.mode === "loop" ? 0 : step, cell });
        await sleep(lead());
        if (runId.current !== id) return;
        const next = stepCell(cell, dir);
        if (!onGrid(next, round.width, round.height)) {
          // The edge: the animal bumps and stays.
          moveTo("bump", dir);
          await sleep(Math.max(BUMP_MS, pace()));
          break;
        }
        // The cell being left gets a footprint. (`cell` is about to change, so the list is copied.)
        walked.push(cell);
        setTrail([...walked]);
        cell = next;
        moveTo("hop", dir);
        setPos(cell);
        await sleep(hop());
      }
      if (runId.current !== id) return;
      if (check.ok) {
        arrive();
        return;
      }
      setWalking(null);
      // Which arrow to point at: the wrong one (in a reuse round, the chip its step is from), or the
      // empty place after a plan that stops short (the next place; with every place full of arrows
      // and the way still short, there is none, and it is the routine chip that is wanted).
      const at = round.mode === "loop" ? 0 : check.why === "short" ? steps.length : (stepChips[check.at]?.chip ?? check.at);
      setWrong({ at, why: check.why });
      if (round.mode === "reuse" && check.why === "short" && !routineUsed) {
        wiggle.shake("routine");
        coach.miss([codeSay("code-routine-short")]);
      } else {
        wiggle.shake(`chip-${at}`);
        coach.miss([codeSay(`code-${check.why}`)]);
      }
      // Then, after a moment to see where it got to, the animal walks back the way it came, and the
      // plan is there to mend.
      later.run(
        () => {
          void (async () => {
            // Back the way it came: to the cells before the one it stands on. A plan that doubled
            // back has left this cell before, and the way back starts from that first leaving.
            const been = walked.findIndex((step) => sameCell(step, cell));
            const way = (been >= 0 ? walked.slice(0, been) : walked).reverse();
            // Back is a quiet glide, no hops: a step back is not a step of the plan.
            setMove(null);
            for (const [index, back] of way.entries()) {
              if (runId.current !== id) return;
              setWalking({ step: -1, cell: back });
              setPos(back);
              setTrail(way.slice(index + 1).reverse());
              await sleep(pace() / 2);
            }
            if (runId.current !== id) return;
            setWalking(null);
            setTrail([]);
            setPos(round.start);
          })();
        },
        quickRounds() ? 500 : BACK_MS,
      );
    })();
  };

  // What is shown in the places: in a predict round the given start is there before anything is picked.
  const arrows = steps;
  /** Bug: the plan is as it was first shown, so the arrow (or the empty place) put in it is still there. */
  const untouched = round.mode === "bug" && plan.join() === bugPlan(round).join();
  /** Bug: the plan as the child has it gets home (by any shortest way, as `checkPlan` has it, not only the drawn one). */
  const mended = round.mode === "bug" && checkPlan(round, program(round, plan)).ok;
  // The hand, after three misses: on the arrow a plan goes wrong at, else on an arrow that brings
  // the animal nearer the nest from where the plan so far leaves it (from where it stands, in a tap
  // round). Any shortest way home is right, as checkPlan has it, not only the drawn one.
  const hint = (() => {
    if (!coach.reveal || home) return null;
    if (round.mode === "bug") {
      // The empty place first: the arrow that makes the plan work with the arrows after it, or, if
      // those are wrong too, any step nearer the nest from where the arrows before it lead. Then the
      // arrow the plan goes wrong at.
      if (fillAt >= 0) {
        const fills = DIRS.find((dir) => checkPlan(round, program(round, plan.map((step, at) => (at === fillAt ? dir : step)))).ok);
        const way = fills ?? nextStepHome(round, walkTo(round, program(round, plan.slice(0, fillAt))));
        return way ? { arrow: way } : null;
      }
      const check = checkPlan(round, program(round, plan));
      if (check.ok) return null;
      if (check.why !== "short") return { chip: check.at };
      const way = nextStepHome(round, walkTo(round, program(round, plan)));
      return way ? { arrow: way } : null;
    }
    if (round.mode === "predict") {
      const right = round.choices.findIndex((ending) => checkPlan(round, [...round.shown, ...ending]).ok);
      return queue.length > 0 && queue.join() === round.choices[right]?.join() ? null : { choice: right };
    }
    if (round.mode === "loop") return queue[0] === round.path[0] ? null : { arrow: round.path[0] };
    if (round.mode === "tap") {
      const way = nextStepHome(round, pos);
      return way ? { arrow: way } : null;
    }
    const dirs = program(round, queue);
    const check = checkPlan(round, dirs);
    if (!check.ok && check.why !== "short") return { chip: stepChips[check.at]?.chip ?? check.at };
    // Reuse: the routine chip, when it is not in the plan yet and its steps go the right way from
    // where the plan so far leaves the animal; with every place full, the last arrow has to come
    // off first, so the hand goes to that.
    if (round.mode === "reuse" && !routineUsed) {
      if (queue.length >= places) return { chip: queue.length - 1 };
      if (routineFits(round, queue)) return { routine: true };
    }
    const way = nextStepHome(round, walkTo(round, dirs));
    return way ? { arrow: way } : null;
  })();
  /**
   * How the animal looks (see Mood in the kit): cheering at the nest, hopping while the plan runs
   * (not while it walks back), waiting with the child who is taking a while, else as the coach has
   * it (a puzzled tilt after a miss, idle).
   */
  const petMood: Mood = home ? "cheer" : running ? "walk" : lookOf(coach);
  // A bigger cheer for a mended plan (a bug round) and for the last round of the game.
  const bigCheer = round.mode === "bug" || rounds.index === rounds.total - 1;
  const full =
    ((round.mode === "plan" || round.mode === "keep" || round.mode === "reuse") && queue.length >= places) ||
    (round.mode === "predict" && queue.length > 0) ||
    (round.mode === "bug" && !plan.includes(null));
  const place = PLACES[(rounds.index + Math.abs(salt)) % PLACES.length];
  const cols = round.width;
  const rowsCount = round.height;
  // The tiles are square and as big as the stage allows: the stage is measured, since CSS alone
  // cannot fit a grid of squares to both a width and a height (the old tiles stretched to the
  // stage and were tall and thin on a phone).
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [cell, setCell] = useState(0);
  // Before paint, so a board of a new shape is never drawn at the last board's size for a frame.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const measure = () => setCell(Math.floor(Math.min(stage.clientWidth / cols, stage.clientHeight / rowsCount)));
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(stage);
    return () => watch.disconnect();
  }, [cols, rowsCount]);

  return (
    <GameFrame
      screen="bird"
      title="Take me home"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene={place}
      attrs={{
        "data-level": level,
        "data-mode": round.mode,
        "data-path": round.path.join(","),
        "data-home": home ? "true" : "false",
        "data-solved": home ? "true" : "false",
        "data-again": wrong ? "true" : "false",
        "data-wrong-at": wrong ? wrong.at : undefined,
        "data-wrong-why": wrong ? wrong.why : undefined,
        "data-repeat": round.repeat,
        "data-fixed": mended ? "true" : "false",
        "data-bug-kind": round.bugKind ?? undefined,
        "data-running": walking ? "true" : "false",
        "data-cheer": bigCheer ? "big" : "small",
        "data-facing": facing,
        "data-move": move ? `${move.kind}-${move.count % 2 === 1 ? "a" : "b"}` : "none",
        "data-x": pos.x,
        "data-y": pos.y,
        "data-plan-full": full ? "true" : "false",
        "data-choices": round.mode === "predict" ? round.choices.length : undefined,
        "data-routine": round.mode === "reuse" ? round.routine.join(",") : kept && round.mode === "keep" ? kept.join(",") : undefined,
        "data-routine-at": round.mode === "reuse" ? routineAt(round) : undefined,
        "data-places": places,
      }}
      stage={
        <div className="code-stage" ref={stageRef}>
        <div
          className="code-field"
          style={{ "--cols": cols, "--rows": rowsCount, width: cell ? cell * cols : undefined, height: cell ? cell * rowsCount : undefined } as React.CSSProperties}
          data-width={cols}
          data-height={rowsCount}
        >
          {Array.from({ length: cols * rowsCount }, (_, index) => {
            const x = index % cols;
            const y = Math.floor(index / cols);
            const nest = round.nest.x === x && round.nest.y === y;
            const here = pos.x === x && pos.y === y;
            const passed = trailCells.some((step) => step.x === x && step.y === y);
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
              </div>
            );
          })}
          {/* The animal, one cell big, moved by a transform (never by layout: smooth on a tablet). It
              glides from cell to cell with a hop on each step (the hop and the bump are on an inner
              wrapper, the mood's bounce or tilt on the body, so none of them fight). A new round is a
              new animal (the key), so it does not glide across from the last board. */}
          <span
            key={rounds.index}
            className="game-host code-pet"
            data-mood={petMood}
            data-facing={facing}
            style={
              {
                transform: `translate(${pos.x * 100}%, ${pos.y * 100}%)`,
                "--step": `${walking?.step === -1 ? pace() / 2 : hop()}ms`,
                "--bump": `${BUMP_MS}ms`,
              } as React.CSSProperties
            }
          >
            <span className="game-host-body">
              <span
                className="code-pet-move"
                data-move={move ? `${move.kind}-${move.count % 2 === 1 ? "a" : "b"}` : "none"}
                style={{ "--bx": move?.dir === "left" ? -1 : move?.dir === "right" ? 1 : 0, "--by": move?.dir === "up" ? -1 : move?.dir === "down" ? 1 : 0 } as React.CSSProperties}
              >
                <Hero animal={animal} outfit={outfit} mood={petMood} />
              </span>
            </span>
          </span>
        </div>
        </div>
      }
    >
      {planned ? (
        <div
          className="code-plan"
          data-plan={round.mode}
          data-places={places}
          data-kept={round.mode === "keep" && home ? "true" : "false"}
          // The routine chip is wider than an arrow (it shows its steps), so a reuse round's row is
          // sized as if it had most of one place more.
          style={{ "--places": round.mode === "reuse" ? places + 0.6 : places } as React.CSSProperties}
        >
          <div className="code-queue" aria-label="Your plan">
            {Array.from({ length: places }, (_, at) => {
              const dir = arrows[at];
              if (!dir) {
                const next = wrong?.why === "short" && wrong.at === at;
                if (round.mode !== "bug") {
                  return (
                    <span key={`place-${at}`} className="code-place" data-place={at} data-next={next ? "true" : "false"}>
                      {at + 1}
                    </span>
                  );
                }
                // Bug: an empty place in the plan, where an arrow is missing or one was tapped off. It
                // can be tapped (to choose it, or to hear what goes there), and the one an arrow key
                // fills is marked when there is more than one; that is the one the hand sits in. The
                // pulse (after Go pointed at it) is keyed on the misses so that it is seen each time.
                const fills = at === fillAt;
                const several = arrows.filter((step) => step === null).length > 1;
                return (
                  <button
                    key={`place-${at}`}
                    type="button"
                    className="code-place"
                    data-place={at}
                    data-next={next ? "true" : "false"}
                    data-pulse={next ? (coach.misses % 2 === 1 ? "a" : "b") : "false"}
                    data-gap="true"
                    data-target={fills && several ? "true" : "false"}
                    data-wiggle={wiggle.id === `place-${at}` ? (wiggle.count % 2 === 1 ? "a" : "b") : "false"}
                    aria-label={`place ${at + 1}, empty${fills && several ? ", the arrow goes here" : ""}${next ? ", next" : ""}`}
                    onClick={() => tapPlace(at)}
                  >
                    <span aria-hidden="true">{at + 1}</span>
                    {hint && "arrow" in hint && fills ? <Hand /> : null}
                  </button>
                );
              }
              const bug = untouched && at === round.bugIndex;
              const given = round.mode === "predict" && at < round.shown.length;
              const marked = wrong !== null && wrong.why !== "short" && wrong.at === at;
              // The step being walked, when it is this chip's (a loop's one chip is every step).
              const on = walking !== null && walking.step >= 0 && (round.mode === "loop" ? at === 0 : stepChips[walking.step]?.chip === at);
              if (dir === "routine") {
                // The routine chip: its steps, small, in a row. As they are walked it opens up and
                // the one being walked lights, so the child sees one chip doing several steps.
                const sub = on ? stepChips[walking!.step]!.sub : -1;
                return (
                  <button
                    key={`routine-${at}`}
                    type="button"
                    className="code-chip code-chip-routine"
                    data-queued={at}
                    data-dir="routine"
                    data-on={on ? "true" : "false"}
                    data-wrong={marked ? "true" : "false"}
                    data-wiggle={wiggle.id === `chip-${at}` ? (wiggle.count % 2 === 1 ? "a" : "b") : "false"}
                    aria-label={`your routine, ${round.routine.join(", ")}${marked ? ", wrong" : ""}`}
                    onClick={() => tapChip(at)}
                  >
                    <RoutineChip steps={round.routine} on={sub} />
                    {hint && "chip" in hint && hint.chip === at ? <Hand /> : null}
                  </button>
                );
              }
              return (
                <button
                  key={`${dir}-${at}`}
                  type="button"
                  className="code-chip"
                  data-queued={at}
                  data-dir={dir}
                  data-on={on ? "true" : "false"}
                  data-wrong={marked ? "true" : "false"}
                  data-wiggle={wiggle.id === `chip-${at}` ? (wiggle.count % 2 === 1 ? "a" : "b") : "false"}
                  // For the tests: the arrow put in the plan wrong (or one too many), while the plan is as shown.
                  data-bug={bug ? "true" : "false"}
                  data-given={given ? "true" : "false"}
                  // The wrong arrow in a bug round is for the child to find: it is not named as wrong
                  // until a run has shown it to be.
                  aria-label={marked ? `${dir}, wrong` : dir}
                  onClick={() => tapChip(at)}
                >
                  <ArrowIcon dir={dir} />
                  {hint && "chip" in hint && hint.chip === at ? <Hand /> : null}
                </button>
              );
            })}
            {round.mode === "loop" ? (
              <span className="code-loop" aria-label="3 times">
                × 3
              </span>
            ) : null}
          </div>
          {round.mode === "keep" && home && kept ? (
            // The plan, kept: the arrows close up (CSS) and this takes their place, the one chip
            // the child uses in the next round.
            <span className="code-routine-born" data-routine={kept.join(",")} aria-hidden="true">
              <RoutineChip steps={kept} on={-1} />
            </span>
          ) : null}
        </div>
      ) : null}
      {round.mode === "predict"
        ? round.choices.map((ending, index) => (
            <Pick
              key={ending.join("-")}
              id={`ending-${index}`}
              name={ending.join(", ")}
              art={
                <span className="code-ending" data-ending={ending.join(",")}>
                  {ending.map((dir, step) => (
                    <ArrowIcon key={step} dir={dir} />
                  ))}
                </span>
              }
              chosen={queue.join() === ending.join()}
              wiggle={wiggle.id === `ending-${index}` ? wiggle.count : 0}
              reveal={hint !== null && "choice" in hint && hint.choice === index}
              onPick={() => pickEnding(ending)}
              attrs={{ "data-choice": index }}
            />
          ))
        : null}
      {round.mode !== "predict"
        ? DIRS.map((dir) => (
            <Pick
              key={dir}
              id={dir}
              name={dir}
              size="mid"
              art={<ArrowIcon dir={dir} />}
              wiggle={wiggle.id === dir ? wiggle.count : 0}
              demo={hint !== null && "arrow" in hint && hint.arrow === dir}
              onPick={() => (round.mode === "tap" ? tapMove(dir) : queueDir(dir))}
              attrs={{ "data-arrow": dir }}
            />
          ))
        : null}
      {round.mode === "reuse" ? (
        // The routine, to put in the plan as one chip: on a row of its own with Go, under the arrows
        // (the break makes that so at every width).
        <span className="code-break" aria-hidden="true" />
      ) : null}
      {round.mode === "reuse" ? (
        <Pick
          id="routine"
          name={`your routine: ${round.routine.join(", ")}`}
          size="mid"
          art={<RoutineChip steps={round.routine} on={-1} />}
          wiggle={wiggle.id === "routine" ? wiggle.count : 0}
          demo={hint !== null && "routine" in hint}
          onPick={() => queueChip("routine")}
          attrs={{ "data-routine-pick": "true", "data-used": routineUsed ? "true" : "false" }}
        />
      ) : null}
      {planned ? (
        // Go sits at the end of the row of arrows, the same size as they are and the one solid green
        // thing on the page, so the board, the plan and Go are on one phone screen together. It is
        // not disabled while the animal walks, which would drop a keyboard's focus; it just waits.
        <button
          type="button"
          className="start-button code-go"
          data-go="run"
          // a/b: a new name each time, so a second press is seen to wiggle too.
          data-wiggle={wiggle.id === "go" ? (wiggle.count % 2 === 1 ? "a" : "b") : "false"}
          data-waiting={home || running ? "true" : "false"}
          aria-disabled={home || running ? "true" : undefined}
          onClick={go}
        >
          <GoIcon />
          <span>Go</span>
        </button>
      ) : null}
    </GameFrame>
  );
}

/**
 * The routine as one chip: its steps as small arrows in a row, with a mark that says "kept" (a
 * little nest). `on` is the step being walked right now, or -1.
 */
function RoutineChip({ steps, on }: { steps: Dir[]; on: number }) {
  return (
    <span className="code-routine" data-open={on >= 0 ? "true" : "false"}>
      <svg className="code-routine-mark" viewBox="0 0 64 40" aria-hidden="true">
        <ellipse cx="32" cy="24" rx="22" ry="12" fill="#e4c7a4" />
        <ellipse cx="32" cy="22" rx="14" ry="7" fill="#f6e3b4" />
      </svg>
      {steps.map((dir, index) => (
        <span key={index} className="code-routine-step" data-on={on === index ? "true" : "false"}>
          <ArrowIcon dir={dir} />
        </span>
      ))}
    </span>
  );
}

function GoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="22" height="22">
      <path d="M7 4.5v15l12-7.5Z" fill="currentColor" />
    </svg>
  );
}

/** For the tests only, in a development build: the animal walks fast. The kit's switch. */
function quickRounds(): boolean {
  try {
    return import.meta.env.DEV && window.localStorage.getItem("littlenest-quick-rounds") === "1";
  } catch {
    return false;
  }
}

function useLater() {
  const timer = useRef<number | null>(null);
  const cancel = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => cancel, []);
  return {
    run(fn: () => void, ms: number) {
      cancel();
      timer.current = window.setTimeout(fn, ms);
    },
    cancel,
  };
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
