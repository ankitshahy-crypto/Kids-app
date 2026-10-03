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

const BASE_EARLY: BirdRound[] = [
  { id: "tap-short", mode: "tap", width: 3, height: 3, start: { x: 0, y: 2 }, nest: { x: 2, y: 2 }, path: ["right", "right"], repeat: 1, shown: [], bugIndex: null, fix: null },
  { id: "tap-turn", mode: "tap", width: 3, height: 3, start: { x: 0, y: 2 }, nest: { x: 2, y: 1 }, path: ["right", "right", "up"], repeat: 1, shown: [], bugIndex: null, fix: null },
  { id: "plan-grow", mode: "plan", width: 4, height: 3, start: { x: 0, y: 2 }, nest: { x: 2, y: 0 }, path: ["right", "right", "up", "up"], repeat: 1, shown: [], bugIndex: null, fix: null },
];

const BASE_LATER: BirdRound[] = [
  { id: "plan-long", mode: "plan", width: 4, height: 4, start: { x: 0, y: 3 }, nest: { x: 3, y: 0 }, path: ["right", "right", "right", "up", "up", "up"], repeat: 1, shown: [], bugIndex: null, fix: null },
  { id: "loop-three", mode: "loop", width: 4, height: 2, start: { x: 0, y: 0 }, nest: { x: 3, y: 0 }, path: ["right"], repeat: 3, shown: [], bugIndex: null, fix: null },
  { id: "bug-one", mode: "bug", width: 3, height: 3, start: { x: 0, y: 2 }, nest: { x: 2, y: 0 }, path: ["right", "right", "up", "up"], repeat: 1, shown: ["right", "up", "up", "up"], bugIndex: 1, fix: "right" },
];

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
  };
}

/**
 * The path puzzles for one play. `salt` turns the boards (mirror, upside
 * down), so the nest is not in the same corner every time. Salt 0 is the
 * boards as drawn.
 */
export function birdRounds(level: LogicLevel, salt = 0): BirdRound[] {
  const base = level === "early" ? BASE_EARLY : BASE_LATER;
  const pick = salt === 0 ? 0 : mix(salt);
  const mirror = (pick & 1) === 1;
  // A row that is one cell high has no upside down.
  const flip = (pick & 2) === 2;
  return base.map((round) => turned(round, mirror, flip && round.height > 1));
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
    { id: "code-bug", say: "One arrow is wrong. Tap it, then press go." },
    { id: "code-pattern", say: "What comes next?" },
    { id: "code-order", say: "What comes first? Put the pictures in order." },
    ...RULES.flatMap((rule) => [
      { id: `code-if-${rule.id}`, say: rule.ask },
      { id: `code-then-${rule.id}`, say: rule.rule },
    ]),
    { id: "code-again", say: "Try again." },
  ];
}
