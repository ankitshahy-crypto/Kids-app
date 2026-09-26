export type SpeechSpeed = "slow" | "slower";

export type Settings = {
  /** Voice on or off. Kept in step with `sound` so older saves still apply. */
  sound: boolean;
  voice: boolean;
  /** 0 to 1. */
  voiceVolume: number;
  effects: boolean;
  effectsVolume: number;
  music: boolean;
  musicVolume: number;
  speed: SpeechSpeed;
};

/** speechSynthesis rate. 1 is a typical speaking pace. */
export const SPEECH_RATES: Record<SpeechSpeed, number> = {
  slow: 0.68,
  slower: 0.5,
};

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  voice: true,
  voiceVolume: 1,
  effects: true,
  effectsVolume: 0.55,
  music: true,
  musicVolume: 0.35,
  speed: "slow",
};

function clampVolume(value: unknown, fallback: number): number {
  const number = typeof value === "number" ? value : fallback;
  if (!Number.isFinite(number)) return fallback;
  return Math.min(1, Math.max(0, number));
}

const STORAGE_KEY = "kids-app-settings-v1";

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return DEFAULT_SETTINGS;
    const record = parsed as Partial<Settings>;
    const voice = typeof record.voice === "boolean" ? record.voice : record.sound !== false;
    return {
      sound: voice,
      voice,
      voiceVolume: clampVolume(record.voiceVolume, DEFAULT_SETTINGS.voiceVolume),
      effects: record.effects !== false,
      effectsVolume: clampVolume(record.effectsVolume, DEFAULT_SETTINGS.effectsVolume),
      music: record.music !== false,
      musicVolume: clampVolume(record.musicVolume, DEFAULT_SETTINGS.musicVolume),
      speed: record.speed === "slower" ? "slower" : "slow",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
