import { useEffect, useRef, useState, type ReactNode } from "react";

export const HOLD_MS = 1500;

/**
 * A button that fires after being held, with a ring that fills while it is
 * held. A quick tap does nothing, so a child does not leave their lesson by
 * brushing the corner. Keyboard users press Enter or Space as usual.
 */
export function HoldButton({
  className,
  label,
  onHold,
  holdMs = HOLD_MS,
  children,
}: {
  className?: string;
  label: string;
  onHold: () => void;
  holdMs?: number;
  children: ReactNode;
}) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | null>(null);
  const fired = useRef(false);

  const stop = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  };

  useEffect(() => stop, []);

  const start = () => {
    if (timer.current !== null) return;
    fired.current = false;
    setHolding(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setHolding(false);
      fired.current = true;
      onHold();
    }, holdMs);
  };

  return (
    <button
      type="button"
      className={`hold-button${holding ? " is-holding" : ""}${className ? ` ${className}` : ""}`}
      aria-label={label}
      title="Hold to switch"
      data-hold="true"
      data-holding={holding ? "true" : "false"}
      style={{ "--hold-ms": `${holdMs}ms` } as React.CSSProperties}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        start();
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onHold();
        }
      }}
      onClick={(event) => {
        // A tap that did not last long enough does nothing; the hold already fired when it did.
        if (!fired.current) event.preventDefault();
        fired.current = false;
      }}
    >
      <span className="hold-ring" aria-hidden="true" />
      {children}
    </button>
  );
}
