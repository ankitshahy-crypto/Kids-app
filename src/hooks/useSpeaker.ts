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
  useEffect(() => () => playRef.current?.abort(), []);
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
      prompt(id: string, fallback = "") {
        play((settings, signal) => playPrompt(id, settings, signal, fallback));
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
      line(cues: Cue[]) {
        play((settings, signal) => playLine(cues, settings, signal));
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
