import { useEffect, useRef, type RefObject } from "react";

/**
 * Where keyboard and screen-reader focus goes when the screen changes, and while a dialog
 * is open.
 *
 * Why this exists: the app has no pages, only parts of one page swapped in and out. The
 * button that opened a screen is removed with the old screen, and the browser then drops
 * focus onto nothing. A keyboard's next Tab started again from the top of the page (the
 * Grown-ups button), and VoiceOver's cursor was left pointing at something that had gone,
 * with nothing said about the new screen. Dialogs had the opposite fault: they opened over
 * the page but Tab still walked through everything behind them. (The follow-up to #126.)
 *
 * What happens now:
 * - A new screen: focus goes to its heading, which a screen reader reads out.
 * - Back to a screen: focus goes to the button that was used to leave it (the game's tile),
 *   so the next one along is one Tab away, not a walk from the top again.
 * - A dialog: focus goes in, stays in, and comes back out to what opened it.
 * - Inside a screen: when the button that was pressed goes away (a round's choices, "Read" on
 *   a story's cover), focus goes to what took its place.
 *
 * Focus is moved only when the person has just asked for a new screen, or when it is on
 * nothing. It is never taken from where they have put it.
 */

/** What Tab can land on. */
const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/** How long to wait for a screen whose code is still loading (the Explore sections load on first use). */
const WAIT_FOR_HEADING_MS = 3000;

/** The most screens remembered on the way in. Far more than the app is deep; it only stops the list growing for ever. */
const TRAIL_LIMIT = 16;

/** The screens live in here (src/App.tsx). */
const STAGE = "main.stage";

let waiting: { observer: MutationObserver; timer: number } | null = null;

function stopWaiting(): void {
  if (!waiting) return;
  waiting.observer.disconnect();
  window.clearTimeout(waiting.timer);
  waiting = null;
}

/**
 * Focus something that is not a control: a heading, or a part of the page. It takes no part in
 * Tab order, and it shows no ring (index.css): the ring is for controls.
 */
function land(target: HTMLElement): void {
  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.setAttribute("data-focus-landing", "");
  // No scrolling: a screen opens where it is drawn, and focus must not move it.
  target.focus({ preventScroll: true });
}

/** True when focus is on nothing: the browser's answer when what was focused has been removed. */
function focusIsNowhere(): boolean {
  const at = document.activeElement;
  return at === null || at === document.body;
}

function tabbable(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(TABBABLE)].filter((item) => item.getClientRects().length > 0);
}

/**
 * A control, described so that it can be found again after its screen has been drawn afresh:
 * what it is, what it is called, and which one of those it is when several share the name
 * (each child's row has an Edit button).
 */
type Door = { tag: string; name: string; nth: number };

function nameOf(item: Element): string {
  return (item.getAttribute("aria-label") ?? item.textContent ?? "").replace(/\s+/g, " ").trim();
}

function alike(stage: HTMLElement, tag: string, name: string): HTMLElement[] {
  return tabbable(stage).filter((item) => item.tagName === tag && nameOf(item) === name);
}

function doorOf(item: Element | null): Door | null {
  const stage = document.querySelector<HTMLElement>(STAGE);
  if (!stage || !(item instanceof HTMLElement) || !stage.contains(item)) return null;
  // A heading the app put the focus on is not a way out of the screen.
  if (item.hasAttribute("data-focus-landing")) return null;
  const name = nameOf(item);
  if (name === "") return null;
  const nth = alike(stage, item.tagName, name).indexOf(item);
  return nth < 0 ? null : { tag: item.tagName, name, nth };
}

/** The dialogs that are open, the newest last, each with what had the focus when it opened. */
const dialogs: { box: HTMLElement; opener: HTMLElement | null }[] = [];

/** Dialogs that have just closed, and the timer that will hand their focus back. */
const closing = new Map<HTMLElement, number>();

/** Put focus into a dialog: its first control, or the dialog itself when it has none. */
function enter(dialog: HTMLElement): void {
  const first = tabbable(dialog)[0];
  if (first) first.focus({ preventScroll: true });
  else land(dialog);
}

