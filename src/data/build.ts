import { logicLevel, type LogicLevel } from "./logic";
import type { AgeRange } from "./profiles";

/**
 * Coding's "build" and "code" parts: picture blocks that make a program, and
 * the same program written in words.
 *
 * The plan for coding has three parts, and this file holds two of them:
 *
 *   1. Think: logic without a program (src/data/logic.ts).
 *   2. Build: line up picture blocks, press Play, and the child's animal
 *      does each step in order.
 *   3. Code: the program in words (pseudo code). Every block has a short
 *      line, read aloud; "Read the code" turns it round, giving the words
 *      and asking for the blocks. A grown-up can also turn on a read-only
 *      Python view of the same program.
 *
 * It starts where programmers start, with hello world: one block, "say
 * hello", and the animal says it. In Python that program is
 * `print("Hello, world!")`.
 *
 * There were four boards. Two went after the first phone test: "Scene"
 * (rain, then a flower) and "Chef" (the order of a sandwich) were the If-then
 * and First-then games again, drawn as colored bars a few pixels wide.
 */

/** Picture blocks. A repeat plays the block before it two more times. */
export type BuildBlock = "hello" | "walk" | "jump" | "spin" | "dance" | "sing" | "drum" | "bell" | "note" | "repeat" | "pond";

/** The boards: a first program (hello world), a dance, a song. */
export type BuildActivity = "hello" | "move" | "music";

export const SCRIPT_LIMIT = 8;
export const POND_STEPS = 3;

const BLOCKS = new Set<string>(["hello", "walk", "jump", "spin", "dance", "sing", "drum", "bell", "note", "repeat", "pond"]);

export type PlayStep = { block: BuildBlock; index: number };

/** A step the animal, song, scene, or chef can run. Splash exists only inside an if. */
export type DoAction = Exclude<BuildBlock, "repeat" | "pond"> | "splash";

export type Statement =
  | { type: "do"; action: DoAction; index: number }
  | { type: "repeat"; times: 3; index: number; body: Statement }
  | { type: "if"; when: "at-pond"; index: number; body: Statement };

const PYTHON: Record<DoAction, string> = {
  hello: 'print("Hello, world!")',
  walk: "bird.walk()",
  jump: "bird.jump()",
  spin: "bird.spin()",
  dance: "bird.dance()",
  sing: "bird.sing()",
  drum: "play.drum()",
  bell: "play.bell()",
  note: "play.note()",
  splash: "bird.splash()",
};

export function isBuildBlock(value: string): value is BuildBlock {
  return BLOCKS.has(value);
}

export function palette(activity: BuildActivity, level: LogicLevel): BuildBlock[] {
  // The first program needs one block. Two more are there for the child who wants a second step.
  if (activity === "hello") return ["hello", "jump", "spin"];
  if (activity === "move") {
    const blocks: BuildBlock[] = ["walk", "jump", "spin", "dance", "sing"];
    if (level === "later") blocks.push("repeat", "pond");
    return blocks;
  }
  return ["drum", "bell", "note", "repeat"];
}

export function buildLevel(ageRange: AgeRange | string): LogicLevel {
  return logicLevel(ageRange);
}

/**
 * One program for every view. A repeat wraps the previous block and plays it
 * three times. A pond block is "if at the pond, splash."
 */
export function compile(script: BuildBlock[]): Statement[] {
  const program: Statement[] = [];
  script.forEach((block, index) => {
    if (block === "repeat") {
      const prev = script[index - 1];
      if (!prev || prev === "repeat" || program.length === 0) return;
      const body = program.pop();
      if (!body) return;
      program.push({ type: "repeat", times: 3, index, body });
      return;
    }
    if (block === "pond") {
      program.push({
        type: "if",
        when: "at-pond",
        index,
        body: { type: "do", action: "splash", index },
      });
      return;
    }
    program.push({ type: "do", action: block, index });
  });
  return program;
}

/** A step in words. Most are the block's own name; hello is "say hello". */
function words(action: DoAction | BuildBlock): string {
  return action === "hello" ? "say hello" : action;
}

