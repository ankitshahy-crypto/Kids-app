import { MODULE_BUILD } from "../brand";
import { logicLevel, type LogicLevel } from "./logic";
import type { AgeRange } from "./profiles";
import { defineSubject } from "./subject";

/** LittleNest Build. Coding stays in Games. Reading stays `reading`. */
export const BUILD = "build";

export const buildSteps = ["bridge", "tower", "ramp", "machines", "float"] as const;
export type BuildStep = (typeof buildSteps)[number];

export const buildActivities = ["bridge", "tower", "ramp", "machines", "float", "balance"] as const;
export type BuildActivity = (typeof buildActivities)[number];

export const buildStages = [
  { id: "bridge", title: "Build a bridge", detail: "Blocks and planks carry their animal across the river.", size: 1 },
  { id: "tower", title: "Tall tower", detail: "A wide base stays up. A narrow base topples softly.", size: 1 },
  { id: "ramp", title: "Ramps and rolling", detail: "A higher ramp rolls the ball farther.", size: 1 },
  { id: "machines", title: "Simple machines", detail: "A lever, a pulley, and a wheel and axle.", size: 1 },
  { id: "float", title: "Sink or float", detail: "Guess, then drop the object in the water.", size: 1 },
  { id: "balance", title: "Balance", detail: "Ages 5 to 7 balance weights, then test and fix.", size: 1 },
] as const;

defineSubject({
  id: BUILD,
  title: MODULE_BUILD,
  stages: buildStages,
  steps: buildSteps,
});

/** Ages 3–4 build freely. Ages 5–7 get limited pieces, balance, and a fix prompt. */
export function engineerLevel(ageRange: AgeRange | string): LogicLevel {
  return logicLevel(ageRange);
}

export function activitiesFor(level: LogicLevel): BuildActivity[] {
  const activities: BuildActivity[] = ["bridge", "tower", "ramp", "machines", "float"];
  if (level === "later") activities.push("balance");
  return activities;
}

export type SpanPiece = "block" | "plank";

export type BridgePlan = { gaps: number; blocks: number; planks: number };

/** Banks hold the ends. Each gap is one block or one plank. */
export function bridgePlan(level: LogicLevel): BridgePlan {
  if (level === "later") return { gaps: 3, blocks: 1, planks: 2 };
  return { gaps: 2, blocks: 4, planks: 4 };
}

export function emptySpans(plan: BridgePlan): (SpanPiece | null)[] {
  return Array.from({ length: plan.gaps }, () => null);
}

function pieceCount(slots: readonly (SpanPiece | null)[], piece: SpanPiece): number {
  return slots.filter((slot) => slot === piece).length;
}

/** Put a piece in one gap. A full kit leaves the bridge unchanged. */
export function placeSpan(slots: readonly (SpanPiece | null)[], index: number, piece: SpanPiece, plan: BridgePlan): (SpanPiece | null)[] {
  if (index < 0 || index >= slots.length) return [...slots];
  const next = slots.slice();
  next[index] = null;
  const cap = piece === "block" ? plan.blocks : plan.planks;
  if (pieceCount(next, piece) >= cap) return [...slots];
  next[index] = piece;
  return next;
}

export function clearSpan(slots: readonly (SpanPiece | null)[], index: number): (SpanPiece | null)[] {
  if (!slots[index]) return [...slots];
  const next = slots.slice();
  next[index] = null;
  return next;
}

export function firstOpenSpan(slots: readonly (SpanPiece | null)[]): number {
  return slots.findIndex((slot) => slot === null);
}

export type BridgeVerdict = "wait" | "cross" | "sag";

/**
 * A plank run longer than one sags. A block is a pier, and the banks are piers too.
 * Two planks in a row between piers sag. A block in the middle holds them.
 */
export function bridgeVerdict(slots: readonly (SpanPiece | null)[]): { verdict: BridgeVerdict; hint: string } {
  if (slots.length === 0 || slots.some((slot) => slot === null)) return { verdict: "wait", hint: "" };
  let run = 0;
  const cells = ["support", ...slots.map((slot) => (slot === "block" ? "support" : "plank")), "support"];
  for (const cell of cells) {
    if (cell === "plank") {
      run += 1;
      if (run > 1) return { verdict: "sag", hint: "A long plank sags. Put a block in the middle." };
    } else run = 0;
  }
  return { verdict: "cross", hint: "" };
}

export type BlockWidth = "wide" | "medium" | "narrow";

const WIDTH_RANK: Record<BlockWidth, number> = { wide: 3, medium: 2, narrow: 1 };

export type TowerPlan = { goal: number; wide: number; medium: number; narrow: number };

export function towerPlan(level: LogicLevel): TowerPlan {
  if (level === "later") return { goal: 4, wide: 2, medium: 1, narrow: 1 };
  return { goal: 3, wide: 4, medium: 4, narrow: 4 };
}

export function placeTower(stack: readonly BlockWidth[], piece: BlockWidth, plan: TowerPlan): BlockWidth[] {
  if (stack.filter((item) => item === piece).length >= plan[piece]) return [...stack];
  if (stack.length >= 6) return [...stack];
  return [...stack, piece];
}

export function popTower(stack: readonly BlockWidth[]): BlockWidth[] {
  return stack.slice(0, -1);
}

export type TowerVerdict = "wait" | "reach" | "topple" | "short";

