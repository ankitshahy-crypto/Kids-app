import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { promptCue } from "../audio/player";
import { Avatar } from "../avatars";
import type { AnimalId } from "../data/animals";
import {
  centsPromptId,
  dayParts,
  handsMatch,
  hourFromAngle,
  minuteFromAngle,
  moneyById,
  routineSteps,
  snackById,
  type ClockMode,
  type MoneyId,
  type TimeLesson,
  type TimeStep,
} from "../data/timeMoney";
import { useOpeningLine, useSpeaker } from "../hooks/useSpeaker";
import type { Settings } from "../settings";
import { HearButton } from "./HearButton";
import { LockBadge } from "./LockBadge";

function pieceAudio(id: string) {
  if (id === "one") return { kind: "prompt" as const, id: "one-dollar", say: "one dollar" };
  if (id === "five") return { kind: "prompt" as const, id: "five-dollars", say: "five dollars" };
  const piece = moneyById(id);
  return { kind: "word" as const, id: piece.id, say: piece.name.toLowerCase() };
}

export function MoneyArt({ id }: { id: string }) {
  const piece = moneyById(id);
  if (piece.kind === "bill") {
    const five = id === "five";
    return (
      <svg className="money-art" viewBox="0 0 120 72" aria-hidden="true">
        <rect x="4" y="8" width="112" height="56" rx="10" fill={five ? "#e4d7f5" : "#d7f3ea"} stroke="#3d4a40" strokeWidth="3" />
        <rect x="14" y="16" width="92" height="40" rx="6" fill="none" stroke="#3d4a40" strokeWidth="2" />
        <text x="60" y="42" textAnchor="middle" fontSize="16" fontWeight="700" fill="#3d4a40">
          {piece.name}
        </text>
      </svg>
    );
  }
  const fill = id === "penny" ? "#e0a070" : id === "nickel" ? "#c5c9c2" : id === "dime" ? "#d5dde6" : "#e7d48a";
  const size = id === "dime" ? 22 : id === "quarter" ? 34 : id === "nickel" ? 30 : 26;
  return (
    <svg className="money-art" viewBox="0 0 80 80" aria-hidden="true">
      <circle cx="40" cy="40" r={size} fill={fill} stroke="#3d4a40" strokeWidth="3" />
      <circle cx="40" cy="40" r={size - 8} fill="none" stroke="#3d4a40" strokeWidth="2" />
      <text x="40" y="46" textAnchor="middle" fontSize="14" fontWeight="700" fill="#3d4a40">
        {piece.cents}¢
      </text>
    </svg>
  );
}

export function SnackArt({ id }: { id: string }) {
  if (id === "cookie") {
    return (
      <svg className="snack-art" viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="42" r="24" fill="#e0b070" stroke="#3d4a40" strokeWidth="3" />
        <circle cx="32" cy="36" r="3" fill="#8a5a32" />
        <circle cx="48" cy="40" r="3" fill="#8a5a32" />
        <circle cx="38" cy="50" r="3" fill="#8a5a32" />
      </svg>
    );
  }
  if (id === "milk") {
    return (
      <svg className="snack-art" viewBox="0 0 80 80" aria-hidden="true">
        <path d="M28 22h24l6 46H22Z" fill="#f4f7fb" stroke="#3d4a40" strokeWidth="3" />
        <path d="M30 22c2-8 18-8 20 0" fill="none" stroke="#3d4a40" strokeWidth="3" />
      </svg>
    );
  }
  if (id === "banana") {
    return (
      <svg className="snack-art" viewBox="0 0 80 80" aria-hidden="true">
        <path d="M22 28c18-16 36 0 34 28-16 4-28-2-34-28Z" fill="#f6d56b" stroke="#3d4a40" strokeWidth="3" />
      </svg>
    );
  }
  return (
    <svg className="snack-art" viewBox="0 0 80 80" aria-hidden="true">
      <path d="M40 18c2-8 10-10 14-6-2 6-8 8-12 8" fill="none" stroke="#6e9a74" strokeWidth="3" strokeLinecap="round" />
      <circle cx="40" cy="44" r="20" fill="#e07a5f" stroke="#3d4a40" strokeWidth="3" />
    </svg>
  );
}

function useWiggle() {
  const [id, setId] = useState("");
  const shake = (next: string) => setId(next);
  return { id, shake };
}

