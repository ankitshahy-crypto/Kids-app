import { useCallback, useEffect, useRef, useState } from "react";
import { playEffect } from "../audio/manager";
import { cancelSpeech, hasFreshPrimedSpeech, isAbortError, playCardLine, playTile, playWhole, sleep, warmCard } from "../audio/player";
import type { DeckWord } from "../data/deck";
import type { Settings } from "../settings";

/** Index of the letter currently sounding, or "all" while the whole word plays. */
export type ActiveLetter = number | "all" | null;

const PICTURE_BEAT_MS = 1000;
/** Before a card that opened on its own starts to speak. */
const OPENING_BEAT_MS = 450;
const BETWEEN_LETTERS_MS = 260;
const BEFORE_WORD_MS = 320;
/**
 * Under the slider, each sound gets at least this long before the next one
 * starts, and a short breath after it, so a quick slide is still heard as
 * separate sounds: "mmm", "aaa", "t", then "mat".
 */
const SLIDE_SOUND_MS = 380;
const SLIDE_GAP_MS = 70;

/** What the slider has asked for: a tile it passed, or the whole word at the end of the track. */
type SlideItem = { tile: number } | { word: true; celebrate: boolean };

export function usePlayback(
  word: DeckWord,
  settingsRef: { current: Settings },
  paused: boolean,
  onFinished?: () => void,
) {
  const [revealed, setRevealed] = useState(0);
  const [active, setActive] = useState<ActiveLetter>(null);
  const abortRef = useRef<AbortController | null>(null);
  const tokenRef = useRef(0);
  const wordRef = useRef(word);
  wordRef.current = word;
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  // Sounds the slider has passed and not yet said, in order (see slide below).
  const slideQueue = useRef<SlideItem[]>([]);
  const sliding = useRef(false);

  const begin = useCallback((cancel = true) => {
    tokenRef.current += 1;
    const token = tokenRef.current;
    abortRef.current?.abort();
    // Whatever starts now takes over from a slide that was still being said.
    slideQueue.current = [];
    sliding.current = false;
    // The first run must not cancel speech. Tap-to-start speaks in that
    // gesture, and iOS ignores later speech if that utterance is cancelled
    // before the synthesizer accepts it.
    if (cancel) cancelSpeech();
    const controller = new AbortController();
    abortRef.current = controller;
    return { controller, token };
  }, []);

  const playThrough = useCallback(
    async (run: { controller: AbortController; token: number }, options: { finish?: boolean; beatMs?: number } = {}) => {
      const { controller, token } = run;
      const signal = controller.signal;
      const current = wordRef.current;
      const live = () => token === tokenRef.current && !signal.aborted;
      if (live()) {
        setRevealed(0);
        setActive(null);
      }
      try {
        await sleep(hasFreshPrimedSpeech() ? 280 : (options.beatMs ?? PICTURE_BEAT_MS), signal);
        if (current.letterCard) {
          // A letter card has one line, "m, as in moon", said while its tile is lit. It used to be followed
          // by the word again ("m, as in moon. moon"); the word on its own is what the end of the slide says.
          if (!live()) return;
          setRevealed(current.letters.length);
          setActive(0);
          playEffect("pop", settingsRef.current);
          try {
            await playCardLine(current, settingsRef.current, signal);
          } catch (error) {
            if (isAbortError(error)) throw error;
          }
          if (!live()) return;
          setActive(null);
          if (options.finish !== false) onFinishedRef.current?.();
          return;
        }
        for (let index = 0; index < current.letters.length; index += 1) {
          if (!live()) return;
          setRevealed(index + 1);
          setActive(index);
          playEffect("pop", settingsRef.current);
          const started = Date.now();
          try {
            await playTile(current, current.letters[index], settingsRef.current, signal);
          } catch (error) {
            if (isAbortError(error)) throw error;
          }
          const remain = 450 - (Date.now() - started);
          if (remain > 0) await sleep(remain, signal);
          await sleep(BETWEEN_LETTERS_MS, signal);
        }
        if (!live()) return;
        // A Nest card's tiles are whole words of their own ("I", "a", "the"): there is no word made of them to say.
        if (current.nestCard) {
          setActive(null);
          if (options.finish !== false) onFinishedRef.current?.();
          return;
        }
        setActive("all");
        await sleep(BEFORE_WORD_MS, signal);
        try {
          await playWhole(current, settingsRef.current, signal);
        } catch (error) {
          if (isAbortError(error)) throw error;
        }
        if (!live()) return;
        setActive(null);
        if (!live() || options.finish === false) return;
        onFinishedRef.current?.();
      } catch (error) {
        // Stopped by a newer line elsewhere (not by this hook): put the tiles down.
        if (token === tokenRef.current && (!isAbortError(error) || !signal.aborted)) setActive(null);
      }
    },
    [settingsRef],
  );

  useEffect(() => {
    setRevealed(0);
    setActive(null);
    abortRef.current?.abort();
    slideQueue.current = [];
    sliding.current = false;
    // The new card's sounds are loaded now, so each starts the moment the slider reaches its tile.
    warmCard(word);
  }, [word]);

  useEffect(() => {
    if (!paused) return;
    tokenRef.current += 1;
    abortRef.current?.abort();
    // The slide that was being said is over; the next one starts fresh.
    slideQueue.current = [];
    sliding.current = false;
    cancelSpeech();
    setActive(null);
  }, [paused]);

  useEffect(() => {
    return () => {
      tokenRef.current += 1;
      abortRef.current?.abort();
      slideQueue.current = [];
      sliding.current = false;
      cancelSpeech();
    };
  }, []);

  /** The whole word, sound by sound. `finish: false` plays it as help without finishing the step. */
  const replay = useCallback(
    (finish = true) => {
      const run = begin();
      void playThrough(run, { finish });
    },
    [begin, playThrough],
  );

  /**
   * The card's line when it opens, started by the screen rather than a tap:
   * nothing is finished or rewarded by it, and the tap that opened the lesson
   * is left speaking so iOS keeps the voice unlocked.
   */
  const autoplay = useCallback(() => {
    const run = begin(false);
    // A shorter look at the picture: the card has only just appeared.
    void playThrough(run, { finish: false, beatMs: OPENING_BEAT_MS });
  }, [begin, playThrough]);

  /**
   * Say what the slider passes, in order, each sound to its end.
   *
   * Why a queue: the first phone test found that sliding under a word made no
   * letter sounds. Each tile's sound stopped the one before it, and each had
   * to be loaded first, so at a child's sliding speed every sound was stopped
   * before it began and only the whole word was heard at the end. Now the
   * sounds wait their turn: a slow slide hears each sound as the animal
   * reaches its letter, and a fast one hears them one after another, then the
   * word. The tile whose sound is playing is the one that glows.
   */
  const slide = useCallback(
    (item: SlideItem) => {
      if (sliding.current) {
        slideQueue.current.push(item);
        return;
      }
      const { controller, token } = begin();
      const signal = controller.signal;
      slideQueue.current = [item];
      sliding.current = true;
      const live = () => token === tokenRef.current && !signal.aborted;
      void (async () => {
        try {
          while (live()) {
            const next = slideQueue.current.shift();
            if (!next) break;
            const current = wordRef.current;
            if ("word" in next) {
              setActive("all");
              if (next.celebrate) playEffect("celebrate", settingsRef.current);
              try {
                await playWhole(current, settingsRef.current, signal);
              } catch (error) {
                if (isAbortError(error)) throw error;
              }
              continue;
            }
            const letter = current.letters[next.tile];
            if (!letter) continue;
            setActive(next.tile);
            playEffect("pop", settingsRef.current);
            const started = Date.now();
            try {
              await playTile(current, letter, settingsRef.current, signal);
            } catch (error) {
              if (isAbortError(error)) throw error;
            }
            const remain = SLIDE_SOUND_MS - (Date.now() - started);
            if (remain > 0) await sleep(remain, signal);
            await sleep(SLIDE_GAP_MS, signal);
          }
          if (live()) setActive(null);
        } catch (error) {
          if (!isAbortError(error) && token === tokenRef.current) setActive(null);
        } finally {
          // Only this run's own ending frees the slider; a newer line has already taken over otherwise.
          if (token === tokenRef.current) {
            sliding.current = false;
            slideQueue.current = [];
          }
        }
      })();
    },
    [begin, settingsRef],
  );

  /** The slider reached this tile. */
  const soundLetter = useCallback((index: number) => slide({ tile: index }), [slide]);

  /** The end of the track: the whole word, after the sounds still waiting. `celebrate: false` leaves out the chime. */
  const soundWord = useCallback((celebrate = true) => slide({ word: true, celebrate }), [slide]);

  /** A tapped tile: its sound at once, in place of whatever was being said. */
  const replayLetter = useCallback(
    (index: number) => {
      const current = wordRef.current;
      const { controller, token } = begin();
      setActive(index);
      playEffect("pop", settingsRef.current);
      const started = Date.now();
      void (async () => {
        try {
          const letter = current.letters[index];
          if (letter) await playTile(current, letter, settingsRef.current, controller.signal);
          const remain = 450 - (Date.now() - started);
          if (remain > 0) await sleep(remain, controller.signal);
          if (token === tokenRef.current && !controller.signal.aborted) setActive(null);
        } catch (error) {
          if (!isAbortError(error) && token === tokenRef.current) setActive(null);
        }
      })();
    },
    [begin, settingsRef],
  );

  /**
   * Stop whatever this card is saying, and put down the tiles a Play sound
   * pass had shown, so nothing is lit that the slider does not count. Called
   * when a fresh try starts (Home or a new drag) and on a step back.
   */
  const stop = useCallback(() => {
    tokenRef.current += 1;
    abortRef.current?.abort();
    slideQueue.current = [];
    sliding.current = false;
    cancelSpeech();
    setActive(null);
    setRevealed(0);
  }, []);

  return { revealed, active, replay, autoplay, replayLetter, soundLetter, soundWord, stop };
}
