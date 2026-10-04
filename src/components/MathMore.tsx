import { useEffect, useMemo, useState } from "react";
import { numberCue, promptCue, type Cue } from "../audio/player";
import { playEffect } from "../audio/manager";
import { Avatar } from "../avatars";
import type { AnimalId } from "../data/animals";
import { logicLevel } from "../data/logic";
import type { AgeRange } from "../data/profiles";
import type { Outfit } from "../data/wardrobe";
import { bakeryLineId, bakeryRounds, bakeryVerdict, dotRow, numberLine, peekRounds, PLATE_MAX } from "../data/numberGames";
import { GameFrame, Hand, newSalt, Pick, useCoach, useFinish, useRounds, useRoundState, useWiggle } from "../game/kit";
import type { Settings } from "../settings";
import { Ladybug, Strawberry } from "./mathArt";

/**
 * Two more Numbers games on the kit (src/game/kit.tsx), from the STEM plan:
 *
 *  - Peek: see a small group at a glance (subitizing, ELOF P-MATH 2).
 *  - Bakery: count out as many as are asked for, and stop (cardinality, ELOF P-MATH 3).
 *
 * Both are pictures and voice only, so a child who cannot read can play. Rounds come from a salt that is
 * new each play; see src/data/numberGames.ts.
 */

type GameProps = {
  ageRange: AgeRange | string;
  animal: AnimalId;
  outfit: Outfit;
  settingsRef: { current: Settings };
  onDone: (label: string) => void;
};

const say = (id: string): Cue => promptCue(id, numberLine(id));

