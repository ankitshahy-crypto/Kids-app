import { PLACEMENT_KEY, readStored, writeStored } from "../storage";
import {
  COLORS,
  clampColorWeek,
  colorIntroduced,
  colorWeekCount,
  firstColorWeekForStage,
} from "./colors";
import {
  MATH,
  clampMathWeek,
  firstMathWeekForStage,
  mathIntroduced,
  mathWeekCount,
} from "./math";
import {
  TIME,
  clampTimeWeek,
  firstTimeWeekForStage,
  timeIntroduced,
  timeWeekCount,
} from "./timeMoney";
import { learningPlace, type PathStageId } from "./path";
import { isReviewDay, letterOfTheWeekIndex, letterSchedule, lettersIntroduced, planForWeek, practiceLetters, weekIndex } from "./schedule";
import { READING, isSubjectKey, readingStages, subjectDefinition, type SubjectId } from "./subject";
import { deviceTimeZone } from "./time";

/**
 * Device copy of a class lesson placement.
 * The same JSON is what a class server can store later. This app only reads
 * and writes it on the device. `origin` stays "device" until a server owns it.
 * Each subject has its own place. Reading is the only subject filled in today.
 */
export type PlacementDocument = {
  version: 1;
  origin: "device" | "server";
  /** Stable id. `device-class` until a class server assigns one. */
  classId: string;
  /** ISO-8601 time of the last edit. Empty when nothing has been set. */
  updatedAt: string;
  /** Subject id → class default and per-child overrides. */
  subjects: Record<string, SubjectPlacement>;
};

export type SubjectPlacement = {
  /** Starting lesson for every child who has no override. Null follows that subject's calendar. */
  classDefault: LessonPlace | null;
  /** Child profile id → place. Wins over `classDefault`. */
  byChildId: Record<string, LessonPlace>;
};

/** A starting stage and the lesson week that subject uses. */
export type LessonPlace = {
  subject: SubjectId;
  stageId: string;
  /** Index into that subject's lesson plan. Reading uses `letterSchedule`. */
  weekIndex: number;
};

export type PlacementSource = "child" | "class" | "week" | "calendar";

export type ResolvedPlacement = {
  subject: SubjectId;
  source: PlacementSource;
  weekIndex: number;
  stageId: string;
  /** Reading: letters the child practices today, including Friday review when that applies. */
  letters: string[];
};

/** One class on this device until a server id replaces it. */
export const DEVICE_CLASS_ID = "device-class";

export const PLACEMENT_STORAGE_KEY = PLACEMENT_KEY;

type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

/**
 * Introduced-letter count where each reading stage begins.
 * The lesson week is the first week that moves past that count, so Blending
 * starts on the week after the last Letters week, not on the week that finishes it.
 */
const stageStartIntroduced: Record<PathStageId, number> = {
  letters: 0,
  blending: 8,
  words: 16,
  stories: 22,
};

function emptySubjectPlacement(): SubjectPlacement {
  return { classDefault: null, byChildId: {} };
}

export function emptyPlacement(): PlacementDocument {
  return {
    version: 1,
    origin: "device",
    classId: DEVICE_CLASS_ID,
    updatedAt: "",
    subjects: {
      [READING]: emptySubjectPlacement(),
      [MATH]: emptySubjectPlacement(),
      [COLORS]: emptySubjectPlacement(),
      [TIME]: emptySubjectPlacement(),
    },
  };
}

export function placesFor(doc: PlacementDocument, subject: SubjectId = READING): SubjectPlacement {
  return doc.subjects[subject] ?? emptySubjectPlacement();
}

export function clampWeek(index: number): number {
  if (!Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(letterSchedule.length - 1, Math.floor(index)));
}

export function isPathStageId(value: string): value is PathStageId {
  return readingStages.some((stage) => stage.id === value);
}

export function stageTitle(stageId: string, subject: SubjectId = READING): string {
  const stages = subjectDefinition(subject)?.stages ?? [];
  return stages.find((stage) => stage.id === stageId)?.title ?? stageId;
}

