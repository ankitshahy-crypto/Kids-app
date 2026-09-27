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
  /**
   * Lesson length in minutes of active play. One bonus star when it is reached,
   * then a gentle wrap-up. The child never sees a clock.
   */
  readingGoal: LessonMinutes;
  /** Short grown-up prompts at the start or end of a lesson. */
  showTips: boolean;
  /** Numbers, colors, games, and later Explore courses. Off leaves reading only. */
  showExplore: boolean;
  /** Python for the same Build It program. Off until a grown-up turns it on. */
  showCode: boolean;
  /** Less motion, softer colors, no confetti, no sudden sounds. */
  calm: boolean;
  /** How many times a day "One more?" is offered after the lesson or the time is done. */
  extraChunks: ExtraChunks;
  /** Wider tracing lanes. Calm mode turns this on as well. */
  easierTracing: boolean;
  /** A rounder, more open typeface for letters and words. */
  readableFont: boolean;
  /** Extra space between letters and words. */
  letterSpacing: boolean;
  /** Darker text on plainer backgrounds. */
  highContrast: boolean;
};

export type LessonMinutes = 2 | 5 | 10;
export const LESSON_MINUTES: readonly LessonMinutes[] = [2, 5, 10];

export type ExtraChunks = 0 | 1 | 2 | 3;
export const EXTRA_CHUNKS: readonly ExtraChunks[] = [0, 1, 2, 3];

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
  readingGoal: 5,
  showTips: true,
  showExplore: true,
  showCode: false,
  calm: false,
  extraChunks: 1,
  easierTracing: false,
  readableFont: false,
  letterSpacing: false,
  highContrast: false,
};

/** Older saves kept a 5, 10, or 15 minute goal. 15 becomes 10, the longest lesson now. */
function lessonMinutes(value: unknown): LessonMinutes {
  if (value === 2 || value === 5 || value === 10) return value;
  if (value === 15) return 10;
  return DEFAULT_SETTINGS.readingGoal;
}

function extraChunks(value: unknown): ExtraChunks {
  return value === 0 || value === 1 || value === 2 || value === 3 ? value : DEFAULT_SETTINGS.extraChunks;
}

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
      readingGoal: lessonMinutes(record.readingGoal),
      showTips: record.showTips !== false,
      showExplore: record.showExplore !== false,
      showCode: record.showCode === true,
      calm: record.calm === true,
      extraChunks: extraChunks(record.extraChunks),
      easierTracing: record.easierTracing === true,
      readableFont: record.readableFont === true,
      letterSpacing: record.letterSpacing === true,
      highContrast: record.highContrast === true,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  writeStored(localStorage, STORAGE_KEY, JSON.stringify(settings));
}
