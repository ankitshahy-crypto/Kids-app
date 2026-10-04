import { MODULE_NUMBERS } from "../brand";
import { calendarStageCap, lastWeekWithinStage } from "./ageBand";
import type { AgeRange } from "./profiles";
import { weekIndex } from "./schedule";
import { defineSubject } from "./subject";
import { deviceTimeZone } from "./time";

/** Numbers & Math. Reading stays `reading`. */
export const MATH = "math";

export const mathSteps = ["count", "know", "trace", "shape", "more", "add"] as const;
export type MathStep = (typeof mathSteps)[number];

/**
 * Numbers games added by the STEM plan (Peek: how many at a glance). They are on the Numbers page
 * and earn a star like the others, but are not part of the day's six steps, so a day's lesson is
 * finished by the same games as before.
 */
export const mathExtras = ["peek"] as const;
export type MathExtra = (typeof mathExtras)[number];
export type MathGame = MathStep | MathExtra;

export const mathStages = [
  { id: "counting", title: "Counting", detail: "Count things from 1 to 10. Each says its number when tapped.", size: 10 },
  { id: "numbers", title: "Numbers", detail: "Hear a number and tap it. Trace 0 to 9.", size: 10 },
  { id: "shapes", title: "Shapes", detail: "Fit a block into the hole of its shape, then trace the shape.", size: 6 },
  { id: "adding", title: "Adding", detail: "Put two groups together, up to 5.", size: 5 },
] as const;

export type MathStageId = (typeof mathStages)[number]["id"];

/** Units a child has reached by the end of this math week. Sizes match `mathStages`. */
const mathWeeks = [2, 5, 8, 10, 13, 16, 20, 23, 26, 29, 31] as const;

const stageStart: Record<MathStageId, number> = {
  counting: 0,
  numbers: 10,
  shapes: 20,
  adding: 26,
};

export const numberWords = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
] as const;

export const shapeIds = ["circle", "square", "triangle", "rectangle", "star", "heart"] as const;
export type ShapeId = (typeof shapeIds)[number];

export const shapeTitles: Record<ShapeId, string> = {
  circle: "Circle",
  square: "Square",
  triangle: "Triangle",
  rectangle: "Rectangle",
  star: "Star",
  heart: "Heart",
};

/** Dots in stroke order, in a 0–100 box. The child traces these the way a dotted numeral is traced. */
export const tracePoints: Record<number, { x: number; y: number }[]> = {
  0: [
    { x: 50, y: 16 },
    { x: 74, y: 32 },
    { x: 80, y: 52 },
    { x: 74, y: 72 },
    { x: 50, y: 86 },
    { x: 26, y: 72 },
    { x: 20, y: 52 },
    { x: 26, y: 32 },
  ],
  1: [
    { x: 40, y: 30 },
    { x: 52, y: 16 },
    { x: 52, y: 40 },
    { x: 52, y: 64 },
    { x: 52, y: 86 },
  ],
  2: [
    { x: 28, y: 32 },
    { x: 46, y: 16 },
    { x: 72, y: 28 },
    { x: 58, y: 50 },
    { x: 30, y: 70 },
    { x: 26, y: 86 },
    { x: 76, y: 86 },
  ],
  3: [
    { x: 28, y: 22 },
    { x: 54, y: 14 },
    { x: 74, y: 30 },
    { x: 52, y: 48 },
    { x: 76, y: 66 },
    { x: 54, y: 86 },
    { x: 28, y: 76 },
  ],
  4: [
    { x: 68, y: 16 },
    { x: 68, y: 42 },
    { x: 28, y: 58 },
    { x: 78, y: 58 },
    { x: 68, y: 86 },
  ],
  5: [
    { x: 72, y: 16 },
    { x: 30, y: 16 },
    { x: 28, y: 42 },
    { x: 58, y: 40 },
    { x: 78, y: 62 },
    { x: 52, y: 86 },
    { x: 26, y: 74 },
  ],
  6: [
    { x: 68, y: 20 },
    { x: 42, y: 14 },
    { x: 26, y: 40 },
    { x: 32, y: 68 },
    { x: 54, y: 84 },
    { x: 74, y: 64 },
    { x: 52, y: 52 },
  ],
  7: [
    { x: 24, y: 18 },
    { x: 76, y: 18 },
    { x: 58, y: 46 },
    { x: 42, y: 86 },
  ],
  8: [
    { x: 50, y: 14 },
    { x: 28, y: 30 },
    { x: 50, y: 48 },
    { x: 74, y: 66 },
    { x: 50, y: 86 },
    { x: 26, y: 66 },
    { x: 50, y: 48 },
  ],
  9: [
    { x: 58, y: 48 },
    { x: 34, y: 34 },
    { x: 48, y: 14 },
    { x: 72, y: 28 },
    { x: 70, y: 58 },
    { x: 48, y: 86 },
    { x: 30, y: 74 },
  ],
};

