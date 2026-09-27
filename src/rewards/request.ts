import { isExploreSection } from "../explore/sections";

export const EFFORT_REASONS = ["tried", "finished"] as const;

export type RewardRequest = {
  section: string;
  reason: string;
};

export type RewardDecision = {
  granted: boolean;
  stars: number;
};

const RATE_MS = 1000;
const lastGrant = new Map<string, number>();

/** Only core grants a star. Explore sections ask; they do not write profiles. */
export function requestReward(input: RewardRequest, now = Date.now()): RewardDecision {
  if (!isExploreSection(input.section)) return { granted: false, stars: 0 };
  if (!(EFFORT_REASONS as readonly string[]).includes(input.reason)) return { granted: false, stars: 0 };
  const previous = lastGrant.get(input.section) ?? 0;
  if (now - previous < RATE_MS) return { granted: false, stars: 0 };
  lastGrant.set(input.section, now);
  return { granted: true, stars: 1 };
}

export function resetRewardRequests(): void {
  lastGrant.clear();
}
