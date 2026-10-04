import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { playEffect } from "../audio/manager";
import { colorCue, deckWordCue, letterCue, letterSoundCue, numberCue, playLine, promptCue, type Cue } from "../audio/player";
import type { AnimalId } from "../data/animals";
import { Illustration } from "../illustrations";
import { colorFill, colorPattern, colorTitle } from "../data/colors";
import {
  bonusPrize,
  colorChoices,
  countChoices,
  isBabyAnimal,
  kindAtRotation,
  letterTile,
  playLine as playText,
  snapForward,
  soundChoices,
  spinCount,
  SPIN_KINDS,
  spinTurn,
  traceLetter,
  wheelRotation,
  wordBlank,
  type HatchLevel,
  type SpinKind,
  type SpinPrize,
} from "../data/games";
import { letterForm, type TracePoint } from "../data/handwriting";
import { pictureWords } from "../data/ladder";
import type { StickerInput } from "../data/profiles";
import { guideFor, letterItemId, writingLevel, type WritingMap } from "../data/scaffold";
import { followStroke, stationsAttribute, strokeComplete, traceTolerance } from "../data/trace";
import { wardrobeItem, type Outfit } from "../data/wardrobe";
import { GameFrame, Pick, useCoach, useWiggle, type SceneKind } from "../game/kit";
import { clickWithoutPointer } from "../input/keyboardClick";
import type { Settings } from "../settings";
import { Hero } from "./Hero";
import { BabyArt } from "./ReadingGames";
import { StrokeFigure } from "./StrokeFigure";

/**
 * Spin & Say: a wheel of six small challenges, one for each thing the child is learning.
 *
 * After the first phone test the wheel named its parts in writing ("Sound", "Word", "Trace") and each
 * challenge was a line of small print over three small buttons: three orange dots to count, and for the
 * bonus the words "Bonus", "Kitten" and a button that said DONE. Now each part of the wheel is a picture,
 * and each challenge is a round on the game kit (src/game/kit.tsx): asked aloud, in a scene with the
 * child's animal, with pictures to tap that say their names. A miss never costs the star.
 */

const pastel = ["#F6C3CB", "#B7D7F2", "#C9E6D4", "#F6E3B4", "#E4D4F2", "#F6D56B"];

const say = (id: string): Cue => promptCue(id, playText(id));

