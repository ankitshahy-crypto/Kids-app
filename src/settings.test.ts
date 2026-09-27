import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "./settings";
import { SETTINGS_KEY } from "./storage";

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    dump: () => Object.fromEntries(data),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("comfort settings", () => {
  it("start off, with a five-minute lesson and one extra chunk", () => {
    vi.stubGlobal("localStorage", memory());
    const settings = loadSettings();
    expect(settings.calm).toBe(false);
    expect(settings.easierTracing).toBe(false);
    expect(settings.readableFont).toBe(false);
    expect(settings.letterSpacing).toBe(false);
    expect(settings.highContrast).toBe(false);
    expect(settings.readingGoal).toBe(5);
    expect(settings.extraChunks).toBe(1);
    expect(settings.voice).toBe(true);
    expect(settings.music).toBe(true);
    expect(settings.effects).toBe(true);
  });

  it("save to this device and load back exactly", () => {
    const store = memory();
    vi.stubGlobal("localStorage", store);
    saveSettings({
      ...DEFAULT_SETTINGS,
      calm: true,
      easierTracing: true,
      readableFont: true,
      letterSpacing: true,
      highContrast: true,
      readingGoal: 2,
      extraChunks: 3,
      music: false,
      speed: "slower",
    });
    expect(Object.keys(store.dump())).toContain(SETTINGS_KEY);
    const loaded = loadSettings();
    expect(loaded.calm).toBe(true);
    expect(loaded.easierTracing).toBe(true);
    expect(loaded.readableFont).toBe(true);
    expect(loaded.letterSpacing).toBe(true);
    expect(loaded.highContrast).toBe(true);
    expect(loaded.readingGoal).toBe(2);
    expect(loaded.extraChunks).toBe(3);
    expect(loaded.music).toBe(false);
    expect(loaded.speed).toBe("slower");
  });

  it("keeps an older save readable and moves a 15-minute goal to 10", () => {
    const store = memory();
    store.setItem(SETTINGS_KEY, JSON.stringify({ sound: true, readingGoal: 15, calm: "yes", extraChunks: 9 }));
    vi.stubGlobal("localStorage", store);
    const loaded = loadSettings();
    expect(loaded.readingGoal).toBe(10);
    expect(loaded.calm).toBe(false);
    expect(loaded.extraChunks).toBe(1);
    store.setItem(SETTINGS_KEY, JSON.stringify({ readingGoal: 10, extraChunks: 0 }));
    expect(loadSettings().readingGoal).toBe(10);
    expect(loadSettings().extraChunks).toBe(0);
  });
});
