/** Fired on the window when a child is added, changed, or removed on this device. */
export const PROFILES_EVENT = "littlenest-profiles";

/** Tell the offline download that the children on this device changed. */
export function noteProfilesChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PROFILES_EVENT));
}
