import type { IllustrationName } from "../illustrations";
import type { AgeRange } from "./profiles";

/**
 * The four coding games: a path to plan, a pattern to continue, steps to put
 * in order, and an if-then rule to apply.
 *
 * Rewritten after the first phone test, which called these games half done.
 * What was wrong, and what changed:
 *
 *  - Every play was the same rounds in the same places. Each builder now
 *    takes `salt` (a number that is new each time a game opens) and picks
 *    and arranges its rounds from it, as the reading games do.
 *  - The pictures were colored dots and bars a few pixels wide, and one
 *    pattern drew its answer off the bottom of the page. Patterns, steps and
 *    rules now name drawings the app already has (a cat, an egg, a sock), so
 *    the game shows real things at a size a child can see.
 *  - "Morning" asked a child to order three abstract icons with words under
 *    them. The order game now uses things that have one true order (egg,
 *    chick, hen).
 *  - "If then" showed a four-pixel flower. It is now a rule a child knows
 *    from life: if it rains, you need an umbrella.
 *
 * The game ids (bird, pattern, morning, garden) are unchanged because stars
 * already earned are saved under them.
 */

/** Ages 3–4 play short puzzles. Ages 5–7 add longer paths, a routine to use again, a repeat, and a bug fix. */
export type LogicLevel = "early" | "later";

export type Dir = "up" | "down" | "left" | "right";

export type Cell = { x: number; y: number };

/**
 * tap: each arrow moves the animal a step. plan: arrows are lined up, then run. keep: a short plan
 * that, once it gets home, is kept as the child's routine: its arrows become one chip. reuse: a
 * longer way home that the routine chip is part of (it does all its steps as one). predict: the
 * start of a plan is given and the child picks which ending gets home, then runs it. loop: one
 * arrow, run three times. bug: a plan with one thing wrong in it to find and mend.
 */
export type BirdMode = "tap" | "plan" | "keep" | "reuse" | "predict" | "loop" | "bug";

/** A piece of a plan on the page: an arrow, or the routine (the kept steps, as one chip). */
export type Chip = Dir | "routine";

/** What is wrong with a bug round's plan: an arrow that turns the wrong way, one too many, or one missing. */
export type BugKind = "turn" | "extra" | "missing";

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
  /** Arrows already on the page. A bug round's plan with its bug in it; a predict round's given start. */
  shown: Dir[];
  /** Bug: where the bug is in `shown` (a wrong arrow, an extra one, or the place an arrow is missing from). */
  bugIndex: number | null;
  bugKind: BugKind | null;
  /** Bug: the arrow that belongs at `bugIndex`, for a wrong or a missing one. */
  fix: Dir | null;
  /** Predict: the endings to choose from. Exactly one of them gets home. */
  choices: Dir[][];
  /** Reuse: the kept steps, which the routine chip does as one. Empty in every other round. */
  routine: Dir[];
};

export type PatternRule = "AB" | "ABB" | "ABC";

/**
 * A row of pictures that follows a rule. A picture is the name of a drawing in src/illustrations.tsx;
 * the type holds every game to drawings that exist, so none can show an empty box.
 */
export type PatternRound = {
  rule: PatternRule;
  shown: IllustrationName[];
  answer: IllustrationName;
  choices: IllustrationName[];
};

/** One picture in an order or rule game: the drawing, and the word said when it is tapped. */
export type PictureCard = { art: IllustrationName; name: string };

/** Pictures with one true order, dealt out of order. */
export type OrderRound = {
  id: string;
  cards: PictureCard[];
  deal: IllustrationName[];
};

/** If this is so, then you need that. */
export type RuleRound = {
  id: string;
  when: PictureCard;
  need: PictureCard;
  choices: PictureCard[];
  /** Clip ids: the question, and the rule said in full once it is answered. */
  ask: string;
  rule: string;
};

const DIRS: Dir[] = ["up", "down", "left", "right"];

const DELTA: Record<Dir, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** A number from the salt that differs between neighbors, so play 5 and play 6 do not look alike. */
function mix(salt: number, turn = 0): number {
  const value = Math.imul((salt | 0) + 1 + turn * 7919, 2654435761) >>> 0;
  // `>>> 0` keeps it a whole number from 0 up: a negative one would pick outside a list.
  return (value ^ (value >>> 15)) >>> 0;
}

