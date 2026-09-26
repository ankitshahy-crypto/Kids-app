import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../settings";

class Param {
  value = 0;
  cancelScheduledValues(): void {}
  linearRampToValueAtTime(value: number): void {
    this.value = value;
  }
  setValueAtTime(value: number): void {
    this.value = value;
  }
  exponentialRampToValueAtTime(value: number): void {
    this.value = value;
  }
}

class FakeGain {
  gain = new Param();
  connect(): void {}
}

class FakeSource {
  buffer: unknown = null;
  onended: (() => void) | null = null;
  connected: unknown = null;
  connect(node: unknown): void {
    this.connected = node;
  }
  start(): void {
    this.onended?.();
  }
  stop(): void {}
}

class FakeAudio {
  static srcs: string[] = [];
  volume = 1;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public src = "") {
    FakeAudio.srcs.push(src);
  }
  play(): Promise<void> {
    queueMicrotask(() => this.onended?.());
    return Promise.resolve();
  }
  pause(): void {}
}

function stubAudio(options: { state?: string; decode?: () => Promise<unknown>; play?: () => Promise<void> }) {
  const gains: FakeGain[] = [];
  const source = new FakeSource();
  const state = options.state ?? "running";
  const ctx = {
    state,
    currentTime: 0,
    sampleRate: 22050,
    destination: {},
    resume: () => Promise.resolve(),
    createGain: () => {
      const gain = new FakeGain();
      gains.push(gain);
      return gain;
    },
    createBufferSource: () => source,
    decodeAudioData: options.decode ?? (() => Promise.resolve({ duration: 0.2 })),
  };
  vi.stubGlobal("navigator", { userAgent: "node", platform: "Linux", maxTouchPoints: 0 });
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => undefined });
  if (options.play) FakeAudio.prototype.play = options.play;
  vi.stubGlobal("Audio", FakeAudio);
  vi.stubGlobal("window", {
    AudioContext: function AudioContext() {
      return ctx;
    },
    Audio: FakeAudio,
    localStorage: { getItem: () => null, setItem: () => undefined },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      headers: { get: () => "audio/mpeg" },
      arrayBuffer: async () => new ArrayBuffer(8),
    })),
  );
  return { gains, source };
}

describe("playOnBus", () => {
  afterEach(() => {
    FakeAudio.srcs = [];
    FakeAudio.prototype.play = function play(this: FakeAudio) {
      queueMicrotask(() => this.onended?.());
      return Promise.resolve();
    };
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("routes a file through the voice GainNode when Web Audio can decode it", async () => {
    const { gains, source } = stubAudio({});
    const { applyAudioSettings, playOnBus } = await import("./manager");
    applyAudioSettings({ ...DEFAULT_SETTINGS, voiceVolume: 0.4, effects: false, effectsVolume: 0 });
    const signal = new AbortController().signal;
    await playOnBus("/clip.mp3", "voice", signal);

    expect(FakeAudio.srcs).not.toContain("/clip.mp3");
    expect(gains).toHaveLength(3);
    expect(source.connected).toBe(gains[2]);
    expect(gains[2].gain.value).toBeCloseTo(0.4);
    expect(gains[1].gain.value).toBe(0);
  });

  it("falls back to an audio element when decode fails", async () => {
    stubAudio({ decode: () => Promise.reject(new Error("bad file")) });
    const { applyAudioSettings, playOnBus } = await import("./manager");
    applyAudioSettings(DEFAULT_SETTINGS);
    await playOnBus("/clip.mp3", "voice", new AbortController().signal);
    expect(FakeAudio.srcs).toContain("/clip.mp3");
  });

  it("falls back to an audio element when the context never starts", async () => {
    stubAudio({ state: "suspended" });
    const { applyAudioSettings, playOnBus } = await import("./manager");
    applyAudioSettings(DEFAULT_SETTINGS);
    await playOnBus("/clip.mp3", "effects", new AbortController().signal);
    expect(FakeAudio.srcs).toContain("/clip.mp3");
  });

  it("rejects when the element cannot play either", async () => {
    stubAudio({
      decode: () => Promise.reject(new Error("bad file")),
      play: () => Promise.reject(new Error("blocked")),
    });
    const { applyAudioSettings, playOnBus } = await import("./manager");
    applyAudioSettings(DEFAULT_SETTINGS);
    await expect(playOnBus("/clip.mp3", "voice", new AbortController().signal)).rejects.toThrow(/blocked|play/i);
  });
});
