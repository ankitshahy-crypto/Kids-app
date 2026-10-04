import { useEffect, useRef } from "react";

/** A short cheer when today's reading goal is met. It does not show a time. */
export function GoalCheer({ onDone }: { onDone: () => void }) {
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const timer = window.setTimeout(() => done.current(), 2200);
    return () => window.clearTimeout(timer);
  }, []);

  // A status, not a dialog. It leaves by itself after two seconds, so it does not take the focus
  // and hand it back, and it does not claim to be the only thing on the screen, which is what a
  // modal dialog tells a screen reader. (It said it was one, and took no focus.)
  return (
    <div className="cheer cheer-goal" role="status" aria-label="Reading goal met" data-goal-met="true">
      <p className="cheer-line">Yay</p>
      <button type="button" className="cheer-done" onClick={() => done.current()}>
        OK
      </button>
    </div>
  );
}