/** First reading lesson week of a stage. Letters are the new letters for that week. */
export function firstWeekForStage(stageId: PathStageId): number {
  const need = stageStartIntroduced[stageId];
  if (need <= 0) return 0;
  for (let week = 0; week < letterSchedule.length; week += 1) {
    if (lettersIntroduced(week).length > need) return week;
  }
  return letterSchedule.length - 1;
}

export function placeForStage(stageId: string, subject: SubjectId = READING): LessonPlace {
  if (subject === MATH) return placeForWeek(firstMathWeekForStage(stageId), MATH);
  if (subject === COLORS) return placeForWeek(firstColorWeekForStage(stageId), COLORS);
  if (subject === TIME) return placeForWeek(firstTimeWeekForStage(stageId), TIME);
  if (isPathStageId(stageId)) return placeForWeek(firstWeekForStage(stageId), READING);
  return { subject, stageId, weekIndex: 0 };
}

function introducedFor(subject: SubjectId, week: number): number {
  if (subject === MATH) return mathIntroduced(week);
  if (subject === COLORS) return colorIntroduced(week);
  if (subject === TIME) return timeIntroduced(week);
  return lettersIntroduced(week).length;
}

/** Week chooses the lesson. The stage is the path stage that week sits in. */
export function placeForWeek(index: number, subject: SubjectId = READING): LessonPlace {
  const week =
    subject === MATH
      ? clampMathWeek(index)
      : subject === COLORS
        ? clampColorWeek(index)
        : subject === TIME
          ? clampTimeWeek(index)
          : clampWeek(index);
  return {
    subject,
    stageId: learningPlace(subject, introducedFor(subject, week)).currentId,
    weekIndex: week,
  };
}

export function weekLabel(index: number, subject: SubjectId = READING): string {
  if (subject === MATH) {
    const week = clampMathWeek(index);
    const stageId = learningPlace(MATH, mathIntroduced(week)).currentId;
    return `Week ${week + 1} · ${stageTitle(stageId, MATH)}`;
  }
  if (subject === COLORS) {
    const week = clampColorWeek(index);
    const stageId = learningPlace(COLORS, colorIntroduced(week)).currentId;
    return `Week ${week + 1} · ${stageTitle(stageId, COLORS)}`;
  }
  if (subject === TIME) {
    const week = clampTimeWeek(index);
    const stageId = learningPlace(TIME, timeIntroduced(week)).currentId;
    return `Week ${week + 1} · ${stageTitle(stageId, TIME)}`;
  }
  const week = clampWeek(index);
  const plan = letterSchedule[week];
  const letters = plan.newLetters.map((letter) => letter.toUpperCase()).join(" ");
  return `Week ${week + 1} · ${letters}`;
}

export function weekChoices(subject: SubjectId = READING): number[] {
  const count =
    subject === MATH ? mathWeekCount() : subject === COLORS ? colorWeekCount() : subject === TIME ? timeWeekCount() : letterSchedule.length;
  return Array.from({ length: count }, (_, index) => index);
}

export function withClassPlace(
  doc: PlacementDocument,
  place: LessonPlace | null,
  now = new Date(),
  subject: SubjectId = place?.subject ?? READING,
): PlacementDocument {
  const current = placesFor(doc, subject);
  const nextPlace = place ? { ...place, subject } : null;
  return {
    ...doc,
    updatedAt: now.toISOString(),
    subjects: {
      ...doc.subjects,
      [subject]: { ...current, classDefault: nextPlace },
    },
  };
}

export function withChildPlace(
  doc: PlacementDocument,
  childId: string,
  place: LessonPlace | null,
  now = new Date(),
  subject: SubjectId = place?.subject ?? READING,
): PlacementDocument {
  const current = placesFor(doc, subject);
  const byChildId = { ...current.byChildId };
  if (place) byChildId[childId] = { ...place, subject };
  else delete byChildId[childId];
  return {
    ...doc,
    updatedAt: now.toISOString(),
    subjects: {
      ...doc.subjects,
      [subject]: { ...current, byChildId },
    },
  };
}

