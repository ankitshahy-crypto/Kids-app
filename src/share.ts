import { shareMessage, shareUrl } from "./config";
import { enqueue, removeOutbox } from "./offline/queue";

export type ShareResult = "shared" | "copied" | "cancelled" | "queued";

/** Share the public site. No codes, no tracking. Copy the link when share is unavailable. */
export async function shareWordNest(): Promise<ShareResult> {
  const data = { title: "WordNest", text: shareMessage, url: shareUrl };
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    enqueue("share", data);
    return "queued";
  }
  if (typeof navigator.share === "function") {
    try {
      await navigator.share(data);
      removeOutbox("share");
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }
  const line = `${shareMessage} ${shareUrl}`;
  try {
    await navigator.clipboard?.writeText(line);
    removeOutbox("share");
  } catch {
    // The address stays on the page so it can be copied by hand.
  }
  return "copied";
}
