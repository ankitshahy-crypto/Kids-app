import { useEffect, useMemo, useRef, useState } from "react";
import { numberCue, promptCue, wordCue, type Cue } from "../audio/player";
import type { AnimalId } from "../data/animals";
import {
  activitiesFor,
  balanceRounds,
  balanceTilt,
  bridgeRounds,
  engineerLevel,
  engineerLine,
  MACHINE_NAMES,
  machineRounds,
  plankFit,
  rampRounds,
  rampTry,
  towerNext,
  towerRounds,
  type BuildActivity,
  type MachineId,
  type RampHeight,
} from "../data/engineer";
import type { LogicLevel } from "../data/logic";
import type { AgeRange } from "../data/profiles";
import type { Outfit } from "../data/wardrobe";
import { GameFrame, newSalt, Pick, useCoach, useFinish, useRounds, useRoundState, useWiggle } from "../game/kit";
import type { Settings } from "../settings";
import { LockBadge } from "./LockBadge";

/**
 * LittleNest Build, rebuilt on the game kit.
 *
 * These were colored bars and a button that said TEST. Now each is a small
 * problem in a drawn scene, asked aloud: a river to bridge with the plank
 * that fits, a tower that stands when the widest block is at the bottom, a
 * ball to roll to a flag, a load for a lever, a pulley or wheels, and a beam
 * to balance. What the child picks is tried in the scene, so they see what
 * happens: the short plank falls in, the low ramp stops short.
 */

type PlayProps = {
  level: LogicLevel;
  animal: AnimalId;
  outfit: Outfit;
  settingsRef: { current: Settings };
  onDone: () => void;
};

const say = (id: string): Cue => promptCue(id, engineerLine(id));

/** How long a try is left on show in the scene before it is judged. */
const TRY_MS = 900;
/** How long the scene is given to show a right answer working (the walk across, the lever lifting) before the next round. */
const SHOW_MS = 1700;

/** A timer that is dropped if the game closes first. */
function useLater() {
  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );
  return (run: () => void, ms: number) => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(run, ms);
  };
}

// ------------------------------------------------------------------ bridge

/** How wide one plank-length is, as a share of the scene. */
const SPAN = 9;
const BANK = 28;

function PlankArt({ length }: { length: number }) {
  const width = length * 20;
  const left = 55 - width / 2;
  return (
    <svg className="plank-art" viewBox="0 0 110 56" aria-hidden="true" focusable="false">
      <rect x={left} y="18" width={width} height="20" rx="6" fill="#c48f5c" />
      <rect x={left} y="32" width={width} height="6" rx="3" fill="#a8743f" />
      <path d={`M${left + 7} 25h${width - 14}`} stroke="#dab088" strokeWidth="3" strokeLinecap="round" />
      <circle cx={left + 7} cy="29" r="2" fill="#8a6a4a" />
      <circle cx={left + width - 7} cy="29" r="2" fill="#8a6a4a" />
    </svg>
  );
}

