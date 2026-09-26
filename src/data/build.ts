import { logicLevel, type LogicLevel } from "./logic";
import type { AgeRange } from "./profiles";

/** Picture blocks. A repeat plays the block before it two more times. */
export type BuildBlock =
  | "walk"
  | "jump"
  | "spin"
  | "dance"
  | "sing"
  | "drum"
  | "bell"
  | "note"
  | "repeat"
  | "rain"
  | "sun"
  | "flower"
  | "bread"
  | "spread"
  | "filling"
  | "pond";

export type BuildActivity = "move" | "music" | "scene" | "chef";

export const BUILD_KEY = "littlenest-build-v1";
export const SCRIPT_LIMIT = 8;
export const POND_STEPS = 3;

const BLOCKS = new Set<string>([
  "walk",
  "jump",
  "spin",
  "dance",
  "sing",
  "drum",
  "bell",
  "note",
  "repeat",
  "rain",
  "sun",
  "flower",
  "bread",
  "spread",
  "filling",
  "pond",
]);

export const RECIPE = ["bread", "spread", "filling"] as const;

export type PlayStep = { block: BuildBlock; index: number };

/** A step the animal, song, scene, or chef can run. Splash exists only inside an if. */
export type DoAction = Exclude<BuildBlock, "repeat" | "pond"> | "splash";

export type Statement =
  | { type: "do"; action: DoAction; index: number }
  | { type: "repeat"; times: 3; index: number; body: Statement }
  | { type: "if"; when: "at-pond"; index: number; body: Statement };

const PYTHON: Record<DoAction, string> = {
  walk: "bird.walk()",
  jump: "bird.jump()",
  spin: "bird.spin()",
  dance: "bird.dance()",
  sing: "bird.sing()",
  drum: "play.drum()",
  bell: "play.bell()",
  note: "play.note()",
  rain: "scene.rain()",
  sun: "scene.sun()",
  flower: "scene.flower()",
  bread: "chef.bread()",
  spread: "chef.spread()",
  filling: "chef.filling()",
  splash: "bird.splash()",
};

export function isBuildBlock(value: string): value is BuildBlock {
  return BLOCKS.has(value);
}

export function palette(activity: BuildActivity, level: LogicLevel): BuildBlock[] {
  if (activity === "move") {
    const blocks: BuildBlock[] = ["walk", "jump", "spin", "dance", "sing"];
    if (level === "later") blocks.push("repeat", "pond");
    return blocks;
  }
  if (activity === "music") return ["drum", "bell", "note", "repeat"];
  if (activity === "scene") return ["rain", "sun", "flower"];
  return ["bread", "spread", "filling"];
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

function pseudoStatement(statement: Statement): string {
  if (statement.type === "do") return statement.action === "splash" ? "splash" : statement.action;
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
  if (block !== "repeat") return block;
  const prev = script[index - 1];
  if (!prev || prev === "repeat") return "repeat 3 times";
  if (prev === "pond") return "repeat 3 times: if at pond: splash";
  return `repeat 3 times: ${prev}`;
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

export function sceneResult(script: BuildBlock[]): { flower: "bud" | "grown"; sky: "clear" | "rain" | "sun" } {
  let wet = false;
  let sky: "clear" | "rain" | "sun" = "clear";
  let flower: "bud" | "grown" = "bud";
  for (const step of playSteps(script)) {
    if (step.block === "rain") {
      wet = true;
      sky = "rain";
    } else if (step.block === "sun") {
      wet = false;
      sky = "sun";
    } else if (step.block === "flower" && wet) flower = "grown";
  }
  return { flower, sky };
}

export function chefResult(script: BuildBlock[]): "wait" | "silly" | "sandwich" {
  const food = script.filter((block) => block === "bread" || block === "spread" || block === "filling");
  if (food.length < RECIPE.length) return "wait";
  const made = food.slice(0, RECIPE.length);
  return made.every((block, index) => block === RECIPE[index]) ? "sandwich" : "silly";
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

export function buildManifestEntries(): { id: string; say: string }[] {
  return [
    { id: "build-move", say: "Stack the blocks, then press play." },
    { id: "build-music", say: "Make a song. Press play." },
    { id: "build-scene", say: "What happens next?" },
    { id: "build-chef", say: "Make a sandwich." },
    { id: "build-again", say: "Try again." },
    { id: "build-save", say: "Saved on this device." },
    { id: "build-splash", say: "The bird splashes." },
  ];
}
