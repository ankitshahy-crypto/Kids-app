import type { DeckWord, LetterTile } from "../data/deck";
import { PHONEME_TTS } from "../data/phonemes";
import { SPEECH_RATES, type Settings } from "../settings";

const SILENT_BEAT_MS = 720;

/**
 * iOS only allows speech after a user gesture. Call this synchronously inside
 * the tap handler that starts the app. A single space is effectively silent
 * and unlocks later playback for the rest of the WebView session.
 */
export function primeSpeech(): void {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.resume();
    const utterance = new SpeechSynthesisUtterance(" ");
    utterance.volume = 1;
    utterance.rate = 1;
    utterance.lang = "en-US";
    synth.speak(utterance);
  } catch {
    // A browser can throw if speech is unavailable. The activity still starts.
  }
}

export function resumeSpeech(): void {
  window.speechSynthesis?.resume();
}

export function cancelSpeech(): void {
  window.speechSynthesis?.cancel();
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function abortError(): DOMException {
  return new DOMException("aborted", "AbortError");
}

export function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError());
      return;
    }
    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(abortError());
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  const preferred = ["Samantha", "Karen", "Moira", "Google US English", "Daniel"];
  for (const name of preferred) {
    const match = english.find((voice) => voice.name.includes(name));
    if (match) return match;
  }
  return english.find((voice) => voice.localService) ?? english[0];
}

function speak(text: string, settings: Settings, signal: AbortSignal): Promise<void> {
  const synth = window.speechSynthesis;
  if (!synth) return sleep(SILENT_BEAT_MS, signal);

  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError());
      return;
    }

    let settled = false;
    let timer = 0;

    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      if (signal.aborted || isAbortError(error)) {
        reject(abortError());
        return;
      }
      resolve();
    };

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = SPEECH_RATES[settings.speed];
    utterance.pitch = 1;
    utterance.lang = "en-US";
    try {
      const voice = pickVoice(synth.getVoices());
      if (voice) utterance.voice = voice;
    } catch {
      // A voice list entry the engine rejects should not stop the lesson.
    }
    utterance.onend = () => finish();
    utterance.onerror = () => finish();

    const onAbort = () => {
      synth.cancel();
      finish(abortError());
    };
    signal.addEventListener("abort", onAbort);

    const backupMs = Math.min(9000, (800 + text.length * 420) / utterance.rate);
    timer = window.setTimeout(() => {
      synth.cancel();
      finish();
    }, backupMs);

    const start = () => {
      if (settled) return;
      try {
        synth.resume();
        synth.speak(utterance);
      } catch {
        finish();
      }
    };

    if (synth.speaking) {
      synth.cancel();
      window.setTimeout(start, 60);
    } else {
      start();
    }
  });
}

function playFile(src: string, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError());
      return;
    }
    const audio = new Audio(src);
    const cleanup = () => {
      signal.removeEventListener("abort", onAbort);
      audio.onended = null;
      audio.onerror = null;
    };
    const onAbort = () => {
      audio.pause();
      cleanup();
      reject(abortError());
    };
    signal.addEventListener("abort", onAbort, { once: true });
    audio.onended = () => {
      cleanup();
      resolve();
    };
    audio.onerror = () => {
      cleanup();
      reject(new Error(`Could not play ${src}`));
    };
    void audio.play().catch((error: unknown) => {
      cleanup();
      reject(error instanceof Error ? error : new Error("Could not play audio"));
    });
  });
}

async function playCue(
  cue: { src?: string; text: string },
  settings: Settings,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted) throw abortError();
  if (!settings.sound) {
    await sleep(SILENT_BEAT_MS, signal);
    return;
  }
  if (cue.src) {
    try {
      await playFile(cue.src, signal);
      return;
    } catch (error) {
      if (isAbortError(error) || signal.aborted) throw abortError();
    }
  }
  await speak(cue.text, settings, signal);
}

export function playLetter(
  letter: LetterTile,
  settings: Settings,
  signal: AbortSignal,
): Promise<void> {
  return playCue({ src: letter.audioSrc, text: PHONEME_TTS[letter.phoneme] }, settings, signal);
}

export function playWord(word: DeckWord, settings: Settings, signal: AbortSignal): Promise<void> {
  return playCue({ src: word.audioSrc, text: word.word }, settings, signal);
}