function pseudoStatement(statement: Statement): string {
  if (statement.type === "do") return words(statement.action);
  if (statement.type === "repeat") return `repeat ${statement.times} times: ${pseudoStatement(statement.body)}`;
  return `if at pond: ${pseudoStatement(statement.body)}`;
}

function pythonStatement(statement: Statement, indent: number): string {
  const pad = "    ".repeat(indent);
  if (statement.type === "do") return `${pad}${PYTHON[statement.action]}`;
  if (statement.type === "repeat") {
    return `${pad}for i in range(${statement.times}):\n${pythonStatement(statement.body, indent + 1)}`;
  }
  return `${pad}if bird.at_pond():\n${pythonStatement(statement.body, indent + 1)}`;
}

/** The whole program in short lines. Ages 5–7 show one of these on each block. */
export function pseudoCode(script: BuildBlock[]): string {
  return compile(script).map(pseudoStatement).join("\n");
}

/** The line for one block in the stack. */
export function pseudoLine(script: BuildBlock[], index: number): string {
  const block = script[index];
  if (!block) return "";
  if (block === "pond") return "if at pond: splash";
  if (block !== "repeat") return words(block);
  const prev = script[index - 1];
  if (!prev || prev === "repeat") return "repeat 3 times";
  if (prev === "pond") return "repeat 3 times: if at pond: splash";
  return `repeat 3 times: ${words(prev)}`;
}

/** A line of the program as the clips that say it: a prompt for the phrases, a word clip for a plain step. */
export type LineCue = { kind: "prompt" | "word"; id: string; say: string };

export function lineCues(script: BuildBlock[], index: number): LineCue[] {
  const block = script[index];
  if (!block) return [];
  const step = (kind: BuildBlock): LineCue[] => {
    if (kind === "hello") return [{ kind: "prompt", id: "code-say-hello", say: "Say hello." }];
    if (kind === "pond") return [{ kind: "prompt", id: "code-if-pond", say: "If at the pond, splash." }];
    if (kind === "repeat") return [];
    return [{ kind: "word", id: BLOCK_NAMES[kind], say: BLOCK_NAMES[kind] }];
  };
  if (block !== "repeat") return step(block);
  const prev = script[index - 1];
  return [{ kind: "prompt", id: "code-repeat", say: "Repeat three times." }, ...(prev ? step(prev) : [])];
}

// Read the code: programs written in words, for the child to build with blocks, in the same form at
// every age (words the child hears, blocks the animal acts out) and ordered easy to hard: one block,
// then two, then three (ages 3–4), or a repeat and then the pond (ages 5–7). The first one, at any
// age, is hello world. Three lines at most: the code, the stage and Play then fit a phone without
// scrolling.

/** Two blocks, each a step. */
const CODE_TWO: BuildBlock[][] = [
  ["jump", "hello"],
  ["walk", "jump"],
  ["spin", "hello"],
  ["hello", "dance"],
  ["dance", "spin"],
  ["walk", "dance"],
  ["spin", "walk"],
  ["jump", "dance"],
];

/** Three steps, for ages 3–4: a step done twice, or three different ones. */
const CODE_THREE: BuildBlock[][] = [
  ["walk", "walk", "jump"],
  ["jump", "spin", "hello"],
  ["hello", "jump", "dance"],
  ["dance", "dance", "spin"],
  ["walk", "spin", "walk"],
  ["spin", "hello", "jump"],
];

/** A repeat to work out, for ages 5–7: on its own, before another step, or after one. */
const CODE_REPEAT: BuildBlock[][] = [
  ["jump", "repeat"],
  ["spin", "repeat"],
  ["walk", "repeat"],
  ["dance", "repeat"],
  ["hello", "repeat"],
  ["hello", "spin", "repeat"],
  ["walk", "jump", "repeat"],
  ["dance", "repeat", "hello"],
  ["jump", "repeat", "spin"],
  ["spin", "repeat", "jump"],
];