/** Bridge: a river, three planks, and the animal waiting to cross. The plank that fits lets it walk over. */
function BridgeGame({ level, animal, outfit, settingsRef, onDone }: PlayProps) {
  const [salt] = useState(newSalt);
  const list = useMemo(() => bridgeRounds(level, salt), [level, salt]);
  const rounds = useRounds(list);
  const round = rounds.round;
  // The plank being tried, how it turned out, and whether the animal has walked over.
  const [tried, setTried] = useRoundState<{ plank: number; fit: string } | null>(rounds.index, null);
  const [crossed, setCrossed] = useRoundState(rounds.index, false);
  const wiggle = useWiggle();
  const later = useLater();
  const coach = useCoach(settingsRef, [say("engineer-bridge")], rounds.index);
  useFinish(rounds.finished, settingsRef, coach, onDone);

  const lay = (plank: number) => {
    if (crossed || (tried && tried.fit === "fits")) return;
    const fit = plankFit(round.gap, plank);
    setTried({ plank, fit });
    if (fit === "fits") {
      wiggle.still();
      setCrossed(true);
      coach.right([say("engineer-fits")], rounds.next, SHOW_MS);
      return;
    }
    wiggle.shake(String(plank));
    coach.miss([say(fit === "short" ? "engineer-short" : "engineer-long")]);
    // The plank that did not fit is taken away again.
    later(() => setTried(null), TRY_MS + 500);
  };

  const far = BANK + round.gap * SPAN;
  return (
    <GameFrame
      screen="bridge"
      title="Bridge"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="sky"
      hostAt={{ left: crossed ? far + 2 : 1, bottom: 27, walk: crossed }}
      attrs={{
        "data-engineer": "bridge",
        "data-level": level,
        "data-gap": round.gap,
        "data-answer": round.gap,
        "data-tried": tried ? tried.fit : "none",
        "data-crossed": crossed ? "true" : "false",
        "data-solved": crossed ? "true" : "false",
      }}
      stage={
        <div className="bridge-scene" data-wide="true">
          <span className="bridge-water" />
          <span className="bridge-bank" style={{ left: 0, width: `${BANK}%` }} />
          <span className="bridge-bank is-far" style={{ left: `${far}%`, right: 0 }} />
          {tried ? (
            <span
              key={`${tried.plank}-${tried.fit}`}
              className="bridge-plank"
              data-fit={tried.fit}
              style={{ left: `${BANK - 3}%`, width: `${tried.plank * SPAN + 6}%` }}
            />
          ) : null}
        </div>
      }
    >
      {round.planks.map((plank) => (
        <Pick
          key={plank}
          id={String(plank)}
          name={`plank ${plank} long`}
          art={<PlankArt length={plank} />}
          wiggle={wiggle.id === String(plank) ? wiggle.count : 0}
          reveal={coach.reveal && plank === round.gap}
          onPick={() => lay(plank)}
          attrs={{ "data-plank": plank }}
        />
      ))}
    </GameFrame>
  );
}

// ------------------------------------------------------------------ tower

/** One color for each width. None of them is the green of the grass the tower stands on. */
const BLOCK_COLOR = ["", "#f3a9a0", "#f6d56b", "#c9b6e8", "#9ccbe8", "#f2a65a"];

function BlockArt({ width }: { width: number }) {
  return (
    <svg className="block-art" viewBox="0 0 110 44" aria-hidden="true" focusable="false">
      <rect x={55 - width * 10} y="8" width={width * 20} height="28" rx="6" fill={BLOCK_COLOR[width]} />
      <rect x={55 - width * 10} y="8" width={width * 20} height="8" rx="4" fill="#fffdfb" opacity="0.35" />
    </svg>
  );
}

/** Tower: blocks of different widths. The widest goes on the bottom, then the next widest, and it stands. */
function TowerGame({ level, animal, outfit, settingsRef, onDone }: PlayProps) {
  const [salt] = useState(newSalt);
  const list = useMemo(() => towerRounds(level, salt), [level, salt]);
  const rounds = useRounds(list);
  const round = rounds.round;
  const [stack, setStack] = useRoundState<number[]>(rounds.index, []);
  const [asked, setAsked] = useRoundState(rounds.index, 0);
  // A block that was put on too soon: it wobbles on top for a moment, then comes off.
  const [wobble, setWobble] = useRoundState(rounds.index, 0);
  const wiggle = useWiggle();
  const later = useLater();
  const coach = useCoach(settingsRef, [say(asked === 0 ? "engineer-tower" : "engineer-tower-next")], `${rounds.index}-${asked}`);
  useFinish(rounds.finished, settingsRef, coach, onDone);
  const want = towerNext(round.blocks, stack);

  const put = (block: number) => {
    if (stack.includes(block) || stack.length !== asked || want === 0) return;
    if (block !== want) {
      wiggle.shake(String(block));
      setWobble(block);
      later(() => setWobble(0), TRY_MS);
      coach.miss([say("engineer-tower-wide")]);
      return;
    }
    wiggle.still();
    setWobble(0);
    const next = [...stack, block];
    setStack(next);
    if (next.length >= round.blocks.length) coach.right([say("engineer-tower-done")], rounds.next);
    else coach.right([], () => setAsked(next.length));
  };

  return (
    <GameFrame
      screen="tower"
      title="Tower"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="field"
      attrs={{
        "data-engineer": "tower",
        "data-level": level,
        "data-answer": want,
        "data-stack": stack.join(","),
        "data-ready": stack.length === asked ? "true" : "false",
        "data-solved": want === 0 ? "true" : "false",
        "data-wobble": wobble || "none",
      }}
      stage={
        <div className="tower-stack" data-height={stack.length}>
          <span className="tower-base" />
          {stack.map((block) => (
            <span key={block} className="tower-block" data-block={block} style={{ width: `${block * 26 + 16}px`, background: BLOCK_COLOR[block] }} />
          ))}
          {wobble ? <span key={`wobble-${wobble}-${wiggle.count}`} className="tower-block is-wobbling" data-block={wobble} style={{ width: `${wobble * 26 + 16}px`, background: BLOCK_COLOR[wobble] }} /> : null}
        </div>
      }
    >
      {round.blocks.map((block) => (
        <Pick
          key={block}
          id={String(block)}
          name={`block ${block} wide`}
          size={round.blocks.length > 4 ? "small" : round.blocks.length > 3 ? "mid" : "big"}
          art={<BlockArt width={block} />}
          used={stack.includes(block)}
          wiggle={wiggle.id === String(block) ? wiggle.count : 0}
          reveal={coach.reveal && block === want}
          onPick={() => put(block)}
          attrs={{ "data-block": block }}
        />
      ))}
    </GameFrame>
  );
}

