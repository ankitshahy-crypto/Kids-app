import { useEffect, useRef, useState } from "react";
import { playEffect } from "../audio/manager";
import { playOnDevice, playPrompt } from "../audio/player";
import type { AnimalId } from "../data/animals";
import {
  BUILD_KEY,
  addBlock,
  buildLevel,
  chefResult,
  loadBuild,
  moveResult,
  palette,
  playSteps,
  removeBlock,
  saveBuild,
  sceneResult,
  type BuildActivity,
  type BuildBlock,
} from "../data/build";
import type { AgeRange } from "../data/profiles";
import type { Outfit } from "../data/wardrobe";
import type { Settings } from "../settings";
import { Hero } from "./Hero";

const ACTIVITIES: { id: BuildActivity; label: string }[] = [
  { id: "move", label: "Move" },
  { id: "music", label: "Music" },
  { id: "scene", label: "Scene" },
  { id: "chef", label: "Chef" },
];

const NAMES: Record<BuildBlock, string> = {
  walk: "Walk",
  jump: "Jump",
  spin: "Spin",
  dance: "Dance",
  sing: "Sing",
  drum: "Drum",
  bell: "Bell",
  note: "Note",
  repeat: "Repeat",
  rain: "Rain",
  sun: "Sun",
  flower: "Flower",
  bread: "Bread",
  spread: "Spread",
  filling: "Filling",
  pond: "Pond",
};

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

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