/**
 * The pond, last, for ages 5–7: the rule If, then taught ("If at the pond, splash."), done. The pond is
 * three walks away, and a program is three lines at most, so this is the one program that gets there.
 */
const CODE_POND: BuildBlock[][] = [["walk", "repeat", "pond"]];

function turn(salt: number, step: number): number {
  const value = Math.imul((salt | 0) + 1 + step * 7919, 2654435761) >>> 0;
  return (value ^ (value >>> 15)) >>> 0;
}

/**
 * The programs to read, easy to hard: hello world first, then one of two blocks, then one of three
 * (ages 3–4), or one with a repeat and then the one that reaches the pond (ages 5–7). Different ones
 * each play.
 */
export function codeRounds(level: LogicLevel, salt = 0): BuildBlock[][] {
  const two = CODE_TWO[turn(salt, 1) % CODE_TWO.length];
  if (level !== "later") return [["hello"], two, CODE_THREE[turn(salt, 2) % CODE_THREE.length]];
  return [["hello"], two, CODE_REPEAT[turn(salt, 2) % CODE_REPEAT.length], CODE_POND[turn(salt, 3) % CODE_POND.length]];
}

/** A goal for the move board: the blocks to build, and the line that asks for them. */
export type MoveGoal = { id: string; blocks: BuildBlock[]; line: string; say: string };

/**
 * The move board asks for one thing at a time, said aloud, instead of a free stack with no ask: jump,
 * then spin; and then, at ages 5–7, the same again with the repeat block (the "again" block, as it is
 * named when tapped), which they already have. The animal acts each one out.
 */
export const MOVE_GOALS: MoveGoal[] = [
  { id: "jump-spin", blocks: ["jump", "spin"], line: "build-goal-jump-spin", say: "Make your animal jump, then spin. Then press play." },
  { id: "again", blocks: ["jump", "spin", "repeat"], line: "build-goal-again", say: "Now do that again. Add the again block, then press play." },
];

export function moveGoals(level: LogicLevel): MoveGoal[] {
  return level === "later" ? MOVE_GOALS : MOVE_GOALS.slice(0, 1);
}

/** After this many wrong blocks, the right one is pointed at. */
export const GOAL_MISSES = 3;

/**
 * The blocks on offer for a goal: the move board's, with the goal's own among them, five in all so they
 * sit in one row on a phone, in the board's own order.
 */
export function goalPalette(level: LogicLevel, goal: MoveGoal): BuildBlock[] {
  const pool = palette("move", level);
  const keep = new Set<BuildBlock>(goal.blocks);
  for (const block of pool) {
    if (keep.size >= 5) break;
    keep.add(block);
  }
  return pool.filter((block) => keep.has(block));
}

/**
 * The blocks on offer while reading one program: the ones it uses, and others to choose between, five in
 * all so they sit in one row on a phone. They keep the same left-to-right order from round to round.
 */
export function codePalette(level: LogicLevel, code: BuildBlock[] = []): BuildBlock[] {
  const pool: BuildBlock[] = ["hello", "walk", "jump", "spin", "dance"];
  if (level === "later") pool.push("repeat", "pond");
  const keep = new Set<BuildBlock>(code);
  for (const block of pool) {
    if (keep.size >= 5) break;
    keep.add(block);
  }
  return pool.filter((block) => keep.has(block));
}

/** Do the blocks say what the code says? Compared as programs, so the same steps in the same order. */
export function sameProgram(built: BuildBlock[], code: BuildBlock[]): boolean {
  return pseudoCode(built) === pseudoCode(code) && built.length === code.length;
}

/** The first line where the blocks and the code part ways, or -1 when they agree so far. */
export function firstDifference(built: BuildBlock[], code: BuildBlock[]): number {
  const length = Math.max(built.length, code.length);
  for (let index = 0; index < length; index += 1) {
    if (built[index] !== code[index]) return index;
  }
  return -1;
}

/** The same program as Python. Read-only until a later version. */
export function pythonCode(script: BuildBlock[]): string {
  return compile(script).map((statement) => pythonStatement(statement, 0)).join("\n");
}

