import { useEffect, useRef, useState, type ReactNode } from "react";
import { armUnlockCue, pulseUnlock } from "../audio/manager";

const HOLD_MS = 2000;
const SLOP_PX = 10;

export function HoldButton({
  label,
  className,
  indicator = "ring",
  onOpen,
  children,
}: {
  label: string;
  className?: string;
  indicator?: "ring" | "bar";
  onOpen: () => void;
  children: ReactNode;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const controlsRef = useRef<{
    begin: (x: number, y: number) => void;
    end: () => void;
    move: (x: number, y: number) => void;
  } | null>(null);
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    const node = buttonRef.current;
    if (!node) return;

    let active = false;
    let originX = 0;
    let originY = 0;
    let timer = 0;
    let frame = 0;
    let startedAt = 0;
    let cancelCue = () => undefined as void;

    const paint = (amount: number) => {
      node.style.setProperty("--hold", String(amount));
    };

    const stopClock = () => {
      window.clearTimeout(timer);
      timer = 0;
      window.cancelAnimationFrame(frame);
      frame = 0;
    };

    const end = () => {
      if (!active) return;
      active = false;
      stopClock();
      cancelCue();
      cancelCue = () => undefined;
      paint(0);
      setHolding(false);
    };

    const tick = () => {
      if (!active) return;
      const amount = Math.min(1, (performance.now() - startedAt) / HOLD_MS);
      paint(amount);
      if (amount < 1) frame = window.requestAnimationFrame(tick);
    };

    const begin = (x: number, y: number) => {
      if (active) return;
      active = true;
      originX = x;
      originY = y;
      startedAt = performance.now();
      paint(0);
      setHolding(true);
      cancelCue = armUnlockCue(HOLD_MS);
      frame = window.requestAnimationFrame(tick);
      timer = window.setTimeout(() => {
        timer = 0;
        if (!active) return;
        active = false;
        stopClock();
        paint(1);
        setHolding(false);
        pulseUnlock();
        onOpenRef.current();
      }, HOLD_MS);
    };

    const movedTooFar = (x: number, y: number) => {
      const dx = x - originX;
      const dy = y - originY;
      return dx * dx + dy * dy > SLOP_PX * SLOP_PX;
    };

    const move = (x: number, y: number) => {
      if (!active) return;
      if (movedTooFar(x, y)) end();
    };

    controlsRef.current = { begin, end, move };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      if (event.button !== 0) return;
      begin(event.clientX, event.clientY);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      move(event.clientX, event.clientY);
    };
    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      end();
    };
    const onPointerCancel = (event: PointerEvent) => {
      // iOS fires pointercancel during a long-press while the finger is still down.
      if (event.pointerType === "touch") return;
      end();
    };
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      event.preventDefault();
      const touch = event.touches[0];
      begin(touch.clientX, touch.clientY);
    };
    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      if (active) event.preventDefault();
      move(touch.clientX, touch.clientY);
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length > 0) return;
      event.preventDefault();
      end();
    };
    const onTouchCancel = (event: TouchEvent) => {
      // The callout gesture cancels the touch without a real release.
      // Keep the hold unless the finger has already drifted past the slop.
      const touch = event.changedTouches[0];
      if (!touch || !movedTooFar(touch.clientX, touch.clientY)) return;
      end();
    };
    const onContextMenu = (event: Event) => {
      event.preventDefault();
    };
    const onSelectStart = (event: Event) => {
      event.preventDefault();
    };

    node.addEventListener("pointerdown", onPointerDown);
    node.addEventListener("pointermove", onPointerMove);
    node.addEventListener("pointerup", onPointerUp);
    node.addEventListener("pointercancel", onPointerCancel);
    node.addEventListener("touchstart", onTouchStart, { passive: false });
    node.addEventListener("touchmove", onTouchMove, { passive: false });
    node.addEventListener("touchend", onTouchEnd, { passive: false });
    node.addEventListener("touchcancel", onTouchCancel);
    node.addEventListener("contextmenu", onContextMenu);
    node.addEventListener("selectstart", onSelectStart);

    return () => {
      controlsRef.current = null;
      end();
      node.removeEventListener("pointerdown", onPointerDown);
      node.removeEventListener("pointermove", onPointerMove);
      node.removeEventListener("pointerup", onPointerUp);
      node.removeEventListener("pointercancel", onPointerCancel);
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", onTouchEnd);
      node.removeEventListener("touchcancel", onTouchCancel);
      node.removeEventListener("contextmenu", onContextMenu);
      node.removeEventListener("selectstart", onSelectStart);
    };
  }, []);

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`hold-button${className ? ` ${className}` : ""}${holding ? " is-holding" : ""}`}
      aria-label={label}
      draggable={false}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        if (event.repeat) return;
        controlsRef.current?.begin(0, 0);
      }}
      onKeyUp={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        controlsRef.current?.end();
      }}
    >
      {indicator === "ring" ? (
        <svg className="hold-ring" viewBox="0 0 64 64" aria-hidden="true">
          <circle className="hold-track" cx="32" cy="32" r="28" pathLength="100" />
          <circle className="hold-value" cx="32" cy="32" r="28" pathLength="100" />
        </svg>
      ) : (
        <span className="hold-bar" aria-hidden="true" />
      )}
      {children}
    </button>
  );
}
