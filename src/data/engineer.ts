import { MODULE_BUILD } from "../brand";
import { logicLevel, type LogicLevel } from "./logic";
import type { AgeRange } from "./profiles";
import { among, shuffle, take } from "./seed";
import { defineSubject } from "./subject";

/**
 * LittleNest Build: five things to make work.
 *
 * Rebuilt after the first phone test. Each of these was a sandbox of colored
 * bars: a "bridge" was two tan rectangles and a button that said TEST, a
 * "machine" was two pink squares. Nothing said what to do, and nothing showed
 * what had happened.
 *
 * Now each is a small problem in a drawn scene, asked aloud, with something
 * to see when it is solved:
 *
 *  - Bridge. A river, and three planks. The one that fits lets the child's
 *    animal walk across. A short one falls in.
 *  - Tower. Blocks of different widths. The widest goes on the bottom, then
 *    the next widest: the tower stands.
 *  - Ramp. A ball, a flag, and three ramps. A higher ramp rolls it farther.
 *  - Machines. Something too heavy to lift, pull up or carry, and a lever, a
 *    pulley or wheels to do it.
 *  - Balance (ages 5 to 7). A beam with blocks on one side: which pile makes
 *    it level?
 *
 * The ids are the ones the first version used, so stars already earned are kept.
 */
export const BUILD = "build";

export const buildSteps = ["bridge", "tower", "ramp", "machines"] as const;
export type BuildStep = (typeof buildSteps)[number];

export const buildActivities = ["bridge", "tower", "ramp", "machines", "balance"] as const;
export type BuildActivity = (typeof buildActivities)[number];

export const buildStages = [
  { id: "bridge", title: "Build a bridge", detail: "Pick the plank that fits the river, and their animal walks across.", size: 1 },
  { id: "tower", title: "Tall tower", detail: "The widest block goes on the bottom, and the tower stands.", size: 1 },
  { id: "ramp", title: "Ramps and rolling", detail: "A higher ramp rolls the ball farther.", size: 1 },
  { id: "machines", title: "Simple machines", detail: "A lever lifts, a pulley pulls up, and wheels roll along.", size: 1 },
  { id: "balance", title: "Balance", detail: "Ages 5 to 7 pick the pile of blocks that makes the beam level.", size: 1 },
] as const;

defineSubject({
  id: BUILD,
  title: MODULE_BUILD,
  stages: buildStages,
  steps: buildSteps,
});

/** Ages 3–4 get shorter games. Ages 5–7 get more to choose between, and Balance. */
export function engineerLevel(ageRange: AgeRange | string): LogicLevel {
  return logicLevel(ageRange);
}

export function activitiesFor(level: LogicLevel): BuildActivity[] {
  const activities: BuildActivity[] = ["bridge", "tower", "ramp", "machines"];
  if (level === "later") activities.push("balance");
  return activities;
}

// ---------------------------------------------------------------- bridge

/** A river some planks wide, and planks of different lengths to try. */
export type BridgeRound = { gap: number; planks: number[] };

export type PlankFit = "short" | "fits" | "long";

export function plankFit(gap: number, plank: number): PlankFit {
  if (plank < gap) return "short";
  return plank > gap ? "long" : "fits";
}

/** Rivers of each width, in a new order each play. The planks stay in size order, so they can be compared. */
export function bridgeRounds(level: LogicLevel, salt = 0): BridgeRound[] {
  const widths = level === "later" ? [2, 3, 4, 5] : [2, 3, 4];
  return shuffle(widths, salt).map((gap) => ({ gap, planks: widths.length > 3 ? among(gap, widths, 3, salt + gap).sort((a, b) => a - b) : [...widths] }));
}

// ---------------------------------------------------------------- tower

/** Blocks by width (a bigger number is wider), dealt out of order. */
export type TowerRound = { blocks: number[] };

/** The block that goes on next: the widest one not yet on the tower. */
export function towerNext(blocks: readonly number[], placed: readonly number[]): number {
  const left = blocks.filter((block) => !placed.includes(block));
  return left.length > 0 ? Math.max(...left) : 0;
}

export function towerRounds(level: LogicLevel, salt = 0): TowerRound[] {
  const sizes = level === "later" ? [4, 5] : [3, 4];
  return sizes.map((count, index) => {
    const widths = take([1, 2, 3, 4, 5], count, salt + index);
    const sorted = [...widths].sort((a, b) => b - a);
    let blocks = shuffle(widths, salt + index + 31);
    // Never handed over already in the order they go on.
    if (blocks.every((block, at) => block === sorted[at])) blocks = [...sorted].reverse();
    return { blocks };
  });
}

// ---------------------------------------------------------------- ramp

export type RampHeight = 1 | 2 | 3;

/** The flag stands one, two or three places along the track. */
export type RampRound = { flag: RampHeight };

