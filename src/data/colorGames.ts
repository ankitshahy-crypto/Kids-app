import { colorAudioId, colorIds, mixPaints, type ColorId, type ColorLesson } from "./colors";
import type { LogicLevel } from "./logic";
import { among, shuffle } from "./seed";

/**
 * The rounds of the Colors games.
 *
 * Rebuilt after the first phone test, on the game kit (src/game/kit.tsx).
 * Hearing a color was one question. Mixing was "Drag two paints into the
 * bucket, then stir", written, with a dashed box for a bucket and a button
 * that said "Keep this color". Painting, opened before mixing, said "Mix two
 * colors first." in writing and offered nothing to tap.
 *
 * The first color to find is still this week's (src/data/colors.ts), so the
 * plan the weeks follow is unchanged.
 */

// ---------------------------------------------------------------- names

export type NameRound = { hear: ColorId; choices: ColorId[] };

/** Colors to hear and find. The first is this week's. Ages 5 to 7 get one more, among four. */
export function nameRounds(lesson: ColorLesson, level: LogicLevel, salt = 0): NameRound[] {
  const others = shuffle(
    colorIds.filter((id) => id !== lesson.hear),
    salt,
  ).slice(0, level === "later" ? 4 : 3);
  return [lesson.hear, ...others].map((hear, index) => ({
    hear,
    choices: among<ColorId>(hear, colorIds, level === "later" ? 4 : 3, salt + index),
  }));
}

// ---------------------------------------------------------------- mixing

/** The colors two paints can make, and the two that make each, in the order the line says them. */
export const MIXES: Record<string, readonly [string, string]> = {
  orange: ["red", "yellow"],
  green: ["blue", "yellow"],
  purple: ["red", "blue"],
  "light red": ["red", "white"],
  "light yellow": ["yellow", "white"],
  "light blue": ["blue", "white"],
};

/**
 * A round of mixing. "find": tap any two paints and see what they make; the round is done when it is a
 * color not made yet. "make": a color is asked for, and the child finds the two paints that make it.
 */
export type MixRound = { kind: "find" } | { kind: "make"; want: string };

/** Ages 3 and 4 mix three colors. Ages 5 to 7 get white too, and are then asked for two colors by name. */
export function mixRounds(level: LogicLevel, salt = 0): MixRound[] {
  const find: MixRound[] = [{ kind: "find" }, { kind: "find" }, { kind: "find" }];
  if (level !== "later") return find;
  const wants = shuffle(["orange", "green", "purple"], salt).slice(0, 2);
  return [...find, ...wants.map((want) => ({ kind: "make" as const, want }))];
}

/** The paints on the table. Red, yellow and blue make every color ages 3 and 4 are taught; white makes the light ones. */
export function mixTable(level: LogicLevel): string[] {
  return level === "later" ? ["red", "yellow", "blue", "white"] : ["red", "yellow", "blue"];
}

/** What two paints make, or nothing when they are the same paint. */
export function mixResult(first: string, second: string): string | null {
  return mixPaints(first, second);
}

/** The id of the line that says a mix: "Red and yellow make orange." */
export function mixLineId(result: string): string {
  return `color-make-${colorAudioId(result)}`;
}

/** The id of the line that asks for a color: "Make orange. Which two paints?" */
export function wantLineId(want: string): string {
  return `color-want-${colorAudioId(want)}`;
}

// ---------------------------------------------------------------- painting

/**
 * The paints offered for the animal: the ones the child has mixed, newest first, and red, yellow and blue
 * to make up three. There is always something to paint with, mixed or not.
 */
export function paintPots(made: readonly string[], most = 4): string[] {
  const pots: string[] = [];
  for (const color of [...made].reverse()) {
    if (!pots.includes(color) && pots.length < most) pots.push(color);
  }
  for (const color of ["red", "yellow", "blue"]) {
    if (pots.length >= 3) break;
    if (!pots.includes(color)) pots.push(color);
  }
  return pots;
}

// ---------------------------------------------------------------- spoken lines

const LINES: Record<string, string> = {
  "color-mix": "Tap two paints. What do they make?",
  "color-again": "You made that one. Try two others.",
  "color-paint": "Color your animal. Tap a paint.",
  "color-keep": "Tap the check to keep it.",
};

function capital(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** A line of these games, by id. */
export function colorLine(id: string): string {
  if (LINES[id]) return LINES[id];
  for (const [result, [first, second]] of Object.entries(MIXES)) {
    if (id === mixLineId(result)) return `${capital(first)} and ${second} make ${result}.`;
    if (id === wantLineId(result)) return `Make ${result}. Which two paints?`;
  }
  return "";
}

/** The Colors games' spoken lines. scripts/sync-manifest.ts writes these into the clip list. */
export function colorManifestEntries(): { id: string; say: string }[] {
  return [
    ...Object.entries(LINES).map(([id, say]) => ({ id, say })),
    ...Object.keys(MIXES).map((result) => ({ id: mixLineId(result), say: colorLine(mixLineId(result)) })),
    // Only the three colors of the "make" rounds are asked for by name.
    ...["orange", "green", "purple"].map((want) => ({ id: wantLineId(want), say: colorLine(wantLineId(want)) })),
  ];
}