function shuffle<T>(items: readonly T[], salt: number): T[] {
  const out = [...items];
  for (let index = out.length - 1; index > 0; index -= 1) {
    const pick = mix(salt, index) % (index + 1);
    [out[index], out[pick]] = [out[pick], out[index]];
  }
  return out;
}

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

/** Every cell the animal passes through, the start first. Stops where a move would leave the grid. */
export function trail(start: Cell, dirs: Dir[], width: number, height: number): Cell[] {
  const cells = [start];
  let cell = start;
  for (const dir of dirs) {
    const next = stepCell(cell, dir);
    if (!onGrid(next, width, height)) break;
    cell = next;
    cells.push(cell);
  }
  return cells;
}

const MIRROR: Record<Dir, Dir> = { left: "right", right: "left", up: "up", down: "down" };
const FLIP: Record<Dir, Dir> = { up: "down", down: "up", left: "left", right: "right" };

/** The same puzzle seen in a mirror, upside down, or both: four boards from one. */
function turned(round: BirdRound, mirror: boolean, flip: boolean): BirdRound {
  const cell = (at: Cell): Cell => ({ x: mirror ? round.width - 1 - at.x : at.x, y: flip ? round.height - 1 - at.y : at.y });
  const dir = (way: Dir): Dir => {
    const sideways = mirror ? MIRROR[way] : way;
    return flip ? FLIP[sideways] : sideways;
  };
  return {
    ...round,
    start: cell(round.start),
    nest: cell(round.nest),
    path: round.path.map(dir),
    shown: round.shown.map(dir),
    fix: round.fix ? dir(round.fix) : null,
    routine: round.routine.map(dir),
    choices: round.choices.map((ending) => ending.map(dir)),
  };
}

/**
 * The boards a child can be given. There were five, and every play showed the
 * same three, so a child who had played twice had seen them all. Now every
 * board with a straight path or one turn (ages 3–4), or one or two turns
 * (ages 5–7), is made from the grid sizes below, and each play picks from
 * them with the salt. That is dozens of boards a level before the mirror and
 * upside-down turns of `turned`, which multiply them again.
 */
type BoardShape = { width: number; height: number; turns: number[]; steps: [number, number] };

const SHAPES: Record<LogicLevel, BoardShape[]> = {
  // Two or three steps, straight or with one turn, on small grids.
  early: [
    { width: 3, height: 3, turns: [0, 1], steps: [2, 3] },
    { width: 4, height: 3, turns: [0, 1], steps: [2, 3] },
  ],
  // Four to six steps, one or two turns, on bigger grids. Two turns is a path a child
  // has to look at twice, which is the point at five to seven.
  later: [
    { width: 4, height: 3, turns: [1, 2], steps: [4, 5] },
    { width: 4, height: 4, turns: [1, 2], steps: [4, 6] },
  ],
};

const PERPENDICULAR: Record<Dir, Dir[]> = {
  up: ["left", "right"],
  down: ["left", "right"],
  left: ["up", "down"],
  right: ["up", "down"],
};

/** Every way of walking `steps` moves with exactly `turns` turns, as runs of one direction. */
function routes(steps: number, turns: number): Dir[][] {
  const out: Dir[][] = [];
  const grow = (path: Dir[], runs: number) => {
    if (path.length === steps) {
      if (runs === turns + 1) out.push(path);
      return;
    }
    const last = path[path.length - 1];
    // The first move starts the first run; a move the same way continues it; a sideways move starts
    // another, as long as there are turns left.
    if (!last) {
      for (const dir of DIRS) grow([dir], 1);
      return;
    }
    grow([...path, last], runs);
    if (runs <= turns) for (const dir of PERPENDICULAR[last]) grow([...path, dir], runs + 1);
  };
  grow([], 0);
  return out;
}

