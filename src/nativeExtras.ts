import { isNativeApp } from "./audio/platform";

/**
 * Apple's own rating sheet (StoreKit requestReview), through @capacitor-community/in-app-review.
 * Nothing is sent by the app: the sheet is Apple's, and Apple decides whether it shows.
 * On the web there is no sheet, so nothing happens.
 */
export async function requestStoreReview(): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const { InAppReview } = await import("@capacitor-community/in-app-review");
    await InAppReview.requestReview();
    return true;
  } catch {
    return false;
  }
}

export type TextShareResult = "shared" | "copied" | "cancelled" | "failed";

/** The native share sheet with plain text. The grown-up picks where it goes; nothing is sent on its own. */
export async function shareText(title: string, text: string): Promise<TextShareResult> {
  if (isNativeApp()) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title, text, dialogTitle: title });
      return "shared";
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/cancel/i.test(message)) return "cancelled";
    }
  }
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }
  try {
    await navigator.clipboard?.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
