import { shareMessage, shareUrl } from "./config";

export type ShareResult = "shared" | "copied" | "cancelled";

/** Share the public site. No codes, no tracking. Copy the link when share is unavailable. */
export async function shareWordNest(): Promise<ShareResult> {
  const data = { title: "WordNest", text: shareMessage, url: shareUrl };
  if (typeof navigator.share === "function") {
    try {
      await navigator.share(data);
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }
  const line = `${shareMessage} ${shareUrl}`;
  try {
    await navigator.clipboard?.writeText(line);
  } catch {
    // The address stays on the page so it can be copied by hand.
  }
  return "copied";
}