export function BuildIt({
  childId,
  ageRange,
  animal,
  outfit,
  settingsRef,
  onDone,
}: {
  childId: string;
  ageRange: AgeRange;
  animal: AnimalId;
  outfit: Outfit;
  settingsRef: { current: Settings };
  onDone: (step: string) => void;
}) {
  const [activity, setActivity] = useState<BuildActivity | null>(null);
  const level = buildLevel(ageRange);
  if (!activity) {
    return (
      <div className="game-board" data-build="menu">
        <h1>Build It</h1>
        <div className="game-tiles">
          {ACTIVITIES.map((item) => (
            <button key={item.id} type="button" className="game-tile" data-build-tile={item.id} onClick={() => setActivity(item.id)}>
              <BlockArt kind={item.id === "move" ? "walk" : item.id === "music" ? "drum" : item.id === "scene" ? "flower" : "bread"} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <Builder
      key={activity}
      activity={activity}
      childId={childId}
      level={level}
      animal={animal}
      outfit={outfit}
      settingsRef={settingsRef}
      onBack={() => setActivity(null)}
      onDone={() => onDone(`game-build-${activity}`)}
    />
  );
}

function Builder({
  activity,
  childId,
  level,
  animal,
  outfit,
  settingsRef,
  onBack,
  onDone,
}: {
  activity: BuildActivity;
  childId: string;
  level: ReturnType<typeof buildLevel>;
  animal: AnimalId;
  outfit: Outfit;
  settingsRef: { current: Settings };
  onBack: () => void;
  onDone: () => void;
}) {
  const speak = useSpeaker(settingsRef);
  const blocks = palette(activity, level);
  const [script, setScript] = useState<BuildBlock[]>([]);
  const [playing, setPlaying] = useState(-1);
  const [ran, setRan] = useState<string[]>([]);
  const [lit, setLit] = useState<number[]>([]);
  const [played, setPlayed] = useState(false);
  const [frame, setFrame] = useState({ steps: 0, pose: "rest", splash: false, flower: "bud" as "bud" | "grown", sky: "clear" as "clear" | "rain" | "sun" });
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const drag = useRef<{ kind: BuildBlock; x: number; y: number; moved: boolean } | null>(null);
  const runId = useRef(0);
  const finished = useRef(false);
  const boardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const prompt =
      activity === "move" ? "build-move" : activity === "music" ? "build-music" : activity === "scene" ? "build-scene" : "build-chef";
    const fallback =
      activity === "move"
        ? "Stack the blocks, then press play."
        : activity === "music"
          ? "Make a song. Press play."
          : activity === "scene"
            ? "What happens next?"
            : "Make a sandwich.";
    speak.prompt(prompt, fallback);
    if (level !== "later") return;
    const stored = loadBuild(childId, activity, localStorage.getItem(BUILD_KEY));
    if (stored.length > 0) {
      setScript(stored);
      setLoaded(true);
    }
  }, [activity]);

  const append = (kind: BuildBlock) => {
    if (playing >= 0) return;
    setScript((current) => addBlock(current, kind));
    setSaved(false);
    setPlayed(false);
    setFrame({ steps: 0, pose: "rest", splash: false, flower: "bud", sky: "clear" });
  };

  const play = () => {
    if (script.length === 0 || playing >= 0) return;
    const steps = playSteps(script);
    if (steps.length === 0) return;
    const id = ++runId.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPlayed(false);
    setRan([]);
    setLit([]);
    void (async () => {
      const heard: string[] = [];
      let stepsWalked = 0;
      let wet = false;
      let sky: "clear" | "rain" | "sun" = "clear";
      let flower: "bud" | "grown" = "bud";
      for (const step of steps) {
        if (runId.current !== id) return;
        setPlaying(step.index);
        setLit((current) => [...current, step.index]);
        heard.push(step.block);
        setRan([...heard]);
        if (step.block === "walk") stepsWalked += 1;
        if (step.block === "rain") {
          wet = true;
          sky = "rain";
        } else if (step.block === "sun") {
          wet = false;
          sky = "sun";
        } else if (step.block === "flower" && wet) flower = "grown";
        const splash = step.block === "pond" && stepsWalked >= 3;
        if (step.block !== "repeat") {
          setFrame({
            steps: stepsWalked,
            pose: step.block === "pond" ? (splash ? "splash" : "pond") : step.block,
            splash,
            flower,
            sky,
          });
        }
        if (step.block === "drum") playEffect("boop", settingsRef.current);
        if (step.block === "bell") playEffect("chime", settingsRef.current);
        if (step.block === "note") speak.words("la");
        if (splash) speak.prompt("build-splash", "The bird splashes.");
        await sleep(reduce ? 0 : 280);
      }
      if (runId.current !== id) return;
      setPlaying(-1);
      setPlayed(true);
      const scene = sceneResult(script);
      const chef = chefResult(script);
      if (activity === "scene" && scene.flower !== "grown") speak.prompt("build-again", "Try again.");
      if (activity === "chef" && chef === "silly") speak.prompt("build-again", "Try again.");
    })();
  };

  const store = () => {
    const next = saveBuild(childId, activity, script, localStorage.getItem(BUILD_KEY));
    localStorage.setItem(BUILD_KEY, next);
    setSaved(true);
    speak.prompt("build-save", "Saved on this device.");
  };

  const motion = moveResult(script);
  const scene = sceneResult(played ? script : []);
  const chef = played ? chefResult(script) : "wait";
  const done =
    played &&
    ((activity === "move" && script.length > 0) ||
      (activity === "music" && script.length > 0) ||
      (activity === "scene" && scene.flower === "grown") ||
      (activity === "chef" && chef === "sandwich"));

  return (
    <div
      className="game-board"
      ref={boardRef}
      data-build={activity}
      data-level={level}
      data-script={script.join(",")}
      data-playing={playing >= 0 ? String(playing) : ""}
      data-ran={ran.join(",")}
      data-lit={lit.join(",")}
      data-played={played ? "true" : "false"}
      data-steps={activity === "move" && played ? motion.steps : 0}
      data-pose={activity === "move" && played ? motion.pose : "rest"}
      data-splash={activity === "move" && played && motion.splashed ? "true" : "false"}
      data-flower={activity === "scene" ? scene.flower : "bud"}
      data-sky={activity === "scene" && played ? scene.sky : "clear"}
      data-result={activity === "chef" ? chef : "wait"}
      data-saved={saved ? "true" : "false"}
      data-loaded={loaded ? "true" : "false"}
    >
      <button type="button" className="game-back" onClick={onBack}>
        Build It
      </button>
      <h1>{ACTIVITIES.find((item) => item.id === activity)?.label}</h1>
      <Stage activity={activity} animal={animal} outfit={outfit} script={script} played={played} playing={playing} frame={frame} />
      <div className="build-script" data-drop="script" aria-label="Program">
        {script.length === 0 ? <span className="build-empty">+</span> : null}
        {script.map((kind, index) => (
          <button
            key={`${kind}-${index}`}
            type="button"
            className="build-chip"
            data-index={index}
            data-kind={kind}
            data-on={playing === index ? "true" : "false"}
            aria-label={NAMES[kind]}
            onClick={() => {
              if (playing >= 0) return;
              setScript((current) => removeBlock(current, index));
              setPlayed(false);
              setSaved(false);
            }}
          >
            <BlockArt kind={kind} />
          </button>
        ))}
      </div>
      <div className="build-palette" role="group" aria-label="Blocks">
        {blocks.map((kind) => (
          <button
            key={kind}
            type="button"
            className="build-block"
            data-block={kind}
            aria-label={NAMES[kind]}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              drag.current = { kind, x: event.clientX, y: event.clientY, moved: false };
            }}
            onPointerMove={(event) => {
              const info = drag.current;
              if (!info || info.kind !== kind) return;
              if (Math.hypot(event.clientX - info.x, event.clientY - info.y) > 8) info.moved = true;
            }}
            onPointerUp={(event) => {
              const info = drag.current;
              drag.current = null;
              if (!info || info.kind !== kind) return;
              if (!info.moved) {
                append(kind);
                return;
              }
              const drop = boardRef.current?.querySelector("[data-drop=script]");
              const box = drop?.getBoundingClientRect();
              const over = Boolean(
                box && event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom,
              );
              if (over) append(kind);
            }}
          >
            <BlockArt kind={kind} />
          </button>
        ))}
      </div>
      <button type="button" className="start-button" data-play="run" onClick={play}>
        Play
      </button>
      {level === "later" ? (
        <button type="button" className="game-back" data-save="device" onClick={store}>
          Save
        </button>
      ) : null}
      {activity === "chef" && chef === "silly" ? <p className="build-again">Try again.</p> : null}
      {activity === "scene" && played && scene.flower !== "grown" ? <p className="build-again">Try again.</p> : null}
      {done ? (
        <button
          type="button"
          className="start-button"
          data-finish={activity}
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

function Stage({
  activity,
  animal,
  outfit,
  script,
  played,
  playing,
  frame,
}: {
  activity: BuildActivity;
  animal: AnimalId;
  outfit: Outfit;
  script: BuildBlock[];
  played: boolean;
  playing: number;
  frame: { steps: number; pose: string; splash: boolean; flower: "bud" | "grown"; sky: "clear" | "rain" | "sun" };
}) {
  const live = playing >= 0 ? script[playing] : null;
  if (activity === "move") {
    return (
      <div className="build-stage" data-stage="move">
        <div
          className="build-actor"
          data-pose={frame.pose}
          style={{
            transform: `translateX(${frame.steps * 28}px)${frame.pose === "jump" ? " translateY(-18px)" : frame.pose === "spin" ? " rotate(24deg)" : frame.pose === "dance" ? " translateY(-8px) rotate(-8deg)" : ""}`,
          }}
        >
          <Hero animal={animal} outfit={outfit} />
        </div>
        <PondMark splash={frame.splash} />
      </div>
    );
  }
  if (activity === "music") {
    const sound = live === "drum" || live === "bell" || live === "note" ? live : played ? script.filter((kind) => kind !== "repeat").at(-1) : "";
    return (
      <div className="build-stage build-music" data-stage="music" data-sound={sound || ""}>
        <span data-sound="drum" data-on={sound === "drum" ? "true" : "false"}><BlockArt kind="drum" /></span>
        <span data-sound="bell" data-on={sound === "bell" ? "true" : "false"}><BlockArt kind="bell" /></span>
        <span data-sound="note" data-on={sound === "note" ? "true" : "false"}><BlockArt kind="note" /></span>
      </div>
    );
  }
  if (activity === "scene") {
    return (
      <div className="build-stage" data-stage="scene">
        {frame.sky === "rain" || live === "rain" ? <Cloud /> : null}
        {frame.sky === "sun" || live === "sun" ? <Sun /> : null}
        <Flower grown={frame.flower === "grown"} />
      </div>
    );
  }
  const chef = played ? chefResult(script) : "wait";
  return (
    <div className="build-stage" data-stage="chef">
      <Robot />
      <Sandwich result={chef} />
    </div>
  );
}

function BlockArt({ kind }: { kind: BuildBlock }) {
  if (kind === "walk") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="18" r="8" fill="#e07a5f" />
        <path d="M32 28 v12 M24 52 l8-12 8 12 M20 36 h24" stroke="#6d8f78" strokeWidth="4" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "jump") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="16" r="8" fill="#e07a5f" />
        <path d="M24 48c8-16 8-16 16 0" stroke="#6d8f78" strokeWidth="4" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "spin") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M18 32 a14 14 0 1 1 8-12" fill="none" stroke="#8eb4d6" strokeWidth="4" strokeLinecap="round" />
        <path d="M26 16 l2 8 l-8 2" fill="#8eb4d6" />
      </svg>
    );
  }
  if (kind === "dance") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="16" r="7" fill="#f4a4b4" />
        <path d="M32 24 l-10 12 M32 24 l10 8 M22 50 l10-14 8 14" stroke="#6d8f78" strokeWidth="4" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "sing") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="24" cy="40" r="8" fill="#f6d56b" />
        <path d="M32 40 V16 h16" stroke="#e07a5f" strokeWidth="4" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "drum") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <ellipse cx="32" cy="36" rx="18" ry="10" fill="#e07a8a" />
        <path d="M14 36 v8 c0 8 36 8 36 0 v-8" fill="#f6c3cb" />
      </svg>
    );
  }
  if (kind === "bell") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M32 12 v6 a16 16 0 0 1 16 16 v8 H16 v-8 a16 16 0 0 1 16-16" fill="#f6d56b" />
        <circle cx="32" cy="48" r="4" fill="#e4c7a4" />
      </svg>
    );
  }
  if (kind === "note") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="22" cy="44" r="8" fill="#8eb4d6" />
        <path d="M30 44 V14" stroke="#8eb4d6" strokeWidth="4" />
        <path d="M30 14 h16 v8" fill="#b7d7f2" />
      </svg>
    );
  }
  if (kind === "repeat") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M18 24 h24 a10 10 0 0 1 0 20 H22" fill="none" stroke="#6d8f78" strokeWidth="4" strokeLinecap="round" />
        <path d="M22 36 l-8 8 l8 8" fill="none" stroke="#6d8f78" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "rain") return <Cloud />;
  if (kind === "sun") return <Sun />;
  if (kind === "flower") return <Flower grown />;
  if (kind === "bread") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <rect x="12" y="26" width="40" height="16" rx="8" fill="#f6d56b" />
      </svg>
    );
  }
  if (kind === "spread") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <rect x="14" y="28" width="36" height="12" rx="4" fill="#e4b07a" />
      </svg>
    );
  }
  if (kind === "pond") return <PondMark splash={false} />;
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="12" fill="#c9e6d4" />
      <circle cx="32" cy="32" r="6" fill="#e07a8a" />
    </svg>
  );
}

