import type { LogicLevel } from "./logic";
import { shapeIds, type MathLesson, type ShapeId } from "./math";
import { among, mix, shuffle, take } from "./seed";

/**
 * The rounds of the Numbers games.
 *
 * Rebuilt after the first phone test. Each of these was one question at the
 * top of an empty screen: three apples to tap and it was over, one number to
 * hear, one pair of groups. Now each is several rounds in a scene, on the game
 * kit (src/game/kit.tsx).
 *
 * The first round is always this week's lesson (the number, shape or sum the
 * week is about, from src/data/math.ts), so the plan the weeks follow is
 * unchanged. The rounds after it are near it and differ each play.
 */

/**
 * Things to count. Each is one of the app's drawings and has a recorded word, and each is something
 * that can be found in a garden or set on a table, where the games show them (so no fish).
 */
export const COUNT_THINGS = ["apple", "star", "duck", "bee", "egg", "flower", "butterfly"] as const;
export type CountThing = (typeof COUNT_THINGS)[number];

/** Three numbers to choose from, in counting order, with the answer among them. */
export function numeralChoices(answer: number, low: number, high: number, salt: number, count = 3): number[] {
  const near = [answer - 2, answer - 1, answer + 1, answer + 2, answer + 3, answer - 3].filter((value) => value >= low && value <= high);
  return among(answer, near, count, salt).sort((a, b) => a - b);
}

/** How many rounds a game has: one more for ages 5 to 7. */
function roundCount(level: LogicLevel, early = 3): number {
  return level === "later" ? early + 1 : early;
}

// ---------------------------------------------------------------- count

export type CountRound = { count: number; thing: CountThing; choices: number[] };

/** Groups to count. The first is this week's number; the others are near it, none the same. */
export function countRounds(lesson: MathLesson, level: LogicLevel, salt = 0): CountRound[] {
  const top = Math.min(10, Math.max(5, lesson.count + 2));
  const others = shuffle(
    Array.from({ length: top }, (_, index) => index + 1).filter((value) => value !== lesson.count),
    salt,
  ).slice(0, roundCount(level) - 1);
  const things = take(COUNT_THINGS, others.length + 1, salt + 3);
  return [lesson.count, ...others].map((count, index) => ({
    count,
    thing: things[index],
    choices: numeralChoices(count, 1, 10, salt + index),
  }));
}

// ---------------------------------------------------------------- know

export type KnowRound = { hear: number; choices: number[] };

/** Numbers to hear and find. The first is this week's; the others come from the numbers up to it. */
export function knowRounds(lesson: MathLesson, level: LogicLevel, salt = 0): KnowRound[] {
  const top = Math.max(5, lesson.hear);
  const others = shuffle(
    Array.from({ length: top }, (_, index) => index + 1).filter((value) => value !== lesson.hear),
    salt,
  ).slice(0, roundCount(level, 4) - 1);
  return [lesson.hear, ...others].map((hear, index) => ({
    hear,
    choices: numeralChoices(hear, 1, Math.max(top, hear + 1), salt + index, level === "later" ? 4 : 3),
  }));
}

/** Where each dot of a number sits in a frame of two rows of five. */
export function tenFrame(value: number): { row: number; column: number }[] {
  return Array.from({ length: Math.max(0, value) }, (_, index) => ({ row: Math.floor(index / 5), column: index % 5 }));
}

// ---------------------------------------------------------------- shapes

/** Colors a shape block can be. A block's color is dealt apart from its shape, so the shape is what is matched. */
export const SHAPE_TINTS = ["#f4a4b4", "#f6c445", "#8fcb7a", "#8eb8d8", "#c9b6e8", "#f2a65a"] as const;

export type ShapeRound = { shape: ShapeId; choices: { shape: ShapeId; tint: string }[] };

/** A hole to fill and three blocks. The first hole is this week's shape. */
export function shapeRounds(lesson: MathLesson, level: LogicLevel, salt = 0): ShapeRound[] {
  const others = shuffle(
    shapeIds.filter((id) => id !== lesson.shape),
    salt,
  ).slice(0, roundCount(level) - 1);
  return [lesson.shape, ...others].map((shape, index) => {
    const tints = shuffle(SHAPE_TINTS, salt + index * 5);
    return {
      shape,
      choices: among<ShapeId>(shape, shapeIds, 3, salt + index).map((choice, at) => ({ shape: choice, tint: tints[at] })),
    };
  });
}

// ---------------------------------------------------------------- more

export type MoreAsk = "more" | "fewer";
export type MoreRound = { ask: MoreAsk; left: number; right: number; thing: CountThing };

/** Which side is the answer. */
export function moreAnswer(round: Pick<MoreRound, "ask" | "left" | "right">): "left" | "right" {
  const leftIsMore = round.left > round.right;
  return (round.ask === "more") === leftIsMore ? "left" : "right";
}

/**
 * Two groups to compare. The first is this week's pair. Ages 3 and 4 are asked which has more every
 * time, with groups at least two apart; ages 5 to 7 are also asked which has fewer, one apart.
 */
