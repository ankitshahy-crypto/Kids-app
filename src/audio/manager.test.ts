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

describe("playOnBus", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("routes a file through the voice GainNode and does not use an audio element", async () => {
    const gains: FakeGain[] = [];
    const source = new FakeSource();
    let audioElements = 0;
    const ctx = {
      state: "running",
      currentTime: 0,
      destination: {},
      resume: () => Promise.resolve(),
      createGain: () => {
        const gain = new FakeGain();
        gains.push(gain);
        return gain;
      },
      createBufferSource: () => source,
      decodeAudioData: () => Promise.resolve({}),
    };
    vi.stubGlobal("navigator", { userAgent: "node", platform: "Linux", maxTouchPoints: 0 });
    vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => undefined });
    vi.stubGlobal("window", {
      AudioContext: function AudioContext() {
        return ctx;
      },
      Audio: function Audio() {
        audioElements += 1;
      },
      localStorage: { getItem: () => null, setItem: () => undefined },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })),
    );

    const { applyAudioSettings, playOnBus } = await import("./manager");
    applyAudioSettings({ ...DEFAULT_SETTINGS, voiceVolume: 0.4, effects: false, effectsVolume: 0 });
    const signal = new AbortController().signal;
    await playOnBus("/clip.mp3", "voice", signal);

    expect(audioElements).toBe(0);
    expect(gains).toHaveLength(3);
    expect(source.connected).toBe(gains[2]);
    expect(gains[2].gain.value).toBeCloseTo(0.4);
    expect(gains[1].gain.value).toBe(0);
  });
});