/** Repeat means the previous block plays three times in all. */
export function playSteps(script: BuildBlock[]): PlayStep[] {
  const steps: PlayStep[] = [];
  const emit = (statement: Statement) => {
    if (statement.type === "do") {
      if (statement.action === "splash") return;
      steps.push({ block: statement.action, index: statement.index });
      return;
    }
    if (statement.type === "if") {
      steps.push({ block: "pond", index: statement.index });
      return;
    }
    emit(statement.body);
    steps.push({ block: "repeat", index: statement.index });
    emit(statement.body);
    emit(statement.body);
  };
  for (const statement of compile(script)) emit(statement);
  return steps;
}

export function moveResult(script: BuildBlock[]): { steps: number; splashed: boolean; pose: string } {
  let steps = 0;
  let splashed = false;
  let pose = "rest";
  for (const step of playSteps(script)) {
    if (step.block === "walk") steps += 1;
    if (step.block === "pond") {
      if (steps >= POND_STEPS) splashed = true;
      pose = steps >= POND_STEPS ? "splash" : "pond";
      continue;
    }
    if (step.block !== "repeat") pose = step.block;
  }
  return { steps, splashed, pose };
}

export function addBlock(script: BuildBlock[], block: BuildBlock): BuildBlock[] {
  if (script.length >= SCRIPT_LIMIT) return script;
  return [...script, block];
}

export function removeBlock(script: BuildBlock[], index: number): BuildBlock[] {
  return script.filter((_, item) => item !== index);
}

type BuildStore = Record<string, Partial<Record<BuildActivity, BuildBlock[]>>>;

export function loadBuild(childId: string, activity: BuildActivity, raw: string | null): BuildBlock[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as BuildStore;
    const saved = parsed?.[childId]?.[activity];
    if (!Array.isArray(saved)) return [];
    return saved.filter((item): item is BuildBlock => typeof item === "string" && isBuildBlock(item)).slice(0, SCRIPT_LIMIT);
  } catch {
    return [];
  }
}

/** Keep a program on this device. The saved text is block ids, not a name. */
export function saveBuild(childId: string, activity: BuildActivity, script: BuildBlock[], raw: string | null): string {
  const current = loadStore(raw);
  const next: BuildStore = {
    ...current,
    [childId]: { ...current[childId], [activity]: script.slice(0, SCRIPT_LIMIT) },
  };
  return JSON.stringify(next);
}

function loadStore(raw: string | null): BuildStore {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as BuildStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** The words said when a block is tapped: each needs a recorded word clip. */
export const BLOCK_NAMES: Record<BuildBlock, string> = {
  hello: "hello",
  walk: "walk",
  jump: "jump",
  spin: "spin",
  dance: "dance",
  sing: "sing",
  drum: "drum",
  bell: "bell",
  note: "note",
  repeat: "again",
  pond: "pond",
};

export function buildWords(): string[] {
  return [...new Set(Object.values(BLOCK_NAMES))];
}

/** Build It's spoken lines. scripts/sync-manifest.ts writes these into the clip list. */
export function buildManifestEntries(): { id: string; say: string }[] {
  return [
    { id: "build-hello", say: "Make your animal say hello. Tap hello, then press play." },
    ...MOVE_GOALS.map((goal) => ({ id: goal.line, say: goal.say })),
    { id: "build-music", say: "Make a song. Press play." },
    { id: "build-again", say: "Try again." },
    { id: "build-save", say: "Saved on this device." },
    // The child's animal may be any of twelve; this line used to call it a bird.
    { id: "build-splash", say: "Splash!" },
    // Read the code: the instruction, and the lines that are phrases (a plain step is a word clip).
    { id: "code-read", say: "Listen to the code. Then build it." },
    { id: "code-say-hello", say: "Say hello." },
    { id: "code-repeat", say: "Repeat three times." },
    { id: "code-if-pond", say: "If at the pond, splash." },
  ];
}
