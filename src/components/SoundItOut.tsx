import { useEffect, useRef, useState } from "react";
import { unlockAudio } from "../audio/manager";
import { resumeSpeech } from "../audio/player";
import type { AnimalId } from "../data/animals";
import { starterDeck, type DeckWord } from "../data/deck";
import { emptyOutfit, type Outfit } from "../data/wardrobe";
import { usePlayback } from "../hooks/usePlayback";
import type { Settings } from "../settings";
import { Illustration } from "../illustrations";
import { Hero } from "./Hero";
import { Chevron, SpeakerIcon, StarIcon } from "./icons";
import { PictureCard } from "./PictureCard";
import { SoundLabel } from "./SoundLabel";

export function SoundItOut({
  settingsRef,
  paused,
  words = starterDeck.words,
  animal = null,
  outfit = emptyOutfit(),
  ladderStep = 1,
  onFinished,
}: {
  settingsRef: { current: Settings };
  paused: boolean;
  words?: DeckWord[];
  animal?: AnimalId | null;
  outfit?: Outfit;
  ladderStep?: number;
  onFinished?: (word: DeckWord) => void;
}) {
  const deck = words.length > 0 ? words : starterDeck.words;
  const [index, setIndex] = useState(0);
  const word = deck[index % deck.length];
  const finish = () => onFinished?.(word);
  const { revealed, active, replay, soundLetter, soundWord } = usePlayback(word, settingsRef, paused, finish);
  const [lit, setLit] = useState<boolean[]>(() => word.letters.map(() => false));
  const [litOrder, setLitOrder] = useState<number[]>([]);
  const [blended, setBlended] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [progress, setProgress] = useState(0.06);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<{ x: number; y: number; interactive: boolean } | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);
  const draggingRef = useRef(false);
  const sounded = useRef(new Set<number>());
  const blendedPass = useRef(false);
  const rewarded = useRef(false);
  const touchHandled = useRef(false);

  useEffect(() => {
    sounded.current = new Set();
    blendedPass.current = false;
    rewarded.current = false;
    setLit(word.letters.map(() => false));
    setLitOrder([]);
    setBlended(false);
    setCelebrating(false);
    setProgress(0.06);
  }, [word]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const block = (event: TouchEvent) => {
      if (draggingRef.current) event.preventDefault();
    };
    track.addEventListener("touchmove", block, { passive: false });
    return () => track.removeEventListener("touchmove", block);
  }, [word]);

  const go = (direction: 1 | -1) => {
    resumeSpeech();
    setIndex((current) => (current + direction + deck.length) % deck.length);
  };

  const light = (indexes: number[]) => {
    const fresh = indexes.filter((item) => !sounded.current.has(item));
    if (fresh.length === 0) return;
    fresh.forEach((item) => sounded.current.add(item));
    setLit((current) => {
      const next = current.slice();
      fresh.forEach((item) => {
        next[item] = true;
      });
      return next;
    });
    setLitOrder((current) => {
      const next = current.slice();
      fresh.forEach((item) => {
        if (!next.includes(item)) next.push(item);
      });
      return next;
    });
    fresh.forEach((item) => soundLetter(item));
  };

  const tilesCrossed = (fromX: number, toX: number) => {
    const left = Math.min(fromX, toX);
    const right = Math.max(fromX, toX);
    const hits: number[] = [];
    tileRefs.current.forEach((element, tileIndex) => {
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const inside = toX >= rect.left && toX <= rect.right;
      if ((center >= left && center <= right) || inside) hits.push(tileIndex);
    });
    const movingRight = toX >= fromX;
    return hits.sort((a, b) => (movingRight ? a - b : b - a));
  };

  const moveToken = (clientX: number, fromX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return;
    const clamped = Math.min(rect.right - 8, Math.max(rect.left + 8, clientX));
    setProgress((clamped - rect.left) / rect.width);
    light(tilesCrossed(fromX, clientX));
    const allSounded = word.letters.every((_, tileIndex) => sounded.current.has(tileIndex));
    if (clientX >= rect.right - 28 && allSounded && !blendedPass.current) {
      blendedPass.current = true;
      setBlended(true);
      setCelebrating(true);
      window.setTimeout(() => setCelebrating(false), 900);
      soundWord();
      if (!rewarded.current) {
        rewarded.current = true;
        onFinished?.(word);
      }
    }
  };

  const onTrackDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const track = event.currentTarget;
    try {
      track.setPointerCapture(event.pointerId);
    } catch {
      // The pointer can end before capture if the browser cancels the gesture.
    }
    draggingRef.current = true;
    setDragging(true);
    sounded.current = new Set();
    blendedPass.current = false;
    unlockAudio();
    resumeSpeech();
    moveToken(event.clientX, event.clientX);
  };

  const onTrackMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    event.preventDefault();
    const previous = Number(trackRef.current?.dataset.lastX ?? event.clientX);
    if (trackRef.current) trackRef.current.dataset.lastX = String(event.clientX);
    moveToken(event.clientX, previous);
  };

  const onTrackUp = (event: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const tapLetter = (letterIndex: number) => {
    if (!lit[letterIndex] && letterIndex >= revealed && active !== "all") return;
    unlockAudio();
    resumeSpeech();
    soundLetter(letterIndex);
  };

  return (
    <div
      className="activity"
      data-word={word.id}
      data-letter-card={word.letterCard ? "true" : "false"}
      data-ladder-step={ladderStep}
      data-sentence={word.sentenceId ? "true" : "false"}
      data-revealed={Math.max(revealed, lit.filter(Boolean).length)}
      data-active={active === null ? "" : String(active)}
      data-blended={blended ? "true" : "false"}
      onPointerDown={(event) => {
        const target = event.target as HTMLElement;
        gesture.current = {
          x: event.clientX,
          y: event.clientY,
          interactive: Boolean(target.closest("button, .blend-track")),
        };
      }}
      onPointerUp={(event) => {
        const start = gesture.current;
        gesture.current = null;
        if (!start || start.interactive) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
        go(dx < 0 ? 1 : -1);
      }}
      onPointerCancel={() => {
        gesture.current = null;
      }}
    >
      <PictureCard label={word.word}>
        {word.photoSrc ? (
          <img className="photo" src={word.photoSrc} alt="" />
        ) : word.glyph ? (
          <span className="letter-glyph" data-glyph={word.glyph} aria-hidden="true">
            {word.glyph}
            <small>{word.word}</small>
          </span>
        ) : (
          <Illustration name={word.illustration} />
        )}
      </PictureCard>
      <SoundLabel />
      <div className={`blend${celebrating ? " is-celebrating" : ""}${dragging ? " is-dragging" : ""}`} data-lit-order={litOrder.join(",")}>
        <div className={`letters${word.sentenceId ? " chunks" : ""}`} role="group" aria-label={word.word}>
          {word.letters.map((letter, letterIndex) => {
            const shown = lit[letterIndex] || letterIndex < revealed || active === "all";
            const highlighted = shown && (active === "all" || active === letterIndex);
            const sounding = active === letterIndex;
            const chunk = Boolean(letter.wordId);
            const label = chunk ? letter.char : letter.char.toUpperCase();
            return (
              <div
                key={`${word.id}-${letterIndex}`}
                ref={(element) => {
                  tileRefs.current[letterIndex] = element;
                }}
                className={`tile-wrap${chunk ? " is-chunk" : ""}${shown ? " is-lit" : " is-dim"}${highlighted ? " is-active" : ""}`}
                data-letter={letterIndex}
                data-lit={shown ? "true" : "false"}
              >
                {sounding ? <SoundWaves /> : null}
                <button
                  type="button"
                  className="tile"
                  disabled={!shown}
                  aria-label={chunk ? letter.char : `${letter.char.toUpperCase()} sound`}
                  onPointerDown={(event) => event.stopPropagation()}
                  onPointerUp={(event) => {
                    if (event.pointerType === "mouse" || !shown) return;
                    touchHandled.current = true;
                    tapLetter(letterIndex);
                  }}
                  onClick={() => {
                    if (touchHandled.current) {
                      touchHandled.current = false;
                      return;
                    }
                    tapLetter(letterIndex);
                  }}
                >
                  {shown ? label : <span className="tile-mark" />}
                </button>
              </div>
            );
          })}
        </div>
        <div
          ref={trackRef}
          className="blend-track"
          role="slider"
          aria-label={word.sentenceId ? "Drag across the words" : "Drag across the letters"}
          aria-valuemin={0}
          aria-valuemax={word.letters.length}
          aria-valuenow={lit.filter(Boolean).length}
          aria-valuetext={blended ? word.word : "Drag from left to right"}
          style={{ touchAction: "none" }}
          onPointerDown={(event) => {
            if (trackRef.current) trackRef.current.dataset.lastX = String(event.clientX);
            onTrackDown(event);
          }}
          onPointerMove={onTrackMove}
          onPointerUp={onTrackUp}
          onPointerCancel={onTrackUp}
        >
          <svg className="blend-arrow" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
            <line x1="2" y1="12" x2="90" y2="12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            <path d="M86 5 L97 12 L86 19" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="blend-token" style={{ left: `${progress * 100}%` }} data-blend-token>
            {animal ? <Hero animal={animal} outfit={outfit} /> : <StarIcon />}
          </div>
        </div>
      </div>
      <div className="controls">
        <button type="button" className="nav-button" aria-label="Previous word" onClick={() => go(-1)}>
          <Chevron direction="left" />
        </button>
        <button
          type="button"
          className="play-button"
          onClick={() => {
            unlockAudio();
            resumeSpeech();
            replay();
          }}
        >
          <span className="play-icon" aria-hidden="true">
            <SpeakerIcon />
          </span>
          <span>Play sound</span>
        </button>
        <button type="button" className="nav-button" aria-label="Next word" onClick={() => go(1)}>
          <Chevron direction="right" />
        </button>
      </div>
    </div>
  );
}

function SoundWaves() {
  return (
    <>
      <svg className="wave wave-left" viewBox="0 0 18 36" aria-hidden="true">
        <path d="M16 6c-6 4-6 20 0 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M10 12c-4 2.5-4 9 0 12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <svg className="wave wave-right" viewBox="0 0 18 36" aria-hidden="true">
        <path d="M2 6c6 4 6 20 0 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M8 12c4 2.5 4 9 0 12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </>
  );
}
