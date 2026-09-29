import type { Settings } from "../settings";
import { SILENT_HINT_KEY, readStored, writeStored } from "../storage";
import { isIos, isNativeApp } from "./platform";

/**
 * Soft sounds for the lesson. Effects are synthesized. Recorded clips and
 * future music files play through a GainNode so the parent sliders work on
 * iOS, where an audio element's volume is read-only.
 *
 * TODO(music): play a soft loop per area once a licensed file exists.
 * Calm for Today and Play, gentle for stories. Do not add a file until it is
 * logged in ASSETS.md. Tracing focus (`focus`) stays silent.
 */

export type EffectName = "tap" | "pop" | "chime" | "boop" | "celebrate" | "cheer";

export type MusicArea = "today" | "play" | "story" | "focus" | "none";

export type AudioBus = "voice" | "effects" | "music";

const DUCK = 0.22;
const SILENT_HINT_STORAGE_KEY = SILENT_HINT_KEY;
const SILENT_HINT = "If you don't hear anything, the switch on the side of the phone may be muting sound.";

let context: AudioContext | null = null;
let musicGain: GainNode | null = null;
let effectsGain: GainNode | null = null;
let voiceGain: GainNode | null = null;
let duckDepth = 0;
let area: MusicArea = "none";
let latest: Settings | null = null;
let silentHint: string | null = null;
const hintListeners = new Set<(text: string | null) => void>();

function audioCtor(): typeof AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  return window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

function ensure(): AudioContext | null {
  const Ctor = audioCtor();
  if (!Ctor) return null;
  if (!context) {
    context = new Ctor();
    musicGain = context.createGain();
    effectsGain = context.createGain();
    voiceGain = context.createGain();
    musicGain.gain.value = 0;
    effectsGain.gain.value = 0;
    voiceGain.gain.value = 0;
    musicGain.connect(context.destination);
    effectsGain.connect(context.destination);
    voiceGain.connect(context.destination);
  }
  return context;
}

function busNode(bus: AudioBus): GainNode | null {
  if (bus === "voice") return voiceGain;
  if (bus === "effects") return effectsGain;
  return musicGain;
}

function isBlocked(state: AudioContextState | string): boolean {
  return state === "suspended" || state === "interrupted";
}

/**
 * One silent sample. Playing it inside a tap unlocks later file playback
 * on iOS, where play() is ignored until a gesture has started audio.
 */
const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

function startSilentBuffer(ctx: AudioContext): void {
  try {
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate || 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch {
    // resume() in the same gesture is still the important call.
  }
}

function startSilentElement(): void {
  // A data-URI element crashes headless WebKit (no audio device). Real phones
  // still need this play() inside the tap so later clips are allowed.
  if (typeof navigator !== "undefined" && navigator.webdriver) return;
  try {
    const audio = new Audio(SILENT_WAV);
    void audio.play().catch(() => undefined);
  } catch {
    // The Web Audio buffer is the other unlock path.
  }
}

/**
 * Call synchronously from a tap, touchend, or click. iOS only accepts
 * resume() inside that gesture, and the context can drop back to
 * "suspended" or "interrupted" later.
 */
let didUnlockGesture = false;

export function unlockAudio(): void {
  try {
    const ctx = ensure();
    if (ctx && isBlocked(ctx.state)) void ctx.resume().catch(() => undefined);
    if (!didUnlockGesture) {
      didUnlockGesture = true;
      if (ctx) startSilentBuffer(ctx);
      startSilentElement();
    }
    refreshGains();
    // The hint is a small toast. Showing it in this turn can steal the gesture
    // iOS just granted, so wait until the tap handler has finished.
    setTimeout(showSilentHintOnce, 0);
  } catch {
    // Creating a context can throw when no audio device is available.
  }
}

export function applyAudioSettings(settings: Settings): void {
  latest = settings;
  refreshGains();
}

export function setMusicArea(next: MusicArea): void {
  area = next;
  // TODO(music): start or stop the loop for `next` here. No file is loaded yet,
  // so the music bus stays quiet until a clip is played on it. Gain still
  // follows the parent settings and ducking.
  refreshGains();
}

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function musicLevel(): number {
  if (!latest?.music || area === "none" || area === "focus") return 0;
  const base = clampVolume(latest.musicVolume);
  return duckDepth > 0 ? base * DUCK : base;
}

function voiceLevel(): number {
  if (!latest?.voice) return 0;
  return clampVolume(latest.voiceVolume);
}

function effectsLevel(): number {
  if (!latest?.effects) return 0;
  return clampVolume(latest.effectsVolume);
}

function refreshGains(): void {
  const ctx = context;
  if (!ctx || !musicGain || !effectsGain || !voiceGain || !latest) return;
  const set = (node: GainNode, value: number) => {
    node.gain.value = value;
  };
  set(musicGain, musicLevel());
  set(effectsGain, effectsLevel());
  set(voiceGain, voiceLevel());
  publishDebug();
}

type AudioDebug = {
  state: string;
  voice: number;
  effects: number;
  music: number;
};

function publishDebug(): void {
  if (!import.meta.env.DEV || typeof window === "undefined" || !context || !voiceGain || !effectsGain || !musicGain) return;
  const snapshot = {
    state: context.state,
    voice: voiceGain.gain.value,
    effects: effectsGain.gain.value,
    music: musicGain.gain.value,
  };
  (window as Window & { __littlenestAudio?: AudioDebug }).__littlenestAudio = snapshot;
}

/** Lower the music bus while a voice or letter sound plays. */
export function beginVoice(): void {
  duckDepth += 1;
  refreshGains();
}

export function endVoice(): void {
  duckDepth = Math.max(0, duckDepth - 1);
  refreshGains();
}

function envGain(ctx: AudioContext, start: number, peak: number, seconds: number): GainNode {
  const node = ctx.createGain();
  const bus = effectsGain ?? ctx.destination;
  node.connect(bus);
  node.gain.setValueAtTime(0.0001, start);
  node.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + 0.02);
  node.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  return node;
}

