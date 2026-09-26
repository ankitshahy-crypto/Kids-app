import { learningPlace, pathStages, type PathStageId } from "./path";
import { isReviewDay, letterSchedule, lettersIntroduced, planForWeek, practiceLetters, weekIndex } from "./schedule";
import { deviceTimeZone } from "./time";

/**
 * Device copy of a class lesson placement.
 * The same JSON is what a class server can store later. This app only reads
 * and writes it on the device. `origin` stays "device" until a server owns it.
 */
export type PlacementDocument = {
  version: 1;
  origin: "device" | "server";
  /** Stable id. `device-class` until a class server assigns one. */
  classId: string;
  /** ISO-8601 time of the last edit. Empty when nothing has been set. */
  updatedAt: string;
  /** Starting lesson for every child who has no override. Null follows the calendar. */
  classDefault: LessonPlace | null;
  /** Child profile id → place. Wins over `classDefault`. */
  byChildId: Record<string, LessonPlace>;
};

/** A starting stage and the letter-plan week that lesson uses. */
export type LessonPlace = {
  stageId: PathStageId;
  /** Index into `letterSchedule`. Today's practice letters come from this week. */
  weekIndex: number;
};

export type PlacementSource = "child" | "class" | "calendar";

export type ResolvedPlacement = {
  source: PlacementSource;
  weekIndex: number;
  stageId: PathStageId;
  /** Letters the child practices today, including Friday review when that applies. */
  letters: string[];
};

/** One class on this device until a server id replaces it. */
export const DEVICE_CLASS_ID = "device-class";

export const PLACEMENT_STORAGE_KEY = "kids-app-placement-v1";

type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

/**
 * Introduced-letter count where each stage begins.
 * The lesson week is the first week that moves past that count, so Blending
 * starts on the week after the last Letters week, not on the week that finishes it.
 */
const stageStartIntroduced: Record<PathStageId, number> = {
  letters: 0,
  blending: 8,
  words: 16,
  stories: 22,
};

export function emptyPlacement(): PlacementDocument {
  return {
    version: 1,
    origin: "device",
    classId: DEVICE_CLASS_ID,
    updatedAt: "",
    classDefault: null,
    byChildId: {},
  };
}

export function clampWeek(index: number): number {
  if (!Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(letterSchedule.length - 1, Math.floor(index)));
}

export function isPathStageId(value: string): value is PathStageId {
  return pathStages.some((stage) => stage.id === value);
}

export function stageTitle(stageId: PathStageId): string {
  return pathStages.find((stage) => stage.id === stageId)?.title ?? stageId;
}

/** First lesson week of a stage. Letters are the new letters for that week. */
export function firstWeekForStage(stageId: PathStageId): number {
  const need = stageStartIntroduced[stageId];
  if (need <= 0) return 0;
  for (let week = 0; week < letterSchedule.length; week += 1) {
    if (lettersIntroduced(week).length > need) return week;
  }
  return letterSchedule.length - 1;
}

export function placeForStage(stageId: PathStageId): LessonPlace {
  return placeForWeek(firstWeekForStage(stageId));
}

/** Week chooses the lesson. The stage is the path stage that week sits in. */
export function placeForWeek(index: number): LessonPlace {
  const week = clampWeek(index);
  return {
    stageId: learningPlace(lettersIntroduced(week).length).currentId,
    weekIndex: week,
  };
}

export function weekLabel(index: number): string {
  const week = clampWeek(index);
  const plan = letterSchedule[week];
  const letters = plan.newLetters.map((letter) => letter.toUpperCase()).join(" ");
  return `Week ${week + 1} · ${letters}`;
}

export function withClassPlace(doc: PlacementDocument, place: LessonPlace | null, now = new Date()): PlacementDocument {
  return {
    ...doc,
    classDefault: place,
    updatedAt: now.toISOString(),
  };
}

export function withChildPlace(
  doc: PlacementDocument,
  childId: string,
  place: LessonPlace | null,
  now = new Date(),
): PlacementDocument {
  const byChildId = { ...doc.byChildId };
  if (place) byChildId[childId] = place;
  else delete byChildId[childId];
  return { ...doc, byChildId, updatedAt: now.toISOString() };
}

function parsePlace(value: unknown): LessonPlace | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.weekIndex !== "number") return null;
  return placeForWeek(record.weekIndex);
}

function parsePlaces(value: unknown): Record<string, LessonPlace> {
  if (!value || typeof value !== "object") return {};
  const places: Record<string, LessonPlace> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!key || key === "__proto__" || key === "constructor") continue;
    const place = parsePlace(item);
    if (place) places[key] = place;
  }
  return places;
}

export function parsePlacement(value: unknown): PlacementDocument | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.version !== 1) return null;
  const classId = typeof record.classId === "string" && record.classId.trim() ? record.classId : DEVICE_CLASS_ID;
  const origin = record.origin === "server" ? "server" : "device";
  const updatedAt = typeof record.updatedAt === "string" ? record.updatedAt : "";
  return {
    version: 1,
    origin,
    classId,
    updatedAt,
    classDefault: parsePlace(record.classDefault),
    byChildId: parsePlaces(record.byChildId),
  };
}

export function loadPlacement(storage: KeyValueStore = localStorage): PlacementDocument {
  try {
    const raw = storage.getItem(PLACEMENT_STORAGE_KEY);
    if (!raw) return emptyPlacement();
    return parsePlacement(JSON.parse(raw)) ?? emptyPlacement();
  } catch {
    return emptyPlacement();
  }
}

export function savePlacement(doc: PlacementDocument, storage: KeyValueStore = localStorage): void {
  storage.setItem(PLACEMENT_STORAGE_KEY, JSON.stringify(doc));
}

/** Child override, then the class place, then the calendar week since the profile was created. */
export function resolvePlacement(
  doc: PlacementDocument,
  childId: string,
  createdAt: string,
  now = new Date(),
  timeZone = deviceTimeZone(),
): ResolvedPlacement {
  const childPlace = doc.byChildId[childId] ?? null;
  const chosen = childPlace ?? doc.classDefault;
  const source: PlacementSource = childPlace ? "child" : doc.classDefault ? "class" : "calendar";
  const index = chosen ? chosen.weekIndex : weekIndex(createdAt, now, timeZone);
  const stageId = chosen ? chosen.stageId : learningPlace(lettersIntroduced(index).length).currentId;
  return {
    source,
    weekIndex: index,
    stageId,
    letters: practiceLetters(planForWeek(index), isReviewDay(now, timeZone)),
  };
}
