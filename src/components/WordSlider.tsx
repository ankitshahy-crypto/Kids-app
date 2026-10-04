import { useEffect, useMemo, useRef, useState } from "react";
import { unlockAudio } from "../audio/manager";
import { resumeSpeech } from "../audio/player";
import type { AnimalId } from "../data/animals";
import type { DeckWord } from "../data/deck";
import { soundLength } from "../data/soundLength";
import { made, phonemeOf } from "../data/wordBuild";
import type { Outfit } from "../data/wardrobe";
import { usePlayback } from "../hooks/usePlayback";
import type { Settings } from "../settings";
import { Hero } from "./Hero";

/**
 * One word from a story line on its own small slider: the same tiles and the
 * same animal on a track as a lesson, so sliding in a book is the move the
 * child already knows. With `quiet` the child says the sounds and the app
 * says only the whole word at the end.
 */
export function WordSlider({
  word,
  animal,
  outfit,
  settingsRef,
  quiet,
  onDone,
}: {
  word: string;
  animal: AnimalId;
  outfit: Outfit;
  settingsRef: { current: Settings };
  quiet: boolean;
  /** The slide reached the end with every sound passed. `voiced`: the app said the sounds. */
  onDone: (voiced: boolean) => void;
}) {
  const card = useMemo((): DeckWord => {
    const text = word.toLowerCase();
    try {
      return made(text, text);
    } catch {
      // A spelling the sound list does not split: one tile per letter.
      return { id: text, word: text, letters: [...text].map((char) => ({ char, phoneme: phonemeOf(char) })) };
    }
  }, [word]);
  const { active, soundLetter, soundWord, stop } = usePlayback(card, settingsRef, false);
  const [lit, setLit] = useState<boolean[]>(() => card.letters.map(() => false));
  const [progress, setProgress] = useState(0.06);
  const [joined, setJoined] = useState(false);
  const sounded = useRef(new Set<number>());
  const finished = useRef(false);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const tokenRef = useRef<HTMLDivElement | null>(null);
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    sounded.current = new Set();
    finished.current = false;
    setLit(card.letters.map(() => false));
    setProgress(0.06);
    setJoined(false);
  }, [card]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    const block = (event: TouchEvent) => {
      if (dragging.current) event.preventDefault();
    };
    track.addEventListener("touchmove", block, { passive: false });
    return () => track.removeEventListener("touchmove", block);
  }, []);

  const light = (indexes: number[]) => {
    const fresh = indexes.filter((item) => !sounded.current.has(item));
    if (fresh.length === 0) return;
    fresh.forEach((item) => sounded.current.add(item));
    setLit((current) => current.map((on, at) => on || fresh.includes(at)));
    if (!quiet) fresh.forEach((item) => soundLetter(item));
  };

  const finish = () => {
    if (finished.current || !card.letters.every((_, at) => sounded.current.has(at))) return;
    finished.current = true;
    setJoined(true);
    soundWord(true);
    onDone(!quiet);
  };

  const crossed = (fromX: number, toX: number) => {
    const left = Math.min(fromX, toX);
    const right = Math.max(fromX, toX);
    const hits: number[] = [];
    tileRefs.current.forEach((element, at) => {
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      if ((center >= left && center <= right) || (toX >= rect.left && toX <= rect.right)) hits.push(at);
    });
    return hits.sort((a, b) => (toX >= fromX ? a - b : b - a));
  };

  const move = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return;
    const half = (tokenRef.current?.offsetWidth ?? 56) / 2;
    const clamped = Math.min(rect.right - half, Math.max(rect.left + half, clientX));
    setProgress((clamped - rect.left) / rect.width);
    light(crossed(lastX.current, clientX));
    lastX.current = clientX;
    if (clientX >= rect.right - 24) finish();
  };

  /** A fresh try: the tiles go down and the animal goes back to the start. */
  const restart = () => {
    stop();
    sounded.current = new Set();
    finished.current = false;
    setLit(card.letters.map(() => false));
    setJoined(false);
  };

  const step = (toEnd = false) => {
    unlockAudio();
    resumeSpeech();
    if (finished.current) {
      soundWord(false);
      return;
    }
    const remaining = card.letters.map((_, at) => at).filter((at) => !sounded.current.has(at));
    if (remaining.length > 0 && !toEnd) {
      light([remaining[0]]);
      const track = trackRef.current?.getBoundingClientRect();
      const tile = tileRefs.current[remaining[0]]?.getBoundingClientRect();
      if (track && tile && track.width > 0) setProgress((tile.left + tile.width / 2 - track.left) / track.width);
      return;
    }
    light(remaining);
    setProgress(0.94);
    finish();
  };

  const count = lit.filter(Boolean).length;
  return (
    <div className={`blend story-slider${joined ? " is-joined" : ""}`} data-story-slider={card.word} data-joined={joined ? "true" : "false"}>
      <div className="letters" role="group" aria-label={card.word}>
        {card.letters.map((tile, at) => {
          const length = soundLength(tile);
          const shown = lit[at];
          return (
            <div
              key={`${card.id}-${at}`}
              ref={(element) => {
                tileRefs.current[at] = element;
              }}
              className={`tile-wrap${tile.char.length > 1 ? " is-unit" : ""}${tile.silent ? " is-silent" : ""}${shown ? " is-lit" : " is-dim"}${active === at || active === "all" ? " is-active" : ""}${length ? ` is-${length}` : ""}`}
              style={{ "--join-steps": (card.letters.length - 1) / 2 - at } as React.CSSProperties}
              data-letter={at}
              data-lit={shown ? "true" : "false"}
              data-stretch={length ?? undefined}
            >
              <span className="tile" aria-hidden="true">
                {tile.char}
              </span>
            </div>
          );
        })}
      </div>
      <div
        ref={trackRef}
        className="blend-track"
        role="slider"
        aria-label="Slide across the letters"
        aria-valuemin={0}
        aria-valuemax={card.letters.length + 1}
        aria-valuenow={joined ? card.letters.length + 1 : count}
        aria-valuetext={joined ? card.word : `${count} of ${card.letters.length}`}
        aria-orientation="horizontal"
        tabIndex={0}
        style={{ touchAction: "none" }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowUp") {
            event.preventDefault();
            step();
          } else if (event.key === "End") {
            event.preventDefault();
            step(true);
          } else if (event.key === "Home") {
            event.preventDefault();
            restart();
            setProgress(0.06);
          }
        }}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          unlockAudio();
          resumeSpeech();
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            // The pointer can end before capture.
          }
          if (finished.current) restart();
          dragging.current = true;
          lastX.current = event.clientX;
          move(event.clientX);
        }}
        onPointerMove={(event) => {
          if (!dragging.current) return;
          event.preventDefault();
          move(event.clientX);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
      >
        <svg className="blend-arrow" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
          <line x1="2" y1="12" x2="90" y2="12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path d="M86 5 L97 12 L86 19" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="blend-token" ref={tokenRef} style={{ left: `${progress * 100}%` }} data-blend-token>
          {quiet && !joined ? (
            <span className="say-cue" data-say-cue aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          ) : null}
          <Hero animal={animal} outfit={outfit} />
        </div>
      </div>
    </div>
  );
}