function PondMark({ splash }: { splash: boolean }) {
  return (
    <svg className="pond-mark" viewBox="0 0 64 40" aria-hidden="true">
      <ellipse cx="32" cy="24" rx="22" ry="10" fill="#8eb4d6" />
      {splash ? <path d="M32 8 v8 M22 14 l6 6 M42 14 l-6 6" stroke="#d7eef8" strokeWidth="3" strokeLinecap="round" /> : null}
    </svg>
  );
}

function Cloud() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <ellipse cx="32" cy="26" rx="16" ry="10" fill="#d7eef8" />
      <path d="M24 36 v8 M32 34 v12 M40 36 v8" stroke="#8eb4d6" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Sun() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="10" fill="#f6d56b" />
      <path d="M32 10 v6 M32 48 v6 M10 32 h6 M48 32 h6" stroke="#f6d56b" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Flower({ grown }: { grown: boolean }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect x="30" y="34" width="4" height={grown ? 18 : 8} fill="#6e9a74" />
      {grown ? (
        <>
          <circle cx="32" cy="24" r="6" fill="#f6d56b" />
          <circle cx="22" cy="30" r="6" fill="#f4a4b4" />
          <circle cx="42" cy="30" r="6" fill="#f4a4b4" />
        </>
      ) : (
        <circle cx="32" cy="30" r="5" fill="#c9e6d4" />
      )}
    </svg>
  );
}

