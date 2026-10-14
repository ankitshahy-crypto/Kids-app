import { colorSteps } from "../data/colors";
import type { DeckWord } from "../data/deck";
import { buildActivities } from "../data/engineer";
import { decodable } from "../data/ladder";
import { lettersIntroduced } from "../data/schedule";
import { mathSteps } from "../data/math";
import { scienceActivities } from "../data/science";
import { moneyGames, timeSteps } from "../data/timeMoney";

/**
 * What a family gets before the one-time unlock: the first two reading
 * weeks, and the first activity of each Explore area, for as long as they
 * like. There is no timer, so reinstalling the app changes nothing.
 */
export const FREE_WEEKS = 2;

export type ExploreArea = "math" | "colors" | "time" | "money" | "build" | "science" | "games";

/**
 * The games that stay open: Hatch from Games, and from Coding the first thing in each part: hello world
 * and the Build boards ("build"), and Take me home ("bird"). Read the code ("code") opens with the full app.
 */
const FREE_GAMES = new Set(["hatch", "bird", "build"]);

const FIRST: Record<Exclude<ExploreArea, "games">, string> = {
  math: mathSteps[0],
  colors: colorSteps[0],
  time: timeSteps[0],
  money: moneyGames[0],
  build: buildActivities[0],
  science: scienceActivities[0],
};

/** Is this reading week (0-based) open? */
export function weekOpen(weekIndex: number, unlocked: boolean): boolean {
  return unlocked || weekIndex < FREE_WEEKS;
}

/** The week a child without the unlock plays: their own, up to the last free week. */
export function playableWeek(weekIndex: number, unlocked: boolean): number {
  return weekOpen(weekIndex, unlocked) ? weekIndex : FREE_WEEKS - 1;
}

/**
 * The blended words a child without the unlock may trace: those made of the free weeks' letters.
 * A word sticker earned beyond them (in the pilot, or before a refund took the unlock away) stays in
 * the sticker book, but Trace a word offers it again only with the unlock, as the lesson itself
 * waits at the last free week.
 */
export function tracedWordsOpen(words: DeckWord[], unlocked: boolean): DeckWord[] {
  if (unlocked) return words;
  const free = new Set(lettersIntroduced(FREE_WEEKS - 1).map((letter) => letter.toLowerCase()));
  return words.filter((word) => decodable(word, free));
}

/** Is this Explore activity open? */
export function activityOpen(area: ExploreArea, id: string, unlocked: boolean): boolean {
  if (unlocked) return true;
  if (area === "games") return FREE_GAMES.has(id);
  return FIRST[area] === id;
}
