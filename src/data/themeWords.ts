import type { DeckWord } from "./deck";
import type { ThemeId } from "./themes";
import { made } from "./wordBuild";

/**
 * Words for each interest theme, by ladder step. An entry is either a word
 * drawn for the theme or `{ use }`, the id of a regular ladder word that fits
 * the theme (the same card, the same recording, moved to the front). Steps a
 * theme has nothing for fall back to the regular list.
 */
export type ThemedEntry = DeckWord | { use: string };

const use = (id: string): ThemedEntry => ({ use: id });

// One object per word, like the regular lists, so a card keeps its state
// while the lesson list is recomputed around it.
//
// Most themed words are regular ladder words now (`use`): bug, ant, web, van,
// jet, cab, hen, cub, sub, gem, dig, crab, flag and wasp have real drawings, so
// every child gets them, and a theme only moves them to the front. The words
// that borrowed another picture were dropped after the phone test: "stomp" and
// "honk" (a dinosaur and a truck), "fin" (a whole fish) and "king" (a crown).
const egg = made("egg", "egg", "egg");
const truck = made("truck", "truck", "vehicles");
const star = made("star", "star", "star");
const rocket = made("rocket", "rocket", "space");
const kitten = made("kitten", "kitten", "cat");
const insect = made("insect", "insect", "bug");

export const THEME_WORDS: Record<ThemeId, Partial<Record<1 | 2 | 3 | 4 | 5, ThemedEntry[]>>> = {
  dinosaurs: {
    3: [egg, use("dig")],
    4: [use("nest")],
  },
  vehicles: {
    3: [use("bus"), use("van"), use("jet"), use("cab")],
    4: [use("stop")],
    5: [truck],
  },
  space: {
    3: [use("sun"), use("jet")],
    4: [star],
    5: [rocket],
  },
  animals: {
    3: [use("cat"), use("dog"), use("pig"), use("fox"), use("hen"), use("cub")],
    4: [use("frog"), use("fish"), use("nest")],
    5: [kitten],
  },
  bugs: {
    3: [use("bug"), use("ant"), use("web")],
    4: [use("wasp")],
    5: [insect],
  },
  ocean: {
    3: [use("sub")],
    4: [use("fish"), use("crab"), use("sand")],
  },
  castles: {
    3: [use("gem")],
    4: [use("flag")],
  },
};

/** Every word drawn for a theme, for checks and clip lists. */
export function themedWordCatalog(): DeckWord[] {
  const words: DeckWord[] = [];
  for (const steps of Object.values(THEME_WORDS)) {
    for (const entries of Object.values(steps)) {
      for (const entry of entries) {
        if ("use" in entry || words.includes(entry)) continue;
        words.push(entry);
      }
    }
  }
  return words;
}

/**
 * Themed entries for this step, in the order the themes were picked, with
 * repeats dropped. Empty when no theme is picked or none has words here.
 */
export function themedEntries(themes: readonly ThemeId[], step: 1 | 2 | 3 | 4 | 5): ThemedEntry[] {
  const picked: ThemedEntry[] = [];
  const seen = new Set<string>();
  for (const theme of themes) {
    for (const entry of THEME_WORDS[theme]?.[step] ?? []) {
      const id = "use" in entry ? entry.use : entry.id;
      if (seen.has(id)) continue;
      seen.add(id);
      picked.push(entry);
    }
  }
  return picked;
}
