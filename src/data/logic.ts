import type { AgeRange } from "./profiles";

/** Ages 3–4 play short puzzles. Ages 5–7 add longer paths, a repeat, and a bug fix. */
export type LogicLevel = "early" | "later";

export type Dir = "up" | "down" | "left" | "right";

export type Cell = { x: number; y: number };

export type BirdMode = "tap" | "plan" | "loop" | "bug";

export type BirdRound = {
  id: string;
  mode: BirdMode;
  width: number;
  height: number;
  start: Cell;
  nest: Cell;
  /** Moves that reach the nest. For a loop this is the move inside the repeat. */
  path: Dir[];
  repeat: number;
  /** Arrows already on the page. A bug round hides one wrong turn here. */
  shown: Dir[];
  bugIndex: number | null;
  fix: Dir | null;
};

export type PatternRule = "AB" | "ABB" | "ABC";

export type PatternRound = {
  kind: "color" | "shape" | "animal";
  rule: PatternRule;
  shown: string[];
  answer: string;
  choices: string[];
};

export type MorningCard = { id: string; title: string };

export type GardenRound = {
  cause: "rain" | "sun";
  other: "rain" | "sun";
  effect: "flower" | "melt";
  prompt: string;
};

const DELTA: Record<Dir, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const MORNING: MorningCard[] = [
  { id: "wake", title: "Wake up" },
  { id: "brush", title: "Brush teeth" },
  { id: "eat", title: "Eat breakfast" },
  { id: "school", title: "Go to school" },
];

export function logicLevel(ageRange: AgeRange | string): LogicLevel {
  return ageRange === "5" || ageRange === "6-7" ? "later" : "early";
}

export function stepCell(cell: Cell, dir: Dir): Cell {
  const delta = DELTA[dir];
  return { x: cell.x + delta.x, y: cell.y + delta.y };
}

export function onGrid(cell: Cell, width: number, height: number): boolean {
  return cell.x >= 0 && cell.y >= 0 && cell.x < width && cell.y < height;
}

export function sameCell(a: Cell, b: Cell): boolean {
  return a.x === b.x && a.y === b.y;
}

/** Walk until a move would leave the grid. */
export function walk(start: Cell, dirs: Dir[], width: number, height: number): { end: Cell; blocked: boolean } {
  let cell = start;
  for (const dir of dirs) {
    const next = stepCell(cell, dir);
    if (!onGrid(next, width, height)) return { end: cell, blocked: true };
    cell = next;
  }
  return { end: cell, blocked: false };
}

export function birdRounds(level: LogicLevel): BirdRound[] {
  const early: BirdRound[] = [
    {
      id: "tap-short",
      mode: "tap",
      width: 3,
      height: 3,
      start: { x: 0, y: 2 },
      nest: { x: 2, y: 2 },
      path: ["right", "right"],
      repeat: 1,
      shown: [],
      bugIndex: null,
      fix: null,
    },
    {
      id: "plan-grow",
      mode: "plan",
      width: 4,
      height: 3,
      start: { x: 0, y: 2 },
      nest: { x: 2, y: 0 },
      path: ["right", "right", "up", "up"],
      repeat: 1,
      shown: [],
      bugIndex: null,
      fix: null,
    },
  ];
  if (level === "early") return early;
  return [
    {
      id: "plan-long",
      mode: "plan",
      width: 4,
      height: 4,
      start: { x: 0, y: 3 },
      nest: { x: 3, y: 0 },
      path: ["right", "right", "right", "up", "up", "up"],
      repeat: 1,
      shown: [],
      bugIndex: null,
      fix: null,
    },
    {
      id: "loop-three",
      mode: "loop",
      width: 4,
      height: 2,
      start: { x: 0, y: 0 },
      nest: { x: 3, y: 0 },
      path: ["right"],
      repeat: 3,
      shown: [],
      bugIndex: null,
      fix: null,
    },
    {
      id: "bug-one",
      mode: "bug",
      width: 3,
      height: 3,
      start: { x: 0, y: 2 },
      nest: { x: 2, y: 0 },
      path: ["right", "right", "up", "up"],
      repeat: 1,
      shown: ["right", "up", "up", "up"],
      bugIndex: 1,
      fix: "right",
    },
  ];
}

