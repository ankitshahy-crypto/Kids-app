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
};

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
  return { visitor: pick.id, visitorName: pick.name, theme, gift, line };
}
