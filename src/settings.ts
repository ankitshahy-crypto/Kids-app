import { SETTINGS_KEY, readStored, writeStored } from "./storage";

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
  /** Soft tap sound and a short buzz. Dragging a word does not use this. */
  tapFeedback: boolean;
  speed: SpeechSpeed;
  /** Device voice chosen in Settings. Null uses the best installed en-US voice. */
  voiceURI: string | null;
  /** Daily active-reading goal. One bonus star, then no more for extra time. */
  readingGoal: 5 | 10 | 15;
  /** Short grown-up prompts at the start or end of a lesson. */
  showTips: boolean;
};

/**
 * speechSynthesis rate. 1 is a typical speaking pace.
 * Both steps stay near that pace so the voice does not sound dragged out.
 */
export const SPEECH_RATES: Record<SpeechSpeed, number> = {
  slow: 0.9,
  slower: 0.85,
};

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  voice: true,
  voiceVolume: 1,
  effects: true,
  effectsVolume: 0.55,
  music: true,
  musicVolume: 0.35,
  tapFeedback: true,
  speed: "slow",
  voiceURI: null,
  readingGoal: 10,
  showTips: true,
};

function clampVolume(value: unknown, fallback: number): number {
  const number = typeof value === "number" ? value : fallback;
  if (!Number.isFinite(number)) return fallback;
  return Math.min(1, Math.max(0, number));
}

const STORAGE_KEY = SETTINGS_KEY;

export function loadSettings(): Settings {
  try {
    const raw = readStored(localStorage, STORAGE_KEY);
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
      tapFeedback: record.tapFeedback !== false,
      speed: record.speed === "slower" ? "slower" : "slow",
      voiceURI: typeof record.voiceURI === "string" && record.voiceURI ? record.voiceURI : null,
      readingGoal: record.readingGoal === 5 || record.readingGoal === 15 ? record.readingGoal : 10,
      showTips: record.showTips !== false,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  writeStored(localStorage, STORAGE_KEY, JSON.stringify(settings));
}
