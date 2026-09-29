import { lettersIntroduced, letterPlanSize, weekIndex } from "./schedule";
import {
  READING,
  readingLater,
  readingStages,
  subjectDefinition,
  type SubjectId,
  type SubjectLater,
} from "./subject";
import { deviceTimeZone } from "./time";
import { calendarStageCap } from "./ageBand";

export const pathStages = readingStages;
export const laterPath = readingLater;

export type PathStageId = (typeof pathStages)[number]["id"];
export type PathState = "done" | "current" | "upcoming";

export type PathStageView = {
  id: string;
  title: string;
  detail: string;
  state: PathState;
  /** 0 to 1 inside the current stage. Done stages are 1, later ones are 0. */
  progress: number;
};

export type LearningPlace = {
  subject: SubjectId;
  currentId: string;
  introduced: number;
  stages: PathStageView[];
  later?: SubjectLater;
};

/** Where a child is on a subject's stages. An unknown subject has an empty path. */
export function learningPlace(subject: SubjectId, introduced: number): LearningPlace {
  const definition = subjectDefinition(subject);
  const stages = definition?.stages ?? [];
  const total = stages.reduce((sum, stage) => sum + stage.size, 0);
  const count = Math.max(0, Math.min(total, Math.floor(introduced)));
  if (stages.length === 0) {
    return { subject, currentId: "", introduced: 0, stages: [], later: definition?.later };
  }
  let cursor = count;
  let currentIndex = stages.length - 1;
  let progress = 1;
  for (let index = 0; index < stages.length; index += 1) {
    const size = stages[index].size;
    if (cursor < size) {
      currentIndex = index;
      progress = size === 0 ? 0 : cursor / size;
      break;
    }
    cursor -= size;
    if (index === stages.length - 1) {
      currentIndex = index;
      progress = 1;
    }
  }
  return {
    subject,
    currentId: stages[currentIndex].id,
    introduced: count,
    later: definition?.later,
    stages: stages.map((stage, index) => ({
      id: stage.id,
      title: stage.title,
      detail: stage.detail,
      state: index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming",
      progress: index < currentIndex ? 1 : index === currentIndex ? progress : 0,
    })),
  };
}

/** Reading place from the letter plan. Other subjects bring their own units. */
export function placeForChild(createdAt: string, now = new Date(), timeZone = deviceTimeZone()): LearningPlace {
  const introduced = lettersIntroduced(weekIndex(createdAt, now, timeZone)).length;
  return learningPlace(READING, introduced);
}

/** Guard so the reading stage sizes stay aligned with the letter plan. */
export function pathCoversLetterPlan(): boolean {
  const total = pathStages.reduce((sum, stage) => sum + stage.size, 0);
  return total === letterPlanSize();
}

/**
 * The stages to show for this child: up to the last stage their age reaches
 * (see CALENDAR_STAGE_CAPS), or further if a grown-up placed them there. A
 * three- or four-year-old's parent does not need the 5–7 stages yet.
 */
export function stagesForAge<T extends { id: string; state: string }>(stages: readonly T[], subject: SubjectId, ageRange: string | undefined): { shown: T[]; hidden: number } {
  const cap = calendarStageCap(subject, ageRange);
  const capAt = cap ? stages.findIndex((stage) => stage.id === cap) : -1;
  if (capAt === -1) return { shown: [...stages], hidden: 0 };
  const currentAt = stages.findIndex((stage) => stage.state === "current");
  const last = Math.max(capAt, currentAt);
  return { shown: stages.slice(0, last + 1), hidden: stages.length - last - 1 };
}

/** The "Longer stories 6–7" row is for six- and seven-year-olds. */
export function showsLaterReading(ageRange: string | undefined): boolean {
  return ageRange === "6-7";
}