function Robot() {
  return (
    <svg className="chef-robot" viewBox="0 0 64 64" aria-hidden="true">
      <rect x="16" y="16" width="32" height="28" rx="8" fill="#d7eef8" />
      <circle cx="26" cy="28" r="3" fill="#2c3a4f" />
      <circle cx="38" cy="28" r="3" fill="#2c3a4f" />
      <rect x="24" y="44" width="6" height="10" fill="#8eb4d6" />
      <rect x="34" y="44" width="6" height="10" fill="#8eb4d6" />
    </svg>
  );
}

function Sandwich({ result }: { result: "wait" | "silly" | "sandwich" }) {
  if (result === "wait") return null;
  const messy = result === "silly";
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" data-stack={result}>
      <rect x={messy ? 10 : 14} y={messy ? 18 : 36} width="36" height="10" rx="4" fill="#f6d56b" transform={messy ? "rotate(-12 28 23)" : undefined} />
      <rect x={messy ? 18 : 16} y={messy ? 34 : 28} width="30" height="8" rx="3" fill="#e4b07a" />
      <circle cx={messy ? 40 : 32} cy={messy ? 30 : 24} r="6" fill="#e07a8a" />
      {result === "sandwich" ? <rect x="14" y="16" width="36" height="10" rx="4" fill="#f6d56b" /> : null}
    </svg>
  );
}
