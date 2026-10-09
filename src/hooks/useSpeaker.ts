import { useEffect, useMemo, useRef } from "react";
import { playColor, playLine, playNumber, playPrompt, playWordId, type Cue } from "../audio/player";
import type { Settings } from "../settings";

/**
 * One voice per activity. Each call stops whatever was still being said, so
 * a tap always answers with its own sound, and leaving the screen goes quiet.
 * `line` says an instruction and its target as one line ("Tap the color you
 * hear." then "orange"), which "Hear again" then repeats whole.
 */
export function useSpeaker(settingsRef: { current: Settings }) {
  const playRef = useRef<AbortController | null>(null);
  /** The screen has closed: a line stopped by that tells no one. */
  const gone = useRef(false);
  useEffect(() => {
    gone.current = false;
    return () => {
      gone.current = true;
      playRef.current?.abort();
    };
  }, []);
  return useMemo(() => {
    const play = (run: (settings: Settings, signal: AbortSignal) => Promise<void>) => {
      playRef.current?.abort();
      const controller = new AbortController();
      playRef.current = controller;
      void run(settingsRef.current, controller.signal).catch(() => undefined);
    };
    return {
      stop() {
        playRef.current?.abort();
      },
      /** `onDone` runs only when the line is said all the way through, not when it is stopped. */
      prompt(id: string, fallback = "", onDone?: () => void) {
        play((settings, signal) =>
          playPrompt(id, settings, signal, fallback).then(() => {
            if (!signal.aborted) onDone?.();
          }),
        );
      },
      word(id: string, fallback: string) {
        play((settings, signal) => playWordId(id, fallback, settings, signal));
      },
      number(value: number) {
        play((settings, signal) => playNumber(value, settings, signal));
      },
      color(name: string) {
        play((settings, signal) => playColor(name, settings, signal));
      },
      /**
       * `onDone` runs only when the whole line is said, not when it is stopped. `onStop` runs when it
       * is stopped before its end by something else being said (not when the screen closes). A line is
       * kept for "Hear it again" unless `remember` is false (what a tap says, right or wrong, is not
       * the question). `onCue` is told which part of the line is being said, as each starts.
       */
      line(cues: Cue[], onDone?: () => void, options: { remember?: boolean; onStop?: () => void; onCue?: (index: number) => void } = {}) {
        play((settings, signal) =>
          playLine(cues, settings, signal, { remember: options.remember, onCue: options.onCue }).then(
            () => {
              if (!signal.aborted) onDone?.();
              else if (!gone.current) options.onStop?.();
            },
            (error: unknown) => {
              if (!gone.current) options.onStop?.();
              throw error;
            },
          ),
        );
      },
    };
  }, [settingsRef]);
}

export type Speaker = ReturnType<typeof useSpeaker>;

/** Says the activity's line when it opens, and again whenever the line changes. */
export function useOpeningLine(speak: Speaker, cues: Cue[]): void {
  const key = cues.map((cue) => cue.text).join("|");
  useEffect(() => {
    speak.line(cues);
    // The line is rebuilt each render; its words decide when to say it again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speak, key]);
}