// ------------------------------------------------------------------ ramp

/** Where the ball stops for each place along the track, as a share of the scene. */
const SPOT_AT: Record<RampHeight, number> = { 1: 62, 2: 76, 3: 90 };

function RampArt({ height }: { height: RampHeight }) {
  return (
    <svg className="ramp-art" viewBox="0 0 100 80" aria-hidden="true" focusable="false">
      <path d={`M14 72V${72 - height * 20}L86 72Z`} fill="#e6c79f" />
      <path d={`M14 ${72 - height * 20}L86 72`} stroke="#c48f5c" strokeWidth="5" strokeLinecap="round" />
      <circle cx="22" cy={72 - height * 20 - 9} r="8" fill="#e07a5f" />
    </svg>
  );
}

/** Ramp: a ball, a flag, and three ramps. A higher ramp rolls the ball farther; the child finds the one that reaches. */
function RampGame({ level, animal, outfit, settingsRef, onDone }: PlayProps) {
  const [salt] = useState(newSalt);
  const list = useMemo(() => rampRounds(level, salt), [level, salt]);
  const rounds = useRounds(list);
  const round = rounds.round;
  const [roll, setRoll] = useRoundState<{ height: RampHeight; turn: number } | null>(rounds.index, null);
  const [solved, setSolved] = useRoundState(rounds.index, false);
  const [rolling, setRolling] = useRoundState(rounds.index, false);
  const wiggle = useWiggle();
  const later = useLater();
  const coach = useCoach(settingsRef, [say("engineer-ramp")], rounds.index);
  useFinish(rounds.finished, settingsRef, coach, onDone);

  const send = (height: RampHeight) => {
    if (solved || rolling) return;
    setRoll({ height, turn: (roll?.turn ?? 0) + 1 });
    setRolling(true);
    coach.touch();
    // The ball is watched all the way before anything is said about where it stopped.
    later(() => {
      setRolling(false);
      const result = rampTry(height, round.flag);
      if (result === "reach") {
        wiggle.still();
        setSolved(true);
        coach.right([say("engineer-ramp-done")], rounds.next);
        return;
      }
      wiggle.shake(String(height));
      coach.miss([say(result === "short" ? "engineer-ramp-short" : "engineer-ramp-far")]);
    }, TRY_MS + 300);
  };

  return (
    <GameFrame
      screen="ramp"
      title="Ramps"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="sky"
      hostAt={{ left: 1, bottom: 15 }}
      attrs={{
        "data-engineer": "ramp",
        "data-level": level,
        "data-flag": round.flag,
        "data-answer": round.flag,
        "data-height": roll ? roll.height : "none",
        "data-rolling": rolling ? "true" : "false",
        "data-landed": roll && !rolling ? roll.height : "none",
        "data-solved": solved ? "true" : "false",
      }}
      stage={
        <div className="ramp-scene" data-wide="true">
          <span className="ramp-ground" />
          {([1, 2, 3] as RampHeight[]).map((spot) => (
            <span key={spot} className="ramp-spot" data-spot={spot} data-flag={spot === round.flag ? "true" : "false"} style={{ left: `${SPOT_AT[spot]}%` }}>
              {spot === round.flag ? (
                <svg viewBox="0 0 30 50" aria-hidden="true" focusable="false">
                  <rect x="13" y="4" width="4" height="44" rx="2" fill="#8a6a4a" />
                  <path d="M17 6h13l-5 8 5 8H17Z" fill="#e07a5f" />
                </svg>
              ) : null}
            </span>
          ))}
          {/* No ramp stands there until one is chosen: the ball waits on the grass, so no answer looks picked already. */}
          {roll ? (
            <svg className="ramp-slope" data-height={roll.height} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
              <path d={`M0 100V${100 - roll.height * 30}L100 100Z`} fill="#e6c79f" />
              <path d={`M0 ${100 - roll.height * 30}L100 100`} stroke="#c48f5c" strokeWidth="5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>
          ) : null}
          <span
            key={roll ? roll.turn : 0}
            className={`ramp-ball${roll ? " is-rolling" : ""}`}
            style={{ ["--top" as string]: `${roll ? 20 + roll.height * 13.5 : 20}%`, ["--stop" as string]: `${roll ? SPOT_AT[roll.height] : 0}%` }}
          />
        </div>
      }
    >
      {([1, 2, 3] as RampHeight[]).map((option) => (
        <Pick
          key={option}
          id={String(option)}
          name={option === 1 ? "low ramp" : option === 2 ? "middle ramp" : "high ramp"}
          art={<RampArt height={option} />}
          wiggle={wiggle.id === String(option) ? wiggle.count : 0}
          reveal={coach.reveal && option === round.flag}
          onPick={() => send(option)}
          attrs={{ "data-ramp": option }}
        />
      ))}
    </GameFrame>
  );
}