/** A higher ramp rolls farther: one, two or three places. */
export function rollDistance(height: RampHeight): number {
  return height;
}

export type RampTry = "short" | "reach" | "far";

export function rampTry(height: RampHeight, flag: RampHeight): RampTry {
  const distance = rollDistance(height);
  if (distance < flag) return "short";
  return distance > flag ? "far" : "reach";
}

export function rampRounds(level: LogicLevel, salt = 0): RampRound[] {
  const flags = shuffle<RampHeight>([1, 2, 3], salt).map((flag) => ({ flag }));
  if (level !== "later") return flags;
  // One more, and not the same as the one just before it.
  const again = shuffle<RampHeight>([1, 2, 3], salt + 5).find((flag) => flag !== flags[2].flag) ?? 1;
  return [...flags, { flag: again }];
}

// ---------------------------------------------------------------- machines

export type MachineId = "lever" | "pulley" | "wheel";

export type MachineJob = { id: "rock" | "bucket" | "box"; machine: MachineId; ask: string; answer: string };

export const MACHINE_JOBS: (MachineJob & { say: string; done: string })[] = [
  { id: "rock", machine: "lever", ask: "engineer-lift-rock", answer: "engineer-lever", say: "The rock is too heavy to lift. What can lift it?", done: "A lever lifts it." },
  { id: "bucket", machine: "pulley", ask: "engineer-lift-bucket", answer: "engineer-pulley", say: "The bucket is down in the well. What can pull it up?", done: "A pulley pulls it up." },
  { id: "box", machine: "wheel", ask: "engineer-move-box", answer: "engineer-wheels", say: "The box is too heavy to carry. What can move it?", done: "Wheels roll it along." },
];

export const MACHINE_NAMES: Record<MachineId, string> = { lever: "lever", pulley: "pulley", wheel: "wheels" };

export type MachineRound = MachineJob & { choices: MachineId[] };

/** The three jobs in a new order, each with the three machines to choose from. */
export function machineRounds(salt = 0): MachineRound[] {
  return shuffle(MACHINE_JOBS, salt).map((job, index) => ({
    id: job.id,
    machine: job.machine,
    ask: job.ask,
    answer: job.answer,
    choices: shuffle<MachineId>(["lever", "pulley", "wheel"], salt + index + 3),
  }));
}

// ---------------------------------------------------------------- balance

/** Some blocks on the left of a beam, and three piles to try on the right. */
export type BalanceRound = { left: number; choices: number[] };

export type Tilt = "left" | "level" | "right";

/** Which way the beam leans with these many blocks on each side. */
export function balanceTilt(left: number, right: number): Tilt {
  if (left === right) return "level";
  return left > right ? "left" : "right";
}

export function balanceRounds(salt = 0): BalanceRound[] {
  return take([1, 2, 3, 4], 3, salt).map((left, index) => ({
    left,
    choices: among(left, [1, 2, 3, 4], 3, salt + index + 1).sort((a, b) => a - b),
  }));
}

// ---------------------------------------------------------------- spoken lines

const LINES: Record<string, string> = {
  "engineer-bridge": "Help your animal cross the river. Which plank fits?",
  "engineer-short": "Too short. It fell in.",
  "engineer-long": "Too long. It sticks out.",
  "engineer-fits": "It fits!",
  "engineer-tower": "Build a tower. The widest block goes on the bottom.",
  "engineer-tower-next": "Which block goes next?",
  "engineer-tower-wide": "A wider one goes first.",
  "engineer-tower-done": "The tower stands!",
  "engineer-ramp": "Roll the ball to the flag. Which ramp?",
  "engineer-ramp-short": "Not far enough. Try a higher ramp.",
  "engineer-ramp-far": "Too far. Try a lower ramp.",
  "engineer-ramp-done": "It reached the flag!",
  "engineer-balance": "Make it balance. Which pile is the same?",
  "engineer-balance-few": "Not enough. The other side is heavier.",
  "engineer-balance-many": "Too many. This side is heavier.",
  "engineer-balance-done": "It balances!",
};

/** A line of these games, by id. */
export function engineerLine(id: string): string {
  return LINES[id] ?? MACHINE_JOBS.find((job) => job.ask === id)?.say ?? MACHINE_JOBS.find((job) => job.answer === id)?.done ?? "";
}

/** Build's spoken lines. scripts/sync-manifest.ts writes these into the clip list. */
export function engineerManifestEntries(): { id: string; say: string }[] {
  return [
    ...Object.entries(LINES).map(([id, say]) => ({ id, say })),
    ...MACHINE_JOBS.flatMap((job) => [
      { id: job.ask, say: job.say },
      { id: job.answer, say: job.done },
    ]),
  ];
}

/** The words these games say when a machine is tapped: each needs a recorded word clip. */
export function engineerWords(): string[] {
  return Object.values(MACHINE_NAMES);
}
