import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { unlockAudio } from "../audio/manager";
import { resumeSpeech } from "../audio/player";
import type { AnimalId } from "../data/animals";
import { starterDeck, type DeckWord } from "../data/deck";
import { emptyOutfit, type Outfit } from "../data/wardrobe";
import { usePlayback } from "../hooks/usePlayback";
import { useSpeaker } from "../hooks/useSpeaker";
import type { Settings } from "../settings";
import { Illustration } from "../illustrations";
import { Hero } from "./Hero";
import { Chevron, SpeakerIcon, StarIcon } from "./icons";
import { PictureCard } from "./PictureCard";
import { SoundLabel } from "./SoundLabel";

/** Clear a pending timeout kept in a ref. */
function clearTimer(timer: { current: number | null }) {
  if (timer.current !== null) window.clearTimeout(timer.current);
  timer.current = null;
}

export function SoundItOut({
  settingsRef,
  paused,
  words = starterDeck.words,
  animal = null,
  outfit = emptyOutfit(),
  ladderStep = 1,
  saysSounds = false,
  focus,
  onFinished,
}: {
  settingsRef: { current: Settings };
  paused: boolean;
  words?: DeckWord[];
  animal?: AnimalId | null;
  outfit?: Outfit;
  ladderStep?: number;
  /**
   * A grown-up's choice: the child says each letter sound out loud. The drag
   * lights the tiles without sound and the app says only the whole word at
   * the end, for the child to check. A tapped tile and Play sound still play
   * the sounds. A letter card, which teaches a new letter, is always voiced,
   * and so is a sentence: its tiles are whole words, not letter sounds.
   */
  saysSounds?: boolean;
  /**
   * What this lesson is about, for the grown-up beside the child: "This week:
   * M and A". Shown above every card, because the first phone test asked for
   * it to be clear that a week is about its two letters.
   */
  focus?: string;
  onFinished?: (word: DeckWord) => void;
}) {
  const deck = words.length > 0 ? words : starterDeck.words;
  const [index, setIndex] = useState(0);
  const word = deck[index % deck.length];
  const finish = () => onFinished?.(word);
  const { revealed, active, replay, autoplay, replayLetter, soundLetter, soundWord, stop: stopPlayback } = usePlayback(word, settingsRef, paused, finish);
  const quiet = saysSounds && !word.letterCard && !word.sentenceId;
  const speak = useSpeaker(settingsRef);
  const [lit, setLit] = useState<boolean[]>(() => word.letters.map(() => false));
  const [litOrder, setLitOrder] = useState<number[]>([]);
  const [blended, setBlended] = useState(false);
  // The tiles slide together while the whole word plays, so the sounds are seen joining into one word.
  const [joined, setJoined] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [progress, setProgress] = useState(0.06);
  const [dragging, setDragging] = useState(false);
  /**
   * The one bar under the part being said, as a share of the track: under the letter whose sound
   * plays, under the whole word when the word is said, and otherwise where the finger or the last
   * sound left it. At rest it waits under the first tile.
   */
  const [bar, setBar] = useState<{ left: number; width: number; under: string }>({ left: 0, width: 0, under: "none" });
  const gesture = useRef<{ x: number; y: number; interactive: boolean } | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const tokenRef = useRef<HTMLDivElement | null>(null);
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);
  const draggingRef = useRef(false);
  const sounded = useRef(new Set<number>());
  const blendedPass = useRef(false);
  const rewarded = useRef(false);
  const touchHandled = useRef(false);
  // The finishing bounce ends on its own after a moment, or at once when a fresh try starts.
  const celebrationTimer = useRef<number | null>(null);

  const stopCelebrating = () => {
    clearTimer(celebrationTimer);
    setCelebrating(false);
  };

  useEffect(() => () => clearTimer(celebrationTimer), []);

  /** Where a tile sits on the track, as shares of the track's width (its left edge and its width). */
  const tileSpan = (tileIndex: number): { left: number; width: number } | null => {
    const track = trackRef.current;
    const tile = tileRefs.current[tileIndex];
    if (!track || !tile) return null;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return null;
    const box = tile.getBoundingClientRect();
    return { left: ((box.left - rect.left) / rect.width) * 100, width: (box.width / rect.width) * 100 };
  };

  /** The span from the first tile to the last: the whole word. Joined tiles have slid toward the middle. */
  const wordSpan = (): { left: number; width: number } | null => {
    const first = tileSpan(0);
    const last = tileSpan(word.letters.length - 1);
    if (!first || !last) return null;
    return { left: first.left, width: last.left + last.width - first.left };
  };

  // The bar follows the sound: under the letter being said, under the whole word while it is said. The
  // whole word is measured once the tiles have slid together (they take 0.55 s), and again as they do.
  useLayoutEffect(() => {
    if (active === "all") {
      const place = () => {
        const span = wordSpan();
        if (span) setBar({ ...span, under: "word" });
      };
      place();
      const timers = [120, 320, 600].map((ms) => window.setTimeout(place, ms));
      return () => timers.forEach((timer) => window.clearTimeout(timer));
    }
    if (typeof active === "number") {
      const span = tileSpan(active);
      if (span) setBar({ ...span, under: String(active) });
    }
    return undefined;
  }, [active, joined]);

  // A new card: the bar waits under the first tile. (Measured after the tiles are on the page.)
  useLayoutEffect(() => {
    const span = tileSpan(0);
    setBar(span ? { ...span, under: "none" } : { left: 0, width: 0, under: "none" });
  }, [word]);

  useEffect(() => {
    sounded.current = new Set();
    blendedPass.current = false;
    rewarded.current = false;
    setLit(word.letters.map(() => false));
    setLitOrder([]);
    setBlended(false);
    setJoined(false);
    clearTimer(celebrationTimer);
    setCelebrating(false);
    setProgress(0.06);
  }, [word]);

  // A letter card says its line once when it appears, so a child who cannot
  // read the button still hears the letter. Play sound says it again and
  // finishes the step. The card is marked as heard when the line starts, not
  // when the effect runs, so a cancelled effect (StrictMode) still plays it.
  const autoPlayed = useRef("");
  useEffect(() => {
    if (!word.letterCard || paused || autoPlayed.current === word.id) return undefined;
    const timer = window.setTimeout(() => {
      autoPlayed.current = word.id;
      autoplay();
    }, 200);
    return () => window.clearTimeout(timer);
  }, [word, paused, autoplay]);

  // The first word the child sounds out on their own starts with what to do. It counts as heard once it
  // has been said all the way through: cut off by a step, a tap or a new card, the next word says it again.
  // (The timer keeps StrictMode's second run of the effect from saying it twice.)
  const heardSay = useRef(false);
  useEffect(() => {
    if (!quiet || paused || heardSay.current) return undefined;
    const timer = window.setTimeout(() => {
      speak.prompt("blend-say", "Say each sound as you slide.", () => {
        heardSay.current = true;
      });
    }, 200);
    return () => window.clearTimeout(timer);
  }, [quiet, paused, speak, word]);

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
    // A new card starts quiet: the opening instruction does not run on over it.
    speak.stop();
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
    // The child says these sounds; the app waits for the whole word.
    if (!quiet) fresh.forEach((item) => soundLetter(item));
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
    // Keep the whole hero on the track: its center stops half a token from each end.
    const half = (tokenRef.current?.offsetWidth ?? 72) / 2;
    const clamped = Math.min(rect.right - half, Math.max(rect.left + half, clientX));
    setProgress((clamped - rect.left) / rect.width);
    // Between sounds the bar rides under the finger, the width of a tile.
    if (active === null && !blendedPass.current) {
      const width = tileSpan(0)?.width ?? 20;
      setBar({ left: Math.min(100 - width, Math.max(0, ((clamped - rect.left) / rect.width) * 100 - width / 2)), width, under: "finger" });
    }
    light(tilesCrossed(fromX, clientX));
    if (clientX >= rect.right - 28) finishWord();
  };

  /** The end of the track, once every tile has been passed: the whole word, and the step is done. */
  const finishWord = () => {
    const allSounded = word.letters.every((_, tileIndex) => sounded.current.has(tileIndex));
    if (!allSounded || blendedPass.current) return;
    blendedPass.current = true;
    setBlended(true);
    // Single letters and sound units join; a sentence's word chunks wrap onto rows and stay put.
    setJoined(!word.sentenceId);
    // The chime, the bounce and the reward are for the card's first finish. Finishing it again
    // (a step back and forward, or a new drag) says the word and joins the tiles, and that is all.
    const first = !rewarded.current;
    if (first) {
      stopCelebrating();
      setCelebrating(true);
      celebrationTimer.current = window.setTimeout(() => {
        celebrationTimer.current = null;
        setCelebrating(false);
      }, 900);
    }
    soundWord(first);
    if (first) {
      rewarded.current = true;
      onFinished?.(word);
    }
  };

  /** Put the hero over a tile, or at the end of the track, for a step made without a finger. */
  const placeToken = (at: number | "end") => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return;
    const half = (tokenRef.current?.offsetWidth ?? 72) / 2;
    const tile = at === "end" ? null : tileRefs.current[at]?.getBoundingClientRect();
    const x = at === "end" ? rect.right : tile ? tile.left + tile.width / 2 : rect.left + ((at + 0.5) / word.letters.length) * rect.width;
    const clamped = Math.min(rect.right - half, Math.max(rect.left + half, x));
    setProgress((clamped - rect.left) / rect.width);
  };

  /**
   * A pass along the track starts from the beginning: separate, unlit tiles,
   * nothing sounded yet, and the slider back at "0 of 3", so a second try
   * lights up (and, for a screen reader, counts up) like the first.
   */
  const startPass = () => {
    sounded.current = new Set();
    blendedPass.current = false;
    setLit(word.letters.map(() => false));
    setLitOrder([]);
    setBlended(false);
    setJoined(false);
    stopCelebrating();
    // Nothing keeps talking over this try: not the last one's sounds, a Play sound pass, or the opening instruction.
    stopPlayback();
    speak.stop();
  };

  /**
   * One step back, for a keyboard's left arrow or a swipe down. From the end
   * of the track it is back to the last tile, with the word to hear again on
   * the next step forward; from a tile it is that tile unlit and unsounded,
   * without a sound.
   */
  const stepBack = () => {
    const last = litOrder[litOrder.length - 1];
    // Once the child is on the track, the opening instruction has done its job.
    speak.stop();
    // From the end of the track: back to the last tile. The word that was still being said stops.
    if (blendedPass.current) {
      stopPlayback();
      blendedPass.current = false;
      setBlended(false);
      setJoined(false);
      stopCelebrating();
      if (last === undefined) setProgress(0.06);
      else placeToken(last);
      return;
    }
    if (last === undefined) {
      // Nothing to step back. A letter card is left as it is: its one tile is shown by the card's own line,
      // and there is nothing to count. On a word, the app's Play sound pass stops and its tiles go down, as a
      // step forward would do, so the tiles match the "0 of 3" VoiceOver reads.
      if (!word.letterCard && (revealed > 0 || active !== null)) stopPlayback();
      return;
    }
    // What was still being said (a letter, a Play sound pass) stops, and Play sound's tiles go down, so
    // nothing talks over or shows more than what VoiceOver reads for the step.
    stopPlayback();
    sounded.current.delete(last);
    setLit((current) => current.map((on, tileIndex) => (tileIndex === last ? false : on)));
    setLitOrder((current) => current.slice(0, -1));
    const before = litOrder[litOrder.length - 2];
    if (before === undefined) setProgress(0.06);
    else placeToken(before);
  };

  /**
   * The slider without a finger: a keyboard's right arrow, or VoiceOver and
   * Switch Control adjusting it (WebKit turns their increment on a horizontal
   * slider into the same arrow key). Each step is the next tile, in order; the
   * step after the last tile is the end of the track. Like any slider, it
   * stops at the end: another step there says the word again. A fresh try is
   * a step back, Home, or a new drag.
   */
  const stepForward = (toEnd = false) => {
    unlockAudio();
    resumeSpeech();
    // Once the child is on the track, the opening instruction has done its job: it stops, rather than
    // talking over what VoiceOver reads for the step.
    speak.stop();
    if (blendedPass.current) {
      soundWord(false);
      return;
    }
    // A Play sound pass stops, and the tiles it showed go down (still going or done), so the tiles lit are
    // the ones the slider counts, as on a new drag.
    if (revealed > 0 || active !== null) stopPlayback();
    const remaining = word.letters.map((_, tileIndex) => tileIndex).filter((tileIndex) => !sounded.current.has(tileIndex));
    if (remaining.length > 0 && !toEnd) {
      light([remaining[0]]);
      placeToken(remaining[0]);
      return;
    }
    if (remaining.length > 0) light(remaining);
    placeToken("end");
    finishWord();
  };

  /** Home: back to the start of the track, every tile unlit, for a fresh try. */
  const startOver = () => {
    startPass();
    setProgress(0.06);
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
    startPass();
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

  // The slider's value: the tiles passed on this pass, and one more for the whole word at the end of the track.
  const litCount = lit.filter(Boolean).length;

  const tapLetter = (letterIndex: number) => {
    if (!lit[letterIndex] && letterIndex >= revealed && active !== "all") return;
    unlockAudio();
    resumeSpeech();
    // A tap wants this sound now, not after the ones a slide left waiting.
    replayLetter(letterIndex);
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
      data-says-sounds={quiet ? "child" : "app"}
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
      {/* What the lesson is about, for the grown-up, small and out of the way of the word. */}
      {focus ? (
        <span className="lesson-focus" data-lesson-focus>
          {focus}
        </span>
      ) : null}
      {/* The word is the page: its picture, when it has one, sits small above it. A word with no drawing of
          its own ("am", "sat") has nothing above it; the child's animal waits at the edge of the track and
          says the word once it has been read. (The card used to borrow another word's picture, then
          showed the animal big, above a small word.) */}
      {word.photoSrc || word.glyph || word.illustration ? (
        <PictureCard label={word.word}>
          {word.photoSrc ? (
            <img className="photo" src={word.photoSrc} alt="" />
          ) : word.glyph ? (
            <span className="letter-glyph" data-glyph={word.glyph} data-glyph-long={word.glyph.length > 1 ? "true" : undefined} aria-hidden="true">
              {word.glyph}
              <small>{word.word}</small>
            </span>
          ) : word.illustration ? (
            <Illustration name={word.illustration} />
          ) : null}
          {word.letterCard && !word.glyph ? <LetterCaption word={word} /> : null}
        </PictureCard>
      ) : null}
      <SoundLabel />
      <div
        className={`blend${celebrating ? " is-celebrating" : ""}${dragging ? " is-dragging" : ""}${joined ? " is-joined" : ""}`}
        data-lit-order={litOrder.join(",")}
        data-joined={joined ? "true" : "false"}
      >
        <div className={`letters${word.sentenceId ? " chunks" : ""}`} role="group" aria-label={word.word}>
          {word.letters.map((letter, letterIndex) => {
            const shown = lit[letterIndex] || letterIndex < revealed || active === "all";
            const highlighted = shown && (active === "all" || active === letterIndex);
            const sounding = active === letterIndex;
            const chunk = Boolean(letter.wordId);
            // A sound unit (sh, a-e) is one tile with two or three letters on it.
            const unit = !chunk && letter.char.length > 1;
            // A word is shown the way a child will meet it in a book: in small letters ("mat", not "MAT").
            // A letter card shows the big and the little letter together ("Mm"); a sound unit is small (sh).
            const single = letter.char.length === 1;
            const label = chunk ? letter.char : word.letterCard && single ? `${letter.char.toUpperCase()}${letter.char.toLowerCase()}` : letter.char.toLowerCase();
            // How many gaps this tile crosses toward the middle when the word joins: +1.5, +0.5, -0.5, -1.5 for four tiles.
            const joinSteps = (word.letters.length - 1) / 2 - letterIndex;
            return (
              <div
                key={`${word.id}-${letterIndex}`}
                ref={(element) => {
                  tileRefs.current[letterIndex] = element;
                }}
                className={`tile-wrap${chunk ? " is-chunk" : ""}${unit ? " is-unit" : ""}${letter.silent ? " is-silent" : ""}${shown ? " is-lit" : " is-dim"}${highlighted ? " is-active" : ""}`}
                style={{ "--join-steps": joinSteps } as React.CSSProperties}
                data-letter={letterIndex}
                data-lit={shown ? "true" : "false"}
                data-sound={chunk ? undefined : letter.silent ? "silent" : letter.phoneme}
              >
                {sounding && !letter.silent ? <SoundWaves /> : null}
                <button
                  type="button"
                  className="tile"
                  disabled={!shown}
                  aria-label={chunk ? letter.char : letter.silent ? `silent ${letter.char}` : `${letter.char.toUpperCase()} sound`}
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
                  {/* The letter is on its tile from the start, pale until the slider reaches it. It used to be
                      a blank dot until then, so there was no letter to slide under. */}
                  {label}
                </button>
              </div>
            );
          })}
        </div>
        <div
          ref={trackRef}
          className="blend-track"
          role="slider"
          // Named for what it does, not a gesture: a finger drags, a keyboard steps, and VoiceOver adds its own
          // "adjustable, swipe up or down" hint to any slider.
          aria-label={word.sentenceId ? "Slide across the words" : "Slide across the letters"}
          aria-valuemin={0}
          aria-valuemax={word.letters.length + 1}
          aria-valuenow={blended ? word.letters.length + 1 : litCount}
          aria-valuetext={
            blended
              ? word.word
              : litCount < word.letters.length
                ? `${litCount} of ${word.letters.length}`
                : `${litCount} of ${word.letters.length}. One more for ${word.letterCard ? word.word : word.sentenceId ? "the sentence" : "the word"}.`
          }
          aria-orientation="horizontal"
          tabIndex={0}
          style={{ touchAction: "none" }}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "PageUp") {
              event.preventDefault();
              stepForward();
            } else if (event.key === "ArrowLeft" || event.key === "ArrowDown" || event.key === "PageDown") {
              event.preventDefault();
              stepBack();
            } else if (event.key === "End") {
              event.preventDefault();
              stepForward(true);
            } else if (event.key === "Home") {
              event.preventDefault();
              startOver();
            }
          }}
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
          {/* The one bar: under the letter being said, under the whole word when it is said. The finger
              drags it along the track. */}
          <div
            className="blend-bar"
            ref={tokenRef}
            style={{ "--bar-left": `${bar.left}%`, "--bar-width": `${bar.width}%`, "--blend-at": `${progress * 100}%` } as CSSProperties}
            data-blend-token
            data-under={bar.under}
            data-said={active !== null ? "true" : "false"}
            aria-hidden="true"
          />
          {/* The child's animal waits at the edge of the track until the word is said, then comes in and says it. */}
          <div className="blend-animal" data-word-teller={blended ? "said" : "waiting"} aria-hidden="true">
            {animal ? <Hero animal={animal} outfit={outfit} /> : <StarIcon />}
            {blended ? <span className="word-bubble">{word.word}</span> : null}
          </div>
        </div>
      </div>
      <p className="chunk-strip chunk-strip-word" data-word-index={index % deck.length} data-word-count={deck.length}>
        {word.letterCard ? "Letter" : "Word"} {(index % deck.length) + 1} of {deck.length}
      </p>
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
            // The letters start at once; the opening instruction does not run on into them.
            speak.stop();
            // When the child says the sounds, Play sound is help: it plays them all, and only the child's own slide finishes the word.
            replay(!quiet);
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