/** The plan boards for a level, each solved by its own path, the shortest first. */
export function boardLibrary(level: LogicLevel): BirdRound[] {
  const boards: BirdRound[] = [];
  for (const shape of SHAPES[level]) {
    for (let steps = shape.steps[0]; steps <= shape.steps[1]; steps += 1) {
      for (const turns of shape.turns) {
        for (const path of routes(steps, turns)) {
          for (let y = 0; y < shape.height; y += 1) {
            for (let x = 0; x < shape.width; x += 1) {
              const start = { x, y };
              const { end, blocked } = walk(start, path, shape.width, shape.height);
              if (blocked) continue;
              const board: BirdRound = { id: `plan-${shape.width}x${shape.height}-${x}${y}-${path.join("")}`, mode: "plan", width: shape.width, height: shape.height, start, nest: end, path, repeat: 1, shown: [], bugIndex: null, bugKind: null, fix: null, choices: [], routine: [] };
              // Only a shortest way home is a board: a path that doubles back (up, right, down) is a
              // detour, and the game would call the child's shorter plan wrong.
              if (checkPlan(board, path).ok) boards.push(board);
            }
          }
        }
      }
    }
  }
  return boards;
}

/** Boards that are the same as each other once mirrored or turned over are one board. */
export function boardFamily(round: BirdRound): string {
  const forms = [turned(round, false, false), turned(round, true, false), turned(round, false, true), turned(round, true, true)];
  return forms.map((form) => `${form.width}x${form.height}:${form.start.x},${form.start.y}:${form.path.join("")}`).sort()[0];
}

const LOOP: BirdRound = { id: "loop-three", mode: "loop", width: 4, height: 2, start: { x: 0, y: 0 }, nest: { x: 3, y: 0 }, path: ["right"], repeat: 3, shown: [], bugIndex: null, bugKind: null, fix: null, choices: [], routine: [] };

/** How many times a path changes direction. */
function turnsOf(path: Dir[]): number {
  return path.filter((dir, index) => index > 0 && dir !== path[index - 1]).length;
}

/** The grids a reuse board can be on, and how long its way home is: the later level's, with the routine inside it. */
const REUSE = { grids: [{ width: 4, height: 3 }, { width: 4, height: 4 }], steps: [5, 6], turns: 2 };

/**
 * The boards a routine can be used again on: every way home of five or six steps that has the
 * routine's steps in it as one run, with a straight run of one to three steps before it, after it,
 * or both, no more than two turns in all (a way a child can read; one more than the routine's own,
 * when it has two: a child's way round a corner can be "right, up, right"), on the later level's
 * grids, from every start it fits. The routine is not always at the start, so the child has to see
 * where it goes. Never empty for a kept routine (three steps, on a grid of three rows).
 */
export function reuseBoards(routine: Dir[]): BirdRound[] {
  const boards: BirdRound[] = [];
  const seen = new Set<string>();
  const turns = Math.max(REUSE.turns, turnsOf(routine) + 1);
  const runs: Dir[][] = [[]];
  for (const dir of DIRS) for (let length = 1; length <= 3; length += 1) runs.push(Array.from({ length }, () => dir));
  for (const before of runs) {
    for (const after of runs) {
      const path = [...before, ...routine, ...after];
      if (path.length < REUSE.steps[0] || path.length > REUSE.steps[1] || turnsOf(path) > turns) continue;
      for (const grid of REUSE.grids) {
        for (let y = 0; y < grid.height; y += 1) {
          for (let x = 0; x < grid.width; x += 1) {
            const start = { x, y };
            const { end, blocked } = walk(start, path, grid.width, grid.height);
            if (blocked) continue;
            const board: BirdRound = { id: `reuse-${grid.width}x${grid.height}-${x}${y}-${path.join("")}-${before.length}`, mode: "reuse", width: grid.width, height: grid.height, start, nest: end, path, repeat: 1, shown: [], bugIndex: null, bugKind: null, fix: null, choices: [], routine };
            // A shortest way home only (no doubling back), and each board once.
            if (!checkPlan(board, path).ok || seen.has(board.id)) continue;
            seen.add(board.id);
            boards.push(board);
          }
        }
      }
    }
  }
  return boards;
}

/**
 * The reuse round for a routine: one of its boards, picked by the salt. The routine is the plan the
 * child got home with in the keep round (any shortest way counts there, so it may differ from the
 * board's own path), which is why this is built when the keep round is done and not before; the
 * play's list holds the one for the keep board's own path until then.
 */
export function reuseRound(routine: Dir[], salt: number): BirdRound {
  const boards = reuseBoards(routine);
  return boards[mix(salt, 12) % boards.length];
}

