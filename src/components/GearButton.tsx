import { useRef, useState } from "react";
import { GearIcon } from "./icons";

const HOLD_MS = 2000;

export function GearButton({ onOpen }: { onOpen: () => void }) {
  const [holding, setHolding] = useState(false);
  const timerRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const finishHold = () => {
    clearTimer();
    setHolding(false);
  };

  const startHold = () => {
    if (timerRef.current !== null) return;
    setHolding(true);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setHolding(false);
      onOpen();
    }, HOLD_MS);
  };

  return (
    <button
      type="button"
      className={`gear-button${holding ? " is-holding" : ""}`}
      aria-label="Parent settings. Press and hold to open."
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        startHold();
      }}
      onPointerUp={finishHold}
      onPointerCancel={finishHold}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        if (event.repeat) return;
        startHold();
      }}
      onKeyUp={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        finishHold();
      }}
    >
      <svg className="hold-ring" viewBox="0 0 64 64" aria-hidden="true">
        <circle className="hold-track" cx="32" cy="32" r="28" pathLength="100" />
        <circle className="hold-value" cx="32" cy="32" r="28" pathLength="100" />
      </svg>
      <span className="gear-face">
        <GearIcon />
      </span>
    </button>
  );
}
