import { useRef, useState } from "react";
import { unlockAudio } from "../audio/manager";
import { resumeSpeech } from "../audio/player";
import { starterDeck, type DeckWord } from "../data/deck";
import { usePlayback } from "../hooks/usePlayback";
import type { Settings } from "../settings";
import { Illustration } from "../illustrations";
import { Chevron, SpeakerIcon } from "./icons";
import { PictureCard } from "./PictureCard";
import { SoundLabel } from "./SoundLabel";

export function SoundItOut({
  settingsRef,
  paused,
  words = starterDeck.words,
  onFinished,
}: {
  settingsRef: { current: Settings };
  paused: boolean;
  words?: DeckWord[];
  onFinished?: () => void;
}) {
  const deck = words.length > 0 ? words : starterDeck.words;
  const [index, setIndex] = useState(0);
  const word = deck[index % deck.length];
  const { revealed, active, replay, replayLetter } = usePlayback(word, settingsRef, paused, onFinished);
  const gesture = useRef<{ x: number; y: number; interactive: boolean } | null>(null);
  const touchHandled = useRef(false);

  const tapLetter = (letterIndex: number) => {
    unlockAudio();
    resumeSpeech();
    replayLetter(letterIndex);
  };

  const go = (direction: 1 | -1) => {
    resumeSpeech();
    setIndex((current) => (current + direction + deck.length) % deck.length);
  };

  return (
    <div
      className="activity"
      data-word={word.id}
      data-revealed={revealed}
      data-active={active === null ? "" : String(active)}
      onPointerDown={(event) => {
        const target = event.target as HTMLElement;
        gesture.current = {
          x: event.clientX,
          y: event.clientY,
          interactive: Boolean(target.closest("button")),
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
        ) : (
          <Illustration name={word.illustration} />
        )}
      </PictureCard>
      <SoundLabel />
      <div className="letters" role="group" aria-label={word.word}>
        {word.letters.map((letter, letterIndex) => {
          const highlighted = active === "all" || active === letterIndex;
          const sounding = active === letterIndex;
          return (
            <div
              key={`${word.id}-${letterIndex}`}
              className={`tile-wrap${highlighted ? " is-active" : ""}`}
              data-letter={letterIndex}
            >
              {sounding ? <SoundWaves /> : null}
              <button
                type="button"
                className="tile"
                aria-label={`${letter.char.toUpperCase()} sound`}
                onPointerDown={(event) => event.stopPropagation()}
                onPointerUp={(event) => {
                  if (event.pointerType === "mouse") return;
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
                {letter.char.toUpperCase()}
              </button>
            </div>
          );
        })}
      </div>
      <div className="controls">
        <button type="button" className="nav-button" aria-label="Previous word" onClick={() => go(-1)}>
          <Chevron direction="left" />
        </button>
        <button
          type="button"
          className="play-button"
          onClick={() => {
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