/** Where the routine sits in a reuse board's own path: the index of its first step. */
export function routineAt(round: BirdRound): number {
  const inner = round.routine.join(",");
  for (let at = 0; at + round.routine.length <= round.path.length; at += 1) {
    if (round.path.slice(at, at + round.routine.length).join(",") === inner) return at;
  }
  return -1;
}

/** The chips a reuse board's own path takes: its steps, with the routine's as one. */
export function reuseChips(round: BirdRound): Chip[] {
  const at = routineAt(round);
  return [...round.path.slice(0, at), "routine", ...round.path.slice(at + round.routine.length)];
}

/** How many places a reuse round's plan has: one for each chip of the board's own way home. */
export function reusePlaces(round: BirdRound): number {
  return round.path.length - round.routine.length + 1;
}

/**
 * Which chip each step of a plan comes from, and which step inside the routine it is (-1 for an
 * arrow): for the arrow that lights as a step is walked, and the arrow a run goes wrong at.
 */
export function chipSteps(round: BirdRound, chips: (Chip | null)[]): { chip: number; sub: number }[] {
  const steps: { chip: number; sub: number }[] = [];
  chips.forEach((chip, index) => {
    if (chip === null) return;
    if (chip === "routine") round.routine.forEach((_, sub) => steps.push({ chip: index, sub }));
    else steps.push({ chip: index, sub: -1 });
  });
  return steps;
}

/**
 * Whether the routine, put next in a reuse plan, keeps the animal on its way: every one of its steps
 * from where the plan so far leaves it goes nearer the nest. For the hand after three misses, and
 * for the line after a run that stops short.
 */
export function routineFits(round: BirdRound, chips: (Chip | null)[]): boolean {
  const check = checkPlan(round, program(round, [...chips, "routine"]));
  return check.ok || check.why === "short";
}


/**
 * A plan with one thing wrong in it, for the child to find and mend. Three kinds, by the salt:
 *
 *  - turn: one arrow turns the wrong way (tap it off, then put the right one in its place);
 *  - extra: one arrow too many (tap it off);
 *  - missing: one arrow is missing, and its place is empty (put the right one in).
 *
 * The bug is never the first arrow, so there is a step to watch before it goes wrong, and never
 * the last, so there is a step after it. A wrong or extra arrow is one the animal is seen to go
 * wrong on at that very step: off the edge, or a step away from the nest.
 */
function bugged(round: BirdRound, salt: number): BirdRound {
  const kinds: BugKind[] = ["turn", "extra", "missing"];
  const bugKind = kinds[mix(salt, 9) % kinds.length];
  const spots = round.path.map((_, index) => index).filter((index) => index > 0 && index < round.path.length - 1);
  const bugIndex = spots[mix(salt, 3) % spots.length] ?? 1;
  const back = (dir: Dir): Dir => ({ up: "down", down: "up", left: "right", right: "left" })[dir] as Dir;
  if (bugKind === "missing") {
    const shown = round.path.filter((_, index) => index !== bugIndex);
    return { ...round, id: `bug-missing-${round.id}`, mode: "bug", shown, bugIndex, bugKind, fix: round.path[bugIndex] };
  }
  if (bugKind === "extra") {
    // An arrow put in before the one at bugIndex: sideways from the step before, when that goes
    // wrong there, else straight back.
    const before = round.path[bugIndex - 1];
    let shown = round.path;
    for (const extra of [...shuffle(PERPENDICULAR[before], salt + 4), back(before)]) {
      const tried = [...round.path.slice(0, bugIndex), extra, ...round.path.slice(bugIndex)];
      const check = checkPlan(round, tried);
      if (!check.ok && check.why !== "short" && check.at === bugIndex) {
        shown = tried;
        break;
      }
    }
    return { ...round, id: `bug-extra-${round.id}`, mode: "bug", shown, bugIndex, bugKind, fix: null };
  }
  const right = round.path[bugIndex];
  let shown = round.path;
  for (const wrong of [...shuffle(PERPENDICULAR[right], salt + 4), back(right)]) {
    const tried = round.path.map((dir, index) => (index === bugIndex ? wrong : dir));
    const check = checkPlan(round, tried);
    if (!check.ok && check.why !== "short" && check.at === bugIndex) {
      shown = tried;
      break;
    }
  }
  return { ...round, id: `bug-turn-${round.id}`, mode: "bug", shown, bugIndex, bugKind, fix: right };
}

