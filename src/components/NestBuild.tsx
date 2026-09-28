import { useEffect, useRef, useState, type PointerEvent } from "react";
import { playOnDevice, playPrompt } from "../audio/player";
import type { AnimalId } from "../data/animals";
import {
  BEAM_SPOTS,
  activitiesFor,
  beamVerdict,
  bridgePlan,
  bridgeVerdict,
  clearSpan,
  emptySpans,
  engineerLevel,
  firstOpenSpan,
  leverLifts,
  leverWeight,
  machinesReady,
  placeBeam,
  placeSpan,
  placeTower,
  popTower,
  pulleyLifts,
  rampGoal,
  rampVerdict,
  stepHeight,
  towerPlan,
  towerVerdict,
  wheelMoves,
  wheelNeed,
  type BeamPos,
  type BeamWeight,
  type BlockWidth,
  type BuildActivity,
  type MachineId,
  type RampHeight,
  type SpanPiece,
} from "../data/engineer";
import type { LogicLevel } from "../data/logic";
import type { AgeRange } from "../data/profiles";
import type { Outfit } from "../data/wardrobe";
import type { Settings } from "../settings";
import { Hero } from "./Hero";
import { LockBadge } from "./LockBadge";

const NAMES: Record<BuildActivity, string> = {
  bridge: "Bridge",
  tower: "Tower",
  ramp: "Ramps",
  machines: "Machines",
  balance: "Balance",
};

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

function noteMiss(level: LogicLevel, hint: string, speak: ReturnType<typeof useSpeaker>) {
  if (level === "later" && hint) {
    speak.words(`What went wrong? ${hint}`);
    return;
  }
  speak.prompt("engineer-again", "Try again.");
}

function closestAttr(x: number, y: number, name: string): string | null {
  const hit = document.elementFromPoint(x, y);
  const node = hit instanceof Element ? hit.closest(`[data-${name}]`) : null;
  return node?.getAttribute(`data-${name}`) ?? null;
}

function usePieceDrag(onEnd: (piece: string, moved: boolean, x: number, y: number) => void) {
  const drag = useRef<{ piece: string; x: number; y: number; moved: boolean } | null>(null);
  const moved = useRef(false);
  const bind = (piece: string) => ({
    onPointerDown(event: PointerEvent<HTMLButtonElement>) {
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { piece, x: event.clientX, y: event.clientY, moved: false };
    },
    onPointerMove(event: PointerEvent<HTMLButtonElement>) {
      const info = drag.current;
      if (!info || info.piece !== piece) return;
      if (Math.hypot(event.clientX - info.x, event.clientY - info.y) > 8) info.moved = true;
    },
    onPointerUp(event: PointerEvent<HTMLButtonElement>) {
      const info = drag.current;
      drag.current = null;
      if (!info || info.piece !== piece) return;
      moved.current = info.moved;
      if (info.moved) onEnd(piece, true, event.clientX, event.clientY);
    },
    onClick() {
      if (moved.current) {
        moved.current = false;
        return;
      }
      onEnd(piece, false, 0, 0);
    },
  });
  return bind;
}