function tone(
  ctx: AudioContext,
  fromHz: number,
  toHz: number,
  start: number,
  seconds: number,
  peak: number,
): void {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(fromHz, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, toHz), start + seconds);
  osc.connect(envGain(ctx, start, peak, seconds));
  osc.start(start);
  osc.stop(start + seconds + 0.02);
}

/** Short, soft effects. The effects slider is the bus gain, not this peak. */
/** Calm mode swaps the loud, sudden effects for the soft chime. */
export function calmEffect(name: EffectName, settings: Pick<Settings, "calm"> | undefined): EffectName {
  if (!settings?.calm) return name;
  return name === "cheer" || name === "celebrate" ? "chime" : name;
}

export function playEffect(name: EffectName, settings?: Settings): void {
  if (settings) latest = settings;
  const current = latest;
  if (!current?.effects || clampVolume(current.effectsVolume) <= 0) return;
  const ctx = ensure();
  if (!ctx) return;
  const sound = calmEffect(name, current);
  const run = () => {
    if (ctx.state !== "running") return;
    refreshGains();
    startEffect(ctx, sound);
  };
  if (isBlocked(ctx.state)) void ctx.resume().then(run).catch(() => undefined);
  else run();
}

function startEffect(ctx: AudioContext, name: EffectName): void {
  const now = ctx.currentTime;
  const peak = 0.12;
  try {
    if (name === "tap") {
      tone(ctx, 740, 560, now, 0.035, peak * 0.22);
      return;
    }
    if (name === "pop") {
      tone(ctx, 520, 760, now, 0.07, peak);
      return;
    }
    if (name === "chime") {
      tone(ctx, 784, 784, now, 0.28, peak * 0.7);
      tone(ctx, 1175, 1175, now + 0.02, 0.32, peak * 0.35);
      return;
    }
    if (name === "boop") {
      tone(ctx, 240, 180, now, 0.14, peak * 0.55);
      return;
    }
    if (name === "cheer") {
      tone(ctx, 523, 523, now, 0.12, peak * 0.45);
      tone(ctx, 659, 659, now + 0.1, 0.12, peak * 0.45);
      tone(ctx, 784, 784, now + 0.2, 0.16, peak * 0.5);
      tone(ctx, 1046, 1046, now + 0.32, 0.22, peak * 0.4);
      return;
    }
    tone(ctx, 523, 523, now, 0.16, peak * 0.55);
    tone(ctx, 659, 659, now + 0.14, 0.16, peak * 0.55);
    tone(ctx, 784, 784, now + 0.28, 0.28, peak * 0.6);
  } catch {
    // A browser can refuse the audio graph. The lesson still continues.
  }
}