/** A bug round's plan as it is first shown: the arrows, with an empty place where one is missing. */
export function bugPlan(round: BirdRound): (Dir | null)[] {
  if (round.bugKind === "missing" && round.bugIndex !== null) {
    return [...round.shown.slice(0, round.bugIndex), null, ...round.shown.slice(round.bugIndex)];
  }
  return [...round.shown];
}

/**
 * Endings a child could pick for a plan whose start is given: the right one, and wrong ones made
 * from it by turning one arrow. Reading code before running it. A wrong ending goes wrong at the
 * arrow that was changed, so when it is walked the arrow that is marked is the one that differs
 * from the right ending (a changed arrow that only goes wrong later would mark an arrow the right
 * ending has too). Straight back the other way always goes wrong at once, so there are always
 * enough.
 */
export function predictChoices(round: BirdRound, tail: number, count: number, salt: number): Dir[][] {
  const right = round.path.slice(round.path.length - tail);
  const given = round.path.slice(0, round.path.length - tail);
  const seen = new Set<string>([right.join(",")]);
  const wrong: Dir[][] = [];
  const changes: { ending: Dir[]; at: number }[] = [];
  for (let at = 0; at < right.length; at += 1) {
    for (const dir of DIRS) {
      if (dir === right[at]) continue;
      changes.push({ ending: right.map((step, index) => (index === at ? dir : step)), at });
    }
  }
  for (const { ending, at } of shuffle(changes, salt + 7)) {
    if (wrong.length >= count - 1) break;
    const key = ending.join(",");
    if (seen.has(key)) continue;
    const check = checkPlan(round, [...given, ...ending]);
    if (check.ok || check.why === "short" || check.at !== given.length + at) continue;
    seen.add(key);
    wrong.push(ending);
  }
  return shuffle([right, ...wrong], salt + 11);
}

/** A plan round whose start is given, with `tail` arrows to predict from `count` endings. */
function predicted(round: BirdRound, tail: number, count: number, salt: number): BirdRound {
  return {
    ...round,
    id: `predict-${round.id}`,
    mode: "predict",
    shown: round.path.slice(0, round.path.length - tail),
    choices: predictChoices(round, tail, count, salt),
  };
}

/** The short board a child's routine is made on: three steps with a turn, so it is worth keeping. */
const KEEP_STEPS = 3;

/** Steps a child can take by tapping, before any planning: the two shortest kinds of board. */
const TAP_STEPS = [2, 3];

/**
 * The path puzzles for one play, picked from the library with `salt`:
 *
 *  - ages 3–4: two boards to walk by tapping (a straight one, then one with a turn),
 *    two to plan before pressing go, then one whose ending is picked from two;
 *  - ages 5–7: a plan of four, then a short one of three with a turn that is kept
 *    as the child's routine, then a longer way home of five or six that the routine
 *    chip is part of, then a plan whose ending is picked from three, a move to
 *    repeat three times, and a plan with one wrong arrow to find.
 *
 * No two boards of a play are the same shape, and the salt also mirrors or turns
 * the boards over, so the nest is not in the same corner every time.
 */
export function birdRounds(level: LogicLevel, salt = 0): BirdRound[] {
  const library = boardLibrary(level);
  const seen = new Set<string>();
  const pick = (filter: (round: BirdRound) => boolean, turn: number, from = library): BirdRound => {
    const fitting = from.filter((round) => filter(round) && !seen.has(boardFamily(round)));
    const pool = fitting.length > 0 ? fitting : from.filter(filter);
    const chosen = pool[mix(salt, turn) % pool.length];
    seen.add(boardFamily(chosen));
    const spin = mix(salt, turn + 50);
    return turned(chosen, salt !== 0 && (spin & 1) === 1, salt !== 0 && (spin & 2) === 2 && chosen.height > 1);
  };
  const straight = (round: BirdRound) => new Set(round.path).size === 1;
  if (level === "early") {
    return [
      { ...pick((round) => straight(round) && round.path.length === TAP_STEPS[0], 1), mode: "tap" },
      { ...pick((round) => !straight(round) && round.path.length === TAP_STEPS[1], 2), mode: "tap" },
      pick((round) => round.path.length === 2, 3),
      pick((round) => round.path.length === 3, 4),
      // A board with a turn, so there is a turn to read in the plan.
      predicted(pick((round) => round.path.length === 3 && !straight(round), 7), 2, 2, salt),
    ];
  }
  // The keep board is a short one (from the early library), and the reuse board is made from it.
  const keep: BirdRound = { ...pick((round) => round.path.length === KEEP_STEPS && !straight(round), 2, boardLibrary("early")), mode: "keep" };
  return [
    pick((round) => round.path.length === 4, 1),
    { ...keep, id: `keep-${keep.id}` },
    reuseRound(keep.path, salt),
    predicted(pick((round) => round.path.length === 5, 8), 3, 3, salt),
    turned(LOOP, salt !== 0 && (mix(salt, 5) & 1) === 1, false),
    bugged(pick((round) => round.path.length >= 4 && round.path.length <= 5, 6), salt),
  ];
}