/**
 * The way back that a dialog was in the way of. A game can end with a cheer over the page it
 * goes back to: the cheer has the focus first, and this is where it goes when the cheer closes.
 */
let held: Door | null = null;

/** What has the focus as a screen is left, and the way back to it. */
function leavingBy(): { at: Element | null; door: Door | null } {
  const at = document.activeElement;
  // With a dialog in the way (the grown-up check), the way out was the button that opened it.
  return { at, door: doorOf(dialogs.length > 0 ? dialogs[0].opener : at) };
}

/**
 * Put focus on the screen that is showing.
 *
 * `door` is the control that was used to leave this screen, when the person is coming back to
 * it: focus returns there. Otherwise focus goes to the screen's heading, which a screen reader
 * then reads out, and from which Tab goes on into the screen.
 *
 * `before` is what had the focus as the change began. If something else on the new screen has
 * the focus by now, a box there asked for it (autoFocus), and it keeps it.
 */
function focusScreen(door: Door | null = null, before: Element | null = null): void {
  stopWaiting();
  // A dialog owns the focus while it is open, and hands it back when it closes.
  if (dialogs.length > 0) {
    held = door;
    return;
  }
  held = null;
  const stage = document.querySelector<HTMLElement>(STAGE);
  if (!stage) return;
  const at = document.activeElement;
  const claimed = at instanceof HTMLElement && at !== before && at !== rescued && at !== stage && stage.contains(at) && !at.hasAttribute("data-focus-landing");
  rescued = null;
  parked = null;
  if (claimed) return;

  const target = door ? (alike(stage, door.tag, door.name)[door.nth] ?? null) : null;
  if (target) {
    focusControl(target);
    return;
  }
  const heading = stage.querySelector<HTMLElement>("h1, h2");
  if (heading) {
    land(heading);
    return;
  }
  // No heading yet: the screen's code is still loading. Hold focus on the page, so it is not
  // lost, and move it to the heading when that arrives, unless the person has moved on.
  land(stage);
  const observer = new MutationObserver(() => {
    const arrived = stage.querySelector<HTMLElement>("h1, h2");
    if (!arrived) return;
    stopWaiting();
    if (dialogs.length === 0 && (focusIsNowhere() || document.activeElement === stage)) land(arrived);
  });
  observer.observe(stage, { childList: true, subtree: true });
  waiting = { observer, timer: window.setTimeout(stopWaiting, WAIT_FOR_HEADING_MS) };
}

function showsRing(item: HTMLElement): boolean {
  try {
    return item.matches(":focus-visible");
  } catch {
    // A browser too old to know the selector: no ring to follow.
    return false;
  }
}

/**
 * Move focus to the new screen whenever `key` changes. `key` is whatever names the screen that
 * is showing. Not on first load: nothing has been left behind yet, and the page should open
 * the way a page opens.
 */
export function useScreenFocus(key: string): void {
  // The last key, not a "have I run" flag: React's development build runs every effect twice
  // when a component first appears, and a flag would read the second run as a change.
  const last = useRef(key);
  // The screens left behind on the way here, each with the button that led on from it.
  const trail = useRef<{ screen: string; door: Door | null }[]>([]);
  // Read while the new screen is being drawn: by the time the effect runs, the old screen and
  // the button that was pressed on it have gone.
  const leaving = useRef<{ at: Element | null; door: Door | null } | null>(null);
  if (key !== last.current && typeof document !== "undefined") leaving.current = leavingBy();

  useEffect(() => {
    if (last.current === key) return;
    const from = last.current;
    last.current = key;
    const left = leaving.current;
    leaving.current = null;
    const seen = trail.current.findIndex((entry) => entry.screen === key);
    if (seen >= 0) {
      // Coming back: to the button that led away, and everything after it is forgotten.
      const door = trail.current[seen].door;
      trail.current.length = seen;
      focusScreen(door, left?.at ?? null);
      return;
    }
    trail.current.push({ screen: from, door: left?.door ?? null });
    if (trail.current.length > TRAIL_LIMIT) trail.current.shift();
    focusScreen(null, left?.at ?? null);
  }, [key]);
}

