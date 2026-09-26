export type SpeechSpeed = "slow" | "slower";

export type Settings = {
  sound: boolean;
  speed: SpeechSpeed;
};

/** speechSynthesis rate. 1 is a typical speaking pace. */
export const SPEECH_RATES: Record<SpeechSpeed, number> = {
  slow: 0.68,
  slower: 0.5,
};

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  speed: "slow",
};

const STORAGE_KEY = "kids-app-settings-v1";

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return DEFAULT_SETTINGS;
    const record = parsed as Partial<Settings>;
    return {
      sound: record.sound !== false,
      speed: record.speed === "slower" ? "slower" : "slow",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