export function moreRounds(lesson: MathLesson, level: LogicLevel, salt = 0): MoreRound[] {
  const total = roundCount(level);
  const top = level === "later" ? 9 : 6;
  const gap = level === "later" ? 1 : 2;
  const things = take(COUNT_THINGS, total, salt + 11);
  const rounds: MoreRound[] = [{ ask: "more", left: lesson.moreLeft, right: lesson.moreRight, thing: things[0] }];
  for (let index = 1; index < total; index += 1) {
    const small = 1 + (mix(salt, index) % (top - gap));
    const big = small + gap + (mix(salt, index + 40) % Math.max(1, top - small - gap + 1));
    const bigFirst = mix(salt, index + 80) % 2 === 0;
    rounds.push({
      ask: level === "later" && index % 2 === 1 ? "fewer" : "more",
      left: bigFirst ? big : small,
      right: bigFirst ? small : big,
      thing: things[index],
    });
  }
  return rounds;
}

// ---------------------------------------------------------------- add

/** Two groups that make five or fewer, as the plan says: "Put two groups together, up to 5." */
export const ADD_PAIRS: readonly [number, number][] = [
  [1, 1],
  [2, 1],
  [1, 2],
  [2, 2],
  [3, 1],
  [1, 3],
  [3, 2],
  [2, 3],
  [4, 1],
  [1, 4],
];

export type AddRound = { left: number; right: number; sum: number; thing: CountThing; choices: number[] };

/** Sums to make. The first is this week's; no sum's pair comes up twice. */
export function addRounds(lesson: MathLesson, level: LogicLevel, salt = 0): AddRound[] {
  const others = shuffle(
    ADD_PAIRS.filter(([left, right]) => left !== lesson.addLeft || right !== lesson.addRight),
    salt,
  ).slice(0, roundCount(level) - 1);
  const pairs: (readonly [number, number])[] = [[lesson.addLeft, lesson.addRight], ...others];
  const things = take(COUNT_THINGS, pairs.length, salt + 7);
  return pairs.map(([left, right], index) => ({
    left,
    right,
    sum: left + right,
    thing: things[index],
    choices: numeralChoices(left + right, 1, 6, salt + index),
  }));
}

/** The id of the line that says a sum: "Two and one make three." */
export function addLineId(left: number, right: number): string {
  return `num-add-${left}-${right}`;
}

// ---------------------------------------------------------------- peek

/**
 * Peek: a few ladybugs land on a leaf for a moment, a leaf covers them, and the child says how many
 * they saw. Seeing a small group at a glance, without counting, is the first number skill (Head Start
 * ELOF P-MATH 2, "recognizes the number of objects in a small set", up to 5 by age 5).
 */

/** Where the ladybugs sit, in a 0–100 box. The first layouts are dice faces; the `scatter` ones are for ages 5 to 7. */
const PEEK_DICE: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[30, 30], [70, 70]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[30, 30], [70, 30], [30, 70], [70, 70]],
  5: [[26, 26], [74, 26], [50, 50], [26, 74], [74, 74]],
};
const PEEK_SCATTER: Record<number, [number, number][]> = {
  1: [[38, 60]],
  2: [[28, 58], [66, 34]],
  3: [[24, 40], [56, 22], [64, 66]],
  4: [[22, 32], [52, 22], [76, 52], [40, 70]],
  5: [[20, 30], [48, 20], [78, 34], [32, 70], [66, 72]],
};

export type PeekRound = { count: number; spots: { x: number; y: number }[]; choices: number[]; look: number };

/** How long the ladybugs show before the leaf covers them: longer for the youngest. */
export const PEEK_LOOK_MS = { early: 2200, later: 1600 } as const;

/**
 * Groups to see at a glance: four at ages 3–4 (1 to 4, dice faces), five at 5–7 (1 to 5, scattered).
 * No group comes twice in a row, the layout is turned each play, and the answer is not in the same
 * place two rounds running.
 */
export function peekRounds(level: LogicLevel, salt = 0): PeekRound[] {
  const top = level === "later" ? 5 : 4;
  const total = level === "later" ? 5 : 4;
  const pool = Array.from({ length: top }, (_, index) => index + 1);
  const counts: number[] = [];
  let deck = shuffle(pool, salt);
  for (let index = 0; counts.length < total; index += 1) {
    if (deck.length === 0) deck = shuffle(pool, salt + 31 * index);
    const next = deck.shift() as number;
    if (counts[counts.length - 1] === next) {
      deck.push(next);
      continue;
    }
    counts.push(next);
  }
  let lastAt = -1;
  return counts.map((count, index) => {
    const layout = (level === "later" ? PEEK_SCATTER : PEEK_DICE)[count];
    const flipX = mix(salt, index + 50) % 2 === 1;
    const flipY = mix(salt, index + 60) % 2 === 1;
    const spots = layout.map(([x, y]) => ({ x: flipX ? 100 - x : x, y: flipY ? 100 - y : y }));
    const near = [count - 1, count + 1, count + 2, count - 2, count + 3].filter((value) => value >= 1 && value <= top + 1);
    let choices = among(count, near, 3, salt + index * 13);
    // The answer moves: if it would sit where it sat last round, the row turns by one.
    if (choices.indexOf(count) === lastAt) choices = [...choices.slice(1), choices[0]];
    lastAt = choices.indexOf(count);
    return { count, spots, choices, look: PEEK_LOOK_MS[level] };
  });
}

