import { useEffect, useMemo, useState } from "react";
import { numberCue, promptCue, type Cue } from "../audio/player";
import type { AnimalId } from "../data/animals";
import { logicLevel } from "../data/logic";
import type { AgeRange } from "../data/profiles";
import type { Outfit } from "../data/wardrobe";
import { dotRow, peekRounds } from "../data/numberGames";
import { GameFrame, newSalt, Pick, useCoach, useFinish, useRounds, useRoundState, useWiggle } from "../game/kit";
import type { Settings } from "../settings";
import { Ladybug } from "./mathArt";

/**
 * Peek, a Numbers game on the kit (src/game/kit.tsx), from the STEM plan: see a small group at a
 * glance, without counting (subitizing, Head Start ELOF P-MATH 2). Pictures and voice only, so a child
 * who cannot read can play. Rounds come from a salt that is new each play; see src/data/numberGames.ts.
 */

type GameProps = {
  ageRange: AgeRange | string;
  animal: AnimalId;
  outfit: Outfit;
  settingsRef: { current: Settings };
  onDone: (label: string) => void;
};

/**
 * "How many?" is the line Spin & Say's counting challenge already has, recorded and checked; the
 * ladybugs on the leaf say the rest.
 */
const ASK: Cue = promptCue("game-spin-count", "How many?");

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
  const coach = useCoach(settingsRef, [ASK], rounds.index);
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
      // The miss names the number tapped. From the second, the question is asked again and the ladybugs come back for a second look.
      coach.miss([numberCue(value)]);
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
              {solved || coach.reveal ? <span className="count-badge">{index + 1}</span> : null}
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