export function SpinSay({
  knownLetters,
  hatchLevel,
  spins,
  stars,
  writing,
  count,
  color,
  colorOptions,
  gifts,
  babies,
  animal,
  outfit,
  settingsRef,
  onAttempt,
}: {
  knownLetters: string[];
  hatchLevel: HatchLevel;
  spins: number;
  stars: number;
  writing?: WritingMap;
  count: number;
  color: string;
  colorOptions: string[];
  gifts: string[];
  babies: string[];
  animal: AnimalId;
  outfit: Outfit;
  settingsRef: { current: Settings };
  onAttempt: (attempt: { step: string; stickers: StickerInput[]; gift?: string; ladder?: boolean }) => void;
}) {
  const [index, setIndex] = useState(spins);
  const [rotation, setRotation] = useState(0);
  const [phase, setPhase] = useState<"ready" | "spinning" | "challenge">("ready");
  const [kind, setKind] = useState<SpinKind | "">("");
  const [flick, setFlick] = useState(false);
  const [hint, setHint] = useState("");
  const [glow, setGlow] = useState(false);
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const rotationRef = useRef(0);
  const lock = useRef(false);
  const drag = useRef<{ angle: number; time: number; moved: number; velocity: number } | null>(null);

  useEffect(() => setIndex(spins), [spins]);
  const hearSpin = useCue();
  useEffect(() => {
    if (phase !== "ready") return;
    hearSpin((signal) => playLine([promptCue("game-spin", "Spin the wheel.")], settingsRef.current, signal));
    // When the wheel is ready again: on opening, and after each challenge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);
  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const finishSpin = useCallback((next: number, flicked: boolean) => {
    const landed = kindAtRotation(next);
    setRotation(next);
    rotationRef.current = next;
    setKind(landed);
    setFlick(flicked);
    setHint("");
    setGlow(false);
    if (reduced) {
      setPhase("challenge");
      return;
    }
    window.setTimeout(() => setPhase("challenge"), 900);
  }, [reduced]);

  const begin = (flicked: boolean, raw?: number) => {
    if (lock.current || phase !== "ready") return;
    lock.current = true;
    setPhase("spinning");
    const from = rotationRef.current;
    const next = flicked && raw !== undefined ? snapForward(raw, from) : wheelRotation(index, from);
    finishSpin(next, flicked);
  };

  const angleOf = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    return (Math.atan2(dx, -dy) * 180) / Math.PI;
  };

  const onDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (phase !== "ready") return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // A tap can still spin when capture is unavailable.
    }
    drag.current = { angle: angleOf(event), time: performance.now(), moved: 0, velocity: 0 };
  };

  const onMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const info = drag.current;
    if (!info || phase !== "ready") return;
    const angle = angleOf(event);
    let delta = angle - info.angle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    const now = performance.now();
    const dt = Math.max(16, now - info.time);
    info.velocity = delta / dt;
    info.moved += Math.abs(delta);
    info.angle = angle;
    info.time = now;
    setRotation((current) => current + delta);
  };

  const onUp = () => {
    const info = drag.current;
    drag.current = null;
    if (!info || phase !== "ready") return;
    const flicked = info.moved > 12 || Math.abs(info.velocity) > 0.08;
    if (!flicked) {
      begin(false);
      return;
    }
    const coast = Math.min(1400, Math.max(360, Math.abs(info.velocity) * 800));
    const raw = rotationRef.current + Math.sign(info.velocity || 1) * coast;
    begin(true, raw);
  };

  const collect = (stickers: StickerInput[] = [], gift?: string) => {
    const shown = kind || spinTurn(index);
    const step = (SPIN_KINDS as readonly string[]).includes(shown) ? `spin-${shown}` : "spin-sound";
    onAttempt({ step, stickers, gift, ladder: shown === "word" });
    setIndex((current) => current + 1);
    setPhase("ready");
    setKind("");
    lock.current = false;
  };

  return (
    <div
      className="game-board spin-board"
      data-phase={phase}
      data-kind={kind}
      data-spin={index}
      data-flick={flick ? "true" : "false"}
      data-reduced={reduced ? "true" : "false"}
      data-hint={hint}
      data-rotation={Math.round(rotation)}
    >
      {phase !== "challenge" ? (
        <>
          <h1>Spin & Say</h1>
          <div className="spin-stage">
            <div className="spin-pointer" aria-hidden="true" />
            <button
              type="button"
              className="spin-wheel"
              data-wheel
              aria-label="Spin the wheel"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: phase === "spinning" && !reduced ? "transform 0.9s cubic-bezier(0.12, 0.55, 0.08, 1)" : "none",
              }}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={() => {
                drag.current = null;
              }}
              // A keyboard sends no pointer events, only a click. Without this, Enter on the wheel
              // did nothing and the game could not be started. It spins like a tap, with no flick.
              onClick={(event) => {
                if (clickWithoutPointer(event)) begin(false);
              }}
            >
              <WheelFace />
            </button>
          </div>
        </>
      ) : (
        <Challenge
          kind={kind || spinTurn(index)}
          knownLetters={knownLetters}
          hatchLevel={hatchLevel}
          writing={writing}
          count={count}
          color={color}
          colorOptions={colorOptions}
          gifts={gifts}
          babies={babies}
          stars={stars}
          spinIndex={index}
          glow={glow}
          animal={animal}
          outfit={outfit}
          settingsRef={settingsRef}
          onMiss={() => {
            setHint("Try again.");
            setGlow(true);
          }}
          onDone={collect}
        />
      )}
    </div>
  );
}