function aborted(): DOMException {
  return new DOMException("aborted", "AbortError");
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function busLevel(bus: AudioBus): number {
  if (bus === "voice") return voiceLevel();
  if (bus === "effects") return effectsLevel();
  return musicLevel();
}

/**
 * Play a file on one channel. The GainNode sets the loudness when Web Audio
 * can decode the file. If that fails, a plain audio element plays it so iOS
 * still makes a sound. The caller speaks if both fail.
 */
export async function playOnBus(src: string, bus: AudioBus, signal: AbortSignal, onStart?: (durationMs: number) => void): Promise<void> {
  if (signal.aborted) throw aborted();
  unlockAudio();
  try {
    await playBuffer(src, bus, signal, onStart);
  } catch (error) {
    if (signal.aborted || isAbort(error)) throw aborted();
    await playElement(src, bus, signal, onStart);
  }
}

/** Tell the caller the clip has started, never letting its handler stop the sound. */
function started(onStart: ((durationMs: number) => void) | undefined, seconds: number): void {
  if (!onStart) return;
  try {
    onStart(Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 0);
  } catch {
    // A read-along handler must not interrupt the voice.
  }
}

async function playBuffer(src: string, bus: AudioBus, signal: AbortSignal, onStart?: (durationMs: number) => void): Promise<void> {
  const ctx = ensure();
  if (!ctx) throw new Error("Audio is unavailable");
  if (isBlocked(ctx.state)) {
    try {
      await ctx.resume();
    } catch {
      throw new Error("Audio context did not resume");
    }
  }
  if (ctx.state !== "running") throw new Error("Audio context is not running");
  refreshGains();
  if (signal.aborted) throw aborted();
  const response = await fetch(src, { signal });
  if (!response.ok) throw new Error(`Could not play ${src}`);
  const type = response.headers?.get?.("content-type") ?? "";
  if (type.includes("text/html")) throw new Error(`Could not play ${src}`);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength === 0) throw new Error(`Could not play ${src}`);
  if (signal.aborted) throw aborted();
  let buffer: AudioBuffer;
  try {
    buffer = await ctx.decodeAudioData(bytes.slice(0));
  } catch {
    throw new Error(`Could not decode ${src}`);
  }
  if (signal.aborted) throw aborted();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(busNode(bus) ?? ctx.destination);
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      if (error) reject(error instanceof Error ? error : new Error("Could not play audio"));
      else resolve();
    };
    const onAbort = () => {
      try {
        source.stop();
      } catch {
        // The clip already ended.
      }
      finish(aborted());
    };
    const durationMs = Math.min(15000, Math.ceil((buffer.duration || 1) * 1000) + 750);
    const timer = setTimeout(() => finish(), durationMs);
    signal.addEventListener("abort", onAbort, { once: true });
    source.onended = () => finish();
    try {
      source.start();
      started(onStart, buffer.duration);
    } catch (error) {
      finish(error instanceof Error ? error : new Error("Could not play audio"));
    }
  });
}

/** Plain element playback. Used when Web Audio cannot play the file. */
function playElement(src: string, bus: AudioBus, signal: AbortSignal, onStart?: (durationMs: number) => void): Promise<void> {
  if (signal.aborted) return Promise.reject(aborted());
  const audio = new Audio(src);
  try {
    audio.volume = busLevel(bus);
  } catch {
    // iOS exposes HTMLAudioElement.volume as read-only.
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", onAbort);
      audio.onended = null;
      audio.onerror = null;
      if (error) reject(error instanceof Error ? error : new Error("Could not play audio"));
      else resolve();
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const done = (error?: unknown) => {
      clearTimeout(timer);
      finish(error);
    };
    const onAbort = () => {
      audio.pause();
      done(aborted());
    };
    signal.addEventListener("abort", onAbort, { once: true });
    audio.onended = () => done();
    audio.onerror = () => done(new Error(`Could not play ${src}`));
    let playing: Promise<void>;
    try {
      playing = audio.play();
    } catch (error) {
      done(error instanceof Error ? error : new Error("Could not play audio"));
      return;
    }
    void playing.then(
      () => {
        if (settled) return;
        started(onStart, audio.duration);
        timer = setTimeout(() => done(), 15000);
      },
      (error: unknown) => done(error instanceof Error ? error : new Error("Could not play audio")),
    );
  });
}

function showSilentHintOnce(): void {
  if (!isIos() || isNativeApp() || silentHint) return;
  try {
    if (readStored(localStorage, SILENT_HINT_STORAGE_KEY)) return;
    writeStored(localStorage, SILENT_HINT_STORAGE_KEY, "1");
  } catch {
    return;
  }
  silentHint = SILENT_HINT;
  hintListeners.forEach((listener) => listener(silentHint));
}

export function subscribeSilentHint(listener: (text: string | null) => void): () => void {
  hintListeners.add(listener);
  listener(silentHint);
  return () => hintListeners.delete(listener);
}

export function dismissSilentHint(): void {
  silentHint = null;
  hintListeners.forEach((listener) => listener(null));
}
