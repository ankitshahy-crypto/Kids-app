import { useCallback, useEffect, useRef, useState } from "react";
import { playEffect } from "../audio/manager";
import { cancelSpeech, hasFreshPrimedSpeech, isAbortError, playTile, playWhole, sleep } from "../audio/player";
import type { DeckWord } from "../data/deck";
import type { Settings } from "../settings";

/** Index of the letter currently sounding, or "all" while the whole word plays. */
export type ActiveLetter = number | "all" | null;

const PICTURE_BEAT_MS = 1000;
const BETWEEN_LETTERS_MS = 260;
const BEFORE_WORD_MS = 320;

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

  const begin = useCallback((cancel = true) => {
    tokenRef.current += 1;
    const token = tokenRef.current;
    abortRef.current?.abort();
    // The first run must not cancel speech. Tap-to-start speaks in that
    // gesture, and iOS ignores later speech if that utterance is cancelled
    // before the synthesizer accepts it.
    if (cancel) cancelSpeech();
    const controller = new AbortController();
    abortRef.current = controller;
    return { controller, token };
  }, []);

  const playThrough = useCallback(
    async (run: { controller: AbortController; token: number }, options: { finish?: boolean } = {}) => {
      const { controller, token } = run;
      const signal = controller.signal;
      const current = wordRef.current;
      const live = () => token === tokenRef.current && !signal.aborted;
      if (live()) {
        setRevealed(0);
        setActive(null);
      }
      try {
        await sleep(hasFreshPrimedSpeech() ? 280 : PICTURE_BEAT_MS, signal);
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
  }, [word]);

  useEffect(() => {
    if (!paused) return;
    tokenRef.current += 1;
    abortRef.current?.abort();
    cancelSpeech();
    setActive(null);
  }, [paused]);

  useEffect(() => {
    return () => {
      tokenRef.current += 1;
      abortRef.current?.abort();
      cancelSpeech();
    };
  }, []);

  const replay = useCallback(() => {
    const run = begin();
    void playThrough(run);
  }, [begin, playThrough]);

  /**
   * The card's line when it opens, started by the screen rather than a tap:
   * nothing is finished or rewarded by it, and the tap that opened the lesson
   * is left speaking so iOS keeps the voice unlocked.
   */
  const autoplay = useCallback(() => {
    const run = begin(false);
    void playThrough(run, { finish: false });
  }, [begin, playThrough]);

  const soundLetter = useCallback(
    (index: number) => {
      const current = wordRef.current;
      const letter = current.letters[index];
      if (!letter) return;
      const { controller, token } = begin();
      setActive(index);
      playEffect("pop", settingsRef.current);
      void (async () => {
        try {
          await playTile(current, letter, settingsRef.current, controller.signal);
          if (token === tokenRef.current && !controller.signal.aborted) setActive(null);
        } catch (error) {
          if (!isAbortError(error) && token === tokenRef.current) setActive(null);
        }
      })();
    },
    [begin, settingsRef],
  );

  const soundWord = useCallback(() => {
    const current = wordRef.current;
    const { controller, token } = begin();
    setActive("all");
    playEffect("celebrate", settingsRef.current);
    void (async () => {
      try {
        await playWhole(current, settingsRef.current, controller.signal);
        if (token === tokenRef.current && !controller.signal.aborted) setActive(null);
      } catch (error) {
        if (!isAbortError(error) && token === tokenRef.current) setActive(null);
      }
    })();
  }, [begin, settingsRef]);

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

  return { revealed, active, replay, autoplay, replayLetter, soundLetter, soundWord };
}