const board: { id: TimeStep; label: string; name: string }[] = [
  { id: "day", label: "Day", name: "Parts of the day" },
  { id: "routine", label: "Routine", name: "Daily routine" },
  { id: "clock", label: "Clock", name: "Set the clock" },
  { id: "coins", label: "Coins", name: "Name the money" },
  { id: "shop", label: "Shop", name: "Pretend shop" },
];

export function TimeBoard({
  lesson,
  done,
  locked,
  onOpen,
  onMoneyPlay,
}: {
  lesson: TimeLesson;
  done: Record<string, boolean>;
  /** Tiles that open with the full app. */
  locked?: (id: string) => boolean;
  onOpen: (step: TimeStep) => void;
  onMoneyPlay?: () => void;
}) {
  const moneySteps = ["jars", "lemonade", "choose", "needs", "cards"];
  const moneyDone = moneySteps.every((id) => done[id]);
  return (
    <div className="math-board" data-stage={lesson.stageId} data-week={lesson.weekIndex}>
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
            {stop.id === "day" ? <span className="math-numeral">Day</span> : null}
            {stop.id === "routine" ? <span className="math-numeral">Go</span> : null}
            {stop.id === "clock" ? <span className="math-numeral">{lesson.targetHour}</span> : null}
            {stop.id === "coins" ? <MoneyArt id={lesson.coinTarget} /> : null}
            {stop.id === "shop" ? <SnackArt id={lesson.snackId} /> : null}
          </span>
          <span>{stop.label}</span>
        </button>
      ))}
      {onMoneyPlay ? (
        <button
          type="button"
          className={`math-activity${moneyDone ? " is-done" : ""}`}
          data-activity="money-play"
          aria-label="Money play"
          onClick={onMoneyPlay}
        >
          <span className="math-activity-art" aria-hidden="true">
            <MoneyArt id={lesson.coinTarget} />
          </span>
          <span>Play</span>
        </button>
      ) : null}
    </div>
  );
}

