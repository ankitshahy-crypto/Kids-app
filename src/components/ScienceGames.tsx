import { useMemo, useState } from "react";
import { promptCue, wordCue, type Cue } from "../audio/player";
import type { AnimalId } from "../data/animals";
import {
  bodyRounds,
  floatResult,
  floatRounds,
  GROW_NEEDS,
  GROW_STEPS,
  growAccepts,
  homeRounds,
  lifeRounds,
  SCIENCE_NOW,
  scienceLevel,
  senseRounds,
  weatherRounds,
  wordId,
  type BodyPart,
  type FloatGuess,
  type GrowNeed,
  type ScienceActivity as ScienceId,
  type SciencePicture,
} from "../data/science";
import type { LogicLevel } from "../data/logic";
import type { AgeRange } from "../data/profiles";
import type { Outfit } from "../data/wardrobe";
import { GameFrame, Hand, newSalt, Pick, useCoach, useFinish, useRounds, useRoundState, useWiggle, type SceneKind } from "../game/kit";
import { Illustration } from "../illustrations";
import type { Settings } from "../settings";
import { LockBadge } from "./LockBadge";

/**
 * LittleNest Science, rebuilt on the game kit.
 *
 * Every picture here was a colored dot. The planting game was three green
 * squares to put in order; "Body" was three dots, one of them the wing.
 *
 * Now each game is a drawn scene with the child's animal in it, a question
 * said aloud, and pictures to tap that say their names. Growing is a garden:
 * a seed goes in, water and sun are given when the plant asks for them, and
 * it grows at each step.
 */

type PlayProps = {
  level: LogicLevel;
  animal: AnimalId;
  outfit: Outfit;
  settingsRef: { current: Settings };
  onDone: () => void;
};

const say = (id: string): Cue => promptCue(id, "");
const word = (name: string): Cue => wordCue(wordId(name), name);
const title = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function Picture({ picture }: { picture: SciencePicture }) {
  return <Illustration name={picture.art} />;
}

// ------------------------------------------------------------------ grow

