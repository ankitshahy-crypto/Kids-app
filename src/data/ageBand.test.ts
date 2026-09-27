import { describe, expect, it } from "vitest";
import { CALENDAR_STAGE_CAPS, ageBand, calendarStageCap, lastWeekWithinStage } from "./ageBand";
import { colorLessonForChild, lastColorWeekForStage } from "./colors";
import { lastMathWeekForStage, lessonForChild as mathLessonForChild, mathWeekCount } from "./math";
import { emptyPlacement, placeForStage, resolvePlacement, withChildPlace } from "./placement";
import { weekIndex } from "./schedule";
import { lastTimeWeekForStage, lessonForChild as timeLessonForChild, timeWeekCount } from "./timeMoney";

/** A profile old enough to have walked every week of every course. */
const CREATED = "2025-01-06T12:00:00.000Z";
const NOW = new Date("2026-09-27T12:00:00.000Z");
/** Six lesson weeks in: the calendar reaches half hours here. */
const SIX_WEEKS_AGO = "2026-08-17T12:00:00.000Z";

describe("age bands", () => {
  it("splits ages the way Games, Build, and Science do", () => {
    expect(ageBand("3")).toBe("early");
    expect(ageBand("4")).toBe("early");
    expect(ageBand("5")).toBe("later");
    expect(ageBand("6-7")).toBe("later");
    expect(ageBand(undefined)).toBe("early");
  });

  it("caps the calendar for the ages in the table and nobody else", () => {
    expect(calendarStageCap("time", "3")).toBe("shop");
    expect(calendarStageCap("time", "4")).toBe("shop");
    expect(calendarStageCap("time", "5")).toBeNull();
    expect(calendarStageCap("time", "6-7")).toBeNull();
    expect(calendarStageCap("math", "3")).toBe("shapes");
    expect(calendarStageCap("math", "4")).toBeNull();
    expect(calendarStageCap("colors", "3")).toBeNull();
    expect(calendarStageCap("reading", "3")).toBeNull();
    expect(Object.keys(CALENDAR_STAGE_CAPS).sort()).toEqual(["math", "time"]);
  });

  it("finds the last week inside a stage", () => {
    const stages = ["a", "b", "c"];
    const stageOf = (week: number) => (week < 2 ? "a" : week < 5 ? "b" : "c");
    expect(lastWeekWithinStage("a", 8, stages, stageOf)).toBe(1);
    expect(lastWeekWithinStage("b", 8, stages, stageOf)).toBe(4);
    expect(lastWeekWithinStage("c", 8, stages, stageOf)).toBe(7);
    expect(lastWeekWithinStage("missing", 8, stages, stageOf)).toBe(7);
  });

  it("stops the time calendar before half hours for ages 3 and 4", () => {
    const shop = lastTimeWeekForStage("shop");
    expect(shop).toBeLessThan(timeWeekCount() - 1);
    for (const age of ["3", "4"]) {
      const lesson = timeLessonForChild(CREATED, NOW, "UTC", undefined, age);
      expect(lesson.weekIndex).toBe(shop);
      expect(lesson.clockMode).toBe("hour");
      expect(lesson.targetMinute).toBe(0);
      expect(["day", "routine", "clock", "coins", "shop"]).toContain(lesson.stageId);
      expect(lesson.cardsOpen).toBe(false);
    }
    for (const age of ["5", "6-7"]) {
      expect(timeLessonForChild(CREATED, NOW, "UTC", undefined, age).weekIndex).toBe(timeWeekCount() - 1);
    }
    // Same six weeks of use: a 4-year-old still sets o'clock, a 5-year-old moves on to half past.
    expect(weekIndex(SIX_WEEKS_AGO, NOW, "UTC")).toBeGreaterThan(shop);
    expect(timeLessonForChild(SIX_WEEKS_AGO, NOW, "UTC", undefined, "4").clockMode).toBe("hour");
    expect(timeLessonForChild(SIX_WEEKS_AGO, NOW, "UTC", undefined, "5").clockMode).toBe("half");
  });

  it("holds adding for age 3 and opens the whole numbers path from age 4", () => {
    const shapes = lastMathWeekForStage("shapes");
    expect(mathLessonForChild(CREATED, NOW, "UTC", undefined, "3").weekIndex).toBe(shapes);
    expect(mathLessonForChild(CREATED, NOW, "UTC", undefined, "3").stageId).not.toBe("adding");
    expect(mathLessonForChild(CREATED, NOW, "UTC", undefined, "4").weekIndex).toBe(mathWeekCount() - 1);
    expect(mathLessonForChild(CREATED, NOW, "UTC", undefined, "4").stageId).toBe("adding");
    expect(colorLessonForChild(CREATED, NOW, "UTC", undefined, "3").weekIndex).toBe(
      colorLessonForChild(CREATED, NOW, "UTC", undefined, "6-7").weekIndex,
    );
    expect(lastColorWeekForStage("mixing")).toBeGreaterThan(lastColorWeekForStage("names"));
  });

  it("caps the calendar in placement, and leaves a grown-up's placement alone", () => {
    const calendar = resolvePlacement(emptyPlacement(), "mia", CREATED, NOW, "UTC", "time", "4");
    expect(calendar.source).toBe("calendar");
    expect(calendar.ageCap).toBe("shop");
    expect(calendar.weekIndex).toBe(lastTimeWeekForStage("shop"));
    expect(calendar.stageId).toBe("shop");

    const older = resolvePlacement(emptyPlacement(), "mia", CREATED, NOW, "UTC", "time", "5");
    expect(older.ageCap).toBeNull();
    expect(older.weekIndex).toBe(weekIndex(CREATED, NOW, "UTC"));
    expect(older.weekIndex).toBeGreaterThan(calendar.weekIndex);

    const fresh = resolvePlacement(emptyPlacement(), "mia", NOW.toISOString(), NOW, "UTC", "time", "4");
    expect(fresh.ageCap).toBeNull();
    expect(fresh.weekIndex).toBe(0);

    const placed = withChildPlace(emptyPlacement(), "mia", placeForStage("hours", "time"), NOW);
    const chosen = resolvePlacement(placed, "mia", CREATED, NOW, "UTC", "time", "4");
    expect(chosen.source).toBe("child");
    expect(chosen.stageId).toBe("hours");
    expect(chosen.ageCap).toBeNull();
    expect(timeLessonForChild(CREATED, NOW, "UTC", chosen.weekIndex, "4").clockMode).toBe("half");
  });
});
