/** Sections that are in this build. Later courses are added with their own pull requests. */
export const EXPLORE_SECTIONS = ["math", "colors", "time", "games"] as const;

export type ExploreSection = (typeof EXPLORE_SECTIONS)[number];

const BY_SCREEN: Record<string, ExploreSection> = {
  count: "math",
  know: "math",
  trace: "math",
  shape: "math",
  more: "math",
  add: "math",
  name: "colors",
  mix: "colors",
  paint: "colors",
  day: "time",
  routine: "time",
  clock: "time",
  coins: "time",
  shop: "time",
  jars: "time",
  lemonade: "time",
  choose: "time",
  needs: "time",
  cards: "time",
  games: "games",
};

export function isExploreSection(value: string): value is ExploreSection {
  return (EXPLORE_SECTIONS as readonly string[]).includes(value);
}

/** Reading, the nest, and the closet stay outside Explore. */
export function sectionForScreen(screen: string): ExploreSection | null {
  return BY_SCREEN[screen] ?? null;
}