function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** For the tests, in a development build only: the ladybugs show for a moment, not two seconds. */
function quick(): boolean {
  try {
    return import.meta.env.DEV && window.localStorage.getItem("littlenest-quick-rounds") === "1";
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------ art

/** A big leaf for the ladybugs to sit on. */
function LeafPad() {
  return (
    <svg className="peek-leaf" viewBox="0 0 200 160" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M100 6c58 0 94 34 94 74s-36 74-94 74S6 120 6 80 42 6 100 6Z" fill="#a9d7a6" />
      <path d="M100 14v132M100 50l-44-22M100 50l44-22M100 86l-56-22M100 86l56-22M100 120l-44-20M100 120l44-20" stroke="#8cc28f" strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** The leaf that covers the ladybugs: it drops over them and lifts off again. */
function LeafCover() {
  return (
    <svg className="peek-cover-art" viewBox="0 0 200 160" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M100 2c62 0 98 36 98 78s-36 78-98 78S2 122 2 80 38 2 100 2Z" fill="#7fbf86" />
      <path d="M100 10v140M100 46l-48-24M100 46l48-24M100 84l-60-24M100 84l60-24M100 122l-48-22M100 122l48-22" stroke="#6aab73" strokeWidth="5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** A number to choose, with the same number of dots under it. */
function NumberWithDots({ value }: { value: number }) {
  const dots = dotRow(value);
  const perRow = Math.max(1, ...dots.map((dot) => dot.x + 1));
  const rows = Math.max(1, ...dots.map((dot) => dot.y + 1));
  const step = 14;
  return (
    <span className="peek-choice">
      <span className="pick-number is-numeral">{value}</span>
      <svg className="peek-dots" viewBox={`0 0 ${perRow * step} ${rows * step}`} style={{ width: `${perRow * 14}px` }} aria-hidden="true" focusable="false">
        {dots.map((dot, index) => (
          <circle key={index} cx={dot.x * step + step / 2} cy={dot.y * step + step / 2} r="5" fill="#e8705f" />
        ))}
      </svg>
    </span>
  );
}

/** A bowl heaped with strawberries: tap it for one more on the plate. */
function BerryBowl() {
  return (
    <svg className="bowl-art" viewBox="0 0 120 90" aria-hidden="true" focusable="false">
      <g transform="translate(14 4) scale(0.9)">
        <Berry x={8} y={18} />
        <Berry x={36} y={10} />
        <Berry x={64} y={18} />
        <Berry x={22} y={30} />
        <Berry x={50} y={30} />
      </g>
      <path d="M8 46h104c0 24-22 40-52 40S8 70 8 46Z" fill="#8eb8d8" />
      <path d="M8 46h104" stroke="#6f9fc4" strokeWidth="6" strokeLinecap="round" />
      <path d="M26 60c8 6 18 9 34 9" stroke="#b9d5ea" strokeWidth="5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function Berry({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(0.62)`}>
      <path d="M24 14c12 0 18 6 18 14 0 12-10 20-18 22C16 48 6 40 6 28c0-8 6-14 18-14Z" fill="#e8705f" />
      <path d="M24 16 15 9l5 8-9 1 9 3M24 16l9-7-5 8 9 1-9 3" fill="#7fbf86" stroke="#6aab73" strokeWidth="2.5" strokeLinejoin="round" />
    </g>
  );
}

/** The bell on the counter: ring it to give the plate to the customer. */
function Bell() {
  return (
    <svg className="bell-art" viewBox="0 0 80 80" aria-hidden="true" focusable="false">
      <circle cx="40" cy="16" r="6" fill="#d9a63c" />
      <path d="M14 58c0-18 11-32 26-32s26 14 26 32Z" fill="#f2c14e" />
      <path d="M22 50c1-10 7-17 14-19" stroke="#fbe3a0" strokeWidth="5" strokeLinecap="round" fill="none" />
      <rect x="6" y="58" width="68" height="10" rx="5" fill="#c48f5c" />
    </svg>
  );
}

/** Dots in the customer's bubble: what was asked for, to match one for one. */
function OrderDots({ count }: { count: number }) {
  const perRow = count <= 5 ? count : Math.ceil(count / 2);
  const rows = count <= 5 ? 1 : 2;
  const step = 16;
  return (
    <svg className="order-dots" data-rows={rows} viewBox={`0 0 ${perRow * step} ${rows * step}`} aria-hidden="true" focusable="false">
      {Array.from({ length: count }, (_, index) => (
        <circle key={index} cx={(index % perRow) * step + step / 2} cy={Math.floor(index / perRow) * step + step / 2} r="6" fill="#e8705f" />
      ))}
    </svg>
  );
}

// ------------------------------------------------------------------ peek

/** Peek: ladybugs land on a leaf, a leaf covers them, and the child taps how many there were. */
export function PeekActivity({ ageRange, animal, outfit, settingsRef, onDone }: GameProps) {
  const level = logicLevel(ageRange);
  const [salt] = useState(newSalt);
  const list = useMemo(() => peekRounds(level, salt), [level, salt]);
  const rounds = useRounds(list);
  const round = rounds.round;
  const [solved, setSolved] = useRoundState(rounds.index, false);
  // "show": the ladybugs are there to see. "hid": the leaf is over them. A second look shows them again.
  const [view, setView] = useRoundState<"show" | "hid">(rounds.index, "show");
  const [looks, setLooks] = useRoundState(rounds.index, 0);
  const wiggle = useWiggle();
  const coach = useCoach(settingsRef, [say("num-peek")], rounds.index);
  useFinish(rounds.finished, settingsRef, coach, () => onDone(String(list[0]?.count ?? 1)));

  // The leaf covers the ladybugs after a moment; a look again uncovers them for a shorter one.
  useEffect(() => {
    if (view !== "show" || solved || rounds.finished) return;
    const wait = quick() ? 250 : looks > 0 ? Math.round(round.look * 0.7) : round.look;
    const timer = window.setTimeout(() => setView("hid"), wait);
    return () => window.clearTimeout(timer);
    // setView changes with the round, which the round index already covers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, solved, looks, rounds.index, rounds.finished, round.look]);

  // After the second miss the ladybugs are shown once more. After the third, they stay for the child to count.
  useEffect(() => {
    if (solved) return;
    if (coach.misses === 2 && looks === 0) {
      setLooks(1);
      setView("show");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coach.misses]);

  const choose = (value: number) => {
    if (solved) return;
    if (value !== round.count) {
      wiggle.shake(String(value));
      coach.miss(coach.misses + 1 === 2 ? [numberCue(value), say("num-peek-again")] : [numberCue(value)]);
      return;
    }
    wiggle.still();
    setSolved(true);
    setView("show");
    coach.right([numberCue(value)], rounds.next, 1500);
  };

  const open = view === "show" || solved || coach.reveal;
  return (
    <GameFrame
      screen="peek"
      title="Peek"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="field"
      attrs={{ "data-answer": round.count, "data-view": open ? "show" : "hid", "data-level": level, "data-solved": solved ? "true" : "false" }}
      stage={
        <span className="peek-pad" data-open={open ? "true" : "false"} data-count={round.count}>
          <LeafPad />
          {round.spots.map((spot, index) => (
            <span
              key={`${rounds.index}-${index}`}
              className="peek-bug"
              data-bug={index}
              style={{ left: `${spot.x}%`, top: `${spot.y}%`, animationDelay: `${index * 70}ms` }}
            >
              <Ladybug />
              {solved ? <span className="count-badge">{index + 1}</span> : null}
            </span>
          ))}
          <span className="peek-cover" data-on={open ? "false" : "true"}>
            <LeafCover />
          </span>
        </span>
      }
    >
      {round.choices.map((value) => (
        <Pick
          key={value}
          id={String(value)}
          name={String(value)}
          art={<NumberWithDots value={value} />}
          wiggle={wiggle.id === String(value) ? wiggle.count : 0}
          reveal={coach.reveal && value === round.count}
          onPick={() => choose(value)}
          attrs={{ "data-number": value }}
        />
      ))}
    </GameFrame>
  );
}

// ------------------------------------------------------------------ bakery

/** Bakery: a customer asks for some strawberries. Tap the bowl for each one, tap the plate to take one back, ring the bell. */
export function BakeryActivity({ ageRange, animal, outfit, settingsRef, onDone }: GameProps) {
  const level = logicLevel(ageRange);
  const [salt] = useState(newSalt);
  const list = useMemo(() => bakeryRounds(level, salt, animal), [level, salt, animal]);
  const rounds = useRounds(list);
  const round = rounds.round;
  const [plate, setPlate] = useRoundState<number[]>(rounds.index, []);
  const [made, setMade] = useRoundState(rounds.index, 0);
  const [solved, setSolved] = useRoundState(rounds.index, false);
  const [face, setFace] = useRoundState<"wait" | "more" | "less" | "yum">(rounds.index, "wait");
  const wiggle = useWiggle();
  // The first order also says how to give it. The bell is the one new thing in this game.
  const line = rounds.index === 0 ? [say(bakeryLineId(round.ask)), say("num-bake-bell")] : [say(bakeryLineId(round.ask))];
  const coach = useCoach(settingsRef, line, rounds.index);
  useFinish(rounds.finished, settingsRef, coach, () => onDone(String(list[0]?.ask ?? 1)));

  const addOne = () => {
    if (solved) return;
    if (plate.length >= PLATE_MAX) {
      wiggle.shake("bowl");
      return;
    }
    const id = made + 1;
    setMade(id);
    const next = [...plate, id];
    setPlate(next);
    setFace("wait");
    playEffect("pop", settingsRef.current);
    coach.touch([numberCue(next.length)]);
  };

  /** A tap on the plate takes the last strawberry back to the bowl. The plate is one big target, not ten small ones. */
  const takeBack = () => {
    if (solved || plate.length === 0) return;
    const next = plate.slice(0, -1);
    setPlate(next);
    setFace("wait");
    coach.touch([numberCue(next.length)]);
  };

  const serve = () => {
    if (solved) return;
    const verdict = bakeryVerdict(round.ask, plate.length);
    if (verdict === "right") {
      wiggle.still();
      setSolved(true);
      setFace("yum");
      coach.right([numberCue(round.ask), say("num-bake-yum")], rounds.next, 1600);
      return;
    }
    wiggle.shake("bell");
    setFace(verdict);
    // An empty plate is "more" too; the count is said first, so the child hears what they gave.
    coach.miss([numberCue(plate.length), say(verdict === "more" ? "num-bake-more" : "num-bake-less")]);
  };

  // After three misses, the plate is set right for the child and the hand points at the bell.
  useEffect(() => {
    if (!coach.reveal || solved) return;
    setPlate(Array.from({ length: round.ask }, (_, index) => 1000 + index));
    setFace("wait");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coach.reveal]);

  const cols = plate.length <= 4 ? Math.max(1, plate.length) : plate.length <= 6 ? 3 : 5;
  return (
    <GameFrame
      screen="bakery"
      title="Bakery"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="shop"
      attrs={{
        "data-answer": round.ask,
        "data-on-plate": plate.length,
        "data-customer": round.customer,
        "data-face": face,
        "data-level": level,
        "data-solved": solved ? "true" : "false",
      }}
      stage={
        <span className="bakery-stage">
          <span className="bakery-customer" data-face={face} key={`c-${rounds.index}`}>
            <span className="bakery-bubble">
              <OrderDots count={round.ask} />
            </span>
            <span className="bakery-face">
              <Avatar animal={round.customer} />
            </span>
          </span>
          <button
            type="button"
            className="bakery-plate"
            data-plate="true"
            data-count={plate.length}
            data-eaten={solved && !reducedMotion() ? "true" : "false"}
            aria-label={plate.length === 0 ? "The plate, empty" : `The plate, ${plate.length}. Tap to take one back`}
            onClick={takeBack}
          >
            <span className="bakery-plate-dish" aria-hidden="true" />
            <span className="bakery-berries" style={{ ["--cols" as string]: cols }} aria-hidden="true">
              {plate.map((id, index) => (
                <span key={id} className="bakery-berry" data-berry={index} style={{ ["--at" as string]: index }}>
                  <Strawberry />
                </span>
              ))}
            </span>
          </button>
        </span>
      }
    >
      <Pick
        id="bowl"
        name="Add a strawberry"
        art={<BerryBowl />}
        wiggle={wiggle.id === "bowl" ? wiggle.count : 0}
        demo={rounds.index === 0 && plate.length === 0 && !coach.reveal}
        onPick={addOne}
        attrs={{ "data-bowl": "true" }}
      />
      <button
        type="button"
        className="pick bakery-bell"
        data-bell="true"
        data-pick="bell"
        data-wiggle={wiggle.id === "bell" ? (wiggle.count % 2 === 1 ? "a" : "b") : "false"}
        data-reveal={coach.reveal && !solved ? "true" : "false"}
        data-ready={plate.length > 0 ? "true" : "false"}
        aria-label="Ring the bell"
        onClick={serve}
      >
        <span className="pick-art">
          <Bell />
        </span>
        {coach.reveal && !solved ? <Hand /> : null}
      </button>
    </GameFrame>
  );
}
