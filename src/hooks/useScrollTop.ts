import { useEffect, type RefObject } from "react";

/**
 * Each page of a view starts at its top. The screen body keeps its scroll position when what it
 * holds changes, so a page opened from the end of a long list (About, from the foot of the
 * Grown-ups menu on a phone) came up part-way down, and a child's next screen could start where
 * the last one was left. `key` is the page or screen; the nearest screen body is scrolled up when
 * it changes.
 */
export function useScrollTop(ref: RefObject<HTMLElement | null>, key: unknown): void {
  useEffect(() => {
    const scroller = ref.current?.closest(".screen-body");
    if (scroller) scroller.scrollTop = 0;
  }, [ref, key]);
}
