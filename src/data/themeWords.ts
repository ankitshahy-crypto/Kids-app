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
const egg = made("egg", "egg", "egg");
const dig = made("dig", "dig", "dig");
const stomp = made("stomp", "stomp", "dinosaurs");
const van = made("van", "van", "van");
const jet = made("jet", "jet", "jet");
const cab = made("cab", "cab", "cab");
const honk = made("honk", "honk", "vehicles");
const truck = made("truck", "truck", "vehicles");
const star = made("star", "star", "star");
const rocket = made("rocket", "rocket", "space");
const hen = made("hen", "hen", "hen");
const cub = made("cub", "cub", "cub");
const kitten = made("kitten", "kitten", "cat");
const bug = made("bug", "bug", "bug");
const ant = made("ant", "ant", "ant");
const web = made("web", "web", "web");
const wasp = made("wasp", "wasp", "wasp");
const insect = made("insect", "insect", "bug");
const sub = made("sub", "sub", "sub");
const fin = made("fin", "fin", "fish");
const crab = made("crab", "crab", "crab");
const gem = made("gem", "gem", "gem");
const king = made("king", "king", "castles");
const flag = made("flag", "flag", "flag");

export const THEME_WORDS: Record<ThemeId, Partial<Record<1 | 2 | 3 | 4 | 5, ThemedEntry[]>>> = {
  dinosaurs: {
    3: [egg, dig],
    4: [use("nest")],
    5: [stomp],
  },
  vehicles: {
    3: [use("bus"), van, jet, cab],
    4: [use("stop"), honk],
    5: [truck],
  },
  space: {
    3: [use("sun"), jet],
    4: [star],
    5: [rocket],
  },
  animals: {
    3: [use("cat"), use("dog"), use("pig"), use("fox"), hen, cub],
    4: [use("frog"), use("fish"), use("nest")],
    5: [kitten],
  },
  bugs: {
    3: [bug, ant, web],
    4: [wasp],
    5: [insect],
  },
  ocean: {
    3: [sub, fin],
    4: [use("fish"), crab, use("sand")],
  },
  castles: {
    3: [gem],
    4: [king, flag],
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