/** The last thing that had the focus. */
let lastFocused: Element | null = null;

/**
 * Was the last press a key? A screen reader's "activate" counts: it sends a click with no
 * pointer behind it. A finger or a mouse does not count.
 */
let byKey = false;

/** A control the net below put the focus on. A new screen may move it on; it is not a box that asked for the focus. */
let rescued: Element | null = null;

/** A part of the screen the focus is waiting on, until a control arrives in it. */
let parked: HTMLElement | null = null;

function focusControl(target: HTMLElement): void {
  target.focus({ preventScroll: true });
  // Bring it into view only for someone who can see the ring, which is someone on a keyboard.
  // A finger did not ask for the page to move.
  if (showsRing(target)) target.scrollIntoView({ block: "nearest", inline: "nearest" });
}

/**
 * The button that had the focus has been removed, and the focus is on nothing. Put it on what
 * took the button's place: the first control after the spot where it was, or failing that the
 * one before, in the part of the screen it was removed from. If that part has no control yet
 * (a game is cheering, a picture is being drawn), the part itself holds the focus until one
 * arrives.
 */
function rescue(records: MutationRecord[]): void {
  if (parked) {
    // Something was waiting here. If the person has not moved on, the first control to arrive gets the focus.
    if (document.activeElement !== parked) parked = null;
    else {
      const first = tabbable(parked)[0];
      if (!first) return;
      parked = null;
      rescued = first;
      focusControl(first);
      return;
    }
  }
  const lost = lastFocused;
  if (!lost || lost.isConnected || !focusIsNowhere()) return;
  lastFocused = null;
  // Only for keys. A finger that tapped a button has no use for the focus, and moving it could
  // bring up the keyboard or scroll the page under the child.
  if (!byKey) return;
  // A dialog that has closed hands its own focus back (useDialogFocus, below).
  if (dialogs.some((entry) => entry.box.contains(lost)) || [...closing.keys()].some((box) => box.contains(lost))) return;

  // Where it was removed from. If that has gone too, where that was removed from, and so on up.
  let gone: Node = lost;
  let region: Node | null = null;
  let previous: Node | null = null;
  for (let step = 0; step < 8 && !(region && region.isConnected); step += 1) {
    const from = records.find((record) => [...record.removedNodes].some((node) => node === gone || node.contains(gone)));
    if (!from) return;
    region = from.target;
    previous = from.previousSibling;
    gone = from.target;
  }
  if (!(region instanceof HTMLElement) || !region.isConnected) return;
  // Not out of a dialog that is open: its keys stay inside it.
  const top = dialogs[dialogs.length - 1];
  if (top && !top.box.contains(region)) {
    enter(top.box);
    return;
  }
  const items = tabbable(region);
  const spot = previous && previous.isConnected ? previous : null;
  const after = spot ? items.filter((item) => !spot.contains(item) && (spot.compareDocumentPosition(item) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0) : items;
  const target = after[0] ?? items[items.length - 1] ?? null;
  if (target) {
    rescued = target;
    focusControl(target);
    return;
  }
  parked = region;
  land(region);
}

/**
 * The net under everything else: focus is never left on nothing after a key press. Used once,
 * by the app (src/App.tsx).
 *
 * Why this exists: inside a screen, the button that was pressed is often removed by the press.
 * A game's choices are new buttons each round; "Read" on a story's cover gives way to the first
 * page; "Add another child" gives way to the form. Each time the browser dropped the focus onto
 * nothing, and the next Tab began again at the top of the page. A child on a keyboard, or on a
 * switch that steps through the controls, had to walk the whole page again after every answer.
 */
export function useFocusNet(): void {
  useEffect(() => {
    const onFocus = (event: FocusEvent) => {
      lastFocused = event.target instanceof Element ? event.target : null;
    };
    const onKey = (event: KeyboardEvent) => {
      byKey = true;
      // A key held down repeats, and each repeat of Enter presses the focused button again. Now
      // that focus moves on to what takes a pressed button's place, one long press would run
      // through a whole story. A held key presses once, as a held finger does: the repeats are
      // stopped here, before the button or any handler on it hears them.
      if (event.repeat && event.key === "Enter" && event.target instanceof Element && event.target.closest("button, [role=button]")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const onPointer = () => {
      byKey = false;
    };
    const onClick = (event: MouseEvent) => {
      // No pointer made this click: a screen reader's or a switch's "activate" (src/input/keyboardClick.ts).
      if (event.detail === 0) byKey = true;
    };
    document.addEventListener("focusin", onFocus);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onPointer, true);
    document.addEventListener("click", onClick, true);
    const observer = new MutationObserver(rescue);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onPointer, true);
      document.removeEventListener("click", onClick, true);
      observer.disconnect();
      lastFocused = null;
      parked = null;
    };
  }, []);
}