/**
 * Arrows that will run: a queued plan, a move repeated three times, or the given start of a plan
 * with the ending that was picked (`queued`). A bug round's plan is the child's (`queued`), with
 * any empty place in it left out; it starts as `bugPlan` and is mended on the page. In a reuse
 * round the routine chip stands for its steps.
 */
export function program(round: BirdRound, queued: (Chip | null)[]): Dir[] {
  const dirs = queued.flatMap((chip): Dir[] => (chip === null ? [] : chip === "routine" ? round.routine : [chip]));
  if (round.mode === "predict") return dirs.length === 0 ? [] : [...round.shown, ...dirs];
  if (round.mode === "loop") {
    const body = dirs[0];
    if (!body) return [];
    return Array.from({ length: round.repeat }, () => body);
  }
  return dirs;
}

export function reachesNest(round: BirdRound, dirs: Dir[]): boolean {
  const result = walk(round.start, dirs, round.width, round.height);
  return !result.blocked && sameCell(result.end, round.nest);
}

/** How many steps each cell is from the nest, by the shortest way. */
function stepsToNest(round: BirdRound): number[][] {
  const far = Infinity;
  const steps = Array.from({ length: round.height }, () => Array.from({ length: round.width }, () => far));
  steps[round.nest.y][round.nest.x] = 0;
  const queue: Cell[] = [round.nest];
  while (queue.length > 0) {
    const cell = queue.shift()!;
    for (const dir of DIRS) {
      const next = stepCell(cell, dir);
      if (!onGrid(next, round.width, round.height) || steps[next.y][next.x] !== far) continue;
      steps[next.y][next.x] = steps[cell.y][cell.x] + 1;
      queue.push(next);
    }
  }
  return steps;
}

/**
 * A step from `cell` that brings the animal nearer the nest, for the hand that shows the way after
 * three misses. The board's own path first, when it is one of them; null on the nest.
 */
export function nextStepHome(round: BirdRound, cell: Cell): Dir | null {
  const steps = stepsToNest(round);
  const nearer = DIRS.filter((dir) => {
    const next = stepCell(cell, dir);
    return onGrid(next, round.width, round.height) && steps[next.y][next.x] < steps[cell.y][cell.x];
  });
  const walked = trail(round.start, round.path, round.width, round.height);
  const along = walked.findIndex((step) => sameCell(step, cell));
  const drawn = along >= 0 ? round.path[along] : undefined;
  return drawn && nearer.includes(drawn) ? drawn : (nearer[0] ?? null);
}

export type PlanCheck =
  | { ok: true }
  /** Step `at` leaves the grid ("off"), or walks away from the nest ("away"); or the plan ends short of it. */
  | { ok: false; why: "off" | "away"; at: number }
  | { ok: false; why: "short"; at: number };

/**
 * Where a plan goes wrong, if it does. A step is wrong when it leaves the grid or takes the animal
 * farther from the nest than it was: the first such step is the one to point at, and the animal
 * walks that far so the child sees it. A plan that keeps heading the right way but stops early is
 * short, and `at` is the place the next arrow belongs in. Any way home counts, not only the one the
 * board was drawn with: on a grid with no walls, "up, right" is as good as "right, up".
 */
export function checkPlan(round: BirdRound, dirs: Dir[]): PlanCheck {
  const steps = stepsToNest(round);
  let cell = round.start;
  for (const [at, dir] of dirs.entries()) {
    const next = stepCell(cell, dir);
    if (!onGrid(next, round.width, round.height)) return { ok: false, why: "off", at };
    if (steps[next.y][next.x] > steps[cell.y][cell.x]) return { ok: false, why: "away", at };
    cell = next;
  }
  return sameCell(cell, round.nest) ? { ok: true } : { ok: false, why: "short", at: dirs.length };
}