/** A watering can, drawn for the garden. */
function WateringCan() {
  return (
    <svg className="can-art" viewBox="0 0 120 100" aria-hidden="true" focusable="false">
      <path d="M22 40h48v44c0 6-4 10-10 10H32c-6 0-10-4-10-10Z" fill="#7FB8DE" />
      <rect x="18" y="34" width="56" height="12" rx="6" fill="#5E9CC8" />
      <path d="M70 52l30-22" stroke="#5E9CC8" strokeWidth="9" strokeLinecap="round" />
      <path d="M96 20l14 16-10 8-14-16Z" fill="#5E9CC8" />
      <path d="M22 50C4 50 4 78 22 78" fill="none" stroke="#5E9CC8" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

function NeedArt({ need }: { need: GrowNeed }) {
  if (need === "seed") return <Illustration name="seed" />;
  if (need === "sun") return <Illustration name="sun" />;
  return <WateringCan />;
}

/**
 * The garden bed. The plant is drawn at the step it has reached: bare soil, a seed, a sprout, a plant
 * with a bud, a flower. A bubble shows what it needs next, and the last thing given plays over it.
 */
function GardenBed({ step, need, effect, turn }: { step: number; need?: GrowNeed; effect: GrowNeed | ""; turn: number }) {
  return (
    <div className="garden-bed" data-grown={step} data-effect={effect || "none"}>
      <svg className="garden-plant" viewBox="0 0 160 170" aria-hidden="true" focusable="false">
        {/* what was just given: water falling, or the sun's light */}
        {effect === "water" ? (
          <g key={`water-${turn}`} className="garden-drops" fill="#6fa8dc">
            <path d="M58 8c-5 8-7 12-7 16a7 7 0 0 0 14 0c0-4-2-8-7-16Z" />
            <path d="M84 0c-5 8-7 12-7 16a7 7 0 0 0 14 0c0-4-2-8-7-16Z" />
            <path d="M108 10c-5 8-7 12-7 16a7 7 0 0 0 14 0c0-4-2-8-7-16Z" />
          </g>
        ) : null}
        {effect === "sun" ? (
          <g key={`sun-${turn}`} className="garden-rays" stroke="#f2c14e" strokeWidth="6" strokeLinecap="round">
            <path d="M20 10l22 26M80 0v34M140 10l-22 26" />
          </g>
        ) : null}
        {/* the plant */}
        <g className="garden-grow" key={`plant-${step}`}>
          {step >= 2 ? <path d={step >= 3 ? "M80 140V62" : "M80 140v-34"} stroke="#5f9a68" strokeWidth="7" strokeLinecap="round" fill="none" /> : null}
          {step === 2 ? (
            <>
              <path d="M80 112c-16-2-22-14-18-22 12 2 18 12 18 22Z" fill="#7dba8f" />
              <path d="M80 108c16-2 22-14 18-22-12 2-18 12-18 22Z" fill="#8fcb7a" />
            </>
          ) : null}
          {step >= 3 ? (
            <>
              <path d="M80 118c-24-2-32-20-26-30 16 2 26 16 26 30Z" fill="#7dba8f" />
              <path d="M80 104c24-2 32-20 26-30-16 2-26 16-26 30Z" fill="#8fcb7a" />
            </>
          ) : null}
          {step === 3 ? <ellipse cx="80" cy="56" rx="11" ry="15" fill="#8fcb7a" /> : null}
          {step >= 4 ? (
            <g>
              {[0, 60, 120, 180, 240, 300].map((angle) => (
                <ellipse key={angle} cx="80" cy="30" rx="12" ry="20" fill="#f08fa5" transform={`rotate(${angle} 80 54)`} />
              ))}
              <circle cx="80" cy="54" r="13" fill="#f6d56b" />
            </g>
          ) : null}
        </g>
        {/* the soil, with the seed in it once it is planted */}
        <path d="M24 150c8-18 32-26 56-26s48 8 56 26Z" fill="#a9774d" />
        <path d="M30 150c8-12 28-18 50-18s42 6 50 18Z" fill="#b98a5e" />
        {step === 1 ? <ellipse cx="80" cy="132" rx="9" ry="6" fill="#6b4a2b" /> : null}
        {step === 0 ? <ellipse cx="80" cy="134" rx="12" ry="5" fill="#8a5f3a" /> : null}
      </svg>
      {/* What it needs next, as a picture: the same picture as the thing to tap. */}
      {need ? (
        <span className="garden-need" data-need={need}>
          <NeedArt need={need} />
        </span>
      ) : null}
    </div>
  );
}

/** Growing: the garden first, then a life put in order. */
function LifeGame({ level, animal, outfit, settingsRef, onDone }: PlayProps) {
  const [salt] = useState(newSalt);
  const list = useMemo(() => lifeRounds(level, salt), [level, salt]);
  const rounds = useRounds(list);
  const round = rounds.round;
  // How far the plant has grown, or how many pictures are in place. `asked` follows once the praise is said,
  // so the next question does not talk over it.
  const [done, setDone] = useRoundState(rounds.index, 0);
  const [asked, setAsked] = useRoundState(rounds.index, 0);
  const [effect, setEffect] = useRoundState<GrowNeed | "">(rounds.index, "");
  const wiggle = useWiggle();
  const line: Cue[] = round.kind === "grow" ? [say(GROW_STEPS[Math.min(asked, GROW_STEPS.length - 1)].line)] : [say(asked === 0 ? "science-first" : "science-next")];
  const coach = useCoach(settingsRef, line, `${rounds.index}-${asked}`);
  useFinish(rounds.finished, settingsRef, coach, onDone);

  const give = (need: GrowNeed) => {
    if (round.kind !== "grow" || done >= GROW_STEPS.length || done !== asked) return;
    if (!growAccepts(done, need)) {
      wiggle.shake(need);
      coach.miss([word(need)]);
      return;
    }
    wiggle.still();
    const next = done + 1;
    setDone(next);
    setEffect(need);
    if (next >= GROW_STEPS.length) coach.right([say("science-grow-done")], rounds.next);
    else coach.right([], () => setAsked(next));
  };

  const place = (picture: SciencePicture) => {
    if (round.kind !== "order" || done >= round.stages.length || done !== asked) return;
    if (round.stages.findIndex((stage) => stage.art === picture.art) < done) return;
    if (picture.art !== round.stages[done].art) {
      wiggle.shake(picture.art);
      coach.miss([word(picture.name)]);
      return;
    }
    wiggle.still();
    const next = done + 1;
    setDone(next);
    if (next >= round.stages.length) coach.right([word(picture.name)], rounds.next);
    else coach.right([word(picture.name)], () => setAsked(next));
  };

  const need = round.kind === "grow" ? GROW_STEPS[done]?.need : undefined;
  return (
    <GameFrame
      screen="life"
      title="Grow"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="garden"
      attrs={{
        "data-science": "life",
        "data-level": level,
        "data-task": round.kind,
        "data-step": done,
        // The next tap is taken once the praise for the last one has been said.
        "data-ready": done === asked ? "true" : "false",
        "data-need": round.kind === "grow" ? (need ?? "none") : (round.stages[done]?.art ?? "none"),
        "data-cycle": round.kind === "order" ? round.id : "garden",
        "data-order": round.kind === "order" ? round.stages.map((stage) => stage.art).join(",") : undefined,
      }}
      stage={
        round.kind === "grow" ? (
          <GardenBed step={done} need={need} effect={effect} turn={done} />
        ) : (
          <ol className="routine-line order-line" aria-label="In order so far">
            {round.stages.map((stage, index) => (
              <li key={stage.art} data-slot={index} data-filled={index < done ? "true" : "false"}>
                {index < done ? <Picture picture={stage} /> : <span>{index + 1}</span>}
              </li>
            ))}
          </ol>
        )
      }
    >
      {round.kind === "grow"
        ? GROW_NEEDS.map((item, index) => (
            <Pick
              key={item}
              id={item}
              name={item === "water" ? "water" : item}
              art={<NeedArt need={item} />}
              wiggle={wiggle.id === item ? wiggle.count : 0}
              reveal={coach.reveal && item === need}
              // The seed is pointed at on the very first step: this is where the garden starts.
              demo={done === 0 && index === 0}
              onPick={() => give(item)}
              attrs={{ "data-give": item }}
            />
          ))
        : round.deal.map((picture) => (
            <Pick
              key={picture.art}
              id={picture.art}
              name={picture.name}
              art={<Picture picture={picture} />}
              used={round.stages.findIndex((stage) => stage.art === picture.art) < done}
              wiggle={wiggle.id === picture.art ? wiggle.count : 0}
              reveal={coach.reveal && picture.art === round.stages[done]?.art}
              onPick={() => place(picture)}
            />
          ))}
    </GameFrame>
  );
}

// ------------------------------------------------------------------ picture questions

/** A question about a picture, answered by tapping one of three pictures: homes, weather and senses are all this. */
function AskGame<Round extends { id: string; choices: SciencePicture[] }>({
  id,
  name,
  scene,
  list,
  level,
  line,
  answer,
  praise,
  stage,
  animal,
  outfit,
  settingsRef,
  onDone,
}: PlayProps & {
  id: ScienceId;
  name: string;
  scene: (round: Round) => SceneKind;
  list: Round[];
  line: (round: Round) => Cue[];
  answer: (round: Round) => SciencePicture;
  /** What is said when the answer is found. */
  praise: (round: Round) => Cue[];
  /** The picture the question is about, if there is one. */
  stage: (round: Round, solved: boolean) => React.ReactNode;
}) {
  const rounds = useRounds(list);
  const round = rounds.round;
  const [solved, setSolved] = useRoundState(rounds.index, false);
  const wiggle = useWiggle();
  const coach = useCoach(settingsRef, line(round), rounds.index);
  useFinish(rounds.finished, settingsRef, coach, onDone);
  const right = answer(round);

  const tap = (picture: SciencePicture) => {
    if (solved) return;
    if (picture.art !== right.art) {
      wiggle.shake(picture.art);
      coach.miss([word(picture.name)]);
      return;
    }
    wiggle.still();
    setSolved(true);
    coach.right(praise(round), rounds.next);
  };

  return (
    <GameFrame
      screen={id}
      title={name}
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene={scene(round)}
      attrs={{ "data-science": id, "data-level": level, "data-item": round.id, "data-answer": right.art, "data-solved": solved ? "true" : "false" }}
      stage={stage(round, solved)}
    >
      {round.choices.map((picture) => (
        <Pick
          key={picture.art}
          id={picture.art}
          name={picture.name}
          art={<Picture picture={picture} />}
          wiggle={wiggle.id === picture.art ? wiggle.count : 0}
          reveal={coach.reveal && picture.art === right.art}
          onPick={() => tap(picture)}
        />
      ))}
    </GameFrame>
  );
}

function HomesGame(props: PlayProps) {
  const [salt] = useState(newSalt);
  const list = useMemo(() => homeRounds(props.level, salt), [props.level, salt]);
  return (
    <AskGame
      {...props}
      id="homes"
      name="Homes"
      list={list}
      scene={() => "field"}
      line={(round) => [say(round.ask)]}
      answer={(round) => round.home}
      praise={(round) => [say(round.answer)]}
      stage={(round) => (
        <span className="science-subject" data-subject={round.animal.art}>
          <Picture picture={round.animal} />
        </span>
      )}
    />
  );
}

const WEATHER_SCENE: Record<string, SceneKind> = { rain: "rainy", sun: "afternoon", snow: "snowy", wind: "windy" };

function WeatherGame(props: PlayProps) {
  const [salt] = useState(newSalt);
  const list = useMemo(() => weatherRounds(props.level, salt), [props.level, salt]);
  return (
    <AskGame
      {...props}
      id="weather"
      name="Weather"
      list={list}
      // The weather is the scene itself: the rain falls on the child's animal.
      scene={(round) => WEATHER_SCENE[round.id] ?? "field"}
      line={(round) => [say(round.ask)]}
      answer={(round) => round.thing}
      praise={(round) => [word(round.thing.name)]}
      // Once it is found, the animal has it beside them.
      stage={(round, solved) =>
        solved ? (
          <span className="science-subject is-held" data-subject={round.thing.art}>
            <Picture picture={round.thing} />
          </span>
        ) : null
      }
    />
  );
}

function SensesGame(props: PlayProps) {
  const [salt] = useState(newSalt);
  const list = useMemo(() => senseRounds(props.level, salt), [props.level, salt]);
  return (
    <AskGame
      {...props}
      id="senses"
      name="Senses"
      list={list}
      scene={() => "table"}
      line={(round) => [say(round.ask)]}
      answer={(round) => round.part}
      praise={(round) => [say(round.answer)]}
      stage={(round) => (
        <span className="science-subject" data-subject={round.thing.art}>
          <Picture picture={round.thing} />
        </span>
      )}
    />
  );
}

// ------------------------------------------------------------------ body

/** Where the pointing hand goes for each part, as a share of the bird's box. */
const PART_SPOT: Record<BodyPart, { left: number; top: number }> = {
  beak: { left: 88, top: 34 },
  wing: { left: 46, top: 56 },
  tail: { left: 10, top: 58 },
  eye: { left: 73, top: 26 },
  feet: { left: 52, top: 92 },
};

/** One bird, with each part its own thing to tap. */
function Bird({ onPart, wiggle, reveal, found }: { onPart: (part: BodyPart) => void; wiggle: string; reveal?: BodyPart; found?: BodyPart }) {
  const part = (id: BodyPart) => ({
    className: "body-part",
    "data-part": id,
    "data-wiggle": wiggle === id ? "true" : "false",
    "data-reveal": reveal === id ? "true" : "false",
    "data-found": found === id ? "true" : "false",
    role: "button" as const,
    tabIndex: 0,
    "aria-label": id,
    onClick: () => onPart(id),
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") onPart(id);
    },
  });
  return (
    <svg className="bird-art" viewBox="0 0 240 190" role="group" aria-label="A bird">
      <g {...part("tail")}>
        <path d="M70 108L10 82l8 30-10 26 62-10Z" fill="#4f8fc0" />
      </g>
      <g {...part("feet")}>
        <rect x="96" y="150" width="60" height="38" fill="transparent" />
        <path d="M112 150v24M112 174l-12 10M112 174l12 10M140 150v24M140 174l-12 10M140 174l12 10" fill="none" stroke="#e0a45e" strokeWidth="6" strokeLinecap="round" />
      </g>
      {/* the body is not a part to find: a tap on it is a tap on nothing */}
      <ellipse cx="120" cy="112" rx="62" ry="46" fill="#7fb8de" />
      <circle cx="168" cy="62" r="34" fill="#7fb8de" />
      <ellipse cx="130" cy="124" rx="34" ry="20" fill="#bfe0f4" opacity="0.7" />
      <g {...part("wing")}>
        <path d="M76 100c10-22 44-26 70-10-6 30-40 44-70 30Z" fill="#4f8fc0" />
        <path d="M92 108c12-6 28-6 40 0M96 120c10-4 22-4 30 0" fill="none" stroke="#7fb8de" strokeWidth="4" strokeLinecap="round" />
      </g>
      <g {...part("beak")}>
        <rect x="192" y="46" width="44" height="36" fill="transparent" />
        <path d="M198 52l34 12-34 12Z" fill="#f2c14e" />
      </g>
      <g {...part("eye")}>
        <circle cx="176" cy="52" r="15" fill="transparent" />
        <circle cx="176" cy="52" r="9" fill="#fffdfb" />
        <circle cx="178" cy="52" r="5" fill="#2c3a4f" />
      </g>
    </svg>
  );
}

/** Body: the voice asks for a part of the bird, and the child taps it on the bird. */
function BodyGame({ level, animal, outfit, settingsRef, onDone }: PlayProps) {
  const [salt] = useState(newSalt);
  const list = useMemo(() => bodyRounds(level, salt), [level, salt]);
  const rounds = useRounds(list);
  const want = rounds.round;
  const [solved, setSolved] = useRoundState(rounds.index, false);
  const wiggle = useWiggle();
  const coach = useCoach(settingsRef, [say(`science-find-${want}`)], rounds.index);
  useFinish(rounds.finished, settingsRef, coach, onDone);

  const tap = (part: BodyPart) => {
    if (solved) return;
    if (part !== want) {
      wiggle.shake(part);
      coach.miss([word(part)]);
      return;
    }
    wiggle.still();
    setSolved(true);
    coach.right([word(part)], rounds.next);
  };

  const spot = PART_SPOT[want];
  return (
    <GameFrame
      screen="body"
      title="Body"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="field"
      attrs={{ "data-science": "body", "data-level": level, "data-answer": want, "data-solved": solved ? "true" : "false" }}
      stage={
        <div className="bird-stage">
          <Bird onPart={tap} wiggle={wiggle.id} reveal={coach.reveal ? want : undefined} found={solved ? want : undefined} />
          {coach.reveal && !solved ? (
            <span className="bird-hint" style={{ left: `${spot.left}%`, top: `${spot.top}%` }}>
              <Hand />
            </span>
          ) : null}
        </div>
      }
    />
  );
}

// ------------------------------------------------------------------ sink or float

function WaterMark({ kind }: { kind: FloatGuess }) {
  return (
    <svg className="water-art" viewBox="0 0 100 90" aria-hidden="true" focusable="false">
      <rect x="6" y="34" width="88" height="50" rx="12" fill="#9ccbe8" />
      <path d="M6 44c10-8 20-8 30 0s20 8 30 0 20-8 28 0v-4c0-8-5-12-12-12H18c-7 0-12 4-12 12Z" fill="#bfe0f4" />
      {kind === "float" ? <circle cx="50" cy="34" r="13" fill="#f2c14e" /> : <circle cx="50" cy="68" r="13" fill="#8a94a3" />}
      {kind === "float" ? (
        <path d="M50 12v-8M42 8l8-8 8 8" fill="none" stroke="#5a7c60" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M50 2v14M42 10l8 8 8-8" fill="none" stroke="#5a7c60" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

/** How long the thing is left where it came to rest before the next one is held up. */
const SETTLE_MS = 700;

/** Sink or float: a guess, then the thing is dropped in the pond and the child sees what it does. */
function FloatGame({ level, animal, outfit, settingsRef, onDone }: PlayProps) {
  const [salt] = useState(newSalt);
  const list = useMemo(() => floatRounds(level, salt), [level, salt]);
  const rounds = useRounds(list);
  const round = rounds.round;
  const [guess, setGuess] = useRoundState<FloatGuess | "">(rounds.index, "");
  const coach = useCoach(settingsRef, [word(round.picture.name), say("science-float")], rounds.index);
  useFinish(rounds.finished, settingsRef, coach, onDone);
  const result = floatResult(round);

  const tap = (kind: FloatGuess) => {
    if (guess) return;
    setGuess(kind);
    const said = [say(result === "float" ? "science-floats" : "science-sinks")];
    // The thing takes a moment to settle on the water or the bottom; the next one waits for it.
    const next = () => window.setTimeout(rounds.next, SETTLE_MS);
    // A right guess is cheered. A wrong one is not a miss: the child has just found something out.
    if (kind === result) coach.right(said, next);
    else coach.tell(said, next);
  };

  return (
    <GameFrame
      screen="float"
      title="Sink or float"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="pond"
      attrs={{
        "data-science": "float",
        "data-level": level,
        "data-item": round.picture.art,
        "data-answer": result,
        "data-guess": guess || "none",
        "data-dropped": guess ? "true" : "false",
      }}
      stage={
        <span className="float-thing" data-result={guess ? result : "held"}>
          <Picture picture={round.picture} />
        </span>
      }
    >
      {(["float", "sink"] as const).map((kind) => (
        <Pick
          key={kind}
          id={kind}
          name={kind}
          art={<WaterMark kind={kind} />}
          label={title(kind)}
          chosen={guess === kind}
          onPick={() => tap(kind)}
          attrs={{ "data-guess": kind }}
        />
      ))}
    </GameFrame>
  );
}

// ------------------------------------------------------------------ the section

const TILES: { id: (typeof SCIENCE_NOW)[number]; label: string; name: string }[] = [
  { id: "life", label: "Grow", name: "Grow" },
  { id: "homes", label: "Homes", name: "Animal homes" },
  { id: "body", label: "Body", name: "Body parts" },
  { id: "weather", label: "Weather", name: "Weather" },
  { id: "senses", label: "Senses", name: "Senses" },
  { id: "float", label: "Sink or float", name: "Sink or float" },
];

function TileArt({ id }: { id: string }) {
  if (id === "life") return <Illustration name="sprout" />;
  if (id === "homes") return <Illustration name="nest" />;
  if (id === "body") return <Illustration name="bird" />;
  if (id === "weather") return <Illustration name="umbrella" />;
  if (id === "senses") return <Illustration name="ear" />;
  return <Illustration name="boat" />;
}

/** The Science page: one picture tile for each game. */
export function ScienceBoard({
  ageRange,
  done,
  locked,
  onOpen,
}: {
  ageRange: AgeRange | string;
  done: Record<string, boolean>;
  /** Tiles that open with the full app. */
  locked?: (id: string) => boolean;
  onOpen: (activity: ScienceId) => void;
}) {
  return (
    <div className="math-board science-board" data-science="menu" data-level={scienceLevel(ageRange)}>
      {TILES.map((tile) => (
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

export function ScienceActivity({
  activity,
  ageRange,
  animal,
  outfit,
  settingsRef,
  onDone,
}: {
  activity: ScienceId;
  ageRange: AgeRange | string;
  animal: AnimalId;
  outfit: Outfit;
  settingsRef: { current: Settings };
  onDone: () => void;
}) {
  const props: PlayProps = { level: scienceLevel(ageRange), animal, outfit, settingsRef, onDone };
  if (activity === "homes") return <HomesGame {...props} />;
  if (activity === "body") return <BodyGame {...props} />;
  if (activity === "weather") return <WeatherGame {...props} />;
  if (activity === "senses") return <SensesGame {...props} />;
  if (activity === "float") return <FloatGame {...props} />;
  // Growing, and any activity that is not in this build (a link kept from an older one).
  return <LifeGame {...props} />;
}