export function EngineerBoard({
  ageRange,
  done,
  locked,
  onOpen,
}: {
  ageRange: AgeRange;
  done: Record<string, boolean>;
  /** Tiles that open with the full app. */
  locked?: (id: string) => boolean;
  onOpen: (activity: BuildActivity) => void;
}) {
  const level = engineerLevel(ageRange);
  return (
    <div className="math-board" data-engineer="menu" data-level={level}>
      {activitiesFor(level).map((id) => (
        <button
          key={id}
          type="button"
          className={`math-activity${done[id] ? " is-done" : ""}${locked?.(id) ? " is-locked" : ""}`}
          data-activity={id}
          data-locked={locked?.(id) ? "true" : undefined}
          aria-label={NAMES[id]}
          onClick={() => onOpen(id)}
        >
          {locked?.(id) ? <LockBadge /> : null}
          <span className="math-activity-art" aria-hidden="true">
            <ActivityMark id={id} />
          </span>
          <span>{NAMES[id]}</span>
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
  ageRange: AgeRange;
  animal: AnimalId;
  outfit: Outfit;
  settingsRef: { current: Settings };
  onDone: () => void;
}) {
  const level = engineerLevel(ageRange);
  const shared = { level, animal, outfit, settingsRef, onDone };
  if (activity === "bridge") return <BridgePlay {...shared} />;
  if (activity === "tower") return <TowerPlay {...shared} />;
  if (activity === "ramp") return <RampPlay {...shared} />;
  if (activity === "machines") return <MachinePlay {...shared} />;
  return <BalancePlay {...shared} />;
}

type PlayProps = {
  level: LogicLevel;
  animal: AnimalId;
  outfit: Outfit;
  settingsRef: { current: Settings };
  onDone: () => void;
};

function Miss({ level, hint, show }: { level: LogicLevel; hint: string; show: boolean }) {
  if (!show) return null;
  if (level === "later" && hint) {
    return (
      <p className="eng-wrong" data-wrong="true">
        What went wrong? {hint}
      </p>
    );
  }
  return <p className="build-again">Try again.</p>;
}

function BridgePlay({ level, animal, outfit, settingsRef, onDone }: PlayProps) {
  const plan = bridgePlan(level);
  const speak = useSpeaker(settingsRef);
  const [slots, setSlots] = useState(() => emptySpans(plan));
  const [verdict, setVerdict] = useState<"wait" | "cross" | "sag">("wait");
  const [hint, setHint] = useState("");
  const finished = useRef(false);
  useEffect(() => {
    speak.prompt("engineer-bridge", "Build a bridge so your animal can cross.");
  }, []);
  const put = (piece: SpanPiece, index: number) => {
    setSlots((current) => placeSpan(current, index, piece, plan));
    setVerdict("wait");
    setHint("");
  };
  const bind = usePieceDrag((piece, moved, x, y) => {
    const span = piece as SpanPiece;
    if (!moved) {
      setSlots((current) => {
        const index = firstOpenSpan(current);
        return index < 0 ? current : placeSpan(current, index, span, plan);
      });
      setVerdict("wait");
      setHint("");
      return;
    }
    const raw = closestAttr(x, y, "slot");
    if (raw === null) return;
    put(span, Number(raw));
  });
  const result = bridgeVerdict(slots);
  return (
    <div className="math-play" data-engineer="bridge" data-level={level} data-outcome={verdict} data-hint={hint} data-slots={slots.map((slot) => slot ?? "").join(",")}>
      <h1>Bridge</h1>
      <div className="eng-stage eng-river" data-wobble={verdict === "sag" ? "true" : "false"} data-crossed={verdict === "cross" ? "true" : "false"}>
        <span className="eng-bank" />
        {slots.map((slot, index) => (
          <button key={index} type="button" className="eng-gap" data-slot={index} data-piece={slot ?? ""} aria-label={slot ? "Clear gap" : "Gap"} onClick={() => setSlots((current) => clearSpan(current, index))}>
            {slot === "block" ? <BlockArt /> : slot === "plank" ? <PlankArt /> : <span className="eng-water" />}
          </button>
        ))}
        <span className="eng-bank" />
        <span className="eng-hero" aria-hidden="true">
          <Hero animal={animal} outfit={outfit} />
        </span>
      </div>
      <div className="eng-tray" role="group" aria-label="Pieces">
        <button type="button" className="eng-piece" data-kit="block" aria-label="Block" {...bind("block")}>
          <BlockArt />
        </button>
        <button type="button" className="eng-piece" data-kit="plank" aria-label="Plank" {...bind("plank")}>
          <PlankArt />
        </button>
      </div>
      <button
        type="button"
        className="start-button"
        data-test="bridge"
        onClick={() => {
          setVerdict(result.verdict);
          setHint(result.verdict === "sag" ? result.hint : "");
          if (result.verdict === "sag") noteMiss(level, result.hint, speak);
        }}
      >
        Test
      </button>
      <Miss level={level} hint={hint} show={verdict === "sag"} />
      {verdict === "cross" ? (
        <button
          type="button"
          className="start-button"
          data-finish="bridge"
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

function TowerPlay({ level, animal, outfit, settingsRef, onDone }: PlayProps) {
  const plan = towerPlan(level);
  const speak = useSpeaker(settingsRef);
  const [stack, setStack] = useState<BlockWidth[]>([]);
  const [verdict, setVerdict] = useState<"wait" | "reach" | "topple" | "short">("wait");
  const [hint, setHint] = useState("");
  const finished = useRef(false);
  useEffect(() => {
    speak.prompt("engineer-tower", "Stack a tower up to the nest.");
  }, []);
  const add = (piece: BlockWidth) => {
    setStack((current) => placeTower(current, piece, plan));
    setVerdict("wait");
    setHint("");
  };
  const bind = usePieceDrag((piece, moved, x, y) => {
    const width = piece as BlockWidth;
    if (!moved || closestAttr(x, y, "drop") === "tower") add(width);
  });
  return (
    <div className="math-play" data-engineer="tower" data-level={level} data-outcome={verdict} data-hint={hint} data-stack={stack.join(",")}>
      <h1>Tower</h1>
      <div className="eng-stage eng-tower" data-drop="tower" data-wobble={verdict === "topple" ? "true" : "false"}>
        <span className="eng-nest" aria-hidden="true" />
        <div className="eng-stack">
          {stack.map((piece, index) => (
            <span key={`${piece}-${index}`} className={`eng-layer eng-${piece}`} data-layer={piece} />
          ))}
        </div>
        <span className="eng-hero" aria-hidden="true">
          <Hero animal={animal} outfit={outfit} />
        </span>
      </div>
      <div className="eng-tray" role="group" aria-label="Shapes">
        {(["wide", "medium", "narrow"] as const).map((piece) => (
          <button key={piece} type="button" className="eng-piece" data-kit={piece} aria-label={piece} {...bind(piece)}>
            <span className={`eng-layer eng-${piece}`} />
          </button>
        ))}
      </div>
      <button
        type="button"
        className="game-back"
        data-undo="tower"
        aria-label="Undo"
        onClick={() => {
          setStack((current) => popTower(current));
          setVerdict("wait");
        }}
      >
        ↩
      </button>
      <button
        type="button"
        className="start-button"
        data-test="tower"
        onClick={() => {
          const result = towerVerdict(stack, plan.goal);
          setVerdict(result.verdict);
          setHint(result.verdict === "topple" || result.verdict === "short" ? result.hint : "");
          if (result.verdict === "topple" || result.verdict === "short") noteMiss(level, result.hint, speak);
        }}
      >
        Test
      </button>
      <Miss level={level} hint={hint} show={verdict === "topple" || verdict === "short"} />
      {verdict === "reach" ? (
        <button
          type="button"
          className="start-button"
          data-finish="tower"
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

function RampPlay({ level, settingsRef, onDone }: PlayProps) {
  const goal = rampGoal(level);
  const speak = useSpeaker(settingsRef);
  const [height, setHeight] = useState<RampHeight>(1);
  const [rolled, setRolled] = useState(0);
  const [verdict, setVerdict] = useState<"wait" | "reach" | "short">("wait");
  const [hint, setHint] = useState("");
  const finished = useRef(false);
  const drag = useRef<{ y: number; height: RampHeight } | null>(null);
  useEffect(() => {
    speak.prompt("engineer-ramp", "Make the ball roll to the flag.");
  }, []);
  const watch = (next: RampHeight) => {
    const result = rampVerdict(next, goal);
    setRolled(result.distance);
    setVerdict(result.verdict);
    setHint(result.verdict === "short" ? result.hint : "");
    if (result.verdict === "short") noteMiss(level, result.hint, speak);
  };
  return (
    <div className="math-play" data-engineer="ramp" data-level={level} data-height={height} data-roll={rolled} data-outcome={verdict} data-hint={hint} data-goal={goal}>
      <h1>Ramps</h1>
      <div
        className="eng-stage eng-ramp"
        data-ramp="board"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { y: event.clientY, height };
        }}
        onPointerUp={(event) => {
          const info = drag.current;
          drag.current = null;
          if (!info) return;
          const delta = info.y - event.clientY;
          if (Math.abs(delta) < 12) return;
          const next = stepHeight(info.height, delta > 0 ? 1 : -1);
          setHeight(next);
          setVerdict("wait");
          setRolled(0);
        }}
      >
        <span className="eng-slope" style={{ height: 24 + height * 28 }} />
        <span className="eng-ball" data-roll={rolled || ""} />
        <span className="eng-flag" data-goal={goal} />
      </div>
      <div className="eng-tray" role="group" aria-label="Ramp height">
        {([1, 2, 3] as const).map((choice) => (
          <button
            key={choice}
            type="button"
            className="eng-piece"
            data-height={choice}
            aria-label={choice === 1 ? "Low ramp" : choice === 2 ? "Middle ramp" : "High ramp"}
            aria-pressed={height === choice}
            onClick={() => {
              setHeight(choice);
              setVerdict("wait");
              setRolled(0);
            }}
          >
            <span className="eng-slope" style={{ height: 12 + choice * 10 }} />
          </button>
        ))}
      </div>
      <button type="button" className="start-button" data-watch="roll" onClick={() => watch(height)}>
        Watch
      </button>
      <Miss level={level} hint={hint} show={verdict === "short"} />
      {verdict === "reach" ? (
        <button
          type="button"
          className="start-button"
          data-finish="ramp"
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

function MachinePlay({ level, settingsRef, onDone }: PlayProps) {
  const speak = useSpeaker(settingsRef);
  const [done, setDone] = useState<Record<MachineId, boolean>>({ lever: false, pulley: false, wheel: false });
  const [turns, setTurns] = useState(0);
  const [miss, setMiss] = useState("");
  const [missed, setMissed] = useState(false);
  const finished = useRef(false);
  const rope = useRef<{ y: number } | null>(null);
  const need = wheelNeed(level);
  const current: MachineId = !done.lever ? "lever" : !done.pulley ? "pulley" : "wheel";
  useEffect(() => {
    speak.prompt("engineer-machines", "Lift it with a simple machine.");
  }, []);
  const mark = (id: MachineId) => {
    setMiss("");
    setMissed(false);
    setDone((currentDone) => ({ ...currentDone, [id]: true }));
  };
  const fail = (hint: string) => {
    setMiss(hint);
    setMissed(true);
    noteMiss(level, hint, speak);
  };
  const ready = machinesReady(done);
  return (
    <div className="math-play" data-engineer="machines" data-level={level} data-machine={current} data-turns={turns} data-ready={ready ? "true" : "false"} data-hint={miss}>
      <h1>Machines</h1>
      <div className="eng-steps" aria-hidden="true">
        <span data-part="lever" data-on={done.lever ? "true" : "false"} />
        <span data-part="pulley" data-on={done.pulley ? "true" : "false"} />
        <span data-part="wheel" data-on={done.wheel ? "true" : "false"} />
      </div>
      {current === "lever" ? (
        <div className="eng-stage" data-machine-view="lever">
          <span className="eng-beam" />
          {level === "later" ? (
            <div className="eng-tray">
              <button type="button" className="eng-piece" data-weight="heavy" aria-label="Heavy rock" onClick={() => (leverWeight("heavy").lifts ? mark("lever") : fail(leverWeight("heavy").hint))}>
                <span className="eng-rock eng-heavy" />
              </button>
              <button type="button" className="eng-piece" data-weight="light" aria-label="Light rock" onClick={() => fail(leverWeight("light").hint)}>
                <span className="eng-rock" />
              </button>
            </div>
          ) : (
            <div className="eng-tray">
              <button type="button" className="eng-piece" data-press="left" aria-label="Left seat" onClick={() => (leverLifts("left") ? mark("lever") : fail(""))}>
                <span className="eng-seat" />
              </button>
              <button type="button" className="eng-piece" data-press="right" aria-label="Basket" onClick={() => fail("")}>
                <span className="eng-basket" />
              </button>
            </div>
          )}
        </div>
      ) : null}
      {current === "pulley" ? (
        <div className="eng-stage">
          <button
            type="button"
            className="eng-piece eng-rope"
            data-rope="pull"
            aria-label="Pull the rope"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              rope.current = { y: event.clientY };
            }}
            onPointerUp={(event) => {
              const info = rope.current;
              rope.current = null;
              const pulled = !info || event.clientY - info.y > 16 || Math.abs(event.clientY - info.y) < 8;
              if (pulleyLifts(pulled)) mark("pulley");
            }}
          >
            <span className="eng-bucket" />
          </button>
        </div>
      ) : null}
      {current === "wheel" ? (
        <div className="eng-stage">
          <button
            type="button"
            className="eng-piece"
            data-wheel="turn"
            aria-label="Turn the wheel"
            onClick={() => {
              const next = turns + 1;
              setTurns(next);
              if (wheelMoves(next, need)) mark("wheel");
            }}
          >
            <span className="eng-wheel" />
          </button>
        </div>
      ) : null}
      <Miss level={level} hint={miss} show={missed} />
      {ready ? (
        <button
          type="button"
          className="start-button"
          data-finish="machines"
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

function BalancePlay({ level, settingsRef, onDone }: PlayProps) {
  const speak = useSpeaker(settingsRef);
  const [spots, setSpots] = useState<Partial<Record<BeamPos, BeamWeight>>>({});
  const [picked, setPicked] = useState<BeamPos | null>(null);
  const [verdict, setVerdict] = useState<"wait" | "balance" | "tilt">("wait");
  const [hint, setHint] = useState("");
  const finished = useRef(false);
  useEffect(() => {
    speak.prompt("engineer-balance", "Balance the beam.");
  }, []);
  const put = (pos: BeamPos, weight: BeamWeight) => {
    setSpots((current) => placeBeam(current, pos, weight));
    setPicked(null);
    setVerdict("wait");
    setHint("");
  };
  const bind = usePieceDrag((piece, moved, x, y) => {
    const weight = Number(piece) as BeamWeight;
    if (moved) {
      const raw = closestAttr(x, y, "pos");
      if (raw === null) return;
      put(Number(raw) as BeamPos, weight);
      return;
    }
    if (picked === null) return;
    put(picked, weight);
  });
  return (
    <div className="math-play" data-engineer="balance" data-level={level} data-outcome={verdict} data-hint={hint}>
      <h1>Balance</h1>
      <div className="eng-stage eng-balance" data-tilt={verdict === "tilt" ? "true" : "false"}>
        <span className="eng-fulcrum" />
        <div className="eng-beam-row">
          {BEAM_SPOTS.map((pos) => (
            <button
              key={pos}
              type="button"
              className="eng-gap"
              data-pos={pos}
              data-weight={spots[pos] ?? ""}
              data-picked={picked === pos ? "true" : "false"}
              aria-label="Spot"
              aria-pressed={picked === pos}
              onClick={() => setPicked(pos)}
            >
              {spots[pos] ? <span className={spots[pos] === 2 ? "eng-rock eng-heavy" : "eng-rock"} /> : null}
            </button>
          ))}
        </div>
      </div>
      <div className="eng-tray" role="group" aria-label="Weights">
        <button type="button" className="eng-piece" data-weight="1" aria-label="Light weight" {...bind("1")}>
          <span className="eng-rock" />
        </button>
        <button type="button" className="eng-piece" data-weight="2" aria-label="Heavy weight" {...bind("2")}>
          <span className="eng-rock eng-heavy" />
        </button>
      </div>
      <button
        type="button"
        className="start-button"
        data-test="balance"
        onClick={() => {
          const result = beamVerdict(spots);
          setVerdict(result.verdict);
          setHint(result.verdict === "tilt" ? result.hint : "");
          if (result.verdict === "tilt") noteMiss(level, result.hint, speak);
        }}
      >
        Test
      </button>
      <Miss level={level} hint={hint} show={verdict === "tilt"} />
      {verdict === "balance" ? (
        <button
          type="button"
          className="start-button"
          data-finish="balance"
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

function ActivityMark({ id }: { id: BuildActivity }) {
  if (id === "bridge") return <PlankArt />;
  if (id === "tower") return <span className="eng-layer eng-wide" />;
  if (id === "ramp") return <span className="eng-ball" />;
  if (id === "machines") return <span className="eng-wheel" />;
  return <span className="eng-rock eng-heavy" />;
}

function BlockArt() {
  return <span className="eng-block" />;
}

function PlankArt() {
  return <span className="eng-plank" />;
}

