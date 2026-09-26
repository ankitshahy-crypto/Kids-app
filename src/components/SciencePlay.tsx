import { useEffect, useRef, useState, type PointerEvent } from "react";
import { playOnDevice, playPrompt } from "../audio/player";
import type { AnimalId } from "../data/animals";
import type { LogicLevel } from "../data/logic";
import type { AgeRange } from "../data/profiles";
import {
  CYCLE_KINDS,
  EXPERIMENTS,
  FOOD_CHAIN,
  GROWNUP_FIZZ,
  HOME_ANIMALS,
  MATTER_ITEMS,
  PREDICT_QUESTION,
  WATER_CYCLE,
  WEATHERS,
  acceptNext,
  activitiesForScience,
  bodyParts,
  bodyPrompt,
  clothesFor,
  cycleStages,
  floatSet,
  floatVerdict,
  foodMatch,
  heatWater,
  homeMatch,
  mixSoda,
  predictionOk,
  scienceLevel,
  seasonFor,
  senseRounds,
  sortMatter,
  soundLine,
  warmIce,
  type BodyPart,
  type ExperimentId,
  type FloatGuess,
  type HomeAnimal,
  type MatterItem,
  type MatterState,
  type ScienceActivity,
} from "../data/science";
import type { Outfit } from "../data/wardrobe";
import type { Settings } from "../settings";
import { Hero } from "./Hero";

