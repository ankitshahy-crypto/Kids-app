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

describe("effects", () => {
  afterEach(() => {
    FakeAudio.srcs = [];
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("are rendered whole: a short swell, a fade to nothing, never louder than their peak", async () => {
    const { renderEffect } = await import("./manager");
    for (const name of ["tap", "pop", "chime", "boop", "cheer", "celebrate"] as const) {
      const samples = renderEffect(name, 22050);
      const peak = Math.max(...samples.map(Math.abs));
      expect(peak, name).toBeGreaterThan(0.01);
      expect(peak, name).toBeLessThanOrEqual(0.13);
      expect(Math.abs(samples[0]), name).toBeLessThan(0.001);
      expect(Math.abs(samples[samples.length - 1]), name).toBeLessThan(0.001);
    }
    // The pop is 70 ms and 20 ms more; the chime's second tone ends at 0.36 s.
    expect(Math.abs(renderEffect("pop", 22050).length - 0.09 * 22050)).toBeLessThanOrEqual(1);
    expect(Math.abs(renderEffect("chime", 22050).length - 0.36 * 22050)).toBeLessThanOrEqual(1);
  });

  it("start at once, with no time from the context's clock, on the effects channel", async () => {
    // On an iPhone the clock could trail the sound being played: an effect started at it was cut,
    // or not heard at all (the playtest of build 3: Make a dance's sing steps were silent).
    const { gains, source } = stubAudio({});
    const started: unknown[][] = [];
    source.start = (...args: unknown[]) => {
      started.push(args);
    };
    const made: { length: number }[] = [];
    const ctx = (globalThis as unknown as { window: { AudioContext: () => Record<string, unknown> } }).window.AudioContext();
    ctx.createBuffer = (_channels: number, length: number) => {
      const data = new Float32Array(length);
      made.push(data);
      return { sampleRate: 22050, getChannelData: () => data };
    };
    const { applyAudioSettings, playEffect } = await import("./manager");
    applyAudioSettings(DEFAULT_SETTINGS);
    playEffect("pop");
    playEffect("pop");
    expect(started).toEqual([[], []]);
    expect(source.connected).toBe(gains[1]);
    // Rendered once, and played from that.
    expect(made).toHaveLength(1);
    expect(Math.max(...Array.from(made[0] as Float32Array, Math.abs))).toBeGreaterThan(0.05);
  });

  it("play on an audio element when the context will not start", async () => {
    stubAudio({ state: "suspended" });
    const window = (globalThis as unknown as { window: { AudioContext: () => Record<string, unknown> } }).window;
    const context = window.AudioContext();
    context.resume = () => new Promise(() => undefined);
    // The module is loaded before the clock is faked, and URL is Node's own (its createObjectURL
    // makes a blob: address): the test runner loads modules with both.
    const { applyAudioSettings, playEffect } = await import("./manager");
    applyAudioSettings(DEFAULT_SETTINGS);
    vi.useFakeTimers();
    try {
      playEffect("boop");
      expect(FakeAudio.srcs).toEqual([]);
      await vi.advanceTimersByTimeAsync(150);
      expect(FakeAudio.srcs).toHaveLength(1);
      expect(FakeAudio.srcs[0]).toMatch(/^blob:/);
    } finally {
      vi.useRealTimers();
    }
  });
});
