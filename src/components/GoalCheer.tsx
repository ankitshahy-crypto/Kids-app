import { useEffect, useRef } from "react";

/** A short cheer when today's reading goal is met. It does not show a time. */
export function GoalCheer({ onDone }: { onDone: () => void }) {
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const timer = window.setTimeout(() => done.current(), 2200);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="cheer cheer-goal" role="dialog" aria-modal="true" aria-label="Reading goal" data-goal-met="true">
      <p className="cheer-line">Yay</p>
      <button type="button" className="cheer-done" onClick={() => done.current()}>
        OK
      </button>
    </div>
  );
}