const NAMES: Record<ScienceActivity, string> = {
  life: "Life",
  homes: "Homes",
  body: "Body",
  change: "Mix",
  weather: "Weather",
  senses: "Senses",
  float: "Float",
  predict: "Predict",
  chain: "Chain",
  water: "Water",
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

function Again({ show }: { show: boolean }) {
  if (!show) return null;
  return <p className="build-again">Try again.</p>;
}

function Finish({ id, onDone }: { id: ScienceActivity; onDone: () => void }) {
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

export function ScienceBoard({
  ageRange,
  done,
  onOpen,
}: {
  ageRange: AgeRange;
  done: Record<string, boolean>;
  onOpen: (activity: ScienceActivity) => void;
}) {
  const level = scienceLevel(ageRange);
  return (
    <div className="math-board" data-science="menu" data-level={level}>
      {activitiesForScience(level).map((id) => (
        <button
          key={id}
          type="button"
          className={`math-activity${done[id] ? " is-done" : ""}`}
          data-activity={id}
          aria-label={NAMES[id]}
          onClick={() => onOpen(id)}
        >
          <span className="math-activity-art" aria-hidden="true">
            <span className={`sci-mark sci-${id}`} />
          </span>
          <span>{NAMES[id]}</span>
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
  activity: ScienceActivity;
  ageRange: AgeRange;
  animal: AnimalId;
  outfit: Outfit;
  settingsRef: { current: Settings };
  onDone: () => void;
}) {
  const level = scienceLevel(ageRange);
  const shared = { level, animal, outfit, settingsRef, onDone };
  if (activity === "life") return <LifePlay {...shared} />;
  if (activity === "homes") return <HomesPlay {...shared} />;
  if (activity === "body") return <BodyPlay {...shared} />;
  if (activity === "change") return <ChangePlay {...shared} />;
  if (activity === "weather") return <WeatherPlay {...shared} />;
  if (activity === "senses") return <SensesPlay {...shared} />;
  if (activity === "float") return <FloatPlay {...shared} />;
  if (activity === "predict") return <PredictPlay {...shared} />;
  if (activity === "chain") return <OrderActivity {...shared} activity="chain" stages={FOOD_CHAIN} title="Chain" promptId="science-chain" prompt="Who eats what?" />;
  return <OrderActivity {...shared} activity="water" stages={WATER_CYCLE} title="Water" promptId="science-water" prompt="Where does the rain come from?" />;
}

type PlayProps = {
  level: LogicLevel;
  animal: AnimalId;
  outfit: Outfit;
  settingsRef: { current: Settings };
  onDone: () => void;
};

function LifePlay({ level, settingsRef, onDone }: PlayProps) {
  const speak = useSpeaker(settingsRef);
  const [kindIndex, setKindIndex] = useState(0);
  const [order, setOrder] = useState<string[]>([]);
  const [miss, setMiss] = useState(false);
  const [ready, setReady] = useState(false);
  const kind = CYCLE_KINDS[kindIndex] ?? "plant";
  const stages = cycleStages(kind, level);
  useEffect(() => {
    speak.prompt("science-life", "What comes next?");
  }, [kind]);
  const place = (piece: string) => {
    const result = acceptNext(order, piece, stages);
    if (!result.ok) {
      setMiss(true);
      speak.prompt("science-again", "Try again.");
      return;
    }
    setMiss(false);
    if (!result.done) {
      setOrder(result.order);
      return;
    }
    if (kindIndex + 1 >= CYCLE_KINDS.length) {
      setOrder(result.order);
      setReady(true);
      return;
    }
    setKindIndex(kindIndex + 1);
    setOrder([]);
  };
  const bind = usePieceDrag((piece, moved, x, y) => {
    if (moved && !closestAttr(x, y, "order-row")) return;
    place(piece);
  });
  return (
    <div className="math-play" data-science="life" data-level={level} data-cycle={kind} data-order={order.join(",")} data-ready={ready ? "true" : "false"}>
      <h1>Life</h1>
      <div className="eng-stage" data-order-row="life" aria-label="Order">
        {order.map((piece) => (
          <span key={piece} className={`sci-bit sci-${piece}`} data-placed={piece} />
        ))}
      </div>
      <div className="eng-tray" role="group" aria-label="Stages">
        {stages.map((piece) =>
          order.includes(piece) ? null : (
            <button key={piece} type="button" className="eng-piece" data-piece={piece} aria-label={piece} {...bind(piece)}>
              <span className={`sci-bit sci-${piece}`} />
            </button>
          ),
        )}
      </div>
      <Again show={miss} />
      {ready ? <Finish id="life" onDone={onDone} /> : null}
    </div>
  );
}

function HomesPlay({ settingsRef, onDone }: PlayProps) {
  const speak = useSpeaker(settingsRef);
  const [round, setRound] = useState<"home" | "food">("home");
  const [picked, setPicked] = useState<HomeAnimal | "">("");
  const [matched, setMatched] = useState<HomeAnimal[]>([]);
  const [miss, setMiss] = useState(false);
  const [ready, setReady] = useState(false);
  const places = round === "home" ? (["den", "nest", "pond"] as const) : (["berries", "worm", "plant"] as const);
  useEffect(() => {
    if (round === "home") speak.prompt("science-homes", "Where does it live?");
    else speak.words("What does it eat?");
  }, [round]);
  const match = (animal: HomeAnimal, place: string) => {
    const ok = round === "home" ? homeMatch(animal, place) : foodMatch(animal, place);
    if (!ok) {
      setMiss(true);
      speak.prompt("science-again", "Try again.");
      return;
    }
    const next = [...matched, animal];
    setMiss(false);
    setPicked("");
    if (next.length < HOME_ANIMALS.length) {
      setMatched(next);
      return;
    }
    if (round === "home") {
      setRound("food");
      setMatched([]);
      return;
    }
    setMatched(next);
    setReady(true);
  };
  const bind = usePieceDrag((piece, moved, x, y) => {
    const animal = piece as HomeAnimal;
    if (moved) {
      const place = closestAttr(x, y, "place");
      if (place) match(animal, place);
      return;
    }
    setPicked(animal);
  });
  return (
    <div className="math-play" data-science="homes" data-round={round} data-picked={picked} data-matched={matched.join(",")} data-ready={ready ? "true" : "false"}>
      <h1>Homes</h1>
      <div className="eng-tray" role="group" aria-label="Animals">
        {HOME_ANIMALS.filter((animal) => !matched.includes(animal)).map((animal) => (
          <button key={animal} type="button" className="eng-piece" data-animal={animal} aria-label={animal} aria-pressed={picked === animal} {...bind(animal)}>
            <span className={`sci-bit sci-${animal}`} />
          </button>
        ))}
      </div>
      <div className="eng-tray" role="group" aria-label={round === "home" ? "Homes" : "Foods"}>
        {places.map((place) => (
          <button key={place} type="button" className="eng-piece" data-place={place} aria-label={place} onClick={() => (picked ? match(picked, place) : undefined)}>
            <span className={`sci-bit sci-${place}`} />
          </button>
        ))}
      </div>
      <Again show={miss} />
      {ready ? <Finish id="homes" onDone={onDone} /> : null}
    </div>
  );
}

function BodyPlay({ level, settingsRef, onDone }: PlayProps) {
  const speak = useSpeaker(settingsRef);
  const parts = bodyParts(level);
  const [index, setIndex] = useState(0);
  const [miss, setMiss] = useState(false);
  const [ready, setReady] = useState(false);
  const ask = parts[index] ?? "wing";
  const line = bodyPrompt(ask);
  useEffect(() => {
    speak.words(line);
  }, [ask]);
  const choose = (part: BodyPart) => {
    if (part !== ask) {
      setMiss(true);
      speak.prompt("science-again", "Try again.");
      return;
    }
    setMiss(false);
    if (index + 1 >= parts.length) {
      setReady(true);
      return;
    }
    setIndex(index + 1);
  };
  return (
    <div className="math-play" data-science="body" data-level={level} data-ask={ask} data-said={line} data-ready={ready ? "true" : "false"}>
      <h1>Body</h1>
      <div className="eng-stage" aria-hidden="true">
        <span className={`sci-bit sci-${ask}`} data-ask-art={ask} />
      </div>
      <div className="eng-tray" role="group" aria-label="Parts">
        {parts.map((part) => (
          <button key={part} type="button" className="eng-piece" data-part={part} aria-label={part} onClick={() => choose(part)}>
            <span className={`sci-bit sci-${part}`} />
          </button>
        ))}
      </div>
      <Again show={miss} />
      {ready ? <Finish id="body" onDone={onDone} /> : null}
    </div>
  );
}

function ChangePlay({ settingsRef, onDone }: PlayProps) {
  const speak = useSpeaker(settingsRef);
  const [phase, setPhase] = useState<"ice" | "water" | "fizz" | "sort">("ice");
  const [result, setResult] = useState("");
  const [sorted, setSorted] = useState<MatterItem[]>([]);
  const [picked, setPicked] = useState<MatterItem | "">("");
  const [miss, setMiss] = useState(false);
  useEffect(() => {
    speak.prompt("science-mix", "Watch what happens.");
  }, []);
  useEffect(() => {
    if (phase === "fizz") speak.prompt("science-grownup", GROWNUP_FIZZ);
  }, [phase]);
  const act = () => {
    if (phase === "ice") setResult(warmIce());
    if (phase === "water") setResult(heatWater());
    if (phase === "fizz") setResult(mixSoda());
  };
  const next = () => {
    setResult("");
    setMiss(false);
    if (phase === "ice") setPhase("water");
    else if (phase === "water") setPhase("fizz");
    else setPhase("sort");
  };
  const sort = (item: MatterItem, bin: MatterState) => {
    if (!sortMatter(item, bin)) {
      setMiss(true);
      speak.prompt("science-again", "Try again.");
      return;
    }
    setMiss(false);
    setPicked("");
    setSorted((current) => (current.includes(item) ? current : [...current, item]));
  };
  const bind = usePieceDrag((piece, moved, x, y) => {
    const item = piece as MatterItem;
    if (moved) {
      const bin = closestAttr(x, y, "bin");
      if (bin === "solid" || bin === "liquid" || bin === "gas") sort(item, bin);
      return;
    }
    setPicked(item);
  });
  const ready = phase === "sort" && sorted.length === MATTER_ITEMS.length;
  return (
    <div className="math-play" data-science="change" data-phase={phase} data-result={result} data-sorted={sorted.join(",")} data-picked={picked}>
      <h1>Mix</h1>
      {phase === "fizz" ? (
        <p className="sci-grownup" data-grownup="true">
          {GROWNUP_FIZZ}
        </p>
      ) : null}
      {phase !== "sort" ? (
        <>
          <div className="eng-stage">
            <span className={`sci-bit sci-${result || phase}`} data-scene={result || phase} />
          </div>
          <button type="button" className="eng-piece" data-act={phase === "ice" ? "warm" : phase === "water" ? "heat" : "mix"} aria-label={phase === "ice" ? "Warm" : phase === "water" ? "Heat" : "Mix"} onClick={act}>
            <span className={`sci-bit sci-${phase === "ice" ? "sun" : phase === "water" ? "heat" : "fizz"}`} />
          </button>
          {result ? (
            <button type="button" className="start-button" data-next="change" onClick={next}>
              Next
            </button>
          ) : null}
        </>
      ) : (
        <>
          <div className="eng-tray" role="group" aria-label="Things">
            {MATTER_ITEMS.filter((item) => !sorted.includes(item)).map((item) => (
              <button key={item} type="button" className="eng-piece" data-item={item} aria-label={item} aria-pressed={picked === item} {...bind(item)}>
                <span className={`sci-bit sci-${item}`} />
              </button>
            ))}
          </div>
          <div className="eng-tray" role="group" aria-label="States">
            {(["solid", "liquid", "gas"] as const).map((bin) => (
              <button key={bin} type="button" className="eng-piece" data-bin={bin} aria-label={bin} onClick={() => (picked ? sort(picked, bin) : undefined)}>
                <span className={`sci-bit sci-${bin}`} />
              </button>
            ))}
          </div>
        </>
      )}
      <Again show={miss} />
      {ready ? <Finish id="change" onDone={onDone} /> : null}
    </div>
  );
}

function WeatherPlay({ animal, outfit, settingsRef, onDone }: PlayProps) {
  const speak = useSpeaker(settingsRef);
  const [index, setIndex] = useState(0);
  const [dressed, setDressed] = useState("");
  const [miss, setMiss] = useState(false);
  const [ready, setReady] = useState(false);
  const sky = WEATHERS[index] ?? "sun";
  useEffect(() => {
    speak.prompt("science-weather", "Dress for the weather.");
  }, [sky]);
  const wear = (cloth: string) => {
    if (cloth !== clothesFor(sky)) {
      setMiss(true);
      speak.prompt("science-again", "Try again.");
      return;
    }
    setMiss(false);
    setDressed(cloth);
  };
  const season = (name: string) => {
    if (!dressed) return;
    if (name !== seasonFor(sky)) {
      setMiss(true);
      speak.prompt("science-again", "Try again.");
      return;
    }
    setMiss(false);
    setDressed("");
    if (index + 1 >= WEATHERS.length) {
      setReady(true);
      return;
    }
    setIndex(index + 1);
  };
  const bind = usePieceDrag((piece, moved, x, y) => {
    if (moved && !closestAttr(x, y, "wear-target")) return;
    wear(piece);
  });
  return (
    <div className="math-play" data-science="weather" data-sky={sky} data-wearing={dressed} data-ready={ready ? "true" : "false"}>
      <h1>Weather</h1>
      <div className="eng-stage" data-wear-target="animal">
        <span className={`sci-bit sci-${sky}`} data-sky-art={sky} />
        <Hero animal={animal} outfit={outfit} />
        {dressed ? <span className={`sci-bit sci-${dressed}`} data-worn={dressed} /> : null}
      </div>
      <div className="eng-tray" role="group" aria-label="Clothes">
        {["hat", "coat", "scarf"].map((cloth) => (
          <button key={cloth} type="button" className="eng-piece" data-cloth={cloth} aria-label={cloth} {...bind(cloth)}>
            <span className={`sci-bit sci-${cloth}`} />
          </button>
        ))}
      </div>
      <div className="eng-tray" role="group" aria-label="Seasons">
        {["spring", "summer", "winter"].map((name) => (
          <button key={name} type="button" className="eng-piece" data-season={name} aria-label={name} onClick={() => season(name)}>
            <span className={`sci-bit sci-${name}`} />
          </button>
        ))}
      </div>
      <Again show={miss} />
      {ready ? <Finish id="weather" onDone={onDone} /> : null}
    </div>
  );
}

function SensesPlay({ settingsRef, onDone }: PlayProps) {
  const speak = useSpeaker(settingsRef);
  const rounds = senseRounds();
  const [index, setIndex] = useState(0);
  const [miss, setMiss] = useState(false);
  const [ready, setReady] = useState(false);
  const round = rounds[index] ?? rounds[0];
  useEffect(() => {
    speak.prompt("science-senses", "What do you notice?");
  }, [round.cue]);
  const choose = (choice: string) => {
    if (choice !== round.answer) {
      setMiss(true);
      speak.prompt("science-again", "Try again.");
      return;
    }
    setMiss(false);
    if (index + 1 >= rounds.length) {
      setReady(true);
      return;
    }
    setIndex(index + 1);
  };
  return (
    <div className="math-play" data-science="senses" data-sense={round.sense} data-cue={round.cue} data-ready={ready ? "true" : "false"}>
      <h1>Senses</h1>
      <div className="eng-stage">
        <span className={`sci-bit sci-${round.cue}`} data-cue-art={round.cue} />
        {round.sense === "sound" ? (
          <button type="button" className="eng-piece" data-listen={round.cue} aria-label="Listen" onClick={() => speak.words(soundLine(round.cue))}>
            <span className="sci-bit sci-listen" />
          </button>
        ) : null}
      </div>
      <div className="eng-tray" role="group" aria-label="Choices">
        {round.choices.map((choice) => (
          <button key={choice} type="button" className="eng-piece" data-choice={choice} aria-label={choice} onClick={() => choose(choice)}>
            <span className={`sci-bit sci-${choice}`} />
          </button>
        ))}
      </div>
      <Again show={miss} />
      {ready ? <Finish id="senses" onDone={onDone} /> : null}
    </div>
  );
}

function FloatPlay({ level, settingsRef, onDone }: PlayProps) {
  const objects = floatSet(level);
  const speak = useSpeaker(settingsRef);
  const [index, setIndex] = useState(0);
  const [miss, setMiss] = useState(false);
  const [dropped, setDropped] = useState("");
  const current = objects[index];
  useEffect(() => {
    speak.prompt("science-float", "Will it sink or float?");
  }, []);
  const guess = (choice: FloatGuess) => {
    if (!current) return;
    const result = floatVerdict(current, choice);
    if (!result.ok) {
      setDropped("");
      setMiss(true);
      speak.prompt("science-again", "Try again.");
      return;
    }
    setMiss(false);
    setDropped(choice);
    const next = index + 1;
    window.setTimeout(() => {
      if (next >= objects.length) return;
      setIndex(next);
      setDropped("");
    }, 350);
  };
  return (
    <div className="math-play" data-science="float" data-level={level} data-object={current ?? ""} data-dropped={dropped} data-left={objects.length - index}>
      <h1>Float</h1>
      <div className="eng-stage eng-pond">{current ? <span className={`eng-object eng-${current}${dropped === "sink" ? " is-sunk" : ""}`} data-float-art={current} /> : null}</div>
      <div className="eng-tray" role="group" aria-label="Guess">
        <button type="button" className="eng-piece" data-guess="float" aria-label="Float" onClick={() => guess("float")}>
          <span className="eng-float" />
        </button>
        <button type="button" className="eng-piece" data-guess="sink" aria-label="Sink" onClick={() => guess("sink")}>
          <span className="eng-sink" />
        </button>
      </div>
      <Again show={miss} />
      {current && index === objects.length - 1 && dropped ? <Finish id="float" onDone={onDone} /> : null}
    </div>
  );
}

function PredictPlay({ settingsRef, onDone }: PlayProps) {
  const speak = useSpeaker(settingsRef);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState("");
  const [revealed, setRevealed] = useState("");
  const [miss, setMiss] = useState(false);
  const experiment = EXPERIMENTS[index] ?? EXPERIMENTS[0];
  useEffect(() => {
    speak.prompt("science-predict", PREDICT_QUESTION);
  }, [experiment.id]);
  useEffect(() => {
    if (experiment.id === "fizz") speak.prompt("science-grownup", GROWNUP_FIZZ);
  }, [experiment.id]);
  const guess = (choice: string) => {
    if (revealed) return;
    if (!predictionOk(experiment.id as ExperimentId, choice)) {
      setPicked("");
      setMiss(true);
      speak.prompt("science-again", "Try again.");
      return;
    }
    setMiss(false);
    setPicked(choice);
  };
  const reveal = () => {
    if (!picked) return;
    setRevealed(experiment.result);
  };
  const next = () => {
    setPicked("");
    setRevealed("");
    setMiss(false);
    setIndex(index + 1);
  };
  const last = index === EXPERIMENTS.length - 1;
  return (
    <div className="math-play" data-science="predict" data-experiment={experiment.id} data-picked={picked} data-revealed={revealed || "false"}>
      <h1>Predict</h1>
      <p className="sci-ask" data-question="predict">
        {PREDICT_QUESTION}
      </p>
      {experiment.id === "fizz" ? (
        <p className="sci-grownup" data-grownup="true">
          {GROWNUP_FIZZ}
        </p>
      ) : null}
      <div className="eng-stage">
        <span className={`sci-bit sci-${revealed || experiment.id}`} data-scene={revealed || experiment.id} />
      </div>
      <div className="eng-tray" role="group" aria-label="Guess">
        {[experiment.right, experiment.wrong].map((choice) => (
          <button key={choice} type="button" className="eng-piece" data-guess={choice} aria-label={choice} onClick={() => guess(choice)}>
            <span className={`sci-bit sci-${choice}`} />
          </button>
        ))}
      </div>
      {picked && !revealed ? (
        <button type="button" className="start-button" data-test="predict" onClick={reveal}>
          Test
        </button>
      ) : null}
      {revealed && !last ? (
        <button type="button" className="start-button" data-next="predict" onClick={next}>
          Next
        </button>
      ) : null}
      <Again show={miss} />
      {revealed && last ? <Finish id="predict" onDone={onDone} /> : null}
    </div>
  );
}

function OrderActivity({
  activity,
  stages,
  title,
  promptId,
  prompt,
  settingsRef,
  onDone,
}: PlayProps & { activity: ScienceActivity; stages: readonly string[]; title: string; promptId: string; prompt: string }) {
  const speak = useSpeaker(settingsRef);
  const [order, setOrder] = useState<string[]>([]);
  const [miss, setMiss] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    speak.prompt(promptId, prompt);
  }, []);
  const place = (piece: string) => {
    const result = acceptNext(order, piece, stages);
    if (!result.ok) {
      setMiss(true);
      speak.prompt("science-again", "Try again.");
      return;
    }
    setMiss(false);
    setOrder(result.order);
    if (result.done) setReady(true);
  };
  const bind = usePieceDrag((piece, moved, x, y) => {
    if (moved && !closestAttr(x, y, "order-row")) return;
    place(piece);
  });
  return (
    <div className="math-play" data-science={activity} data-order={order.join(",")} data-ready={ready ? "true" : "false"}>
      <h1>{title}</h1>
      <div className="eng-stage" data-order-row={activity} aria-label="Order">
        {order.map((piece) => (
          <span key={piece} className={`sci-bit sci-${piece}`} data-placed={piece} />
        ))}
      </div>
      <div className="eng-tray" role="group" aria-label="Pieces">
        {stages.map((piece) =>
          order.includes(piece) ? null : (
            <button key={piece} type="button" className="eng-piece" data-piece={piece} aria-label={piece} {...bind(piece)}>
              <span className={`sci-bit sci-${piece}`} />
            </button>
          ),
        )}
      </div>
      <Again show={miss} />
      {ready ? <Finish id={activity} onDone={onDone} /> : null}
    </div>
  );
}
