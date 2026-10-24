import type { KeyValueStore } from "../storage";
import type { ChildProfile } from "./profiles";
import { weeksCompleted } from "./summary";

/** The app version the App Store rating prompt was last asked for. Kept on this device only. */
export const REVIEW_ASKED_KEY = "littlenest-review-asked-v1";

/** Ask only once per version, and only once some child has finished a whole week. */
export function shouldAskForReview(profiles: readonly ChildProfile[], version: string, storage: KeyValueStore): boolean {
  let asked: string | null = null;
  try {
    asked = storage.getItem(REVIEW_ASKED_KEY);
  } catch {
    return false;
  }
  if (asked === version) return false;
  return profiles.some((profile) => weeksCompleted(profile) >= 1);
}

export function markReviewAsked(version: string, storage: KeyValueStore): void {
  try {
    storage.setItem(REVIEW_ASKED_KEY, version);
  } catch {
    // Not kept: it may be asked again next time, and Apple limits how often it shows anyway.
  }
}
