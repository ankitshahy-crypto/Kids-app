import type { LetterCase } from "./handwriting";
import { shapeIds } from "./math";
import { nameToTrace } from "./tracePractice";

/** 1 is a full guide. 5 is from memory. */
export const SCAFFOLD_LEVELS = [1, 2, 3, 4, 5] as const;
export type ScaffoldLevel = (typeof SCAFFOLD_LEVELS)[number];

export const SUCCESSES_TO_ADVANCE = 3;
export const STRUGGLES_TO_STEP_BACK = 3;

export type WritingState = {
  level: ScaffoldLevel;
  successes: number;
  struggles: number;
};

export type WritingMap = Record<string, WritingState>;

export type WritingOutcome = {
  writing: WritingMap;
  state: WritingState;
  advanced: boolean;
  steppedBack: boolean;
};

const blank = (): WritingState => ({ level: 1, successes: 0, struggles: 0 });

export function isScaffoldLevel(value: number): value is ScaffoldLevel {
  return SCAFFOLD_LEVELS.includes(value as ScaffoldLevel);
}

export function letterItemId(letter: string, casing: LetterCase): string {
  return `letter:${letter.toLowerCase()}:${casing}`;
}

export function shapeItemId(shape: string): string {
  return `shape:${shape.toLowerCase()}`;
}

export function wordItemId(word: string): string {
  return `word:${word.toLowerCase()}`;
}

export function nameItemId(name: string): string {
  return `name:${name}`;
}

export function writingState(map: WritingMap | undefined, id: string): WritingState {
  return map?.[id] ?? blank();
}

export function writingLevel(map: WritingMap | undefined, id: string): ScaffoldLevel {
  return writingState(map, id).level;
}

/** How faint the level-2 guide is. Each success on this level fades it, until the next level. */
export function fadeOpacity(successes: number): number {
  const steps = Math.max(0, Math.min(successes, SUCCESSES_TO_ADVANCE - 1));
  return Math.round((1 - steps * 0.28) * 100) / 100;
}

export function guideFor(level: ScaffoldLevel): "full" | "fade" | "start" | "copy" | "memory" {
  if (level === 1) return "full";
  if (level === 2) return "fade";
  if (level === 3) return "start";
  if (level === 4) return "copy";
  return "memory";
}

/**
 * A finished try. Three successes move up one level. Three struggles move down one.
 * Level 1 stays put. Stars are not part of this count.
 */
export function recordWritingAttempt(map: WritingMap | undefined, id: string, success: boolean): WritingOutcome {
  const current = writingState(map, id);
  let state: WritingState;
  let advanced = false;
  let steppedBack = false;
  if (success) {
    const successes = current.successes + 1;
    if (successes >= SUCCESSES_TO_ADVANCE && current.level < 5) {
      state = { level: (current.level + 1) as ScaffoldLevel, successes: 0, struggles: 0 };
      advanced = true;
    } else {
      state = {
        level: current.level,
        successes: current.level === 5 ? Math.min(SUCCESSES_TO_ADVANCE, successes) : successes,
        struggles: 0,
      };
    }
  } else {
    const struggles = current.struggles + 1;
    if (struggles >= STRUGGLES_TO_STEP_BACK && current.level > 1) {
      state = { level: (current.level - 1) as ScaffoldLevel, successes: 0, struggles: 0 };
      steppedBack = true;
    } else {
      state = { level: current.level, successes: 0, struggles };
    }
  }
  return { writing: { ...(map ?? {}), [id]: state }, state, advanced, steppedBack };
}

/** A teacher picks the level. The success and struggle streaks start over. */
export function assignWritingLevel(map: WritingMap | undefined, id: string, level: ScaffoldLevel): WritingMap {
  return { ...(map ?? {}), [id]: { level, successes: 0, struggles: 0 } };
}

export function memoryPrompt(kind: "letter" | "shape" | "word" | "name", label: string, casing?: LetterCase): string {
  if (kind === "letter") {
    const lower = label.toLowerCase();
    return casing === "upper" ? `Write big ${lower.toUpperCase()}` : `Write little ${lower}`;
  }
  if (kind === "shape") return `Draw a ${label.toLowerCase()}`;
  return `Write ${label}`;
}

export function writingLabel(id: string): string {
  const [kind, first, casing] = id.split(":");
  if (kind === "letter" && first) {
    return casing === "upper" ? `Big ${first.toUpperCase()}` : `Little ${first}`;
  }
  if (!first) return id;
  if (kind === "shape") return first.charAt(0).toUpperCase() + first.slice(1);
  return first;
}

export type WritingRow = { id: string; label: string; level: ScaffoldLevel };

/** Letters in this week's lesson, every shape, blended words, the name, and anything already stored. */
export function writingRoster(
  profile: {
    writing?: WritingMap;
    name?: string;
    stickers?: { kind: string; label: string }[];
  },
  weekLetters: string[],
): WritingRow[] {
  const ids: string[] = [];
  const add = (id: string) => {
    if (!ids.includes(id)) ids.push(id);
  };
  for (const letter of weekLetters) {
    add(letterItemId(letter, "upper"));
    add(letterItemId(letter, "lower"));
  }
  for (const shape of shapeIds) add(shapeItemId(shape));
  for (const sticker of profile.stickers ?? []) {
    if (sticker.kind === "word" && sticker.label.trim()) add(wordItemId(sticker.label));
  }
  const traced = nameToTrace(profile.name ?? "");
  if (traced) add(nameItemId(traced));
  for (const id of Object.keys(profile.writing ?? {})) add(id);
  return ids.map((id) => ({
    id,
    label: writingLabel(id),
    level: writingLevel(profile.writing, id),
  }));
}

const ITEM_KEY = /^(letter:[a-z]:(upper|lower)|shape:[a-z]+|word:[a-z]+|name:[A-Za-z][A-Za-z'-]*)$/;

export function normalizeWriting(value: unknown): WritingMap {
  if (!value || typeof value !== "object") return {};
  const next: WritingMap = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!ITEM_KEY.test(key) || !raw || typeof raw !== "object") continue;
    const item = raw as Partial<WritingState>;
    if (typeof item.level !== "number" || !isScaffoldLevel(item.level)) continue;
    const count = (entry: unknown) => (typeof entry === "number" && entry >= 0 && entry < 20 ? Math.floor(entry) : 0);
    next[key] = { level: item.level, successes: count(item.successes), struggles: count(item.struggles) };
  }
  return next;
}