// ------------------------------------------------------------------ machines

function MachineArt({ id }: { id: MachineId }) {
  if (id === "lever") {
    return (
      <svg className="machine-art" viewBox="0 0 100 70" aria-hidden="true" focusable="false">
        <path d="M40 62l10-20 10 20Z" fill="#8a94a3" />
        <rect x="6" y="36" width="88" height="8" rx="4" fill="#c48f5c" transform="rotate(-12 50 40)" />
      </svg>
    );
  }
  if (id === "pulley") {
    return (
      <svg className="machine-art" viewBox="0 0 100 70" aria-hidden="true" focusable="false">
        <rect x="18" y="4" width="64" height="7" rx="3" fill="#8a6a4a" />
        <circle cx="50" cy="20" r="11" fill="#c7ced6" stroke="#8a94a3" strokeWidth="3" />
        <circle cx="50" cy="20" r="3" fill="#8a94a3" />
        <path d="M39 20v40M61 20v26" stroke="#8a6a4a" strokeWidth="3" strokeLinecap="round" />
        <path d="M61 46c8 0 8 12 0 12" fill="none" stroke="#8a94a3" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className="machine-art" viewBox="0 0 100 70" aria-hidden="true" focusable="false">
      <rect x="14" y="30" width="72" height="14" rx="5" fill="#e07a5f" />
      <path d="M86 34h10" stroke="#8a6a4a" strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="52" r="11" fill="#5e7a99" />
      <circle cx="68" cy="52" r="11" fill="#5e7a99" />
      <circle cx="32" cy="52" r="4" fill="#c7ced6" />
      <circle cx="68" cy="52" r="4" fill="#c7ced6" />
    </svg>
  );
}

/**
 * The job in the scene: before, the load alone on the grass; after, the machine doing the work.
 * Everything stands on one ground line (y 172), level with the animal's feet, so nothing floats on the far hill.
 */
function JobScene({ job, done }: { job: "rock" | "bucket" | "box"; done: boolean }) {
  const rock = (
    <>
      <path d="M150 0c2-26 18-40 38-40s34 14 36 40Z" fill="#9aa5b1" />
      <path d="M150 0c1-8 3-15 7-21 10 9 38 12 60 5 4 5 6 10 7 16Z" fill="#8a94a3" />
      <path d="M168 -26c7-7 16-9 25-7" fill="none" stroke="#c7ced6" strokeWidth="4" strokeLinecap="round" />
    </>
  );
  return (
    <svg className="job-art" viewBox="0 0 240 180" data-job={job} data-done={done ? "true" : "false"} aria-hidden="true" focusable="false">
      {job === "rock" ? (
        done ? (
          <>
            <path d="M106 172l16-28 16 28Z" fill="#8a94a3" />
            {/* The plank starts with its far end under the rock, and tips to lift it. */}
            <g className="job-lever">
              <rect x="30" y="135" width="200" height="10" rx="5" fill="#c48f5c" />
              <rect x="30" y="141" width="200" height="4" rx="2" fill="#a8743f" />
              <g transform="translate(0 135)">{rock}</g>
            </g>
          </>
        ) : (
          <>
            <ellipse cx="187" cy="172" rx="44" ry="5" fill="rgba(36, 48, 86, 0.12)" />
            <g transform="translate(0 172)">{rock}</g>
          </>
        )
      ) : null}
      {job === "bucket" ? (
        <>
          {done ? (
            <>
              <rect x="96" y="8" width="8" height="120" fill="#8a6a4a" />
              <rect x="196" y="8" width="8" height="120" fill="#8a6a4a" />
              <rect x="90" y="6" width="120" height="9" rx="4" fill="#8a6a4a" />
              <circle cx="150" cy="24" r="12" fill="#c7ced6" stroke="#8a94a3" strokeWidth="3" />
              <circle cx="150" cy="24" r="3" fill="#8a94a3" />
            </>
          ) : null}
          <g className={done ? "job-bucket" : undefined}>
            {done ? <path d="M150 36v82" stroke="#8a6a4a" strokeWidth="3" /> : null}
            <path d="M132 118h36l-5 30h-26Z" fill="#7fb8de" />
            <path d="M134 126h32" stroke="#5e9cc8" strokeWidth="3" />
            <path d="M132 118c0-16 36-16 36 0" fill="none" stroke="#5e9cc8" strokeWidth="4" />
          </g>
          {/* the well, in front of the bucket while it is still down */}
          <path d="M100 128h100v34c0 6-4 10-10 10h-80c-6 0-10-4-10-10Z" fill="#b9aecb" />
          <path d="M100 142h100M100 157h100M124 128v14M150 142v15M176 128v14M124 157v15M176 157v15" stroke="#9d91b3" strokeWidth="3" />
          <rect x="94" y="122" width="112" height="12" rx="6" fill="#9d91b3" />
        </>
      ) : null}
      {job === "box" ? (
        done ? (
          <g className="job-cart">
            <rect x="58" y="86" width="72" height="62" rx="6" fill="#e0a45e" />
            <path d="M58 108h72M94 86v62" stroke="#c4863f" strokeWidth="4" />
            <rect x="44" y="148" width="100" height="10" rx="4" fill="#e07a5f" />
            <path d="M144 153h14" stroke="#8a6a4a" strokeWidth="4" strokeLinecap="round" />
            <circle cx="66" cy="162" r="11" fill="#5e7a99" />
            <circle cx="122" cy="162" r="11" fill="#5e7a99" />
            <circle cx="66" cy="162" r="4" fill="#c7ced6" />
            <circle cx="122" cy="162" r="4" fill="#c7ced6" />
          </g>
        ) : (
          <>
            <ellipse cx="94" cy="172" rx="42" ry="5" fill="rgba(36, 48, 86, 0.12)" />
            <rect x="58" y="110" width="72" height="62" rx="6" fill="#e0a45e" />
            <path d="M58 132h72M94 110v62" stroke="#c4863f" strokeWidth="4" />
          </>
        )
      ) : null}
    </svg>
  );
}

/** Machines: a load too heavy to lift, pull up or carry, and three machines. The right one is seen doing the job. */
function MachinesGame({ level, animal, outfit, settingsRef, onDone }: PlayProps) {
  const [salt] = useState(newSalt);
  const list = useMemo(() => machineRounds(salt), [salt]);
  const rounds = useRounds(list);
  const round = rounds.round;
  const [solved, setSolved] = useRoundState(rounds.index, false);
  const wiggle = useWiggle();
  const coach = useCoach(settingsRef, [say(round.ask)], rounds.index);
  useFinish(rounds.finished, settingsRef, coach, onDone);

  const pick = (id: MachineId) => {
    if (solved) return;
    if (id !== round.machine) {
      wiggle.shake(id);
      coach.miss([wordCue(MACHINE_NAMES[id], MACHINE_NAMES[id])]);
      return;
    }
    wiggle.still();
    setSolved(true);
    coach.right([say(round.answer)], rounds.next, SHOW_MS);
  };

  return (
    <GameFrame
      screen="machines"
      title="Machines"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="field"
      attrs={{ "data-engineer": "machines", "data-level": level, "data-job": round.id, "data-answer": round.machine, "data-solved": solved ? "true" : "false" }}
      stage={<JobScene job={round.id} done={solved} />}
    >
      {round.choices.map((id) => (
        <Pick
          key={id}
          id={id}
          name={MACHINE_NAMES[id]}
          art={<MachineArt id={id} />}
          wiggle={wiggle.id === id ? wiggle.count : 0}
          reveal={coach.reveal && id === round.machine}
          onPick={() => pick(id)}
          attrs={{ "data-machine": id }}
        />
      ))}
    </GameFrame>
  );
}

// ------------------------------------------------------------------ balance

function Pile({ count, x }: { count: number; x: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <rect key={index} x={x - 15} y={96 - (index + 1) * 20} width="30" height="18" rx="4" fill="#f6d56b" stroke="#e0a93b" strokeWidth="2" />
      ))}
    </>
  );
}