function period<Token extends string>(rule: PatternRule, tokens: Token[]): Token[] {
  const [a, b, c] = tokens;
  if (rule === "AB") return [a, b];
  if (rule === "ABB") return [a, b, b];
  return [a, b, c];
}

/** The sequence a rule makes, long enough to hide the last item as the answer. */
export function patternSequence<Token extends string>(rule: PatternRule, tokens: Token[], shown: number): { shown: Token[]; answer: Token } {
  const loop = period(rule, tokens);
  const full = Array.from({ length: shown + 1 }, (_, index) => loop[index % loop.length]);
  return { shown: full.slice(0, shown), answer: full[shown] ?? loop[0] };
}

/**
 * Things that go together, three to a set: a pattern is made from one set. Each is a drawing the app
 * has, and one that stands on its own (the moon, the rain and the kite come on a sky-blue card, which
 * would make a row of boxes).
 */
export const PATTERN_SETS: IllustrationName[][] = [
  ["cat", "dog", "pig"],
  ["sun", "star", "leaf"],
  ["apple", "egg", "bun"],
  ["bus", "van", "jet"],
  ["hat", "sock", "boot"],
  ["frog", "duck", "fish"],
  ["bee", "bug", "ant"],
];

const PATTERN_RULES: { rule: PatternRule; shown: number }[] = [
  { rule: "AB", shown: 4 },
  { rule: "ABB", shown: 5 },
  { rule: "ABC", shown: 5 },
];

/** Three patterns, each from its own set of pictures: AB, then ABB, then ABC. */
export function patternRounds(salt = 0): PatternRound[] {
  const sets = shuffle(PATTERN_SETS, salt);
  return PATTERN_RULES.map((spec, index) => {
    const tokens = shuffle(sets[index % sets.length], salt + index);
    const sequence = patternSequence(spec.rule, tokens, spec.shown);
    return { rule: spec.rule, choices: shuffle(tokens, salt + 31 * (index + 1)), ...sequence };
  });
}

/** Things that happen in one order. Each picture is a drawing the app has; the name is said aloud. */
export const ORDER_SETS: { id: string; cards: PictureCard[] }[] = [
  { id: "grow", cards: [{ art: "egg", name: "egg" }, { art: "chick", name: "chick" }, { art: "hen", name: "hen" }] },
  { id: "dress", cards: [{ art: "feet", name: "feet" }, { art: "sock", name: "sock" }, { art: "boot", name: "boot" }] },
  { id: "rain", cards: [{ art: "cloud", name: "cloud" }, { art: "rain", name: "rain" }, { art: "plant", name: "plant" }] },
  { id: "bed", cards: [{ art: "bath", name: "bath" }, { art: "shirt", name: "shirt" }, { art: "bed", name: "bed" }] },
  { id: "tower", cards: [{ art: "stacked", name: "blocks" }, { art: "tower", name: "tower" }, { art: "tumble", name: "crash" }] },
];

/** Cards out of order: never the order that is the answer. */
function dealt(cards: PictureCard[], salt: number): IllustrationName[] {
  const order = cards.map((card) => card.art);
  for (let turn = 0; turn < 6; turn += 1) {
    const deal = shuffle(order, salt + turn);
    if (deal.some((art, index) => art !== order[index])) return deal;
  }
  return [...order].reverse();
}

/** Two sets to order at ages 3–4, three at 5–7, different sets from one play to the next. */
export function orderRounds(level: LogicLevel, salt = 0): OrderRound[] {
  const count = level === "later" ? 3 : 2;
  return shuffle(ORDER_SETS, salt)
    .slice(0, count)
    .map((set, index) => ({ id: set.id, cards: set.cards, deal: dealt(set.cards, salt + index) }));
}

/** Only the next picture in the order fits the next place. */
export function orderFits(order: string[], placed: string[], card: string, slot: number): boolean {
  return slot === placed.length && card === order[slot];
}

