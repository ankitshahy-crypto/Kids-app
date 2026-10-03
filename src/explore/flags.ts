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
 * Sections being rebuilt after the first phone test. They are left out of the
 * app people install (a production build) until each is finished, and stay in
 * development builds so their tests keep running.
 *
 * Why: on a phone these were colored dots and word-only buttons, and could
 * not be understood by the grown-up testing them, let alone a child. A pilot
 * family should see only what is finished.
 *
 * The pull request that finishes a section takes it off this list. Time &
 * Money came off when its ten games were rebuilt on the game kit
 * (src/game/kit.tsx): pictures to tap, every instruction spoken.
 */
export const HELD_BACK: readonly ExploreSection[] = ["build", "science"];

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