/** What each part of the wheel is, as a picture: the wheel said "Sound", "Word", "Count" in writing. */
function WheelIcon({ kind }: { kind: SpinKind }) {
  if (kind === "sound") {
    return (
      <g>
        <path d="M-12 -5h7l9-8v26l-9-8h-7Z" fill="#243056" />
        <path d="M8 -6c4 4 4 8 0 12M13 -11c8 8 8 14 0 22" fill="none" stroke="#243056" strokeWidth="3" strokeLinecap="round" />
      </g>
    );
  }
  if (kind === "word") {
    return (
      <g>
        <rect x="-16" y="-12" width="14" height="18" rx="4" fill="#fffdfb" stroke="#243056" strokeWidth="2" />
        <path d="M-16 11h13M1 11h13" stroke="#243056" strokeWidth="3" strokeLinecap="round" />
        <path d="M-12 2l3-9 3 9M-11 -1h4" fill="none" stroke="#243056" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
  }
  if (kind === "count") {
    return (
      <g fill="#e07a5f">
        <circle cx="-9" cy="6" r="6" />
        <circle cx="9" cy="6" r="6" />
        <circle cx="0" cy="-8" r="6" />
      </g>
    );
  }
  if (kind === "color") {
    return (
      <g>
        <circle cx="-7" cy="-4" r="8" fill="#e10600" />
        <circle cx="7" cy="-4" r="8" fill="#ffe200" />
        <circle cx="0" cy="7" r="8" fill="#1f4bff" />
      </g>
    );
  }
  if (kind === "trace") {
    return (
      <g transform="rotate(35)">
        <rect x="-4" y="-16" width="8" height="24" rx="2" fill="#f6c445" stroke="#243056" strokeWidth="2" />
        <path d="M-4 8h8l-4 8Z" fill="#fffdfb" stroke="#243056" strokeWidth="2" strokeLinejoin="round" />
        <rect x="-4" y="-16" width="8" height="5" rx="2" fill="#f4a4b4" stroke="#243056" strokeWidth="2" />
      </g>
    );
  }
  return (
    <g>
      <rect x="-13" y="-4" width="26" height="18" rx="3" fill="#e07a5f" stroke="#243056" strokeWidth="2" />
      <rect x="-15" y="-10" width="30" height="8" rx="3" fill="#f2a08a" stroke="#243056" strokeWidth="2" />
      <path d="M0 -10v24M0 -10c-8-10-14 0 0 0M0 -10c8-10 14 0 0 0" fill="none" stroke="#243056" strokeWidth="2" strokeLinejoin="round" />
    </g>
  );
}

function WheelFace() {
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true">
      {SPIN_KINDS.map((kind, index) => {
        // Each slice is centred on its angle (the first on the top), the same as segmentCenter in games.ts.
        const start = ((index * 60 - 90 - 30) * Math.PI) / 180;
        const end = start + (60 * Math.PI) / 180;
        const radius = 92;
        const x1 = 100 + radius * Math.cos(start);
        const y1 = 100 + radius * Math.sin(start);
        const x2 = 100 + radius * Math.cos(end);
        const y2 = 100 + radius * Math.sin(end);
        const mid = start + (30 * Math.PI) / 180;
        const lx = 100 + 58 * Math.cos(mid);
        const ly = 100 + 58 * Math.sin(mid);
        return (
          <g key={kind}>
            <path d={`M 100 100 L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`} fill={pastel[index]} stroke="#fffdfb" strokeWidth="2" />
            <g transform={`translate(${lx} ${ly}) rotate(${index * 60})`} data-wheel-part={kind}>
              <WheelIcon kind={kind} />
            </g>
          </g>
        );
      })}
      <circle cx="100" cy="100" r="22" fill="#fffdfb" stroke="#E4C7A4" strokeWidth="3" />
    </svg>
  );
}

/** One thing that can be tapped in a challenge. */
type Choice = { id: string; name: string; art: ReactNode; label?: string; said: Cue };

/** A single round, in the shape the game frame expects. One round, so no dots are drawn. */
const ONE_ROUND = { index: 0, total: 1, finished: false };

/**
 * A challenge on the game kit: a question said aloud, a scene, and choices. A wrong choice says its own
 * name and wiggles; after three the answer is pointed at. The star is kept either way.
 */