// Each rule's picture shows the "if" plainly (rain, a hot sun, a night sky, a small plant, a dog), and no
// two rules could share an answer, so a wrong tap is wrong and not just another good idea.
const RULES: { id: string; when: PictureCard; need: PictureCard; ask: string; rule: string }[] = [
  { id: "rain", when: { art: "rain", name: "rain" }, need: { art: "umbrella", name: "umbrella" }, ask: "It is raining. What do you need?", rule: "If it rains, take an umbrella." },
  { id: "sun", when: { art: "sun", name: "sun" }, need: { art: "hat", name: "hat" }, ask: "The sun is hot. What do you need?", rule: "If the sun is hot, wear a hat." },
  { id: "dark", when: { art: "night", name: "night" }, need: { art: "lamp", name: "lamp" }, ask: "It is dark. What do you need?", rule: "If it is dark, turn on a lamp." },
  { id: "plant", when: { art: "plant", name: "plant" }, need: { art: "jug", name: "jug" }, ask: "The plant is dry. What does it need?", rule: "If the plant is dry, give it a jug of water." },
  { id: "dog", when: { art: "dog", name: "dog" }, need: { art: "bone", name: "bone" }, ask: "The dog is hungry. What does it need?", rule: "If the dog is hungry, give it a bone." },
];

/** The rules for one play: three at ages 3–4, four at 5–7. Each offers the right thing among two others. */
export function ruleRounds(level: LogicLevel, salt = 0): RuleRound[] {
  const count = level === "later" ? 4 : 3;
  const picked = shuffle(RULES, salt).slice(0, count);
  return picked.map((rule, index) => {
    // Wrong answers are the things other rules need, so every choice is a sensible thing to want.
    const others = shuffle(
      RULES.filter((other) => other.id !== rule.id).map((other) => other.need),
      salt + 13 * (index + 1),
    ).slice(0, 2);
    return {
      id: rule.id,
      when: rule.when,
      need: rule.need,
      choices: shuffle([rule.need, ...others], salt + 5 * (index + 1)),
      ask: `code-if-${rule.id}`,
      rule: `code-then-${rule.id}`,
    };
  });
}

/** Every drawing the coding games show. */
export function logicPictures(): IllustrationName[] {
  return [
    ...new Set([
      ...PATTERN_SETS.flat(),
      ...ORDER_SETS.flatMap((set) => set.cards.map((card) => card.art)),
      ...RULES.flatMap((rule) => [rule.when.art, rule.need.art]),
    ]),
  ];
}

/** Every word the coding games say when a picture is tapped: each needs a recorded word clip. */
export function logicWords(): string[] {
  return [...new Set([...ORDER_SETS.flatMap((set) => set.cards.map((card) => card.name)), ...RULES.flatMap((rule) => [rule.when.name, rule.need.name])])];
}

/** The games' spoken lines. scripts/sync-manifest.ts writes these into the clip list. */
export function logicManifestEntries(): { id: string; say: string }[] {
  return [
    { id: "code-bird", say: "Take your animal home to the nest." },
    { id: "code-plan", say: "Line up the arrows, then press go." },
    { id: "code-loop", say: "Do this move three times." },
    { id: "code-bug", say: "One arrow is wrong. Tap it off, then fill the empty place." },
    { id: "code-bug-extra", say: "One arrow too many. Tap it off, then press go." },
    { id: "code-bug-missing", say: "One arrow is missing. Fill the empty place, then press go." },
    { id: "code-predict", say: "Which arrows take it home? Pick one, then press go." },
    { id: "code-routine-kept", say: "Home! Let's keep those steps. Now they're one chip: your routine." },
    { id: "code-routine-use", say: "A longer way home. Your routine chip does all its steps at once. Line up the way, then press go." },
    { id: "code-routine-short", say: "Not home yet. Try your routine chip." },
    { id: "code-go", say: "Now press go." },
    { id: "code-pattern", say: "What comes next?" },
    { id: "code-order", say: "What comes first? Put the pictures in order." },
    ...RULES.flatMap((rule) => [
      { id: `code-if-${rule.id}`, say: rule.ask },
      { id: `code-then-${rule.id}`, say: rule.rule },
    ]),
    { id: "code-again", say: "Try again." },
    { id: "code-off", say: "That way goes off the edge." },
    { id: "code-away", say: "That way goes away from the nest." },
    { id: "code-short", say: "Not home yet. Add one more arrow." },
    { id: "code-home", say: "You made it home!" },
  ];
}