const addPairs: [number, number][] = [
  [2, 1],
  [1, 1],
  [1, 2],
  [2, 2],
  [3, 1],
  [1, 3],
  [3, 2],
  [4, 1],
  [2, 3],
  [1, 4],
];

export type MathLesson = {
  weekIndex: number;
  stageId: string;
  count: number;
  hear: number;
  hearChoices: number[];
  digit: number;
  shape: ShapeId;
  shapeChoices: ShapeId[];
  moreLeft: number;
  moreRight: number;
  addLeft: number;
  addRight: number;
  addChoices: number[];
};

export function mathWeekCount(): number {
  return mathWeeks.length;
}

export function clampMathWeek(index: number): number {
  if (!Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(mathWeeks.length - 1, Math.floor(index)));
}

export function mathIntroduced(weekIndexValue: number): number {
  return mathWeeks[clampMathWeek(weekIndexValue)];
}

export function isMathStageId(value: string): value is MathStageId {
  return mathStages.some((stage) => stage.id === value);
}

export function firstMathWeekForStage(stageId: string): number {
  const need = isMathStageId(stageId) ? stageStart[stageId] : 0;
  if (need <= 0) return 0;
  for (let week = 0; week < mathWeeks.length; week += 1) {
    if (mathWeeks[week] > need) return week;
  }
  return mathWeeks.length - 1;
}

export function numberWord(value: number): string {
  return numberWords[value] ?? String(value);
}

function rotate<T>(items: T[], salt: number): T[] {
  if (items.length === 0) return items;
  const shift = Math.abs(salt) % items.length;
  return items.slice(shift).concat(items.slice(0, shift));
}

function numberChoices(answer: number, low: number, high: number, salt: number): number[] {
  const near = [answer - 1, answer + 1, answer - 2, answer + 2, answer + 3].filter(
    (value) => value >= low && value <= high && value !== answer,
  );
  const picked = [answer];
  for (const value of near) {
    if (!picked.includes(value)) picked.push(value);
    if (picked.length === 3) break;
  }
  return rotate(picked, salt);
}

export function lessonForWeek(weekIndexValue: number): MathLesson {
  const week = clampMathWeek(weekIndexValue);
  const count = Math.min(10, 3 + (week % 8));
  const hear = 1 + (week % 20);
  const digit = week % 10;
  const shape = shapeIds[week % shapeIds.length];
  const shapeChoices = rotate(
    [shape, ...shapeIds.filter((id) => id !== shape)].slice(0, 3),
    week + 1,
  );
  let moreLeft = 1 + (week % 5);
  let moreRight = 2 + ((week + 2) % 6);
  if (moreLeft === moreRight) moreRight = moreLeft === 10 ? moreLeft - 2 : moreLeft + 1;
  moreLeft = Math.min(10, moreLeft);
  moreRight = Math.min(10, moreRight);
  const [addLeft, addRight] = addPairs[week % addPairs.length];
  return {
    weekIndex: week,
    stageId: stageFromIntroduced(mathIntroduced(week)),
    count,
    hear,
    hearChoices: numberChoices(hear, 1, 20, week),
    digit,
    shape,
    shapeChoices,
    moreLeft,
    moreRight,
    addLeft,
    addRight,
    addChoices: numberChoices(addLeft + addRight, 1, 5, week + 2),
  };
}

function stageFromIntroduced(introduced: number): string {
  const stages = mathStages;
  let cursor = introduced;
  for (const stage of stages) {
    if (cursor < stage.size) return stage.id;
    cursor -= stage.size;
  }
  return stages[stages.length - 1]?.id ?? "counting";
}

/** The last math week whose stage is still this stage or an earlier one. */
export function lastMathWeekForStage(stageId: string): number {
  return lastWeekWithinStage(
    stageId,
    mathWeeks.length,
    mathStages.map((stage) => stage.id),
    (week) => stageFromIntroduced(mathIntroduced(week)),
  );
}

/** The calendar week for this age. A placed week is a grown-up's choice and is not capped. */
export function mathCalendarWeek(createdAt: string, ageRange?: AgeRange | string, now = new Date(), timeZone = deviceTimeZone()): number {
  const week = weekIndex(createdAt, now, timeZone);
  const cap = calendarStageCap(MATH, ageRange);
  return cap ? Math.min(week, lastMathWeekForStage(cap)) : week;
}

export function lessonForChild(
  createdAt: string,
  now = new Date(),
  timeZone = deviceTimeZone(),
  placedWeek?: number,
  ageRange?: AgeRange | string,
): MathLesson {
  const week = placedWeek ?? mathCalendarWeek(createdAt, ageRange, now, timeZone);
  return lessonForWeek(week);
}

defineSubject({
  id: MATH,
  title: MODULE_NUMBERS,
  stages: mathStages,
  steps: mathSteps,
});