/** A wide base stands. Anything wider than the block under it topples. */
export function towerVerdict(stack: readonly BlockWidth[], goal: number): { verdict: TowerVerdict; hint: string } {
  if (stack.length === 0) return { verdict: "wait", hint: "" };
  if (stack[0] !== "wide") return { verdict: "topple", hint: "A wide base keeps the tower up." };
  for (let index = 1; index < stack.length; index += 1) {
    if (WIDTH_RANK[stack[index]] > WIDTH_RANK[stack[index - 1]]) {
      return { verdict: "topple", hint: "A wide block is sitting on a narrow one." };
    }
  }
  if (stack.length < goal) return { verdict: "short", hint: "The tower is not tall enough yet." };
  return { verdict: "reach", hint: "" };
}

export type RampHeight = 1 | 2 | 3;

/** Higher ramps roll farther. Height 1, 2, and 3 roll 2, 4, and 6 steps. */
export function rollDistance(height: RampHeight): number {
  return height * 2;
}

export function rampGoal(level: LogicLevel): number {
  return level === "later" ? 6 : 4;
}

export function rampVerdict(height: RampHeight, goal: number): { verdict: "reach" | "short"; distance: number; hint: string } {
  const distance = rollDistance(height);
  if (distance >= goal) return { verdict: "reach", distance, hint: "" };
  return { verdict: "short", distance, hint: "The ramp is too low." };
}

export function stepHeight(height: RampHeight, direction: 1 | -1): RampHeight {
  const next = height + direction;
  if (next <= 1) return 1;
  if (next >= 3) return 3;
  return next as RampHeight;
}

export type MachineId = "lever" | "pulley" | "wheel";

/** The basket sits on the right. Pressing the left seat lifts it. */
export function leverLifts(press: "left" | "right"): boolean {
  return press === "left";
}

/** A heavy rock on the left lifts the basket. A light rock stays down. */
export function leverWeight(weight: "heavy" | "light"): { lifts: boolean; hint: string } {
  if (weight === "heavy") return { lifts: true, hint: "" };
  return { lifts: false, hint: "The heavy rock lifts the basket." };
}

export function pulleyLifts(pulledDown: boolean): boolean {
  return pulledDown;
}

export function wheelNeed(level: LogicLevel): number {
  return level === "later" ? 3 : 1;
}

export function wheelMoves(turns: number, need: number): boolean {
  return turns >= need;
}

export function machinesReady(done: Record<MachineId, boolean>): boolean {
  return done.lever && done.pulley && done.wheel;
}

export type FloatId = "leaf" | "rock" | "boat" | "spoon";
export type FloatGuess = "sink" | "float";

export const FLOATS: Record<FloatId, boolean> = {
  leaf: true,
  rock: false,
  boat: true,
  spoon: false,
};

export function floatSet(level: LogicLevel): FloatId[] {
  if (level === "later") return ["leaf", "rock", "boat", "spoon"];
  return ["leaf", "rock", "boat"];
}

export function floatVerdict(id: FloatId, guess: FloatGuess): { ok: boolean; hint: string } {
  const floats = FLOATS[id];
  if ((guess === "float") === floats) return { ok: true, hint: "" };
  if (id === "rock" || id === "spoon") return { ok: false, hint: "That one is heavy, so it sinks." };
  return { ok: false, hint: "That one is light, so it floats." };
}

export type BeamPos = -2 | -1 | 1 | 2;
export type BeamWeight = 1 | 2;

export const BEAM_SPOTS: BeamPos[] = [-2, -1, 1, 2];

export function beamTorque(spots: Partial<Record<BeamPos, BeamWeight>>): number {
  return BEAM_SPOTS.reduce((sum, pos) => sum + (spots[pos] ?? 0) * pos, 0);
}

export type BeamVerdict = "wait" | "balance" | "tilt";

/** One weight of 1 and one of 2. Distance times weight has to match. */
export function placeBeam(spots: Partial<Record<BeamPos, BeamWeight>>, pos: BeamPos, weight: BeamWeight): Partial<Record<BeamPos, BeamWeight>> {
  const next: Partial<Record<BeamPos, BeamWeight>> = { ...spots };
  for (const spot of BEAM_SPOTS) {
    if (next[spot] === weight) delete next[spot];
  }
  next[pos] = weight;
  return next;
}

export function beamVerdict(spots: Partial<Record<BeamPos, BeamWeight>>): { verdict: BeamVerdict; hint: string } {
  const used = BEAM_SPOTS.some((pos) => spots[pos]);
  if (!used) return { verdict: "wait", hint: "" };
  const torque = beamTorque(spots);
  if (torque === 0) return { verdict: "balance", hint: "" };
  return { verdict: "tilt", hint: torque < 0 ? "The left side is heavier." : "The right side is heavier." };
}

export function engineerManifestEntries(): { id: string; say: string }[] {
  return [
    { id: "engineer-bridge", say: "Build a bridge so your animal can cross." },
    { id: "engineer-tower", say: "Stack a tower up to the nest." },
    { id: "engineer-ramp", say: "Make the ball roll to the flag." },
    { id: "engineer-machines", say: "Lift it with a simple machine." },
    { id: "engineer-float", say: "Will it sink or float?" },
    { id: "engineer-balance", say: "Balance the beam." },
    { id: "engineer-again", say: "Try again." },
    { id: "engineer-wrong", say: "What went wrong?" },
  ];
}