/** Arrows that will run: a queued plan, a move repeated three times, or a bug that was fixed. */
export function program(round: BirdRound, queued: Dir[], fixed: boolean): Dir[] {
  if (round.mode === "loop") {
    const body = queued[0];
    if (!body) return [];
    return Array.from({ length: round.repeat }, () => body);
  }
  if (round.mode === "bug") {
    return round.shown.map((dir, index) => (fixed && index === round.bugIndex && round.fix ? round.fix : dir));
  }
  return queued;
}

export function reachesNest(round: BirdRound, dirs: Dir[]): boolean {
  const result = walk(round.start, dirs, round.width, round.height);
  return !result.blocked && sameCell(result.end, round.nest);
}

function period(rule: PatternRule, tokens: string[]): string[] {
  const [a, b, c] = tokens;
  if (rule === "AB") return [a, b];
  if (rule === "ABB") return [a, b, b];
  return [a, b, c];
}

/** The sequence a rule makes, long enough to hide the last item as the answer. */
export function patternSequence(rule: PatternRule, tokens: string[], shown: number): { shown: string[]; answer: string } {
  const loop = period(rule, tokens);
  const full = Array.from({ length: shown + 1 }, (_, index) => loop[index % loop.length]);
  return { shown: full.slice(0, shown), answer: full[shown] ?? loop[0] };
}

export function patternRounds(): PatternRound[] {
  const specs: { kind: PatternRound["kind"]; rule: PatternRule; tokens: string[]; choices: string[]; shown: number }[] = [
    { kind: "color", rule: "AB", tokens: ["red", "blue"], choices: ["red", "blue", "yellow"], shown: 4 },
    { kind: "shape", rule: "ABB", tokens: ["circle", "square"], choices: ["circle", "square", "triangle"], shown: 5 },
    { kind: "animal", rule: "ABC", tokens: ["fox", "bird", "nest"], choices: ["fox", "bird", "nest"], shown: 5 },
  ];
  return specs.map((spec) => {
    const sequence = patternSequence(spec.rule, spec.tokens, spec.shown);
    return { kind: spec.kind, rule: spec.rule, choices: spec.choices, ...sequence };
  });
}

export function morningOrder(level: LogicLevel): MorningCard[] {
  return level === "later" ? MORNING : MORNING.slice(0, 3);
}

/** A fixed mix so the pictures are not already in morning order. */
export function morningDeal(level: LogicLevel): string[] {
  return level === "later" ? ["school", "wake", "eat", "brush"] : ["eat", "wake", "brush"];
}

export function morningFits(order: string[], placed: string[], card: string, slot: number): boolean {
  return slot === placed.length && card === order[slot];
}

export function gardenRounds(): GardenRound[] {
  return [
    { cause: "rain", other: "sun", effect: "flower", prompt: "code-garden-rain" },
    { cause: "sun", other: "rain", effect: "melt", prompt: "code-garden-sun" },
  ];
}

export function logicManifestEntries(): { id: string; say: string }[] {
  return [
    { id: "code-bird", say: "Take your animal home to the nest." },
    { id: "code-plan", say: "Line up the arrows, then press go." },
    { id: "code-loop", say: "Do this move three times." },
    { id: "code-bug", say: "One arrow is wrong. Tap it, then press go." },
    { id: "code-pattern", say: "What comes next?" },
    { id: "code-morning", say: "Put the morning pictures in order." },
    { id: "code-garden-rain", say: "If it rains, the flower grows." },
    { id: "code-garden-sun", say: "If the sun comes out, the ice melts." },
    { id: "code-again", say: "Try again." },
  ];
}