function PileArt({ count }: { count: number }) {
  return (
    <svg className="pile-art" viewBox="0 0 60 90" aria-hidden="true" focusable="false">
      {Array.from({ length: count }, (_, index) => (
        <rect key={index} x="15" y={86 - (index + 1) * 20} width="30" height="18" rx="4" fill="#f6d56b" stroke="#e0a93b" strokeWidth="2" />
      ))}
    </svg>
  );
}

/** Balance: blocks on one side of a beam, and three piles for the other. The beam shows what each pile does. */
function BalanceGame({ level, animal, outfit, settingsRef, onDone }: PlayProps) {
  const [salt] = useState(newSalt);
  const list = useMemo(() => balanceRounds(salt), [salt]);
  const rounds = useRounds(list);
  const round = rounds.round;
  const [right, setRight] = useRoundState(rounds.index, 0);
  const [solved, setSolved] = useRoundState(rounds.index, false);
  const wiggle = useWiggle();
  const later = useLater();
  const coach = useCoach(settingsRef, [say("engineer-balance")], rounds.index);
  useFinish(rounds.finished, settingsRef, coach, onDone);
  const tilt = balanceTilt(round.left, right);

  const put = (count: number) => {
    if (solved) return;
    setRight(count);
    if (count === round.left) {
      wiggle.still();
      setSolved(true);
      coach.right([numberCue(count), say("engineer-balance-done")], rounds.next, 1300);
      return;
    }
    wiggle.shake(String(count));
    coach.miss([say(count < round.left ? "engineer-balance-few" : "engineer-balance-many")]);
    // The pile is lifted off again after the beam has shown which way it leans.
    later(() => setRight(0), TRY_MS + 700);
  };

  return (
    <GameFrame
      screen="balance"
      title="Balance"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="field"
      attrs={{ "data-engineer": "balance", "data-level": level, "data-left": round.left, "data-right": right, "data-answer": round.left, "data-tilt": tilt, "data-solved": solved ? "true" : "false" }}
      stage={
        <svg className="beam-art" viewBox="0 0 240 180" data-tilt={tilt} aria-hidden="true" focusable="false">
          <path d="M104 172l16-52 16 52Z" fill="#8a94a3" />
          <g className="beam-arm" data-tilt={tilt}>
            <rect x="20" y="96" width="200" height="10" rx="5" fill="#c48f5c" />
            <Pile count={round.left} x={50} />
            <Pile count={right} x={190} />
          </g>
        </svg>
      }
    >
      {round.choices.map((count) => (
        <Pick
          key={count}
          id={String(count)}
          name={`${count} blocks`}
          art={<PileArt count={count} />}
          wiggle={wiggle.id === String(count) ? wiggle.count : 0}
          reveal={coach.reveal && count === round.left}
          onPick={() => put(count)}
          attrs={{ "data-pile": count }}
        />
      ))}
    </GameFrame>
  );
}

