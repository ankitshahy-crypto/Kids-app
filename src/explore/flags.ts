import { EXPLORE_SECTIONS, type ExploreSection } from "./sections";

/** Each Explore section can be turned off. Missing means on. */
export type ExploreFlags = Partial<Record<ExploreSection, boolean>>;

export const EXPLORE_FLAGS: ExploreFlags = {
  math: true,
  colors: true,
  games: true,
};

export function sectionVisible(section: ExploreSection, flags: ExploreFlags = EXPLORE_FLAGS, showExplore = true): boolean {
  if (!showExplore) return false;
  return flags[section] !== false;
}

export function visibleExplore(flags: ExploreFlags = EXPLORE_FLAGS, showExplore = true): ExploreSection[] {
  return EXPLORE_SECTIONS.filter((section) => sectionVisible(section, flags, showExplore));
}
