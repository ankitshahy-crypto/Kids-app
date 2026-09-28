import { colorSteps } from "../data/colors";
import { buildActivities } from "../data/engineer";
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

/** The first game of each Games section stays open: Hatch, Bird home, and Build It. */
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

/** Is this Explore activity open? */
export function activityOpen(area: ExploreArea, id: string, unlocked: boolean): boolean {
  if (unlocked) return true;
  if (area === "games") return FREE_GAMES.has(id);
  return FIRST[area] === id;
}
