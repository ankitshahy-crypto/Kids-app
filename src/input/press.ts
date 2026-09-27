import { playEffect } from "../audio/manager";
import { isNativeApp } from "../audio/platform";
import type { Settings } from "../settings";

const PRESSABLE =
  "button, a, label, select, summary, [role='button'], input[type='checkbox'], input[type='radio'], input[type='range']";

/**
 * Controls whose second tap would repeat the same step (open a child, open a
 * lesson, save, pick a grown-up answer). Back, the word arrows, and Remove stay
 * tappable: Remove's second tap is the confirm, not a repeat.
 */
const COMMIT =
  ".who-pick, .trail-stop, .gate-choice, .gate-button, .done-button, .add-child, .save-child, .dock-button, .parent-row, .teacher-card-link";

const BUSY_MS = 420;
const pressed = new Set<HTMLElement>();

function control(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const element = target.closest(PRESSABLE);
  if (!(element instanceof HTMLElement)) return null;
  if (element.closest(".blend-track")) return null;
  if (element.matches(":disabled") || element.getAttribute("aria-disabled") === "true") return null;
  if (element.closest("[data-busy='true']")) return null;
  return element;
}

function release(): void {
  pressed.forEach((element) => {
    element.classList.remove("is-pressed");
    delete element.dataset.pressed;
  });
  pressed.clear();
}

function buzz(): void {
  if (isNativeApp()) {
    void import("@capacitor/haptics")
      .then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light }))
      .catch(() => undefined);
    return;
  }
  try {
    navigator.vibrate?.(10);
  } catch {
    // This browser has no vibration API.
  }
}

function hold(element: HTMLElement): void {
  if (!element.matches(COMMIT) || element.dataset.busy === "true") return;
  element.dataset.busy = "true";
  element.classList.add("is-busy");
  element.setAttribute("aria-busy", "true");
  window.setTimeout(() => {
    delete element.dataset.busy;
    element.classList.remove("is-busy");
    element.removeAttribute("aria-busy");
  }, BUSY_MS);
}

/** Pressed state, a soft effects-bus tap, and a short buzz. Call once from the app root. */
export function bindPressFeedback(readSettings: () => Settings): () => void {
  const down = (event: PointerEvent) => {
    if (event.button !== 0) return;
    const element = control(event.target);
    if (!element) return;
    element.classList.add("is-pressed");
    element.dataset.pressed = "true";
    pressed.add(element);
    const settings = readSettings();
    if (!settings.tapFeedback) return;
    try {
      playEffect("tap", settings);
      buzz();
    } catch {
      // A missing audio device or haptics plugin should not block the tap.
    }
  };

  const guard = (event: Event) => {
    if (!(event.target instanceof Element)) return;
    const element = event.target.closest(COMMIT);
    if (!(element instanceof HTMLElement)) return;
    if (element.dataset.busy === "true") {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    hold(element);
  };

  window.addEventListener("pointerdown", down, true);
  window.addEventListener("pointerup", release, true);
  window.addEventListener("pointercancel", release, true);
  window.addEventListener("click", guard, true);
  return () => {
    window.removeEventListener("pointerdown", down, true);
    window.removeEventListener("pointerup", release, true);
    window.removeEventListener("pointercancel", release, true);
    window.removeEventListener("click", guard, true);
    release();
  };
}