/** Dots in a row, for a choice: the same number shown a second way, so a child who does not read numerals yet can match it. */
export function dotRow(value: number): { x: number; y: number }[] {
  const perRow = value <= 3 ? value : Math.ceil(value / 2);
  return Array.from({ length: value }, (_, index) => ({ x: index % perRow, y: Math.floor(index / perRow) }));
}

// ---------------------------------------------------------------- bakery

/**
 * Bakery: a customer asks for a number of strawberries and the child puts that many on the plate,
 * then rings the bell. Counting out a set and knowing when to stop is cardinality, "the last number
 * said is how many" (ELOF P-MATH 3; NCTM pre-K focal point: correspondence, counting, cardinality).
 */
export const BAKERY_CUSTOMERS = ["bear", "bunny", "owl", "pig", "duck", "koala", "penguin", "lion"] as const;
export type BakeryCustomer = (typeof BAKERY_CUSTOMERS)[number];

export type BakeryRound = { ask: number; customer: BakeryCustomer };

/** The most a plate holds. */
export const PLATE_MAX = 10;

/** Three orders at ages 3–4 (1 to 5), four at 5–7 (2 to 8). No two orders alike, and no customer twice. */
export function bakeryRounds(level: LogicLevel, salt = 0, child?: string): BakeryRound[] {
  const total = roundCount(level);
  const pool = level === "later" ? [2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 4, 5];
  // The youngest start small: the first order is never more than three.
  let asks = take(pool, total, salt);
  if (level === "early" && asks[0] > 3) {
    const small = asks.findIndex((value) => value <= 3);
    if (small > 0) [asks[0], asks[small]] = [asks[small], asks[0]];
    else asks = [1 + (mix(salt, 9) % 3), ...asks.slice(1)];
  }
  const customers = take(
    BAKERY_CUSTOMERS.filter((id) => id !== child),
    total,
    salt + 5,
  );
  return asks.map((ask, index) => ({ ask, customer: customers[index] }));
}

/** What the customer says about the plate: it is right, too few, or too many. */
export function bakeryVerdict(ask: number, onPlate: number): "right" | "more" | "less" {
  if (onPlate === ask) return "right";
  return onPlate < ask ? "more" : "less";
}

/** The id of the order: "Three strawberries, please!" */
export function bakeryLineId(ask: number): string {
  return `num-bake-${ask}`;
}

// ---------------------------------------------------------------- spoken lines

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

const LINES: Record<string, string> = {
  "num-count": "How many? Tap each one to count.",
  "num-count-pick": "Now tap the number.",
  "num-fewer": "Which has fewer?",
  "num-is-more": "That is more.",
  "num-is-fewer": "That is fewer.",
  "num-peek": "How many ladybugs did you see?",
  "num-peek-again": "Look again!",
  "num-bake-bell": "Ring the bell when it is ready.",
  "num-bake-more": "I need more, please.",
  "num-bake-less": "Oops, too many! Tap the plate to take one back.",
  "num-bake-yum": "Yum! Thank you!",
};

function capital(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** A line of these games, by id. */
export function numberLine(id: string): string {
  if (LINES[id]) return LINES[id];
  const order = /^num-bake-(\d+)$/.exec(id);
  if (order) {
    const ask = Number(order[1]);
    return `${capital(WORDS[ask])} ${ask === 1 ? "strawberry" : "strawberries"}, please!`;
  }
  const sum = /^num-add-(\d+)-(\d+)$/.exec(id);
  if (!sum) return "";
  const left = Number(sum[1]);
  const right = Number(sum[2]);
  // A whole sentence, recorded as one: five clips in a row ("two" "and" "one" "make" "three") sound like a list.
  return `${capital(WORDS[left])} and ${WORDS[right]} make ${WORDS[left + right]}.`;
}

/** The Numbers games' spoken lines. scripts/sync-manifest.ts writes these into the clip list. */
export function numberManifestEntries(): { id: string; say: string }[] {
  return [
    ...Object.entries(LINES).map(([id, say]) => ({ id, say })),
    ...ADD_PAIRS.map(([left, right]) => ({ id: addLineId(left, right), say: numberLine(addLineId(left, right)) })),
    ...Array.from({ length: 8 }, (_, index) => bakeryLineId(index + 1)).map((id) => ({ id, say: numberLine(id) })),
  ];
}

/** The words these games say when a thing is counted or named: each needs a recorded word clip. */
export function numberWords(): string[] {
  return [...COUNT_THINGS];
}
