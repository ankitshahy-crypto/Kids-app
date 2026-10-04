/**
 * Who says the letter sounds while a child slides across a word.
 *
 *  - "auto" (the default): hear first, then say. The app says each sound for
 *    a word's first two slides; from the third the slide is quiet, the child
 *    says the sounds, and the app says the whole word at the end to check.
 *  - "app": the app always says the sounds.
 *  - "child": the child always says them.
 *
 * In every mode a tapped letter, and Play sound, still play the sounds, and a
 * new letter card and a sentence are always said by the app.
 *
 * Why: a child who only ever hears the sounds can repeat them without
 * blending. Sound sliders in other reading programs are silent, with a grown-up
 * beside the child; "auto" gets there by steps, word by word.
 */
export type SoundingMode = "auto" | "app" | "child";

/** Slides with the app's sounds before a word goes quiet. */
export const SLIDES_WITH_APP = 2;

/** Words remembered per child; the oldest are forgotten past this. */
const SLID_LIMIT = 400;

export function isSoundingMode(value: unknown): value is SoundingMode {
  return value === "auto" || value === "app" || value === "child";
}

/** The child's mode, reading older saves: `saysSounds` on meant the child says them. */
export function soundingMode(profile: { sounding?: SoundingMode; saysSounds?: boolean } | null | undefined): SoundingMode {
  if (!profile) return "auto";
  if (isSoundingMode(profile.sounding)) return profile.sounding;
  return profile.saysSounds ? "child" : "auto";
}

/** Should the slide across this word be quiet, for the child to say the sounds? */
export function childSaysSounds(mode: SoundingMode, slid: Readonly<Record<string, number>> | undefined, word: string): boolean {
  if (mode === "app") return false;
  if (mode === "child") return true;
  return (slid?.[word.toLowerCase()] ?? 0) >= SLIDES_WITH_APP;
}

/** Count one finished slide of a word that the app voiced. Stops counting at SLIDES_WITH_APP. */
export function noteSlide(slid: Readonly<Record<string, number>> | undefined, word: string): Record<string, number> {
  const key = word.toLowerCase();
  const next = { ...(slid ?? {}) };
  const before = next[key] ?? 0;
  if (before >= SLIDES_WITH_APP) return next;
  delete next[key];
  next[key] = before + 1;
  const keys = Object.keys(next);
  for (const old of keys.slice(0, Math.max(0, keys.length - SLID_LIMIT))) delete next[old];
  return next;
}
