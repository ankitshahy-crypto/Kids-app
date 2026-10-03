import { useEffect, useRef, useState } from "react";
import { playEffect } from "../audio/manager";
import { playPrompt, playWordId } from "../audio/player";
import type { AnimalId } from "../data/animals";
import {
  addBlock,
  BLOCK_NAMES,
  buildLevel,
  loadBuild,
  moveResult,
  palette,
  playSteps,
  POND_STEPS,
  pseudoLine,
  pythonCode,
  removeBlock,
  saveBuild,
  SCRIPT_LIMIT,
  type BuildActivity,
  type BuildBlock,
} from "../data/build";
import { Illustration } from "../illustrations";
import type { AgeRange } from "../data/profiles";
import type { Outfit } from "../data/wardrobe";
import { readSection, writeSection } from "../explore/sectionStore";
import type { Settings } from "../settings";
import { Hero } from "./Hero";

/**
 * Build It: line up picture blocks, press Play, and the child's animal does
 * each step in order.
 *
 * The screen was rebuilt after the first phone test. Before:
 *  - the blocks were stick figures 30px high, and the row of blocks you had
 *    picked looked the same as the row you pick from;
 *  - the stage was a strip with the animal at one edge, and a step lasted
 *    280 ms, so nothing could be seen to happen;
 *  - a grown-up tip eleven lines long sat above it all and pushed Play off
 *    the screen.
 * Now: a big stage, "Your steps" in numbered places, blocks that show the
 * child's own animal doing the move, a name said aloud for each block, and
 * steps slow enough to watch, with the running step lit.
 */

export const BUILD_TITLES: Record<BuildActivity, string> = { move: "Make a dance", music: "Make a song" };

/** How long one step of the program is on stage. */
const STEP_MS = 700;

type Frame = { steps: number; pose: string; splash: boolean; beat: number };

const REST: Frame = { steps: 0, pose: "rest", splash: false, beat: 0 };

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
    /** A block's name, from its recorded word clip. */
    word(name: string) {
      run((signal) => playWordId(name, name, settingsRef.current, signal));
    },
  };
}

/** The picture on a Build It tile: the child's animal mid-jump, or the drum. */
export function BuildTileArt({ activity, animal, outfit }: { activity: BuildActivity; animal: AnimalId; outfit: Outfit }) {
  return (
    <span className="build-tile-art" aria-hidden="true">
      <BlockArt kind={activity === "move" ? "jump" : "drum"} animal={animal} outfit={outfit} />
    </span>
  );
}

/**
 * One Build It board. Each board is its own tile in the Coding list ("Make a dance", "Make a song"); there
 * was a menu in between, which put three rows of buttons above the game.
 */
