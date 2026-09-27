import { MODULE_WORDS } from "../brand";

/**
 * A subject is one course a child can practice.
 * Reading is built. Numbers & Math registers with `defineSubject` later and
 * reuses stars, time, the path, placement, and printables. No math content lives here.
 */
export const READING = "reading";

/** A course id such as `reading`. A later subject uses another id, such as `math`. */
export type SubjectId = string;

export type SubjectStage = {
  id: string;
  title: string;
  detail: string;
  /** How many units fill this stage. The subject decides what a unit is. */
  size: number;
};

export type SubjectLater = {
  id: string;
  title: string;
  detail: string;
};

export type SubjectDefinition = {
  id: SubjectId;
  title: string;
  stages: readonly SubjectStage[];
  /** Shown after the stages. Not part of today's lesson. */
  later?: SubjectLater;
  /** Step ids that finish one day of this subject. */
  steps: readonly string[];
};

/** Ages 3–5 reading, in teaching order. Sizes add up to the letter plan. */
export const readingStages = [
  { id: "letters", title: "Letters", detail: "Hear each letter sound and trace big and little.", size: 8 },
  { id: "blending", title: "Blending", detail: "Slide sounds together into a word.", size: 8 },
  { id: "words", title: "Words", detail: "Read short words.", size: 6 },
  { id: "stories", title: "Stories", detail: "A tiny story with their animal.", size: 4 },
] as const;

/** Shown on the reading path, not started in this app yet. */
export const readingLater = {
  id: "phonics",
  title: "Phonics 5–7",
  detail: "Comes after this path, for ages 5 to 7.",
} as const;

export const readingSteps = ["letter", "draw", "story", "moment"] as const;

const catalog = new Map<string, SubjectDefinition>();

/** Add a course. Reading is already defined. A later subject calls this once. */
export function defineSubject(definition: SubjectDefinition): void {
  catalog.set(definition.id, definition);
}

defineSubject({
  id: READING,
  title: MODULE_WORDS,
  stages: readingStages,
  later: readingLater,
  steps: readingSteps,
});

export function subjectDefinition(id: SubjectId): SubjectDefinition | undefined {
  return catalog.get(id);
}

export function isSubjectKey(value: string): boolean {
  return /^[a-z][a-z0-9-]{0,31}$/.test(value);
}
