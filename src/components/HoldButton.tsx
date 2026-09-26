import { useEffect, useRef, useState, type ReactNode } from "react";
import { armUnlockCue, pulseUnlock } from "../audio/manager";

const HOLD_MS = 2000;
const SLOP_PX = 10;

function isHoldKey(event: KeyboardEvent): boolean {
  return event.key === "Enter" || event.key === " " || event.key === "Spacebar" || event.code === "Enter" || event.code === "Space";
}

function isTouchPointer(event: PointerEvent): boolean {
  return event.pointerType === "touch";
}

/**
 * Press-and-hold that stays alive in WebKit (Safari, and iOS Chrome/Firefox),
 * Chromium (Chrome, Edge, Samsung Internet), and Firefox, for touch, mouse, and keyboard.
 */
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
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    const node = buttonRef.current;
    if (!node) return;

    let active = false;
    let fromKeyboard = false;
    // Real touch sequences (Safari, Chrome, Firefox, Samsung Internet) also emit
    // pointerup/pointercancel while the finger is still down. Those must not
    // release the hold. A pointer-only touch (no touchstart) still releases on pointerup.
    let usingTouch = false;
    let originX = 0;
    let originY = 0;
    let timer = 0;
    let frame = 0;
    let startedAt = 0;
    let pointerId = -1;
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
      fromKeyboard = false;
      usingTouch = false;
      pointerId = -1;
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

    const begin = (x: number, y: number, keyboard: boolean) => {
      if (active) return;
      active = true;
      fromKeyboard = keyboard;
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
        fromKeyboard = false;
        usingTouch = false;
        pointerId = -1;
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
      if (!active || fromKeyboard) return;
      if (movedTooFar(x, y)) end();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!isTouchPointer(event) && event.button !== 0) return;
      pointerId = event.pointerId;
      if (!isTouchPointer(event)) {
        try {
          node.setPointerCapture(event.pointerId);
        } catch {
          // Capture can fail. Releasing over the button still ends the hold.
        }
      }
      begin(event.clientX, event.clientY, false);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (pointerId !== -1 && event.pointerId !== pointerId) return;
      move(event.clientX, event.clientY);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (isTouchPointer(event) && usingTouch) return;
      if (pointerId !== -1 && event.pointerId !== pointerId) return;
      end();
    };

    const onPointerCancel = (event: PointerEvent) => {
      // WebKit cancels the pointer during a long-press while the finger is still down.
      if (isTouchPointer(event)) return;
      if (pointerId !== -1 && event.pointerId !== pointerId) return;
      end();
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      if (event.cancelable) event.preventDefault();
      usingTouch = true;
      const touch = event.touches[0];
      begin(touch.clientX, touch.clientY, false);
    };

    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      if (active && event.cancelable) event.preventDefault();
      move(touch.clientX, touch.clientY);
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length > 0) return;
      if (event.cancelable) event.preventDefault();
      end();
    };

    const onTouchCancel = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!touch || !movedTooFar(touch.clientX, touch.clientY)) return;
      end();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isHoldKey(event)) return;
      event.preventDefault();
      if (event.repeat) return;
      begin(0, 0, true);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (!fromKeyboard || !isHoldKey(event)) return;
      event.preventDefault();
      end();
    };

    const onBlur = () => {
      if (fromKeyboard) end();
    };

    const onContextMenu = (event: Event) => {
      event.preventDefault();
    };

    const onSelectStart = (event: Event) => {
      event.preventDefault();
    };

    const onDragStart = (event: Event) => {
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
    node.addEventListener("keydown", onKeyDown);
    node.addEventListener("keyup", onKeyUp);
    window.addEventListener("keyup", onKeyUp);
    node.addEventListener("blur", onBlur);
    node.addEventListener("contextmenu", onContextMenu);
    node.addEventListener("selectstart", onSelectStart);
    node.addEventListener("dragstart", onDragStart);

    return () => {
      end();
      node.removeEventListener("pointerdown", onPointerDown);
      node.removeEventListener("pointermove", onPointerMove);
      node.removeEventListener("pointerup", onPointerUp);
      node.removeEventListener("pointercancel", onPointerCancel);
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", onTouchEnd);
      node.removeEventListener("touchcancel", onTouchCancel);
      node.removeEventListener("keydown", onKeyDown);
      node.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("keyup", onKeyUp);
      node.removeEventListener("blur", onBlur);
      node.removeEventListener("contextmenu", onContextMenu);
      node.removeEventListener("selectstart", onSelectStart);
      node.removeEventListener("dragstart", onDragStart);
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