export function BuildIt({
  activity,
  childId,
  ageRange,
  animal,
  outfit,
  settingsRef,
  showCode,
  onDone,
}: {
  activity: BuildActivity;
  childId: string;
  ageRange: AgeRange;
  animal: AnimalId;
  outfit: Outfit;
  settingsRef: { current: Settings };
  showCode: boolean;
  onDone: (step: string) => void;
}) {
  return (
    <Builder
      key={activity}
      activity={activity}
      childId={childId}
      level={buildLevel(ageRange)}
      animal={animal}
      outfit={outfit}
      settingsRef={settingsRef}
      showCode={showCode}
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
  showCode,
  onDone,
}: {
  activity: BuildActivity;
  childId: string;
  level: ReturnType<typeof buildLevel>;
  animal: AnimalId;
  outfit: Outfit;
  settingsRef: { current: Settings };
  showCode: boolean;
  onDone: () => void;
}) {
  const speak = useSpeaker(settingsRef);
  const blocks = palette(activity, level);
  const [script, setScript] = useState<BuildBlock[]>([]);
  const [playing, setPlaying] = useState(-1);
  const [ran, setRan] = useState<string[]>([]);
  const [lit, setLit] = useState<number[]>([]);
  const [played, setPlayed] = useState(false);
  const [frame, setFrame] = useState<Frame>(REST);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [said, setSaid] = useState("");
  const drag = useRef<{ kind: BuildBlock; x: number; y: number; moved: boolean } | null>(null);
  const runId = useRef(0);
  const finished = useRef(false);
  const boardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activity === "move") speak.prompt("build-move", "Stack the blocks, then press play.");
    else speak.prompt("build-music", "Make a song. Press play.");
    if (level !== "later") return;
    const stored = loadBuild(childId, activity, readSection("games", "build"));
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
    setFrame(REST);
    setSaid(BLOCK_NAMES[kind]);
    speak.word(BLOCK_NAMES[kind]);
  };

  const play = () => {
    if (script.length === 0 || playing >= 0) return;
    const steps = playSteps(script);
    if (steps.length === 0) return;
    const id = ++runId.current;
    const pace = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : STEP_MS;
    // The program is acted out on the stage, so the stage has to be on screen when Play is pressed.
    boardRef.current?.querySelector(".build-stage")?.scrollIntoView({ block: "nearest", behavior: pace ? "smooth" : "auto" });
    setPlayed(false);
    setRan([]);
    setLit([]);
    setFrame(REST);
    void (async () => {
      const heard: string[] = [];
      let stepsWalked = 0;
      let beat = 0;
      for (const step of steps) {
        if (runId.current !== id) return;
        setPlaying(step.index);
        setLit((current) => [...current, step.index]);
        heard.push(step.block);
        setRan([...heard]);
        if (step.block === "walk") stepsWalked += 1;
        const splash = step.block === "pond" && stepsWalked >= POND_STEPS;
        if (step.block !== "repeat") {
          beat += 1;
          setFrame({ steps: stepsWalked, pose: step.block === "pond" ? (splash ? "splash" : "pond") : step.block, splash, beat });
        }
        // Every sound is the app's own: a drum, a bell, a note. The note used to be the phone's voice saying "la".
        if (step.block === "drum") playEffect("boop", settingsRef.current);
        if (step.block === "bell") playEffect("chime", settingsRef.current);
        if (step.block === "note" || step.block === "sing") playEffect("pop", settingsRef.current);
        if (splash) speak.prompt("build-splash", "Splash!");
        // The repeat block itself is not a step on stage: it lights and the body runs again.
        if (pace) await sleep(step.block === "repeat" ? pace / 3 : pace);
      }
      if (runId.current !== id) return;
      setPlaying(-1);
      setPlayed(true);
      setFrame((current) => ({ ...current, pose: current.pose === "splash" ? "splash" : "rest" }));
    })();
  };

  const store = () => {
    const next = saveBuild(childId, activity, script, readSection("games", "build"));
    writeSection("games", "build", next);
    setSaved(true);
    speak.prompt("build-save", "Saved on this device.");
  };

  const motion = moveResult(script);
  const done = played && script.length > 0;
  const live = playing >= 0 ? script[playing] : null;

  return (
    <div
      className="game-board build-board"
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
      data-saved={saved ? "true" : "false"}
      data-loaded={loaded ? "true" : "false"}
      data-lines={level === "later" ? "on" : "off"}
      data-python={showCode ? "on" : "off"}
      data-said={said}
    >
      <h1>{BUILD_TITLES[activity]}</h1>
      <Stage activity={activity} animal={animal} outfit={outfit} level={level} live={live} frame={frame} />
      <div className="build-steps">
        <p className="build-label">Your steps</p>
        <div className="build-script" data-drop="script" aria-label="Your steps">
          {/* Five numbered places to fill, and room for up to eight steps. A tap on a step takes it out. */}
          {Array.from({ length: Math.max(5, Math.min(SCRIPT_LIMIT, script.length + 1)) }, (_, index) => {
            const kind = script[index];
            if (!kind) {
              return (
                <span key={`place-${index}`} className="build-place" data-place={index}>
                  {index + 1}
                </span>
              );
            }
            return (
              <button
                key={`${kind}-${index}`}
                type="button"
                className="build-chip"
                data-index={index}
                data-kind={kind}
                data-line={level === "later" ? pseudoLine(script, index) : undefined}
                data-on={playing === index ? "true" : "false"}
                aria-label={BLOCK_NAMES[kind]}
                onClick={() => {
                  if (playing >= 0) return;
                  setScript((current) => removeBlock(current, index));
                  setPlayed(false);
                  setSaved(false);
                  setFrame(REST);
                }}
              >
                <BlockArt kind={kind} animal={animal} outfit={outfit} />
              </button>
            );
          })}
        </div>
      </div>
      {/* Ages 5–7 also see the program in words, one line a block, and the line that is running lights with
          its block. (Each block used to be a full-width row of text, which pushed the stage off the screen
          while the program ran.) */}
      {level === "later" && script.length > 0 ? (
        <ol className="build-lines" aria-label="The program in words">
          {script.map((kind, index) => (
            <li key={`${kind}-${index}`} data-line-index={index} data-on={playing === index ? "true" : "false"}>
              {pseudoLine(script, index)}
            </li>
          ))}
        </ol>
      ) : null}
      {showCode ? (
        <pre className="build-python" data-python="on" aria-readonly="true">
          {pythonCode(script)}
        </pre>
      ) : null}
      <div className="build-palette" role="group" aria-label="Blocks">
        {blocks.map((kind) => (
          <button
            key={kind}
            type="button"
            className="build-block"
            data-block={kind}
            aria-label={BLOCK_NAMES[kind]}
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
              const over = Boolean(box && event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom);
              if (over) append(kind);
            }}
          >
            <BlockArt kind={kind} animal={animal} outfit={outfit} />
            <span className="build-name">{kind === "repeat" ? "× 3" : BLOCK_NAMES[kind]}</span>
          </button>
        ))}
      </div>
      <button type="button" className="start-button" data-play="run" disabled={script.length === 0} onClick={play}>
        Play
      </button>
      {level === "later" ? (
        <button type="button" className="game-back" data-save="device" onClick={store}>
          Save
        </button>
      ) : null}
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

