export type AuthPlatform = "ios-native" | "android-native" | "web";
export type SignProvider = "apple" | "google" | "email";

/** Where this page is running. Android Chrome and desktop browsers are `web`. */
export function authPlatform(input: { native: boolean; os: string }): AuthPlatform {
  if (input.native && input.os === "ios") return "ios-native";
  if (input.native && input.os === "android") return "android-native";
  return "web";
}

/**
 * Apple and Google on a native shell use the Capacitor plugin.
 * Email always uses the Firebase web SDK, including inside the iPhone app.
 * Phone and desktop browsers use the web SDK too.
 */
export function providerTransport(platform: AuthPlatform, provider: SignProvider): "native" | "web" {
  if (provider === "email") return "web";
  if (platform === "web") return "web";
  return "native";
}

/** A narrow browser uses a full-page redirect. A wide browser uses a popup. */
export function webSignInFlow(narrow: boolean): "popup" | "redirect" {
  return narrow ? "redirect" : "popup";
}

export function magicContinueUrl(href: string): string {
  const url = new URL(href);
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function friendlyAuthError(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
  const message = error instanceof Error ? error.message : "";
  if (code === "auth/invalid-email") return "That email does not look right.";
  if (code === "auth/wrong-password" || code === "auth/invalid-credential" || code === "auth/user-not-found") {
    return "That email and password did not match.";
  }
  if (code === "auth/email-already-in-use") return "That email already has an account. Sign in instead.";
  if (code === "auth/weak-password") return "Use a password of at least 8 characters.";
  if (code === "auth/popup-blocked" || code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
    return "The sign-in window was closed.";
  }
  if (code === "auth/network-request-failed") return "You are offline. LittleNest still works on this device.";
  if (code === "auth/operation-not-allowed") return "That sign-in method is not turned on yet.";
  if (code === "auth/requires-recent-login") return "Sign in again, then delete the account.";
  if (/not implemented|UNIMPLEMENTED|plugin is not implemented/i.test(message)) {
    return "Apple and Google on the iPhone app need the setup in the grown-up guide. Email still works here, and Safari can use Apple or Google.";
  }
  if (/plist is missing|Firebase was not configured/i.test(message)) {
    return "This iPhone build does not have the sign-in file yet. Email still works here.";
  }
  if (!code && error instanceof Error && error.message) return error.message;
  return "Sign-in did not finish. LittleNest still works on this device.";
}

export type PreviewMode = "ready" | "signed-in" | "school-admin" | "school-teacher" | "school-parent";

const PREVIEW_MODES: readonly PreviewMode[] = ["ready", "signed-in", "school-admin", "school-teacher", "school-parent"];

/** A local preview for the dev server only. Production builds ignore it. */
export function readPreview(dev: boolean, stored: string | null): PreviewMode | null {
  if (!dev) return null;
  if (stored && (PREVIEW_MODES as readonly string[]).includes(stored)) return stored as PreviewMode;
  return null;
}
