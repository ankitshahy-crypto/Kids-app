import { useEffect, useRef } from "react";
import { advanceReading, type ReadingClock } from "../data/reading";
import { deviceTimeZone } from "../data/time";

/**
 * Count active kid time: the page is visible and someone has tapped or typed
 * in the last minute. Parent screens pass a null child so the clock stays off.
 */
export function useReadingTime(
  active: { id: string; readingMs: Record<string, number> } | null,
  onCredit: (id: string, totals: Record<string, number>) => void,
) {
  const onCreditRef = useRef(onCredit);
  onCreditRef.current = onCredit;
  const seedRef = useRef(active?.readingMs);
  seedRef.current = active?.readingMs;
  const id = active?.id ?? null;

  useEffect(() => {
    if (!id) return;
    const zone = deviceTimeZone();
    let days = { ...(seedRef.current ?? {}) };
    let clock: ReadingClock = {
      startedAt: null,
      lastInteractionAt: 0,
      visible: document.visibilityState === "visible",
    };
    const begin = () => {
      const now = Date.now();
      const visible = document.visibilityState === "visible";
      clock = { startedAt: visible ? now : null, lastInteractionAt: now, visible };
    };
    begin();

    const flush = (event?: { visible?: boolean; interact?: boolean }) => {
      const settled = advanceReading(days, clock, Date.now(), zone, event);
      clock = settled.clock;
      if (settled.addedMs <= 0) return;
      days = settled.days;
      onCreditRef.current(id, days);
    };

    const onInteract = () => flush({ interact: true });
    const onVis = () => flush({ visible: document.visibilityState === "visible" });
    const onHide = () => flush({ visible: false });
    const timer = window.setInterval(() => flush(), 1000);
    window.addEventListener("pointerdown", onInteract);
    window.addEventListener("keydown", onInteract);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onHide);
    return () => {
      flush({ visible: false });
      window.clearInterval(timer);
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onHide);
    };
  }, [id]);
}
