import { EXPLORE_SECTIONS, type ExploreSection } from "./sections";

/** Each Explore section can be turned off. Missing means on. */
export type ExploreFlags = Partial<Record<ExploreSection, boolean>>;

export const EXPLORE_FLAGS: ExploreFlags = {
  math: true,
  colors: true,
  time: true,
  build: true,
  science: true,
  games: true,
};

/**
 * Sections left out of the app people install (a production build) while they
 * are being rebuilt. They stay in development builds so their tests keep running.
 *
 * After the first phone test Time & Money, Build and Science were held back:
 * on a phone they were colored dots and word-only buttons. Each came off this
 * list when it was rebuilt on the game kit (src/game/kit.tsx), and the list is
 * empty now. It stays, so a section can be held back again the same way.
 */
export const HELD_BACK: readonly ExploreSection[] = [];

/** Is this section left out of this build? `production` is passed in by tests. */
export function heldBack(section: ExploreSection, production: boolean = import.meta.env.PROD): boolean {
  return production && HELD_BACK.includes(section);
}

export function sectionVisible(
  section: ExploreSection,
  flags: ExploreFlags = EXPLORE_FLAGS,
  showExplore = true,
  production: boolean = import.meta.env.PROD,
): boolean {
  if (!showExplore) return false;
  if (heldBack(section, production)) return false;
  return flags[section] !== false;
}

export function visibleExplore(
  flags: ExploreFlags = EXPLORE_FLAGS,
  showExplore = true,
  production: boolean = import.meta.env.PROD,
): ExploreSection[] {
  return EXPLORE_SECTIONS.filter((section) => sectionVisible(section, flags, showExplore, production));
}
