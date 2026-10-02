/**
 * Interest themes. A child (or a grown-up) picks one to three favorites, and
 * the same lessons lean on words, pictures, and lines from those themes
 * wherever a themed item exists. Skills and their order never change; a theme
 * with nothing to offer falls back to the regular content.
 *
 * A theme does not change a letter's picture word (see letterCard in
 * ladder.ts): "m, as in moon" is the same for every child.
 */
export const THEME_IDS = ["dinosaurs", "vehicles", "space", "animals", "bugs", "ocean", "castles"] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const MAX_THEMES = 3;

export type ThemeInfo = {
  id: ThemeId;
  title: string;
  /** Pictogram drawn in `themeArt.tsx`. Doubles as the counting object. */
  icon: ThemeId;
  /** What one counted object is called: "Tap each truck". */
  object: string;
  objects: string;
  /** Story lines. `{hero}` is the child's animal hero ("Mia's fox"). */
  story: string[];
};

export const THEMES: Record<ThemeId, ThemeInfo> = {
  dinosaurs: {
    id: "dinosaurs",
    title: "Dinosaurs",
    icon: "dinosaurs",
    object: "dinosaur",
    objects: "dinosaurs",
    story: ["{hero} finds a dinosaur egg in the tall grass.", "{hero} stomps along with a friendly dinosaur."],
  },
  vehicles: {
    id: "vehicles",
    title: "Trucks and vehicles",
    icon: "vehicles",
    object: "truck",
    objects: "trucks",
    story: ["{hero} drives the fire truck to the park.", "{hero} waves from the window of the big bus."],
  },
  space: {
    id: "space",
    title: "Space",
    icon: "space",
    object: "rocket",
    objects: "rockets",
    story: ["{hero} rides a rocket past the moon.", "{hero} counts the stars from a little spaceship."],
  },
  animals: {
    id: "animals",
    title: "Animals",
    icon: "animals",
    object: "paw print",
    objects: "paw prints",
    story: ["{hero} visits the farm and says hello to every animal.", "{hero} follows paw prints to a sleepy bear."],
  },
  bugs: {
    id: "bugs",
    title: "Bugs",
    icon: "bugs",
    object: "ladybug",
    objects: "ladybugs",
    story: ["{hero} follows a ladybug across a big green leaf.", "{hero} peeks at ants marching in a line."],
  },
  ocean: {
    id: "ocean",
    title: "Ocean",
    icon: "ocean",
    object: "fish",
    objects: "fish",
    story: ["{hero} sails a little boat over the waves.", "{hero} counts crabs on the sandy beach."],
  },
  castles: {
    id: "castles",
    title: "Princesses and castles",
    icon: "castles",
    object: "crown",
    objects: "crowns",
    story: ["{hero} wears a crown and walks up to the castle.", "{hero} waves a wand and the castle gate opens."],
  },
};

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}

/** One to three themes, in the order they were picked, with unknowns and repeats dropped. */
export function normalizeThemes(value: unknown): ThemeId[] {
  if (!Array.isArray(value)) return [];
  const themes: ThemeId[] = [];
  for (const item of value) {
    if (!isThemeId(item) || themes.includes(item)) continue;
    themes.push(item);
    if (themes.length >= MAX_THEMES) break;
  }
  return themes;
}

/** The theme that decides the counting object today: themes take turns by day. */
export function themeForDay(themes: readonly ThemeId[], dayKey: string): ThemeId | null {
  if (themes.length === 0) return null;
  let hash = 0;
  for (const char of dayKey) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return themes[hash % themes.length] ?? null;
}

/** A story line for the hero. Falls back to the plain line when no theme is picked. */
export function themedStoryLine(hero: string, themes: readonly ThemeId[], dayKey: string, plain: string): string {
  const theme = themeForDay(themes, dayKey);
  if (!theme) return plain;
  const lines = THEMES[theme].story;
  let hash = 0;
  for (const char of dayKey) hash = (hash * 17 + char.charCodeAt(0)) >>> 0;
  const line = lines[hash % lines.length] ?? lines[0];
  return line.replace("{hero}", hero);
}
