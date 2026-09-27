import type { AgeRange } from "./profiles";
import type { SubjectId } from "./subject";

/**
 * Two bands, the same split Games, Build, and Science use: a gentle start for
 * ages 3 and 4, the full path for ages 5 to 7.
 */
export type AgeBand = "early" | "later";

export function ageBand(ageRange: AgeRange | string | undefined): AgeBand {
  return ageRange === "5" || ageRange === "6-7" ? "later" : "early";
}

export function ageBandTitle(band: AgeBand): string {
  return band === "later" ? "Full path, ages 5 to 7" : "Gentle start, ages 3 and 4";
}

/**
 * The last stage the calendar reaches for an age. A missing entry means the
 * whole path. Only the calendar is capped: a grown-up who places a child on a
 * stage in Parent or Teacher gets exactly that stage.
 *
 * Time & Money follows the store listing: half hours, minutes, coin values,
 * and making change are for ages 5 to 7. Numbers holds adding until age 4.
 * Colors has no age split.
 */
export const CALENDAR_STAGE_CAPS: Readonly<Record<SubjectId, Partial<Record<AgeRange, string>>>> = {
  math: { "3": "shapes" },
  time: { "3": "shop", "4": "shop" },
};

/** The stage id the calendar stops at for this age, or null for the whole path. */
export function calendarStageCap(subject: SubjectId, ageRange: AgeRange | string | undefined): string | null {
  if (!ageRange) return null;
  const caps = CALENDAR_STAGE_CAPS[subject];
  return caps?.[ageRange as AgeRange] ?? null;
}

/**
 * The last week whose stage is still allowed. `stageOfWeek` maps a week to its
 * stage id and `stageIds` lists the subject's stages in path order.
 */
export function lastWeekWithinStage(
  capStageId: string,
  weekCount: number,
  stageIds: readonly string[],
  stageOfWeek: (week: number) => string,
): number {
  const limit = stageIds.indexOf(capStageId);
  if (limit === -1) return Math.max(0, weekCount - 1);
  let last = 0;
  for (let week = 0; week < weekCount; week += 1) {
    const order = stageIds.indexOf(stageOfWeek(week));
    if (order !== -1 && order > limit) break;
    last = week;
  }
  return last;
}