export function DayActivity({
  lesson,
  settingsRef,
  onDone,
}: {
  lesson: TimeLesson;
  settingsRef: { current: Settings };
  onDone: (label: string) => void;
}) {
  const speak = useSpeaker(settingsRef);
  const wiggle = useWiggle();
  const finished = useRef(false);
  const line = lesson.dayTask === "until" ? [promptCue("time-until", "How long until then?")] : [promptCue("time-day", "Is it morning, afternoon, or night?")];
  useOpeningLine(speak, line);

  const choosePart = (id: string) => {
    if (finished.current) return;
    speak.word(id, id);
    if (id !== lesson.dayPart) {
      wiggle.shake(id);
      return;
    }
    finished.current = true;
    onDone(id);
  };

  const chooseHours = (hours: number) => {
    if (finished.current) return;
    speak.prompt("time-until");
    if (hours !== lesson.untilHours) {
      wiggle.shake(String(hours));
      return;
    }
    finished.current = true;
    onDone(String(hours));
  };

  if (lesson.dayTask === "until") {
    return (
      <div className="math-play" data-screen="day" data-task="until" data-from={lesson.untilFrom} data-to={lesson.untilTo} data-answer={lesson.untilHours}>
        <h1>How long until</h1>
        <p className="math-prompt">
          How many hours from {lesson.untilFrom} until {lesson.untilTo}?
        </p>
        <HearButton className="math-hear" onHear={() => speak.line(line)} />
        <div className="math-choices" role="group" aria-label="Hours">
          {lesson.untilChoices.map((hours) => (
            <button
              key={hours}
              type="button"
              data-hours={hours}
              data-wiggle={wiggle.id === String(hours) ? "true" : "false"}
              onClick={() => chooseHours(hours)}
            >
              {hours}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="math-play" data-screen="day" data-task="parts" data-target={lesson.dayPart}>
      <h1>Parts of the day</h1>
      <p className="math-prompt">Morning, afternoon, or night?</p>
      <HearButton className="math-hear" onHear={() => speak.line(line)} />
      <div className="math-choices" role="group" aria-label="Parts of the day">
        {dayParts.map((part) => (
          <button
            key={part.id}
            type="button"
            data-part={part.id}
            data-wiggle={wiggle.id === part.id ? "true" : "false"}
            onClick={() => choosePart(part.id)}
          >
            {part.title}
          </button>
        ))}
      </div>
    </div>
  );
}

export function RoutineActivity({
  lesson,
  settingsRef,
  onDone,
}: {
  lesson: TimeLesson;
  settingsRef: { current: Settings };
  onDone: (label: string) => void;
}) {
  const speak = useSpeaker(settingsRef);
  const wiggle = useWiggle();
  const finished = useRef(false);
  const order = routineSteps.map((step) => step.id);
  const [placed, setPlaced] = useState(0);
  const next = order[placed];
  const line = [promptCue("time-routine", "What comes next?")];
  useOpeningLine(speak, line);

  const tap = (id: string) => {
    if (finished.current) return;
    const step = routineSteps.find((item) => item.id === id);
    speak.word(id, step?.title.toLowerCase() ?? id);
    if (id !== next) {
      wiggle.shake(id);
      return;
    }
    const count = placed + 1;
    setPlaced(count);
    if (count >= order.length) {
      finished.current = true;
      onDone("routine");
    }
  };

  return (
    <div className="math-play" data-screen="routine" data-next={next ?? "done"} data-placed={placed}>
      <h1>Daily routine</h1>
      <p className="math-prompt">Tap what comes next.</p>
      <HearButton className="math-hear" onHear={() => speak.line(line)} />
      <div className="math-choices routine-row" role="group" aria-label="Routine">
        {lesson.routineOrder.map((id) => {
          const step = routineSteps.find((item) => item.id === id);
          const done = order.indexOf(id) < placed;
          return (
            <button
              key={id}
              type="button"
              data-routine={id}
              data-next={id === next ? "true" : "false"}
              data-done={done ? "true" : "false"}
              data-wiggle={wiggle.id === id ? "true" : "false"}
              onClick={() => tap(id)}
            >
              {step?.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function stepMinute(minute: number, mode: ClockMode): number {
  if (mode === "hour") return 0;
  if (mode === "half") return minute === 0 ? 30 : 0;
  if (mode === "quarter") return (minute + 15) % 60;
  return (minute + 5) % 60;
}

export function ClockActivity({
  lesson,
  settingsRef,
  onDone,
}: {
  lesson: TimeLesson;
  settingsRef: { current: Settings };
  onDone: (label: string) => void;
}) {
  const speak = useSpeaker(settingsRef);
  const faceRef = useRef<SVGSVGElement | null>(null);
  const finished = useRef(false);
  const timer = useRef<number | null>(null);
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [hand, setHand] = useState<"hour" | "minute">("hour");
  const [motion, setMotion] = useState("ok");
  const matched = handsMatch(hour, minute, lesson.targetHour, lesson.targetMinute);
  const line = [
    promptCue("time-clock", "Move the hands to the time."),
    lesson.match ? promptCue("time-match", "Match the clock.") : promptCue(lesson.clockCueId, lesson.clockSay),
  ];
  useOpeningLine(speak, line);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setMotion(media.matches ? "reduce" : "ok");
    apply();
    media.addEventListener("change", apply);
    return () => {
      media.removeEventListener("change", apply);
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const finish = (nextHour: number, nextMinute: number) => {
    if (finished.current) return;
    setHour(nextHour);
    setMinute(nextMinute);
    if (!handsMatch(nextHour, nextMinute, lesson.targetHour, lesson.targetMinute)) return;
    finished.current = true;
    timer.current = window.setTimeout(() => onDone(lesson.clockSay), 400);
  };

  const onFace = (event: ReactPointerEvent<SVGSVGElement>) => {
    const face = faceRef.current;
    if (!face || finished.current) return;
    const box = face.getBoundingClientRect();
    const dx = event.clientX - (box.left + box.width / 2);
    const dy = event.clientY - (box.top + box.height / 2);
    const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (hand === "hour") finish(hourFromAngle(angle), minute);
    else finish(hour, minuteFromAngle(angle, lesson.clockMode));
  };

  const hourAngle = ((hour % 12) + minute / 60) * 30;
  const minuteAngle = minute * 6;
  const digital = `${lesson.targetHour}:${String(lesson.targetMinute).padStart(2, "0")}`;

  return (
    <div
      className="math-play"
      data-screen="clock"
      data-mode={lesson.clockMode}
      data-hour={hour}
      data-minute={minute}
      data-target-hour={lesson.targetHour}
      data-target-minute={lesson.targetMinute}
      data-matched={matched ? "true" : "false"}
      data-match={lesson.match ? "true" : "false"}
    >
      <h1>Clock</h1>
      <p className="math-prompt">{lesson.match ? `Match ${digital}. ${lesson.clockSay}` : lesson.clockSay}</p>
      <HearButton className="math-hear" onHear={() => speak.line(line)} />
      <div className="clock-digital" data-digital={digital}>
        {digital}
      </div>
      <svg
        ref={faceRef}
        className="clock-face"
        data-motion={motion}
        viewBox="0 0 100 100"
        role="img"
        aria-label="Clock"
        onPointerDown={onFace}
        onPointerMove={(event) => {
          if (event.buttons === 1) onFace(event);
        }}
      >
        <circle cx="50" cy="50" r="46" fill="#fffaf3" stroke="#6d5b86" strokeWidth="3" />
        {Array.from({ length: 12 }, (_, index) => {
          const number = index + 1;
          const angle = ((number % 12) * 30 - 90) * (Math.PI / 180);
          const x = 50 + Math.cos(angle) * 36;
          const y = 50 + Math.sin(angle) * 36;
          return (
            <text key={number} x={x} y={y + 2} textAnchor="middle" fontSize="7" fontWeight="700" fill="#3d4a40">
              {number}
            </text>
          );
        })}
        <line className="clock-hand clock-hour" x1="50" y1="50" x2="50" y2="28" stroke="#e07a8a" strokeWidth="3" strokeLinecap="round" transform={`rotate(${hourAngle} 50 50)`} />
        <line className="clock-hand clock-minute" x1="50" y1="50" x2="50" y2="18" stroke="#5f8f86" strokeWidth="2.4" strokeLinecap="round" transform={`rotate(${minuteAngle} 50 50)`} />
        <circle cx="50" cy="50" r="2.4" fill="#6d5b86" />
      </svg>
      <div className="math-choices clock-controls" role="group" aria-label="Clock hands">
        <button type="button" aria-pressed={hand === "hour"} onClick={() => setHand("hour")}>
          Hour hand
        </button>
        <button type="button" aria-pressed={hand === "minute"} onClick={() => setHand("minute")}>
          Minute hand
        </button>
        <button type="button" onClick={() => finish(hour === 12 ? 1 : hour + 1, minute)}>
          Next hour
        </button>
        <button type="button" onClick={() => finish(hour, stepMinute(minute, lesson.clockMode))}>
          Next minute
        </button>
      </div>
    </div>
  );
}

export function CoinsActivity({
  lesson,
  settingsRef,
  onDone,
}: {
  lesson: TimeLesson;
  settingsRef: { current: Settings };
  onDone: (label: string) => void;
}) {
  const speak = useSpeaker(settingsRef);
  const wiggle = useWiggle();
  const finished = useRef(false);
  const [picked, setPicked] = useState("");
  const [sorted, setSorted] = useState<string[]>([]);
  const line =
    lesson.coinTask === "sort"
      ? [promptCue("time-sort", "Sort the coins.")]
      : lesson.coinTask === "count"
        ? [promptCue("time-count", "How many cents?")]
        : lesson.coinTask === "compare"
          ? [promptCue("time-compare", "Which snack costs less?")]
          : [promptCue("time-coins", "Which one is this?")];
  useOpeningLine(speak, line);

  const speakPiece = (id: string) => {
    const audio = pieceAudio(id);
    if (audio.kind === "prompt") speak.prompt(audio.id, audio.say);
    else speak.word(audio.id, audio.say);
  };

  const chooseName = (id: string) => {
    if (finished.current) return;
    speakPiece(id);
    if (id !== lesson.coinTarget) {
      wiggle.shake(id);
      return;
    }
    finished.current = true;
    onDone(moneyById(id).name);
  };

  const chooseCount = (total: number) => {
    if (finished.current) return;
    speak.prompt(centsPromptId(total));
    if (total !== lesson.countTotal) {
      wiggle.shake(String(total));
      return;
    }
    finished.current = true;
    onDone(String(total));
  };

  const chooseCheaper = (id: string) => {
    if (finished.current) return;
    speak.word(id, snackById(id).name.toLowerCase());
    if (id !== lesson.cheaper) {
      wiggle.shake(id);
      return;
    }
    finished.current = true;
    onDone(id);
  };

  const tapSortCoin = (id: string) => {
    if (sorted.includes(id)) return;
    setPicked(id);
    speakPiece(id);
  };

  const tapJar = (id: string) => {
    if (!picked || finished.current) return;
    if (picked !== id) {
      wiggle.shake(id);
      return;
    }
    const next = [...sorted, picked];
    setSorted(next);
    setPicked("");
    if (next.length >= 4) {
      finished.current = true;
      onDone("sorted");
    }
  };

  if (lesson.coinTask === "sort") {
    return (
      <div className="math-play" data-screen="coins" data-task="sort" data-sorted={sorted.length}>
        <h1>Sort coins</h1>
        <p className="math-prompt">Tap a coin, then its jar.</p>
        <HearButton className="math-hear" onHear={() => speak.line(line)} />
        <div className="math-choices" role="group" aria-label="Coins">
          {lesson.sortOrder.map((id) => (
            <button key={id} type="button" data-coin={id} data-picked={picked === id ? "true" : "false"} data-sorted={sorted.includes(id) ? "true" : "false"} onClick={() => tapSortCoin(id)}>
              <MoneyArt id={id} />
              {moneyById(id).name}
            </button>
          ))}
        </div>
        <div className="math-choices" role="group" aria-label="Jars">
          {(["penny", "nickel", "dime", "quarter"] as MoneyId[]).map((id) => (
            <button key={id} type="button" data-jar={id} data-wiggle={wiggle.id === id ? "true" : "false"} onClick={() => tapJar(id)}>
              {moneyById(id).name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (lesson.coinTask === "count") {
    return (
      <div className="math-play" data-screen="coins" data-task="count" data-total={lesson.countTotal}>
        <h1>Count the coins</h1>
        <p className="math-prompt">How many cents?</p>
        <HearButton className="math-hear" onHear={() => speak.line(line)} />
        <div className="coin-pile" aria-hidden="true">
          {lesson.countCoins.flatMap((coin) => Array.from({ length: coin.count }, (_, index) => <MoneyArt key={`${coin.id}-${index}`} id={coin.id} />))}
        </div>
        <div className="math-choices" role="group" aria-label="Cents">
          {lesson.countChoices.map((total) => (
            <button key={total} type="button" data-cents={total} data-wiggle={wiggle.id === String(total) ? "true" : "false"} onClick={() => chooseCount(total)}>
              {total}¢
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (lesson.coinTask === "compare") {
    const left = snackById(lesson.compareLeft);
    const right = snackById(lesson.compareRight);
    return (
      <div className="math-play" data-screen="coins" data-task="compare" data-cheaper={lesson.cheaper}>
        <h1>Compare prices</h1>
        <p className="math-prompt">Which snack costs less?</p>
        <HearButton className="math-hear" onHear={() => speak.line(line)} />
        <div className="math-choices" role="group" aria-label="Prices">
          {[left, right].map((snack) => (
            <button key={snack.id} type="button" data-snack={snack.id} data-cents={snack.cents} data-wiggle={wiggle.id === snack.id ? "true" : "false"} onClick={() => chooseCheaper(snack.id)}>
              <SnackArt id={snack.id} />
              {snack.name} {snack.cents}¢
            </button>
          ))}
        </div>
      </div>
    );
  }

  const shown = moneyById(lesson.coinTarget);
  return (
    <div className="math-play" data-screen="coins" data-task="name" data-target={lesson.coinTarget}>
      <h1>Name the money</h1>
      <p className="math-prompt">What is this?</p>
      <div className="coin-show" aria-hidden="true">
        <MoneyArt id={shown.id} />
      </div>
      <HearButton className="math-hear" onHear={() => speak.line(line)} />
      <div className="math-choices" role="group" aria-label="Money names">
        {lesson.coinChoices.map((id) => (
          <button key={id} type="button" data-coin={id} data-wiggle={wiggle.id === id ? "true" : "false"} onClick={() => chooseName(id)}>
            {moneyById(id).name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ShopActivity({
  lesson,
  animal,
  settingsRef,
  onDone,
}: {
  lesson: TimeLesson;
  animal: AnimalId;
  settingsRef: { current: Settings };
  onDone: (label: string) => void;
}) {
  const speak = useSpeaker(settingsRef);
  const wiggle = useWiggle();
  const finished = useRef(false);
  const [paid, setPaid] = useState<string[]>([]);
  const snack = snackById(lesson.snackId);
  const line =
    lesson.shopTask === "change"
      ? [promptCue("time-change", "How much change?")]
      : lesson.shopTask === "pay"
        ? [promptCue("time-pay", "Tap each piece you need."), promptCue(centsPromptId(lesson.priceCents))]
        : [promptCue("time-shop", "Buy the snack.")];
  useOpeningLine(speak, line);

  const speakPiece = (id: string) => {
    const audio = pieceAudio(id);
    if (audio.kind === "prompt") speak.prompt(audio.id, audio.say);
    else speak.word(audio.id, audio.say);
  };

  const buyOne = (id: string) => {
    if (finished.current) return;
    speakPiece(id);
    if (id !== snack.coin) {
      wiggle.shake(id);
      return;
    }
    finished.current = true;
    onDone(snack.name);
  };

  const payPiece = (id: string) => {
    if (finished.current || paid.includes(id)) return;
    speakPiece(id);
    if (!lesson.payPieces.includes(id as MoneyId)) {
      wiggle.shake(id);
      return;
    }
    const next = [...paid, id];
    setPaid(next);
    if (lesson.payPieces.every((piece) => next.includes(piece))) {
      finished.current = true;
      onDone(snack.name);
    }
  };

  const chooseChange = (cents: number) => {
    if (finished.current) return;
    speak.prompt(centsPromptId(cents));
    if (cents !== lesson.changeCents) {
      wiggle.shake(String(cents));
      return;
    }
    finished.current = true;
    onDone(String(cents));
  };

  if (lesson.shopTask === "change") {
    return (
      <div className="math-play" data-screen="shop" data-task="change" data-price="15" data-paid="25" data-change={lesson.changeCents}>
        <h1>Making change</h1>
        <p className="math-prompt">The snack is 15¢. You pay with a quarter. How much change?</p>
        <div className="shop-row">
          <Avatar animal={animal} />
          <MoneyArt id="quarter" />
        </div>
        <HearButton className="math-hear" onHear={() => speak.line(line)} />
        <div className="math-choices" role="group" aria-label="Change">
          {lesson.changeChoices.map((cents) => (
            <button key={cents} type="button" data-cents={cents} data-wiggle={wiggle.id === String(cents) ? "true" : "false"} onClick={() => chooseChange(cents)}>
              {cents}¢
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (lesson.shopTask === "pay") {
    return (
      <div className="math-play" data-screen="shop" data-task="pay" data-price={lesson.priceCents} data-paid={paid.join(" ")}>
        <h1>Dollars and cents</h1>
        <p className="math-prompt">Pay {lesson.priceCents}¢. Tap each piece you need.</p>
        <HearButton className="math-hear" onHear={() => speak.line(line)} />
        <div className="math-choices" role="group" aria-label="Pay">
          {lesson.payChoices.map((id) => (
            <button key={id} type="button" data-coin={id} data-used={paid.includes(id) ? "true" : "false"} data-wiggle={wiggle.id === id ? "true" : "false"} onClick={() => payPiece(id)}>
              <MoneyArt id={id} />
              {moneyById(id).name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const choices = lesson.coinChoices.includes(snack.coin) ? lesson.coinChoices : [snack.coin, ...lesson.coinChoices.filter((id) => id !== snack.coin)].slice(0, 3);
  return (
    <div className="math-play" data-screen="shop" data-task="one" data-snack={snack.id} data-coin={snack.coin} data-price={snack.cents}>
      <h1>Pretend shop</h1>
      <p className="math-prompt">Buy the {snack.name.toLowerCase()} with one coin.</p>
      <div className="shop-row">
        <Avatar animal={animal} />
        <SnackArt id={snack.id} />
        <span>{snack.cents}¢</span>
      </div>
      <HearButton className="math-hear" onHear={() => speak.line(line)} />
      <div className="math-choices" role="group" aria-label="Coins">
        {choices.map((id) => (
          <button key={id} type="button" data-coin={id} data-wiggle={wiggle.id === id ? "true" : "false"} onClick={() => buyOne(id)}>
            <MoneyArt id={id} />
            {moneyById(id).name}
          </button>
        ))}
      </div>
    </div>
  );
}
