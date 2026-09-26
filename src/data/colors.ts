import { MODULE_COLORS } from "../brand";
import { weekIndex } from "./schedule";
import { defineSubject } from "./subject";
import { deviceTimeZone } from "./time";

/** Colors. Reading stays `reading` and numbers stay `math`. */
export const COLORS = "colors";

export const colorSteps = ["name", "mix", "paint"] as const;
export type ColorStep = (typeof colorSteps)[number];

export const colorStages = [
  { id: "names", title: "Color names", detail: "Hear a color and tap the matching object.", size: 10 },
  { id: "mixing", title: "Mixing", detail: "Mix two paints and see the new color.", size: 4 },
] as const;

export type ColorStageId = (typeof colorStages)[number]["id"];

/** Units a child has reached by the end of this color week. Sizes match `colorStages`. */
const colorWeeks = [2, 4, 6, 8, 10, 12, 14] as const;

const stageStart: Record<ColorStageId, number> = {
  names: 0,
  mixing: 10,
};

export const colorIds = ["red", "blue", "yellow", "green", "orange", "purple", "pink", "brown", "black", "white"] as const;
export type ColorId = (typeof colorIds)[number];

/** The paints on the mixing table. Every taught pair is on the screen. */
export const mixBlobs = ["red", "yellow", "blue", "white"] as const;

type Swatch = { fill: string; pattern: string; patternLabel: string };

/**
 * True paints for the color lesson. Same hexes as `--paint-*` in `src/index.css`.
 * They are not the pastel UI tokens. Yellow is not the gold star color.
 */
export const paintFill: Record<ColorId, string> = {
  red: "#e10600",
  blue: "#1f4bff",
  yellow: "#ffe200",
  green: "#12b33a",
  orange: "#ff7a00",
  purple: "#7a2fe0",
  pink: "#ff4d8d",
  brown: "#8b4513",
  black: "#1a1a1a",
  white: "#ffffff",
};

const swatches: Record<ColorId, Swatch> = {
  red: { fill: paintFill.red, pattern: "stripes", patternLabel: "stripes" },
  blue: { fill: paintFill.blue, pattern: "dots", patternLabel: "dots" },
  yellow: { fill: paintFill.yellow, pattern: "waves", patternLabel: "waves" },
  green: { fill: paintFill.green, pattern: "checks", patternLabel: "checks" },
  orange: { fill: paintFill.orange, pattern: "diagonal", patternLabel: "diagonal" },
  purple: { fill: paintFill.purple, pattern: "rings", patternLabel: "rings" },
  pink: { fill: paintFill.pink, pattern: "hearts", patternLabel: "hearts" },
  brown: { fill: paintFill.brown, pattern: "cross", patternLabel: "cross" },
  black: { fill: paintFill.black, pattern: "solid", patternLabel: "solid" },
  white: { fill: paintFill.white, pattern: "outline", patternLabel: "outline" },
};

const pairResult: Record<string, string> = {
  "red+yellow": "orange",
  "blue+yellow": "green",
  "blue+red": "purple",
};

export type ColorLesson = {
  weekIndex: number;
  stageId: string;
  hear: ColorId;
  choices: ColorId[];
};

export function colorWeekCount(): number {
  return colorWeeks.length;
}

export function clampColorWeek(index: number): number {
  if (!Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(colorWeeks.length - 1, Math.floor(index)));
}

export function colorIntroduced(weekIndexValue: number): number {
  return colorWeeks[clampColorWeek(weekIndexValue)];
}

export function isColorStageId(value: string): value is ColorStageId {
  return colorStages.some((stage) => stage.id === value);
}

export function isColorId(value: string): value is ColorId {
  return (colorIds as readonly string[]).includes(value);
}

export function firstColorWeekForStage(stageId: string): number {
  const need = isColorStageId(stageId) ? stageStart[stageId] : 0;
  if (need <= 0) return 0;
  for (let week = 0; week < colorWeeks.length; week += 1) {
    if (colorWeeks[week] > need) return week;
  }
  return colorWeeks.length - 1;
}

export function colorTitle(name: string): string {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function colorFill(name: string): string | undefined {
  const key = name.trim().toLowerCase();
  if (isColorId(key)) return swatches[key].fill;
  if (key.startsWith("light ")) {
    const base = key.slice(6);
    if (!isColorId(base)) return undefined;
    return mixHex(swatches[base].fill, "#FFFFFF", 0.55);
  }
  return undefined;
}

export function colorPattern(name: string): string {
  const key = name.trim().toLowerCase();
  if (isColorId(key)) return swatches[key].pattern;
  if (key.startsWith("light ")) return `pale-${colorPattern(key.slice(6))}`;
  return "outline";
}

export function colorPatternLabel(name: string): string {
  const key = name.trim().toLowerCase();
  if (isColorId(key)) return swatches[key].patternLabel;
  if (key.startsWith("light ")) return `pale ${colorPatternLabel(key.slice(6))}`;
  return "outline";
}

/** Paint mixing kids are taught. White makes a lighter tint. Order does not matter. */
export function mixPaints(a: string, b: string): string | null {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  if (!left || !right || left === right) return null;
  const key = [left, right].sort().join("+");
  if (pairResult[key]) return pairResult[key];
  const base = left === "white" ? right : right === "white" ? left : "";
  if (!base || base === "white" || base.startsWith("light ")) return null;
  if (!isColorId(base)) return null;
  return `light ${base}`;
}

export function colorAudioId(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

function rotate<T>(items: T[], salt: number): T[] {
  if (items.length === 0) return items;
  const shift = Math.abs(salt) % items.length;
  return items.slice(shift).concat(items.slice(0, shift));
}

function colorChoices(answer: ColorId, salt: number): ColorId[] {
  const others = colorIds.filter((id) => id !== answer);
  const picked = [answer, ...rotate([...others], salt).slice(0, 3)];
  return rotate(picked, salt + 1);
}

export function colorLessonForWeek(weekIndexValue: number): ColorLesson {
  const week = clampColorWeek(weekIndexValue);
  const hear = colorIds[week % colorIds.length];
  return {
    weekIndex: week,
    stageId: stageFromIntroduced(colorIntroduced(week)),
    hear,
    choices: colorChoices(hear, week),
  };
}

function stageFromIntroduced(introduced: number): string {
  let cursor = introduced;
  for (const stage of colorStages) {
    if (cursor < stage.size) return stage.id;
    cursor -= stage.size;
  }
  return colorStages[colorStages.length - 1]?.id ?? "names";
}

export function colorLessonForChild(
  createdAt: string,
  now = new Date(),
  timeZone = deviceTimeZone(),
  placedWeek?: number,
): ColorLesson {
  const week = placedWeek ?? weekIndex(createdAt, now, timeZone);
  return colorLessonForWeek(week);
}

function mixHex(source: string, target: string, amount: number): string {
  const from = hexRgb(source);
  const to = hexRgb(target);
  const mix = (a: number, b: number) => Math.round(a + (b - a) * amount);
  return `#${[mix(from[0], to[0]), mix(from[1], to[1]), mix(from[2], to[2])]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function hexRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}

defineSubject({
  id: COLORS,
  title: MODULE_COLORS,
  stages: colorStages,
  steps: colorSteps,
});