function parsePlace(value: unknown, fallbackSubject: SubjectId = READING): LessonPlace | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.weekIndex !== "number" || !Number.isFinite(record.weekIndex)) return null;
  const subject = typeof record.subject === "string" && isSubjectKey(record.subject) ? record.subject : fallbackSubject;
  if (subject === READING) return placeForWeek(record.weekIndex);
  const stageId = typeof record.stageId === "string" && record.stageId ? record.stageId : "";
  if (!stageId) return null;
  return { subject, stageId, weekIndex: Math.max(0, Math.floor(record.weekIndex)) };
}

function parsePlaces(value: unknown, fallbackSubject: SubjectId = READING): Record<string, LessonPlace> {
  if (!value || typeof value !== "object") return {};
  const places: Record<string, LessonPlace> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!key || key === "__proto__" || key === "constructor") continue;
    const place = parsePlace(item, fallbackSubject);
    if (place) places[key] = place;
  }
  return places;
}

function parseSubjectPlacement(value: unknown, fallbackSubject: SubjectId): SubjectPlacement {
  if (!value || typeof value !== "object") return emptySubjectPlacement();
  const record = value as Record<string, unknown>;
  return {
    classDefault: parsePlace(record.classDefault, fallbackSubject),
    byChildId: parsePlaces(record.byChildId, fallbackSubject),
  };
}

export function parsePlacement(value: unknown): PlacementDocument | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.version !== 1) return null;
  const classId = typeof record.classId === "string" && record.classId.trim() ? record.classId : DEVICE_CLASS_ID;
  const origin = record.origin === "server" ? "server" : "device";
  const updatedAt = typeof record.updatedAt === "string" ? record.updatedAt : "";
  const subjects: Record<string, SubjectPlacement> = {};
  if (record.subjects && typeof record.subjects === "object") {
    for (const [key, item] of Object.entries(record.subjects)) {
      if (!isSubjectKey(key) || key === "__proto__" || key === "constructor") continue;
      subjects[key] = parseSubjectPlacement(item, key);
    }
  } else {
    subjects[READING] = {
      classDefault: parsePlace(record.classDefault, READING),
      byChildId: parsePlaces(record.byChildId, READING),
    };
  }
  if (!subjects[READING]) subjects[READING] = emptySubjectPlacement();
  if (!subjects[MATH]) subjects[MATH] = emptySubjectPlacement();
  if (!subjects[COLORS]) subjects[COLORS] = emptySubjectPlacement();
  if (!subjects[TIME]) subjects[TIME] = emptySubjectPlacement();
  return { version: 1, origin, classId, updatedAt, subjects };
}

export function loadPlacement(storage: KeyValueStore = localStorage): PlacementDocument {
  try {
    const raw = readStored(storage, PLACEMENT_STORAGE_KEY);
    if (!raw) return emptyPlacement();
    return parsePlacement(JSON.parse(raw)) ?? emptyPlacement();
  } catch {
    return emptyPlacement();
  }
}

export function savePlacement(doc: PlacementDocument, storage: KeyValueStore = localStorage): void {
  writeStored(storage, PLACEMENT_STORAGE_KEY, JSON.stringify(doc));
}

/**
 * Child override, then the class place.
 * Reading with neither set uses the shared letter of the week.
 * Other subjects use weeks since the profile was created.
 */
export function resolvePlacement(
  doc: PlacementDocument,
  childId: string,
  createdAt: string,
  now = new Date(),
  timeZone = deviceTimeZone(),
  subject: SubjectId = READING,
): ResolvedPlacement {
  const slot = placesFor(doc, subject);
  const childPlace = slot.byChildId[childId] ?? null;
  const chosen = childPlace ?? slot.classDefault;
  const letterWeek = subject === READING && !chosen;
  const source: PlacementSource = childPlace ? "child" : slot.classDefault ? "class" : letterWeek ? "week" : "calendar";
  const index = chosen ? chosen.weekIndex : letterWeek ? letterOfTheWeekIndex(now, timeZone) : weekIndex(createdAt, now, timeZone);
  const stageId = chosen ? chosen.stageId : learningPlace(subject, introducedFor(subject, index)).currentId;
  const letters = subject === READING ? practiceLetters(planForWeek(index), isReviewDay(now, timeZone)) : [];
  return { subject, source, weekIndex: index, stageId, letters };
}
