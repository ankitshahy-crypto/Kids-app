import { useCallback, useEffect, useRef, useState } from "react";
import { playEffect } from "../audio/manager";
import { cancelSpeech, isAbortError, playLetter, playWord, sleep } from "../audio/player";
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
  const wordRef = useRef(word);
  wordRef.current = word;
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  const begin = useCallback((cancel = true) => {
    abortRef.current?.abort();
    // The first run must not cancel speech. Tap-to-start queues a silent
    // utterance in the same gesture, and iOS ignores later speech if that
    // utterance is cancelled before the synthesizer accepts it.
    if (cancel) cancelSpeech();
    const controller = new AbortController();
    abortRef.current = controller;
    return controller;
  }, []);

  const playThrough = useCallback(
    async (controller: AbortController) => {
      const signal = controller.signal;
      const current = wordRef.current;
      setRevealed(0);
      setActive(null);
      try {
        await sleep(PICTURE_BEAT_MS, signal);
        for (let index = 0; index < current.letters.length; index += 1) {
          setRevealed(index + 1);
          setActive(index);
          playEffect("pop", settingsRef.current);
          try {
            await playLetter(current.letters[index], settingsRef.current, signal);
          } catch (error) {
            if (isAbortError(error)) throw error;
          }
          await sleep(BETWEEN_LETTERS_MS, signal);
        }
        setActive("all");
        await sleep(BEFORE_WORD_MS, signal);
        try {
          await playWord(current, settingsRef.current, signal);
        } catch (error) {
          if (isAbortError(error)) throw error;
        }
        if (signal.aborted) return;
        setActive(null);
        onFinishedRef.current?.();
      } catch (error) {
        if (!isAbortError(error)) setActive(null);
      }
    },
    [settingsRef],
  );

  useEffect(() => {
    const controller = begin(false);
    void playThrough(controller);
    return () => {
      controller.abort();
      cancelSpeech();
    };
  }, [word, begin, playThrough]);

  useEffect(() => {
    if (!paused) return;
    abortRef.current?.abort();
    cancelSpeech();
    setActive(null);
  }, [paused]);

  const replay = useCallback(() => {
    const controller = begin();
    void playThrough(controller);
  }, [begin, playThrough]);

  const replayLetter = useCallback(
    (index: number) => {
      const current = wordRef.current;
      const controller = begin();
      setRevealed(current.letters.length);
      setActive(index);
      playEffect("pop", settingsRef.current);
      void (async () => {
        try {
          await playLetter(current.letters[index], settingsRef.current, controller.signal);
          if (!controller.signal.aborted) setActive(null);
        } catch (error) {
          if (!isAbortError(error)) setActive(null);
        }
      })();
    },
    [begin, settingsRef],
  );

  return { revealed, active, replay, replayLetter };
}