/** Where the program is acted out: the animal on a path to the pond, or a band of three instruments. */
function Stage({
  activity,
  animal,
  outfit,
  level,
  live,
  frame,
}: {
  activity: BuildActivity;
  animal: AnimalId;
  outfit: Outfit;
  level: ReturnType<typeof buildLevel>;
  live: BuildBlock | null;
  frame: Frame;
}) {
  if (activity === "move") {
    // Three walks take the animal from the left edge to the pond.
    const along = Math.min(frame.steps, POND_STEPS) / POND_STEPS;
    return (
      <div className="build-stage" data-stage="move" data-pose={frame.pose}>
        <div className="build-ground" />
        {level === "later" ? <PondMark splash={frame.splash} /> : null}
        <div className="build-actor" style={{ left: `calc(${along} * (100% - 116px) + 8px)` }}>
          {/* `key` restarts the move's animation when the same block runs twice in a row. */}
          <div key={frame.beat} className="build-pose" data-pose={frame.pose}>
            <Hero animal={animal} outfit={outfit} />
            {frame.pose === "sing" ? <span className="build-note">♪</span> : null}
          </div>
        </div>
      </div>
    );
  }
  const sound = live === "drum" || live === "bell" || live === "note" ? live : "";
  return (
    <div className="build-stage build-music" data-stage="music" data-sound={sound}>
      {(["drum", "bell", "note"] as const).map((kind) => (
        <span key={kind} className="build-instrument" data-sound={kind} data-on={sound === kind ? "true" : "false"}>
          <BlockArt key={sound === kind ? frame.beat : 0} kind={kind} animal={animal} outfit={outfit} />
        </span>
      ))}
    </div>
  );
}

