import { lettersIntroduced, letterPlanSize, weekIndex } from "./schedule";
import { deviceTimeZone } from "./time";

/** Ages 3–5, in teaching order. Sizes add up to the letter plan. */
export const pathStages = [
  { id: "letters", title: "Letters", detail: "Hear each letter sound.", size: 8 },
  { id: "blending", title: "Blending", detail: "Slide sounds together into a word.", size: 8 },
  { id: "words", title: "Words", detail: "Read short words.", size: 6 },
  { id: "stories", title: "Stories", detail: "A tiny story with their animal.", size: 4 },
] as const;

/** Shown on the path, not started in this app yet. */
export const laterPath = {
  id: "phonics",
  title: "Phonics 5–7",
  detail: "Comes after this path, for ages 5 to 7.",
} as const;

export type PathStageId = (typeof pathStages)[number]["id"];
export type PathState = "done" | "current" | "upcoming";

export type PathStageView = {
  id: PathStageId;
  title: string;
  detail: string;
  state: PathState;
  /** 0 to 1 inside the current stage. Done stages are 1, later ones are 0. */
  progress: number;
};

export type LearningPlace = {
  currentId: PathStageId;
  introduced: number;
  stages: PathStageView[];
};

const pathTotal = pathStages.reduce((sum, stage) => sum + stage.size, 0);

/** Where a child is on Letters → Blending → Words → Stories. */
export function learningPlace(introduced: number): LearningPlace {
  const count = Math.max(0, Math.min(pathTotal, Math.floor(introduced)));
  let cursor = count;
  let currentIndex = pathStages.length - 1;
  let progress = 1;
  for (let index = 0; index < pathStages.length; index += 1) {
    const size = pathStages[index].size;
    if (cursor < size) {
      currentIndex = index;
      progress = cursor / size;
      break;
    }
    cursor -= size;
    if (index === pathStages.length - 1) {
      currentIndex = index;
      progress = 1;
    }
  }
  return {
    currentId: pathStages[currentIndex].id,
    introduced: count,
    stages: pathStages.map((stage, index) => ({
      id: stage.id,
      title: stage.title,
      detail: stage.detail,
      state: index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming",
      progress: index < currentIndex ? 1 : index === currentIndex ? progress : 0,
    })),
  };
}

export function placeForChild(createdAt: string, now = new Date(), timeZone = deviceTimeZone()): LearningPlace {
  const introduced = lettersIntroduced(weekIndex(createdAt, now, timeZone)).length;
  return learningPlace(introduced);
}

/** Guard so the stage sizes stay aligned with the letter plan. */
export function pathCoversLetterPlan(): boolean {
  return pathTotal === letterPlanSize();
}
