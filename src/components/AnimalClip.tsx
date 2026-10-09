import { useEffect, useRef, useState } from "react";
import type { AnimalId } from "../data/animals";
import clips from "../data/animalClips.json";

/**
 * The animals' clips (public/animals/<id>/clips/, made by scripts/animal-clips.py): which each has,
 * how long each runs and whether it loops, and `still`: where the shipped still's frame sits inside
 * the clip's frame (x, y, side, fractions of it), so the video is drawn at the size and place that
 * puts its idle pose exactly on the still underneath.
 */
type ClipName = "idle" | "think-idle" | "wait-idle" | "cheer" | "hello" | "walk" | "jump" | "spin" | "dance" | "sing";
type ClipEntry = { clips: Partial<Record<ClipName, { seconds: number; loops: boolean }>>; still: [number, number, number] };
const CLIPS = clips as Partial<Record<AnimalId, ClipEntry>>;

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
 * An animal's idle life, as video: breathing, blinking, a look aside now and then (the clip loops).
 * It lies over the idle still, at the size and place that puts its pose on the still's, and shows
 * only once it is playing: before that, or where the video never plays (reduced motion; a browser
 * with neither codec; autoplay refused), the still and its CSS blink are what is seen, as they were.
 * Muted, inline, looping; a picture, not a control.
 */
export function AnimalClip({ animal, onPlaying }: { animal: AnimalId; onPlaying: (playing: boolean) => void }) {
  const entry = clipsOf(animal);
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const still = entry?.clips.idle && !reducedMotion();
  useEffect(() => {
    onPlaying(playing);
  }, [playing, onPlaying]);
  useEffect(() => () => onPlaying(false), [onPlaying]);

  useEffect(() => {
    const element = video.current;
    if (!element || !still) return;
    setPlaying(false);
    const onPlaying = () => {
      // The WebM in Safari has no transparency: the still stays.
      if (/\.webm(\?|$)/.test(element.currentSrc) && webmOpaque()) return;
      setPlaying(true);
    };
    const onStop = () => setPlaying(false);
    element.addEventListener("playing", onPlaying);
    element.addEventListener("pause", onStop);
    element.addEventListener("error", onStop);
    element.addEventListener("emptied", onStop);
    // Autoplay is asked for as an attribute too; this is for a browser that waits to be asked.
    void element.play().catch(() => undefined);
    return () => {
      element.removeEventListener("playing", onPlaying);
      element.removeEventListener("pause", onStop);
      element.removeEventListener("error", onStop);
      element.removeEventListener("emptied", onStop);
    };
  }, [animal, still]);

  if (!entry || !still) return null;
  const [x, y, side] = entry.still;
  return (
    <video
      ref={video}
      key={animal}
      className="avatar-clip"
      data-clip="idle"
      data-playing={playing ? "true" : "false"}
      muted
      autoPlay
      loop
      playsInline
      preload="auto"
      disablePictureInPicture
      disableRemotePlayback
      aria-hidden="true"
      tabIndex={-1}
      // The still's frame is `side` of the clip's, at (x, y) in it: the video is drawn 1/side as big
      // as the still's box, shifted so that frame lands on the box.
      style={{ width: `${100 / side}%`, height: `${100 / side}%`, left: `${(-x / side) * 100}%`, top: `${(-y / side) * 100}%` }}
    >
      <source src={clipSrc(animal, "idle", "mov")} type='video/quicktime; codecs="hvc1"' />
      <source src={clipSrc(animal, "idle", "webm")} type='video/webm; codecs="vp9"' />
    </video>
  );
}