// ------------------------------------------------------------------ the section

const TILES: { id: BuildActivity; label: string; name: string }[] = [
  { id: "bridge", label: "Bridge", name: "Build a bridge" },
  { id: "tower", label: "Tower", name: "Tall tower" },
  { id: "ramp", label: "Ramps", name: "Ramps and rolling" },
  { id: "machines", label: "Machines", name: "Simple machines" },
  { id: "balance", label: "Balance", name: "Balance" },
];

function TileArt({ id }: { id: BuildActivity }) {
  if (id === "bridge") {
    return (
      <svg viewBox="0 0 64 56" aria-hidden="true" focusable="false">
        <rect y="40" width="64" height="16" fill="#9ccbe8" />
        <path d="M0 30h18v26H0ZM46 30h18v26H46Z" fill="#9bd1a0" />
        <rect x="12" y="24" width="40" height="7" rx="3" fill="#c48f5c" />
      </svg>
    );
  }
  if (id === "tower") {
    return (
      <svg viewBox="0 0 64 56" aria-hidden="true" focusable="false">
        <rect x="8" y="40" width="48" height="13" rx="4" fill="#9ccbe8" />
        <rect x="16" y="26" width="32" height="13" rx="4" fill="#c9b6e8" />
        <rect x="23" y="12" width="18" height="13" rx="4" fill="#f6d56b" />
      </svg>
    );
  }
  if (id === "ramp") return <RampArt height={2} />;
  if (id === "machines") return <MachineArt id="lever" />;
  return (
    <svg viewBox="0 0 64 56" aria-hidden="true" focusable="false">
      <path d="M26 52l6-18 6 18Z" fill="#8a94a3" />
      <rect x="6" y="30" width="52" height="5" rx="2" fill="#c48f5c" />
      <rect x="10" y="18" width="12" height="11" rx="3" fill="#f6d56b" />
      <rect x="42" y="18" width="12" height="11" rx="3" fill="#f6d56b" />
    </svg>
  );
}

