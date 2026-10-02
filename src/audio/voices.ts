export type VoiceOption = {
  voiceURI: string;
  label: string;
};

/** Joke voices, and the old synthesizer voices (Eloquence, MacinTalk) that iOS lists beside the real ones. */
const NOVELTY =
  /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|organ|superstar|trinoids|whisper|wobble|zarvox|eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley|fred|junior|kathy|ralph)\b/i;

/** Calm, natural en-US voices that ship with iOS and macOS, best first. */
const PREFERRED = ["samantha", "ava", "allison", "susan", "zoe", "joelle", "noelle", "nicky"];

type RankedVoice = SpeechSynthesisVoice & { quality?: string };

function voiceText(voice: SpeechSynthesisVoice): string {
  const extra = voice as RankedVoice;
  return `${voice.name} ${voice.voiceURI} ${extra.quality ?? ""}`.toLowerCase();
}

function preferredRank(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  return PREFERRED.findIndex((known) => name.startsWith(known));
}

/**
 * Novelty and old synthesizer voices sound silly or frightening, and most compact
 * system voices sound mechanical. The compact copy of a known natural voice is
 * kept: on an iPhone that is the only Samantha there is.
 */
export function isUnwantedVoice(voice: SpeechSynthesisVoice): boolean {
  const text = voiceText(voice);
  if (NOVELTY.test(voice.name) || text.includes("eloquence")) return true;
  return text.includes("compact") && preferredRank(voice) < 0;
}

/**
 * Higher is better. Prefer an en-US enhanced, premium, or Siri-quality voice
 * that is installed on the device. Other languages and novelty voices lose.
 */
export function scoreVoice(voice: SpeechSynthesisVoice): number {
  if (isUnwantedVoice(voice)) return -1;
  const lang = voice.lang.toLowerCase().replaceAll("_", "-");
  let score = 0;
  if (lang === "en-us") score += 200;
  else if (lang.startsWith("en-us")) score += 180;
  else if (lang.startsWith("en")) score += 40;
  else return -1;

  const text = voiceText(voice);
  if (text.includes("premium")) score += 80;
  if (text.includes("enhanced")) score += 60;
  if (text.includes("siri")) score += 50;
  if (voice.localService) score += 10;
  // Many voices tie on language. A known natural voice wins the tie; the system default is next.
  const preferred = preferredRank(voice);
  if (preferred >= 0) score += 30 - preferred;
  else if (voice.default) score += 15;
  return score;
}

export function selectableVoices(voices: SpeechSynthesisVoice[]): VoiceOption[] {
  return voices
    .map((voice) => ({ voice, score: scoreVoice(voice) }))
    .filter((item) => item.score >= 0 && item.voice.voiceURI)
    .sort((a, b) => b.score - a.score || a.voice.name.localeCompare(b.voice.name))
    .map((item) => ({
      voiceURI: item.voice.voiceURI,
      label: `${item.voice.name} (${item.voice.lang})`,
    }));
}

export function pickVoice(
  voices: SpeechSynthesisVoice[],
  voiceURI: string | null,
): SpeechSynthesisVoice | undefined {
  if (voiceURI) {
    const chosen = voices.find((voice) => voice.voiceURI === voiceURI);
    if (chosen && !isUnwantedVoice(chosen)) return chosen;
  }
  let best: SpeechSynthesisVoice | undefined;
  let bestScore = -1;
  for (const voice of voices) {
    const score = scoreVoice(voice);
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }
  return best;
}

export function subscribeVoices(onChange: (voices: VoiceOption[]) => void): () => void {
  const synth = window.speechSynthesis;
  const publish = () => onChange(selectableVoices(synth?.getVoices() ?? []));
  publish();
  if (!synth) return () => undefined;
  synth.addEventListener("voiceschanged", publish);
  return () => synth.removeEventListener("voiceschanged", publish);
}