/**
 * Look after focus for a dialog or a sheet that opens over the screen.
 *
 * - On opening, focus goes into it: to the box that asked for it (autoFocus), else its first
 *   control, else the dialog itself.
 * - Tab and Shift+Tab stay inside it. They used to walk through the page underneath, and on the
 *   end-of-lesson sheet Enter on a tile underneath opened another lesson.
 * - Escape calls `onEscape`, and nothing else hears it: a page with its own Escape (Back) used
 *   to hear the same key and close as well.
 * - On closing, focus goes back to what opened it. If that has gone, it goes to the dialog
 *   underneath, or to the screen's heading.
 *
 * Dialogs can open over dialogs (the grown-up check over the lock sheet). The keys belong to
 * the newest.
 */
export function useDialogFocus(ref: RefObject<HTMLElement | null>, onEscape?: () => void): void {
  const escape = useRef(onEscape);
  escape.current = onEscape;
  // What had the focus before the dialog was drawn. Read while it is being drawn, not after:
  // a box with autoFocus has taken the focus by the time the effect below runs.
  const before = useRef<Element | null>(null);
  const drawn = useRef(false);
  if (!drawn.current) {
    drawn.current = true;
    before.current = typeof document === "undefined" ? null : document.activeElement;
  }
  useEffect(() => {
    const box = ref.current;
    if (!box) return undefined;
    stopWaiting();
    // React's development build closes and reopens every new component once. The reopening
    // finds the hand-back still waiting and calls it off, so focus stays where it was.
    const handBack = closing.get(box);
    if (handBack !== undefined) {
      window.clearTimeout(handBack);
      closing.delete(box);
    }
    const opener = before.current instanceof HTMLElement && before.current !== document.body ? before.current : null;
    const entry = { box, opener };
    dialogs.push(entry);
    if (!box.contains(document.activeElement)) enter(box);

    const onKey = (event: KeyboardEvent) => {
      if (dialogs[dialogs.length - 1] !== entry) return;
      if (event.key === "Escape") {
        // Heard first (capture) and stopped here: the page underneath does not hear it.
        event.stopPropagation();
        escape.current?.();
        return;
      }
      if (event.key !== "Tab") return;
      const items = tabbable(box);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const at = document.activeElement;
      if (!box.contains(at)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && (at === first || at === box)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && at === last) {
        event.preventDefault();
        first.focus();
      }
    };
    // Capture, on the document: this hears the key before the page's own handlers do.
    document.addEventListener("keydown", onKey, true);

    return () => {
      document.removeEventListener("keydown", onKey, true);
      const at = dialogs.indexOf(entry);
      if (at >= 0) dialogs.splice(at, 1);
      // A moment later, so that a new screen opening in the same step gets its focus first.
      closing.set(
        box,
        window.setTimeout(() => {
          closing.delete(box);
          const under = dialogs[dialogs.length - 1];
          // The way back that was kept waits for the last dialog to close.
          const door = under ? null : held;
          if (!under) held = null;
          // Something has the focus already (the new screen's heading): leave it there.
          if (!focusIsNowhere()) return;
          if (opener && opener.isConnected) opener.focus({ preventScroll: true });
          if (!focusIsNowhere()) return;
          // What opened it has gone, or cannot take the focus now.
          if (under) enter(under.box);
          else focusScreen(door);
        }, 0),
      );
    };
  }, [ref]);
}