function PickChallenge({
  kind,
  scene,
  line,
  target,
  choices,
  praise,
  stage,
  top,
  animal,
  outfit,
  settingsRef,
  attrs,
  onDone,
}: {
  kind: SpinKind;
  scene: SceneKind;
  line: Cue[];
  target: string;
  choices: Choice[];
  praise: Cue[];
  stage: ReactNode;
  /** Something set over the choices, across the tray (a word with a letter missing). */
  top?: ReactNode;
  animal: AnimalId;
  outfit: Outfit;
  settingsRef: { current: Settings };
  attrs?: Record<string, string | number | undefined>;
  onDone: () => void;
}) {
  const [solved, setSolved] = useState(false);
  const wiggle = useWiggle();
  const coach = useCoach(settingsRef, line, `${kind}:${target}`);

  const tap = (choice: Choice) => {
    if (solved) return;
    if (choice.id !== target) {
      wiggle.shake(choice.id);
      coach.miss([choice.said]);
      return;
    }
    wiggle.still();
    setSolved(true);
    coach.right(praise, onDone);
  };

  return (
    <GameFrame
      screen="spin"
      title="Spin & Say"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={ONE_ROUND}
      scene={scene}
      stage={stage}
      attrs={{ "data-challenge": kind, "data-target": target, "data-solved": solved ? "true" : "false", ...attrs }}
    >
      {top}
      {choices.map((choice) => (
        <Pick
          key={choice.id}
          id={choice.id}
          name={choice.name}
          art={choice.art}
          label={choice.label}
          wiggle={wiggle.id === choice.id ? wiggle.count : 0}
          reveal={coach.reveal && !solved && choice.id === target}
          onPick={() => tap(choice)}
          attrs={{ "data-choice": choice.id, "data-answer": choice.id === target ? "true" : "false" }}
        />
      ))}
    </GameFrame>
  );
}

