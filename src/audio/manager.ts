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

/**
 * `boop` is the soft "try again" of a wrong tap; `thud` is a low beat that means nothing is wrong
 * (Build It's drum, a bite taken in Feed). The two used to be one low tone.
 */
export type EffectName = "tap" | "pop" | "chime" | "boop" | "thud" | "celebrate" | "cheer";

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

/**
 * One tone of an effect: a sine that glides from one pitch to another (an exponential glide), `at`
 * seconds into the effect, for `seconds`. It swells to `peak` over its first 20 ms and fades to
 * nothing by its end.
 */
type Tone = { from: number; to: number; at: number; seconds: number; peak: number };

const PEAK = 0.12;
const SWELL = 0.02;
const FLOOR = 0.0001;

const EFFECT_TONES: Record<EffectName, Tone[]> = {
  tap: [{ from: 740, to: 560, at: 0, seconds: 0.035, peak: PEAK * 0.22 }],
  pop: [{ from: 520, to: 760, at: 0, seconds: 0.07, peak: PEAK }],
  chime: [
    { from: 784, to: 784, at: 0, seconds: 0.28, peak: PEAK * 0.7 },
    { from: 1175, to: 1175, at: 0.02, seconds: 0.32, peak: PEAK * 0.35 },
  ],
  // Two short falling notes, "bo-op", a fourth and more above any voice's hum. The miss used to be
  // one low tone (240 to 180 Hz, 140 ms), and in the playtest of build 4 the flat hum of /n/ in the
  // slow sounding-out of "tent" (a 150 Hz hum, a third of a second) was heard as that buzzer, so the
  // N on the card seemed to be called wrong. Two separate notes are not a sound a mouth makes.
  boop: [
    { from: 392, to: 349, at: 0, seconds: 0.07, peak: PEAK * 0.5 },
    { from: 330, to: 262, at: 0.11, seconds: 0.1, peak: PEAK * 0.5 },
  ],
  thud: [{ from: 240, to: 180, at: 0, seconds: 0.14, peak: PEAK * 0.55 }],
  cheer: [
    { from: 523, to: 523, at: 0, seconds: 0.12, peak: PEAK * 0.45 },
    { from: 659, to: 659, at: 0.1, seconds: 0.12, peak: PEAK * 0.45 },
    { from: 784, to: 784, at: 0.2, seconds: 0.16, peak: PEAK * 0.5 },
    { from: 1046, to: 1046, at: 0.32, seconds: 0.22, peak: PEAK * 0.4 },
  ],
  celebrate: [
    { from: 523, to: 523, at: 0, seconds: 0.16, peak: PEAK * 0.55 },
    { from: 659, to: 659, at: 0.14, seconds: 0.16, peak: PEAK * 0.55 },
    { from: 784, to: 784, at: 0.28, seconds: 0.28, peak: PEAK * 0.6 },
  ],
};

function envelope(t: number, seconds: number, peak: number): number {
  const top = Math.max(FLOOR * 2, peak);
  if (t <= SWELL) return FLOOR * Math.pow(top / FLOOR, t / SWELL);
  if (t <= seconds) return top * Math.pow(FLOOR / top, (t - SWELL) / Math.max(SWELL, seconds - SWELL));
  return FLOOR;
}

/**
 * An effect as samples, at `rate` samples a second: its tones added together, each 20 ms longer
 * than its fade (as the oscillators were stopped then).
 *
 * The effects used to be oscillators started at the context's clock (`currentTime`) with their
 * swell and fade scheduled from it. On an iPhone that clock can trail the sound being played: the
 * start, and the whole of a short effect, then lay in the past. In the playtest of build 3 a
 * chime came out as its last tenth of a second, and a tap, a pop or a boop (35 to 140 ms) not at
 * all: Make a dance's sing steps were silent. Rendered once and started with no time (as the voice
 * clips are, which were heard every time), an effect is played whole.
 */
export function renderEffect(name: EffectName, rate: number): Float32Array {
  const tones = EFFECT_TONES[name];
  const length = Math.max(...tones.map((tone) => tone.at + tone.seconds + 0.02));
  const out = new Float32Array(Math.ceil(length * rate));
  for (const tone of tones) {
    const first = Math.round(tone.at * rate);
    const count = Math.round((tone.seconds + 0.02) * rate);
    let phase = 0;
    for (let index = 0; index < count && first + index < out.length; index += 1) {
      const t = index / rate;
      const hz = tone.from * Math.pow(tone.to / tone.from, Math.min(1, t / tone.seconds));
      phase += (2 * Math.PI * hz) / rate;
      out[first + index] += Math.sin(phase) * envelope(t, tone.seconds, tone.peak);
    }
  }
  return out;
}

/** The rendered effects of the context, made the first time each is played. */
const rendered = new Map<EffectName, AudioBuffer>();

function effectBuffer(ctx: AudioContext, name: EffectName): AudioBuffer {
  const kept = rendered.get(name);
  if (kept && kept.sampleRate === ctx.sampleRate) return kept;
  const samples = renderEffect(name, ctx.sampleRate);
  const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
  buffer.getChannelData(0).set(samples);
  rendered.set(name, buffer);
  return buffer;
}

/** A WAV file of 16-bit samples, for an effect played on an audio element. */
function wavFile(samples: Float32Array, rate: number): ArrayBuffer {
  const bytes = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(bytes);
  const text = (at: number, value: string) => [...value].forEach((char, index) => view.setUint8(at + index, char.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, index) => view.setInt16(44 + index * 2, Math.max(-1, Math.min(1, sample)) * 0x7fff, true));
  return bytes;
}

