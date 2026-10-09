import { useEffect, useRef, useState } from "react";
import type { AnimalId } from "../data/animals";
import clips from "../data/animalClips.json";
import type { Mood } from "../game/kit";

/**
 * The animals' clips (public/animals/<id>/clips/, made by scripts/animal-clips.py): which each has,
 * how long each runs and whether it loops, and `still`: where the shipped still's frame sits inside
 * the clip's frame (x, y, side, fractions of it), so a video is drawn at the size and place that
 * puts its idle pose exactly on the still underneath.
 */
export type ClipName = "idle" | "think-idle" | "wait-idle" | "cheer" | "hello" | "walk" | "jump" | "spin" | "dance" | "sing";
type ClipEntry = { clips: Partial<Record<ClipName, { seconds: number; loops: boolean }>>; still: [number, number, number] };
const CLIPS = clips as Partial<Record<AnimalId, ClipEntry>>;

/** The clip a mood plays, when the animal has it: a mood with none keeps its still face. */
const MOOD_CLIP: Partial<Record<Mood, ClipName>> = { idle: "idle", walk: "idle", cheer: "cheer", think: "think-idle", wait: "wait-idle" };

export function clipsOf(animal: AnimalId): ClipEntry | null {
  return CLIPS[animal] ?? null;
}

function clipSrc(animal: AnimalId, clip: ClipName, kind: "mov" | "webm"): string {
  return `${import.meta.env.BASE_URL}animals/${animal}/clips/${clip}.${kind}`;
}

function reducedMotion(): boolean {
  return typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

/** WebKit (Safari, the installed app, every browser on an iPhone), which plays the HEVC file and
 * would play the WebM too, without its transparency. Blink says AppleWebKit as well, with Chrome/. */
function webmOpaque(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /AppleWebKit/.test(ua) && !/Chrome\/|Chromium\/|Edg\//.test(ua);
}

/**
 * An animal's life as video over its stills: the idle loop (breathing, blinking, a look aside now
 * and then), and a mood's clip when it has one (a cheer: once, then the idle loop again). Each
 * clip is its own video, there from the start so a mood never waits for its download; one plays at
 * a time. A clip is drawn at the size and place that puts its pose on the still's, and shows only
 * while it is playing: before that, or where video never plays (reduced motion; a browser with
 * neither codec; autoplay refused), the stills and their CSS are what is seen, as they were. Muted,
 * inline; pictures, not controls.
 */
export function AnimalClip({ animal, mood, onPlaying }: { animal: AnimalId; mood: Mood; onPlaying: (clip: ClipName | null) => void }) {
  const entry = clipsOf(animal);
  const videos = useRef<Partial<Record<ClipName, HTMLVideoElement | null>>>({});
  const [showing, setShowing] = useState<ClipName | null>(null);
  const [overDone, setOverDone] = useState<ClipName | null>(null);
  // A one-shot clip that has started plays to its end, whatever the mood does meanwhile: a cheer cut
  // off mid-bounce is worse than one that runs a moment past the mood.
  const [holding, setHolding] = useState<ClipName | null>(null);
  const wanted = MOOD_CLIP[mood];
  const have = entry && !reducedMotion() ? (Object.keys(entry.clips) as ClipName[]) : [];
  // The clip for this mood, when the animal has it and it has not just played out; else the idle loop.
  const asked: ClipName | null = wanted && have.includes(wanted) && overDone !== wanted ? wanted : have.includes("idle") ? "idle" : null;
  const active = holding ?? asked;

  useEffect(() => {
    onPlaying(showing);
  }, [showing, onPlaying]);
  useEffect(() => () => onPlaying(null), [onPlaying]);

  // A new mood: a one-shot clip that had played out may play again.
  useEffect(() => {
    setOverDone(null);
  }, [mood]);

  useEffect(() => {
    if (!active) {
      setShowing(null);
      return;
    }
    const element = videos.current[active];
    if (!element) return;
    for (const [name, other] of Object.entries(videos.current)) {
      if (name !== active && other && !other.paused) other.pause();
    }
    const oneShot = !entry?.clips[active]?.loops;
    const onPlaying = () => {
      // The WebM in Safari has no transparency: the still stays.
      if (/\.webm(\?|$)/.test(element.currentSrc) && webmOpaque()) return;
      setShowing(active);
      if (oneShot) setHolding(active);
    };
    const onStop = () => {
      setShowing((was) => (was === active ? null : was));
      if (oneShot) setHolding(null);
    };
    const onEnded = () => {
      setShowing((was) => (was === active ? null : was));
      if (oneShot) {
        setOverDone(active);
        setHolding(null);
      }
    };
    element.addEventListener("playing", onPlaying);
    element.addEventListener("pause", onStop);
    element.addEventListener("error", onStop);
    element.addEventListener("emptied", onStop);
    element.addEventListener("ended", onEnded);
    if (!entry?.clips[active]?.loops) element.currentTime = 0;
    void element.play().catch(() => undefined);
    return () => {
      element.removeEventListener("playing", onPlaying);
      element.removeEventListener("pause", onStop);
      element.removeEventListener("error", onStop);
      element.removeEventListener("emptied", onStop);
      element.removeEventListener("ended", onEnded);
    };
  }, [active, animal, entry]);

  if (!entry || have.length === 0) return null;
  const [x, y, side] = entry.still;
  // The still's frame is `side` of the clip's, at (x, y) in it: a video is drawn 1/side as big as
  // the still's box, shifted so that frame lands on the box.
  const style = { width: `${100 / side}%`, height: `${100 / side}%`, left: `${(-x / side) * 100}%`, top: `${(-y / side) * 100}%` };
  return (
    <>
      {have.map((clip) => (
        <video
          key={`${animal}-${clip}`}
          ref={(element) => {
            videos.current[clip] = element;
          }}
          className="avatar-clip"
          data-clip={clip}
          data-playing={showing === clip ? "true" : "false"}
          muted
          loop={entry.clips[clip]?.loops}
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          aria-hidden="true"
          tabIndex={-1}
          style={style}
        >
          <source src={clipSrc(animal, clip, "mov")} type='video/quicktime; codecs="hvc1"' />
          <source src={clipSrc(animal, clip, "webm")} type='video/webm; codecs="vp9"' />
        </video>
      ))}
    </>
  );
}