/** What the scene shows while something is listened for: nothing that gives the answer away. */
function Listen() {
  return (
    <svg className="hear-waves" viewBox="0 0 120 90" aria-hidden="true" focusable="false">
      <path d="M24 34h16l20-16v54L40 56H24Z" fill="#c48f5c" />
      <path d="M72 30c8 8 8 22 0 30M84 20c14 14 14 36 0 50M96 10c20 20 20 50 0 70" fill="none" stroke="#c48f5c" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

const letterArt = (letter: string) => <span className="pick-letter">{letter.toUpperCase()}</span>;

function Challenge({
  kind,
  knownLetters,
  hatchLevel,
  writing,
  count,
  color,
  colorOptions,
  gifts,
  babies,
  stars,
  spinIndex,
  glow,
  animal,
  outfit,
  settingsRef,
  onMiss,
  onDone,
}: {
  kind: SpinKind;
  knownLetters: string[];
  hatchLevel: HatchLevel;
  writing?: WritingMap;
  count: number;
  color: string;
  colorOptions: string[];
  gifts: string[];
  babies: string[];
  stars: number;
  spinIndex: number;
  glow: boolean;
  animal: AnimalId;
  outfit: Outfit;
  settingsRef: { current: Settings };
  onMiss: () => void;
  onDone: (stickers?: StickerInput[], gift?: string) => void;
}) {
  const play = useCue();
  const shared = { kind, animal, outfit, settingsRef };
  // What changes a challenge from one spin to the next: the letter, the word, the number, the color, and
  // where the right answer sits. The wheel comes back to a kind every sixth spin, so the lap is added in:
  // with two letters taught, spins 0, 6 and 12 would otherwise all ask for the same one.
  const salt = spinIndex + Math.floor(spinIndex / SPIN_KINDS.length);
  if (kind === "sound") {
    const round = soundChoices(knownLetters, salt);
    return (
      <PickChallenge
        {...shared}
        scene="room"
        line={[promptCue("game-spin-sound", "Tap the letter you hear."), letterCue(letterTile(round.target))]}
        target={round.target}
        choices={round.choices.map((letter) => ({ id: letter, name: letter.toUpperCase(), art: letterArt(letter), said: letterSoundCue(letterTile(letter)) }))}
        praise={[letterCue(letterTile(round.target))]}
        stage={<Listen />}
        onDone={() => onDone()}
      />
    );
  }
  if (kind === "word") {
    const round = wordBlank(knownLetters, hatchLevel, pictureWords(), salt);
    const answer = round.word.letters[round.blank]?.char.toLowerCase() ?? "a";
    return (
      <PickChallenge
        {...shared}
        scene="field"
        line={[promptCue("game-spin-word", "Fill the missing letter."), deckWordCue(round.word)]}
        target={answer}
        choices={round.choices.map((letter) => ({ id: letter, name: letter.toUpperCase(), art: letterArt(letter), said: letterSoundCue(letterTile(letter)) }))}
        praise={[deckWordCue(round.word)]}
        attrs={{ "data-word": round.word.word }}
        stage={
          <span className="hatch-stage">
            <span className="hatch-picture">{round.word.illustration ? <Illustration name={round.word.illustration} /> : null}</span>
          </span>
        }
        top={
          <p className="hatch-blanks" aria-label="Word">
            {round.word.letters.map((letter, letterIndex) => (
              <span key={`${letter.char}-${letterIndex}`} data-blank={letterIndex === round.blank ? "open" : "shown"}>
                {letterIndex === round.blank ? "" : letter.char}
              </span>
            ))}
          </p>
        }
        onDone={() => onDone([{ kind: "word", label: round.word.word }])}
      />
    );
  }
  if (kind === "count") {
    const round = countChoices(spinCount(count, salt), salt);
    return (
      <PickChallenge
        {...shared}
        scene="field"
        line={[promptCue("game-spin-count", "How many?")]}
        target={String(round.total)}
        choices={round.choices.map((value) => ({
          id: String(value),
          name: String(value),
          art: <span className="pick-number is-numeral">{value}</span>,
          said: numberCue(value),
        }))}
        praise={[numberCue(round.total)]}
        stage={
          // Apples to count. They were plain orange dots.
          <span className="spin-objects" data-total={round.total} style={{ ["--cols" as string]: round.total <= 3 ? round.total : round.total <= 6 ? 3 : round.total <= 8 ? 4 : 5 }} aria-hidden="true">
            {Array.from({ length: round.total }, (_, at) => (
              <span key={at} className="spin-object">
                <Illustration name="apple" />
              </span>
            ))}
          </span>
        }
        onDone={() => onDone()}
      />
    );
  }
  if (kind === "color") {
    const round = colorChoices(color, colorOptions, salt);
    return (
      <PickChallenge
        {...shared}
        scene="room"
        line={[promptCue("game-spin-color", "Find the color."), colorCue(round.target)]}
        target={round.target}
        choices={round.choices.map((name) => ({
          id: name,
          name: colorTitle(name),
          // The paint, with the pattern that tells it apart without seeing the color.
          art: <span className={`paint-pot pattern-${colorPattern(name)}`} data-color={name} style={{ backgroundColor: colorFill(name) }} />,
          said: colorCue(name),
        }))}
        praise={[colorCue(round.target)]}
        stage={<Listen />}
        onDone={() => onDone()}
      />
    );
  }
  if (kind === "trace") {
    return (
      <MiniTrace
        letter={traceLetter(knownLetters, salt)}
        writing={writing}
        hinted={glow}
        settingsRef={settingsRef}
        onMiss={() => {
          play((signal) => playLine([promptCue("game-again", "Try again.")], settingsRef.current, signal));
          onMiss();
        }}
        onDone={() => onDone()}
      />
    );
  }
  return <Bonus prize={bonusPrize(spinIndex, gifts, babies, stars)} animal={animal} outfit={outfit} settingsRef={settingsRef} onDone={onDone} />;
}

/** The bonus: a present, shown as a picture, and a check to take it. It was the words "Bonus", "Kitten" and DONE. */
function Bonus({
  prize,
  animal,
  outfit,
  settingsRef,
  onDone,
}: {
  prize: SpinPrize;
  animal: AnimalId;
  outfit: Outfit;
  settingsRef: { current: Settings };
  onDone: (stickers?: StickerInput[], gift?: string) => void;
}) {
  const [taken, setTaken] = useState(false);
  const slot = prize.kind === "outfit" ? wardrobeItem(prize.id)?.slot : undefined;
  const line = useMemo(() => [say("play-bonus")], []);
  const coach = useCoach(settingsRef, line, "bonus");
  const take = () => {
    if (taken) return;
    setTaken(true);
    playEffect("celebrate", settingsRef.current);
    coach.right([], () => {
      if (prize.kind === "outfit") onDone([], prize.id);
      else onDone([{ kind: "animal", label: prize.label }]);
    });
  };
  return (
    <GameFrame
      screen="spin"
      title="Spin & Say"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={ONE_ROUND}
      scene="room"
      attrs={{ "data-challenge": "bonus", "data-prize-kind": prize.kind, "data-prize": prize.kind === "outfit" ? prize.id : prize.label, "data-solved": taken ? "true" : "false" }}
      stage={
        <span className="spin-prize" aria-label={prize.kind === "outfit" ? prize.name : prize.label}>
          {prize.kind === "outfit" ? (
            // A dress-up present is shown on the child's own animal, the way it will look.
            <Hero animal={animal} outfit={slot ? { ...outfit, [slot]: prize.id } : outfit} />
          ) : isBabyAnimal(prize.label) ? (
            <svg viewBox="16 40 88 92" aria-hidden="true" focusable="false">
              <BabyArt name={prize.label} />
            </svg>
          ) : null}
        </span>
      }
    >
      <Pick
        id="take"
        name="Keep it"
        demo={coach.nudge}
        art={
          <svg className="keep-art" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
            <circle cx="32" cy="32" r="26" fill="#7fb28a" />
            <path d="M20 33l9 9 16-18" fill="none" stroke="#fffdfb" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        }
        onPick={take}
        attrs={{ "data-keep": "true" }}
      />
    </GameFrame>
  );
}

function MiniTrace({
  letter,
  writing,
  hinted,
  settingsRef,
  onMiss,
  onDone,
}: {
  letter: string;
  writing?: WritingMap;
  hinted: boolean;
  settingsRef: { current: Settings };
  onMiss: () => void;
  onDone: () => void;
}) {
  const form = letterForm(letter, "lower");
  // What to do, said once when the board opens. It said nothing: the instruction was only in writing.
  useEffect(() => {
    const controller = new AbortController();
    void playLine([say("play-trace"), letterCue(letterTile(letter))], settingsRef.current, controller.signal).catch(() => undefined);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letter]);
  const level = writingLevel(writing, letterItemId(letter, "lower"));
  const planned = guideFor(level);
  const guide = hinted || planned === "copy" || planned === "memory" || planned === "full" ? "full" : planned === "fade" ? "fade" : "start";
  const [strokeIndex, setStrokeIndex] = useState(0);
  const [covered, setCovered] = useState(0);
  const coveredRef = useRef(0);
  const tracing = useRef(false);
  const finished = useRef(false);
  const stroke = form.strokes[strokeIndex];
  const done = strokeIndex >= form.strokes.length;

  const pointFrom = (event: ReactPointerEvent<HTMLDivElement>): TracePoint | null => {
    const svg = event.currentTarget.querySelector("svg");
    const rect = svg?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    };
  };

  const follow = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!tracing.current || !stroke || done) return;
    const point = pointFrom(event);
    if (!point) return;
    const next = followStroke(stroke, coveredRef.current, point, traceTolerance(settingsRef.current));
    if (next === coveredRef.current) return;
    coveredRef.current = next;
    setCovered(next);
    if (strokeComplete(stroke, next)) {
      tracing.current = false;
      playEffect("chime", settingsRef.current);
      coveredRef.current = 0;
      setCovered(0);
      if (strokeIndex + 1 >= form.strokes.length) {
        if (!finished.current) {
          finished.current = true;
          onDone();
        }
        return;
      }
      setStrokeIndex((current) => current + 1);
    }
  };

  const progress = form.strokes.map((_, number) => {
    if (number < strokeIndex) return 999;
    if (number === strokeIndex) return covered;
    return 0;
  });

  return (
    <div className="spin-challenge" data-letter={letter} data-trace={done ? "done" : "play"} data-stroke={strokeIndex} data-guide={guide}>
      <h1>Spin & Say</h1>
      {/* For the grown-up. The child is told aloud: "Trace the letter." and the letter. */}
      <p className="game-prompt">Trace little {letter}.</p>
      <div
        className="spin-trace"
        data-stations={stroke ? stationsAttribute(stroke) : ""}
        onPointerDown={(event) => {
          if (done) return;
          tracing.current = true;
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            // The stroke can still follow the pointer.
          }
          follow(event);
        }}
        onPointerMove={follow}
        onPointerUp={() => {
          const missed = tracing.current && coveredRef.current === 0;
          tracing.current = false;
          if (missed) onMiss();
        }}
      >
        <StrokeFigure letter={letter} casing="lower" progress={progress} activeIndex={strokeIndex} guide={guide} />
      </div>
    </div>
  );
}

function useCue() {
  const audio = useRef<AbortController | null>(null);
  useEffect(() => () => audio.current?.abort(), []);
  return useCallback((run: (signal: AbortSignal) => Promise<void>) => {
    audio.current?.abort();
    const controller = new AbortController();
    audio.current = controller;
    void run(controller.signal).catch(() => undefined);
  }, []);
}
