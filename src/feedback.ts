import { PRODUCT_NAME } from "./brand";
import { feedbackEmail } from "./config";

export type FeedbackContext = {
  version: string;
  /** Lesson week the active child is on, 1-based, when a child is chosen. */
  week?: number;
  platform?: string;
  screen?: string;
};

/**
 * A mail link that opens the grown-up's own mail app with the facts a report
 * needs already typed: app version, device, lesson week. Nothing is sent by
 * the app, and no child's name or progress is included. Empty when no help
 * address is configured.
 */
export function feedbackMailto(context: FeedbackContext): string {
  return buildFeedbackMailto(feedbackEmail, context);
}

export function buildFeedbackMailto(email: string, context: FeedbackContext): string {
  if (!email) return "";
  const lines = [
    "What happened:",
    "",
    "",
    "What I expected:",
    "",
    "",
    "----",
    `${PRODUCT_NAME} ${context.version}`,
    context.platform ? `Device: ${context.platform}` : "",
    context.screen ? `Screen: ${context.screen}` : "",
    context.week ? `Lesson week: ${context.week}` : "",
  ].filter((line, index, all) => line !== "" || index < 6 || all[index - 1] !== "");
  const subject = `${PRODUCT_NAME} feedback (${context.version})`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
}

/** A short, non-identifying device line: platform and screen size only. */
export function deviceLine(): { platform: string; screen: string } {
  const nav = typeof navigator === "undefined" ? undefined : navigator;
  const ua = nav?.userAgent ?? "";
  const platform = /iPad/.test(ua) || (/Macintosh/.test(ua) && (nav?.maxTouchPoints ?? 0) > 1) ? "iPad" : /iPhone/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "Other";
  const browser = /CriOS|Chrome/.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : /Firefox/.test(ua) ? "Firefox" : "";
  const screen = typeof window === "undefined" ? "" : `${window.innerWidth}×${window.innerHeight}`;
  return { platform: browser ? `${platform}, ${browser}` : platform, screen };
}