/**
 * The picture word under a letter card's drawing, with the letter marked:
 * "moon" with its m in color, "fox" with its x. A drawing alone left a
 * grown-up guessing what word it stood for (a pin? a needle?).
 */
function LetterCaption({ word }: { word: DeckWord }) {
  const unit = word.letters[0]?.char.toLowerCase() ?? "";
  const text = word.word;
  // A magic-e unit is written a-e: mark the vowel and the final e (c-a-k-e). Others are found as they are spelled.
  const split = /^[aeiou]-e$/.test(unit) ? null : text.toLowerCase().indexOf(unit);
  if (split === null) {
    const vowel = text.toLowerCase().indexOf(unit[0]);
    return (
      <span className="letter-caption" data-letter-caption={text}>
        {[...text].map((char, at) => (at === vowel || at === text.length - 1 ? <b key={at}>{char}</b> : <span key={at}>{char}</span>))}
      </span>
    );
  }
  if (split < 0) {
    return (
      <span className="letter-caption" data-letter-caption={text}>
        {text}
      </span>
    );
  }
  return (
    <span className="letter-caption" data-letter-caption={text}>
      {text.slice(0, split)}
      <b>{text.slice(split, split + unit.length)}</b>
      {text.slice(split + unit.length)}
    </span>
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
