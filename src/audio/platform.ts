type CapacitorWindow = Window & {
  Capacitor?: { isNativePlatform?: () => boolean };
};

/** iPhone, iPad, and iPadOS pretending to be a Mac. */
export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

/** The installed app can set a playback audio session. Safari cannot. */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as CapacitorWindow).Capacitor?.isNativePlatform?.());
}

/**
 * iOS ignores SpeechSynthesisUtterance.volume. Other browsers apply it.
 * Recorded clips do not use this; they follow the voice GainNode.
 */
export function deviceSpeechFollowsSlider(): boolean {
  return !isIos();
}
