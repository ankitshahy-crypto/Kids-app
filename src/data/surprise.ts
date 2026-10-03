import { animals, type AnimalId } from "./animals";
import { THEMES, themeForDay, type ThemeId } from "./themes";

/**
 * One small, predictable surprise a day: a visitor from the other animals,
 * bringing the day's theme object when a theme is picked. The same child
 * sees the same visitor all day, and there is nothing to win or lose.
 */
export type DailySurprise = {
  visitor: AnimalId;
  visitorName: string;
  theme: ThemeId | null;
  /** What the visitor brought, or null without a theme. */
  gift: string | null;
  line: string;
  /**
   * The recorded clips that say the line, in order: who came, then what they brought. The line was read
   * by the phone's own voice, which on the first phone test came out flat and startling ("scary").
   */
  clips: { id: string; say: string }[];
};

/** "Fox came to say hi!" */
export function visitorClip(animal: { id: string; name: string }): { id: string; say: string } {
  return { id: `surprise-hi-${animal.id}`, say: `${animal.name} came to say hi!` };
}

/** "And brought a rocket!" */
export function giftClip(theme: ThemeId): { id: string; say: string } {
  return { id: `surprise-gift-${theme}`, say: `And brought a ${THEMES[theme].object}!` };
}

/** Every line the surprise can say. scripts/sync-manifest.ts writes these into the clip list. */
export function surpriseManifestEntries(): { id: string; say: string }[] {
  return [...animals.map((animal) => visitorClip(animal)), ...(Object.keys(THEMES) as ThemeId[]).map((theme) => giftClip(theme))];
}

function hash(text: string, seed: number): number {
  let value = seed;
  for (const char of text) value = (value * 33 + char.charCodeAt(0)) >>> 0;
  return value;
}

export function dailySurprise(childId: string, own: AnimalId, themes: readonly ThemeId[], dayKey: string): DailySurprise {
  const others = animals.filter((animal) => animal.id !== own);
  const pick = others[hash(`${childId}:${dayKey}`, 7) % others.length] ?? others[0];
  const theme = themeForDay(themes, dayKey);
  const gift = theme ? THEMES[theme].object : null;
  const line = gift ? `${pick.name} came to say hi, and brought a ${gift}!` : `${pick.name} came to say hi!`;
  const clips = theme ? [visitorClip(pick), giftClip(theme)] : [visitorClip(pick)];
  return { visitor: pick.id, visitorName: pick.name, theme, gift, line, clips };
}