/** A block's picture. The move blocks show the child's own animal doing the move. */
function BlockArt({ kind, animal, outfit }: { kind: BuildBlock; animal: AnimalId; outfit: Outfit }) {
  if (kind === "walk" || kind === "jump" || kind === "spin" || kind === "dance" || kind === "sing") {
    return (
      <span className="build-art build-art-move" data-move={kind} aria-hidden="true">
        <span className="build-art-hero">
          <Hero animal={animal} outfit={outfit} />
        </span>
        <MoveMark kind={kind} />
      </span>
    );
  }
  if (kind === "drum") {
    return (
      <span className="build-art" aria-hidden="true">
        <Illustration name="drum" />
      </span>
    );
  }
  if (kind === "bell") {
    return (
      <span className="build-art" aria-hidden="true">
        <svg viewBox="0 0 64 64">
          <path d="M32 8v6" stroke="#C9A24A" strokeWidth="5" strokeLinecap="round" />
          <path d="M32 13a18 18 0 0 1 18 18v10l5 7H9l5-7V31a18 18 0 0 1 18-18Z" fill="#F6D56B" stroke="#E0B94A" strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="32" cy="53" r="5.5" fill="#C9A24A" />
          <path d="M22 28c2-5 6-8 10-8" fill="none" stroke="#FFF1C4" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  if (kind === "note") {
    return (
      <span className="build-art" aria-hidden="true">
        <svg viewBox="0 0 64 64">
          <path d="M26 46V14l24-6v32" fill="none" stroke="#6F9BC8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <ellipse cx="18" cy="47" rx="9" ry="7" fill="#8EB4D6" />
          <ellipse cx="42" cy="41" rx="9" ry="7" fill="#8EB4D6" />
        </svg>
      </span>
    );
  }
  if (kind === "repeat") {
    return (
      <span className="build-art" aria-hidden="true">
        <svg viewBox="0 0 64 64">
          <path d="M14 30a18 18 0 0 1 31-12" fill="none" stroke="#6D8F78" strokeWidth="6" strokeLinecap="round" />
          <path d="M47 8v12H35" fill="none" stroke="#6D8F78" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M50 34a18 18 0 0 1-31 12" fill="none" stroke="#6D8F78" strokeWidth="6" strokeLinecap="round" />
          <path d="M17 56V44h12" fill="none" stroke="#6D8F78" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  return (
    <span className="build-art" aria-hidden="true">
      <PondMark splash />
    </span>
  );
}

/** The sign beside the animal that says which move this is: an arrow along, an arrow up, a turn, a wiggle, a note. */
function MoveMark({ kind }: { kind: "walk" | "jump" | "spin" | "dance" | "sing" }) {
  const stroke = { fill: "none", stroke: "#6D8F78", strokeWidth: 5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg className="build-mark" viewBox="0 0 32 32" aria-hidden="true">
      {kind === "walk" ? <path d="M4 16h22M18 8l8 8-8 8" {...stroke} /> : null}
      {kind === "jump" ? <path d="M16 28V6M8 14l8-8 8 8" {...stroke} /> : null}
      {kind === "spin" ? <path d="M26 16a10 10 0 1 1-4-8M22 2v7h-7" {...stroke} /> : null}
      {kind === "dance" ? <path d="M3 20c4-10 8 6 12-4s8 6 12-4" {...stroke} /> : null}
      {kind === "sing" ? (
        <>
          <path d="M13 23V6l12-3v16" {...stroke} strokeWidth={4} />
          <ellipse cx="9" cy="24" rx="5" ry="4" fill="#6D8F78" />
          <ellipse cx="21" cy="20" rx="5" ry="4" fill="#6D8F78" />
        </>
      ) : null}
    </svg>
  );
}

function PondMark({ splash }: { splash: boolean }) {
  return (
    <svg className="pond-mark" viewBox="0 0 64 40" aria-hidden="true">
      <ellipse cx="32" cy="26" rx="26" ry="11" fill="#8eb4d6" />
      <ellipse cx="26" cy="24" rx="10" ry="3" fill="#b7d7f2" />
      {splash ? <path d="M32 6v10M20 12l7 7M44 12l-7 7" stroke="#8eb4d6" strokeWidth="4" strokeLinecap="round" /> : null}
    </svg>
  );
}