/** Effects as files, by effect and loudness (an audio element's volume cannot be set on iOS). */
const effectFiles = new Map<string, string>();

/**
 * An effect played on an audio element: when the context is suspended or interrupted and does not
 * start again at once (it starts again only inside a tap on iOS), as the voice clips do then.
 */
function playEffectElement(name: EffectName, level: number): void {
  // A test browser has no audio device, and an element played there can bring WebKit down.
  if (level <= 0 || typeof Audio === "undefined" || (typeof navigator !== "undefined" && navigator.webdriver)) return;
  announceEffect(name);
  try {
    const key = `${name}@${Math.round(level * 20)}`;
    let url = effectFiles.get(key);
    if (!url) {
      const rate = 22050;
      const samples = renderEffect(name, rate).map((sample) => sample * level);
      url = URL.createObjectURL(new Blob([wavFile(samples, rate)], { type: "audio/wav" }));
      effectFiles.set(key, url);
    }
    const audio = new Audio(url);
    void audio.play().catch(() => undefined);
  } catch {
    // No element either: the lesson goes on without the effect.
  }
}

/**
 * An effect has started. Nothing in the app listens: this is how the end-to-end tests count the
 * effects a screen played (they used to count the oscillators the effects started).
 */
function announceEffect(name: EffectName): void {
  try {
    window.dispatchEvent(new CustomEvent("littlenest:effect", { detail: name }));
  } catch {
    // No window, or no CustomEvent: nothing to tell.
  }
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
  const sound = calmEffect(name, current);
  const ctx = ensure();
  if (!ctx) {
    playEffectElement(sound, effectsLevel());
    return;
  }
  if (ctx.state === "running") {
    refreshGains();
    startEffect(ctx, sound);
    return;
  }
  // Suspended or interrupted: inside a tap it starts again at once. If it has not by the time a
  // short effect would be over, the effect is played on an audio element instead.
  let played = false;
  const viaContext = () => {
    if (played || ctx.state !== "running") return;
    played = true;
    refreshGains();
    startEffect(ctx, sound);
  };
  void ctx.resume().then(viaContext).catch(() => undefined);
  setTimeout(() => {
    if (played) return;
    played = true;
    playEffectElement(sound, effectsLevel());
  }, 120);
}

/**
 * A source for an effect, made with its own constructor rather than createBufferSource, which is
 * the voice's: what watches the voice clips (the end-to-end tests) sees the voice alone, as it did
 * when effects were oscillators. (createBufferSource where the constructor is missing.)
 */
function effectSource(ctx: AudioContext, buffer: AudioBuffer): AudioBufferSourceNode {
  try {
    return new AudioBufferSourceNode(ctx, { buffer });
  } catch {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    return source;
  }
}

function startEffect(ctx: AudioContext, name: EffectName): void {
  try {
    const source = effectSource(ctx, effectBuffer(ctx, name));
    source.connect(effectsGain ?? ctx.destination);
    // No start time: see renderEffect.
    source.start();
    announceEffect(name);
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

/**
 * Short clips that are ready to play at once: the letter sounds of the card on
 * screen. Without this each sound was fetched and decoded when the slider
 * reached its tile, and on a phone that took longer than a child takes to
 * slide to the next letter, so the sounds came late or not at all.
 */
const READY_CLIPS = 32;
const READY_CLIP_SECONDS = 3;
const ready = new Map<string, AudioBuffer>();

function keepReady(src: string, buffer: AudioBuffer): void {
  if (buffer.duration > READY_CLIP_SECONDS) return;
  ready.delete(src);
  ready.set(src, buffer);
  // The oldest goes first: a Map keeps the order its keys were set in.
  while (ready.size > READY_CLIPS) ready.delete(ready.keys().next().value as string);
}

/**
 * A clip has started playing. Nothing in the app listens: this is how the
 * end-to-end tests know what was said. They used to count a clip when its
 * bytes were read, which is no longer the moment it plays, now that a card's
 * sounds are loaded ahead of the slide.
 */
function announce(src: string): void {
  try {
    window.dispatchEvent(new CustomEvent("littlenest:clip", { detail: src }));
  } catch {
    // No window, or no CustomEvent: nothing to tell.
  }
}

async function loadBuffer(ctx: AudioContext, src: string, signal?: AbortSignal, ahead = false): Promise<AudioBuffer> {
  const kept = ready.get(src);
  if (kept) return kept;
  // Loading ahead is marked low priority, like the offline download, so it never delays a clip being played now.
  const response = await fetch(src, ahead ? ({ priority: "low" } as RequestInit) : signal ? { signal } : undefined);
  if (!response.ok) throw new Error(`Could not play ${src}`);
  const type = response.headers?.get?.("content-type") ?? "";
  if (type.includes("text/html")) throw new Error(`Could not play ${src}`);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength === 0) throw new Error(`Could not play ${src}`);
  if (signal?.aborted) throw aborted();
  let buffer: AudioBuffer;
  try {
    buffer = await ctx.decodeAudioData(bytes.slice(0));
  } catch {
    throw new Error(`Could not decode ${src}`);
  }
  keepReady(src, buffer);
  return buffer;
}

/**
 * Get these clips ready before they are asked for (the tiles of the card that
 * has just appeared). Best effort: a clip that cannot be loaded now is loaded
 * when it is played, as before.
 */
export function warmClips(sources: readonly (string | undefined)[]): void {
  const ctx = ensure();
  if (!ctx) return;
  for (const src of sources) {
    if (!src || ready.has(src)) continue;
    void loadBuffer(ctx, src, undefined, true).catch(() => undefined);
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
  const buffer = await loadBuffer(ctx, src, signal);
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
      announce(src);
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
        announce(src);
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
