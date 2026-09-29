import { useEffect, useState } from "react";
import { todayKey } from "../data/profiles";

/**
 * Today's local date, kept current while the app stays open: an iPad left on
 * overnight, or brought back from the background, rolls to the new day (and
 * to Friday's review) without a reload. Checked on return to the foreground,
 * on page show, and once a minute.
 */
export function useDayKey(): string {
  const [dayKey, setDayKey] = useState(() => todayKey());
  useEffect(() => {
    const check = () => {
      const next = todayKey();
      setDayKey((current) => (current === next ? current : next));
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", check);
    window.addEventListener("focus", check);
    const timer = window.setInterval(check, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", check);
      window.removeEventListener("focus", check);
      window.clearInterval(timer);
    };
  }, []);
  return dayKey;
}
