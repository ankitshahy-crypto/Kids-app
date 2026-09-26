import type { Settings } from "../settings";

/**
 * Soft sounds for the lesson. Step 1 synthesizes a few effects in the browser.
 * No audio files are bundled.
 *
 * TODO(music): play a soft loop per area once a licensed file exists.
 * Calm for Today and Play, gentle for stories. Do not add a file until it is
 * logged in ASSETS.md. Tracing focus (`focus`) stays silent.
 */

export type EffectName = "pop" | "chime" | "boop" | "celebrate";

export type MusicArea = "today" | "play" | "story" | "focus" | "none";

const DUCK = 0.22;

let context: AudioContext | null = null;
let musicGain: GainNode | null = null;
let effectsGain: GainNode | null = null;
let duckDepth = 0;
let area: MusicArea = "none";
let latest: Settings | null = null;

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
    musicGain.gain.value = 0;
    effectsGain.gain.value = 0;
    musicGain.connect(context.destination);
    effectsGain.connect(context.destination);
  }
  return context;
}

/** Call from a tap so iOS will allow later effects. */
export function unlockAudio(): void {
  const ctx = ensure();
  if (ctx && ctx.state === "suspended") void ctx.resume();
  refreshGains();
}

export function applyAudioSettings(settings: Settings): void {
  latest = settings;
  refreshGains();
}

export function setMusicArea(next: MusicArea): void {
  area = next;
  // TODO(music): start or stop the loop for `next` here. No file is loaded yet,
  // so the music bus stays quiet. Gain still follows the parent settings and ducking.
  refreshGains();
}

function musicLevel(): number {
  if (!latest?.music || area === "none" || area === "focus") return 0;
  const base = clampVolume(latest.musicVolume);
  return duckDepth > 0 ? base * DUCK : base;
}

function refreshGains(): void {
  const ctx = context;
  if (!ctx || !musicGain || !effectsGain || !latest) return;
  const now = ctx.currentTime;
  musicGain.gain.cancelScheduledValues(now);
  musicGain.gain.linearRampToValueAtTime(musicLevel(), now + 0.08);
  const effects = latest.effects ? clampVolume(latest.effectsVolume) : 0;
  effectsGain.gain.cancelScheduledValues(now);
  effectsGain.gain.linearRampToValueAtTime(effects, now + 0.05);
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

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
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

/**
 * A soft two-note cue scheduled while the finger is still down, so iOS will
 * play it when a press-and-hold finishes. Call the returned function if the
 * hold is released early. Safari on iPhone has no vibration API.
 */
export function armUnlockCue(delayMs: number): () => void {
  unlockAudio();
  const ctx = ensure();
  if (!ctx) return () => undefined;
  const start = ctx.currentTime + delayMs / 1000;
  const nodes: OscillatorNode[] = [];
  const make = (hz: number, at: number, seconds: number, peak: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(hz, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(at);
    osc.stop(at + seconds + 0.03);
    nodes.push(osc);
  };
  try {
    make(698, start, 0.14, 0.05);
    make(880, start + 0.1, 0.18, 0.04);
  } catch {
    return () => undefined;
  }
  return () => {
    for (const osc of nodes) {
      try {
        osc.stop();
      } catch {
        // The cue already finished.
      }
    }
  };
}

export function pulseUnlock(): void {
  try {
    navigator.vibrate?.(16);
  } catch {
    // iOS Safari does not implement vibration. The scheduled cue is the sound.
  }
}

/** Short, soft effects. Never a buzzer. */
export function playEffect(name: EffectName, settings?: Settings): void {
  if (settings) latest = settings;
  const current = latest;
  if (!current?.effects || clampVolume(current.effectsVolume) <= 0) return;
  const ctx = ensure();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();
  refreshGains();
  const now = ctx.currentTime;
  const peak = 0.12 * clampVolume(current.effectsVolume);
  try {
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
    tone(ctx, 523, 523, now, 0.16, peak * 0.55);
    tone(ctx, 659, 659, now + 0.14, 0.16, peak * 0.55);
    tone(ctx, 784, 784, now + 0.28, 0.28, peak * 0.6);
  } catch {
    // A browser can refuse the audio graph. The lesson still continues.
  }
}
