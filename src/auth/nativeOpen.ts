import { codeLink, type CodeKind } from "./school";

export const IOS_BUNDLE_ID = "com.triagedesk.littlenest";

/** Replace TEAMID with the Apple Team ID before the universal link goes live. */
export const APPLE_APP_ID = `TEAMID.${IOS_BUNDLE_ID}`;

/** Placeholder until a real TestFlight join code exists. The web page is the fallback. */
export const TESTFLIGHT_PLACEHOLDER = "https://testflight.apple.com/join/PLACEHOLDER";

export function prefersIosApp(userAgent: string): boolean {
  return /iPhone|iPad|iPod/i.test(userAgent);
}

export function nativeJoinUrl(kind: CodeKind, code: string): string {
  const key = kind === "teacher" ? "schoolInvite" : kind === "parent" ? "parentCode" : "classCode";
  return `littlenest://join?${key}=${encodeURIComponent(code)}`;
}

/** HTTPS universal link. iOS opens the app when the site association matches. The website is the fallback. */
export function classQrLink(href: string, code: string): string {
  const url = new URL(codeLink(href, "class", code));
  url.searchParams.set("open", "app");
  return url.toString();
}

export function shouldOpenNative(userAgent: string, search: string): boolean {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return prefersIosApp(userAgent) && params.get("open") === "app" && Boolean(params.get("classCode"));
}
