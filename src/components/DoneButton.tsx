import { useEffect, useRef, useState } from "react";
import { playEffect } from "../audio/manager";
import { isAbortError, playLine, promptCue } from "../audio/player";
import { DEFAULT_SETTINGS, type Settings } from "../settings";

/**
 * The cheer's line, as a promise that settles once it has been said (or stopped). A finished game
 * notes its "You did it!" here (kit.tsx useFinish), and the Done button that comes with it waits
 * for that before its own cue, so the cue never cuts the cheer off. A screen with a cheer of its
 * own hands the promise to the button instead (PathTrace).
 */
let cheer: Promise<void> = Promise.resolve();
export function noteCheer(said: Promise<void>): void {
  cheer = said;
}

/** The tick comes this long after the cheer; the pulse this long after the button came, if it is left alone. */
export const DONE_CUE_MS = 1500;
export const DONE_PULSE_MS = 8000;
/** Should a cheer never settle (a clip that will not end), the tick comes anyway after this long. */
const CHEER_MAX_MS = 4000;

/**
 * Done: the one button that leaves a finished screen, the same on each of them (a game's last round,
 * a traced letter, word, name or shape). A pre-reader cannot read the word, so the button is big
 * (260 by 72 on a phone, 300 by 80 on an iPad), and a moment after the cheer is said a tick comes
 * up on it with a soft pop; focus goes to it then, so a keyboard or a switch finds it as well. Left
 * alone for eight seconds, it pulses once and the pop comes once more.
 *
 * With the tick, and again with the pulse, Jessa says "Tap Done." (the "kit-tap-done" clip) after
 * the pop. A tap, or leaving the screen, stops it.
 */
export function DoneButton({
  onDone,
  said,
  settingsRef,
  finish,
  next,
  quiet = false,
}: {
  onDone: () => void;
  said?: Promise<void>;
  settingsRef?: { current: Settings };
  /** The screen's own name for its finish, as data-finish (Build It, Think & Code). */
  finish?: string;
  next?: string;
  /** A Done that checks the child's work (the writing box) rather than leaving a finished screen: the
   * same big button, the tick drawn from the start, with no pop, no pulse and no focus taken while the
   * child is still writing. */
  quiet?: boolean;
}) {
  const [cue, setCue] = useState<"soon" | "shown" | "pulse">(quiet ? "shown" : "soon");
  const button = useRef<HTMLButtonElement>(null);
  const settings = useRef(settingsRef);
  settings.current = settingsRef;
  useEffect(() => {
    if (quiet) return;
    let over = false;
    let show: number | undefined;
    let pulse: number | undefined;
    const current = () => settings.current?.current ?? DEFAULT_SETTINGS;
    const voice = new AbortController();
    const sayTapDone = () => {
      void playLine([promptCue("kit-tap-done", "Tap Done.")], current(), voice.signal).catch((error) => {
        if (!isAbortError(error)) throw error;
      });
    };
    // The cheer is read a microtask later, not now: this effect runs before the game's own
    // (useFinish's), since a child's effects run first, so `cheer` here would still be the last
    // game's, long settled, and the tick would come over "You did it!". (Dev's StrictMode remount
    // hid it; a release build mounts once.)
    const settled = (async () => {
      await Promise.resolve();
      const waited = said ?? cheer;
      await Promise.race([waited.then(() => undefined, () => undefined), new Promise<void>((resolve) => window.setTimeout(resolve, CHEER_MAX_MS))]);
    })();
    void settled.then(() => {
      if (over) return;
      show = window.setTimeout(() => {
        setCue("shown");
        playEffect("pop", current());
        sayTapDone();
        button.current?.focus({ preventScroll: true });
        pulse = window.setTimeout(() => {
          setCue("pulse");
          playEffect("pop", current());
          sayTapDone();
        }, DONE_PULSE_MS - DONE_CUE_MS);
      }, DONE_CUE_MS);
    });
    return () => {
      over = true;
      voice.abort();
      window.clearTimeout(show);
      window.clearTimeout(pulse);
    };
    // Once, as the button comes: the cheer it waits for is the one of that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="game-done-row">
      <button ref={button} type="button" className="start-button game-done" data-game-done="true" data-cue={cue} data-finish={finish} data-next={next} onClick={onDone}>
        <svg className="done-tick" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
          <circle cx="16" cy="16" r="14" fill="currentColor" opacity="0.18" />
          <path d="M9 16.5l5 5 9.5-10" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Done</span>
      </button>
    </div>
  );
}