/** The Build page: one picture tile for each game. */
export function EngineerBoard({
  ageRange,
  done,
  locked,
  onOpen,
}: {
  ageRange: AgeRange | string;
  done: Record<string, boolean>;
  /** Tiles that open with the full app. */
  locked?: (id: string) => boolean;
  onOpen: (activity: BuildActivity) => void;
}) {
  const level = engineerLevel(ageRange);
  return (
    <div className="math-board" data-engineer="menu" data-level={level}>
      {TILES.filter((tile) => activitiesFor(level).includes(tile.id)).map((tile) => (
        <button
          key={tile.id}
          type="button"
          className={`math-activity time-tile${done[tile.id] ? " is-done" : ""}${locked?.(tile.id) ? " is-locked" : ""}`}
          data-activity={tile.id}
          data-locked={locked?.(tile.id) ? "true" : undefined}
          aria-label={tile.name}
          onClick={() => onOpen(tile.id)}
        >
          {locked?.(tile.id) ? <LockBadge /> : null}
          <span className="math-activity-art" aria-hidden="true">
            <TileArt id={tile.id} />
          </span>
          <span>{tile.label}</span>
        </button>
      ))}
    </div>
  );
}

export function EngineerActivity({
  activity,
  ageRange,
  animal,
  outfit,
  settingsRef,
  onDone,
}: {
  activity: BuildActivity;
  ageRange: AgeRange | string;
  animal: AnimalId;
  outfit: Outfit;
  settingsRef: { current: Settings };
  onDone: () => void;
}) {
  const props: PlayProps = { level: engineerLevel(ageRange), animal, outfit, settingsRef, onDone };
  if (activity === "tower") return <TowerGame {...props} />;
  if (activity === "ramp") return <RampGame {...props} />;
  if (activity === "machines") return <MachinesGame {...props} />;
  if (activity === "balance") return <BalanceGame {...props} />;
  return <BridgeGame {...props} />;
}
