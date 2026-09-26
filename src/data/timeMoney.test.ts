import { describe, expect, it } from "vitest";
import manifest from "./audioManifest.json";
import { placeForWeek } from "./placement";
import { createChild, dayProgress, todayKey } from "./profiles";
import { applyEffort } from "./rewards";
import { sheetsFor } from "./sheets";
import {
  TIME,
  canAfford,
  changeAmount,
  clockCue,
  coinSum,
  firstTimeWeekForStage,
  handsMatch,
  hourFromAngle,
  lessonForWeek,
  minuteFromAngle,
  saveAfterPay,
  saveGoalMet,
  snapMinute,
  timeIntroduced,
  timeManifestEntries,
} from "./timeMoney";

describe("time and money lessons", () => {
  it("keeps week 0 on parts of the day, o'clock, naming a coin, and a one-coin shop", () => {
    const lesson = lessonForWeek(0);
    expect(lesson.stageId).toBe("day");
    expect(lesson.clockMode).toBe("hour");
    expect(lesson.targetHour).toBe(1);
    expect(lesson.targetMinute).toBe(0);
    expect(lesson.dayTask).toBe("parts");
    expect(lesson.dayPart).toBe("morning");
    expect(lesson.coinTask).toBe("name");
    expect(lesson.coinTarget).toBe("penny");
    expect(lesson.shopTask).toBe("one");
    expect(lesson.snackId).toBe("apple");
    expect(lessonForWeek(0).stageId).toBe("day");
    expect(lessonForWeek(0).stageId).toBe("day");
  });

  it("moves the clock and the shop with the placement week", () => {
    expect(lessonForWeek(5)).toMatchObject({ stageId: "hours", clockMode: "half", targetMinute: 30, dayTask: "parts" });
    expect(lessonForWeek(6)).toMatchObject({ stageId: "minutes", clockMode: "quarter", targetMinute: 15, match: true, dayTask: "until" });
    expect(lessonForWeek(7)).toMatchObject({ stageId: "minutes", clockMode: "five", targetMinute: 25, match: true });
    expect(lessonForWeek(8)).toMatchObject({ stageId: "values", coinTask: "count", shopTask: "pay", countTotal: 7, clockMode: "five" });
    expect(lessonForWeek(9)).toMatchObject({ stageId: "change", coinTask: "compare", shopTask: "change", changeCents: 10 });
    expect(lessonForWeek(10).stageId).toBe("jars");
    expect(timeIntroduced(10)).toBe(36);
    expect(lessonForWeek(10).cardsOpen).toBe(false);
    expect(lessonForWeek(15)).toMatchObject({ stageId: "cards", cardsOpen: true });
    expect(placeForWeek(0, TIME).stageId).toBe("day");
    expect(placeForWeek(5, TIME).stageId).toBe("hours");
    expect(placeForWeek(9, TIME).stageId).toBe("change");
  });

  it("places each stage on the week that first reaches it", () => {
    expect(firstTimeWeekForStage("day")).toBe(0);
    expect(firstTimeWeekForStage("routine")).toBe(1);
    expect(firstTimeWeekForStage("clock")).toBe(2);
    expect(firstTimeWeekForStage("coins")).toBe(3);
    expect(firstTimeWeekForStage("shop")).toBe(4);
    expect(firstTimeWeekForStage("hours")).toBe(5);
    expect(firstTimeWeekForStage("minutes")).toBe(6);
    expect(firstTimeWeekForStage("values")).toBe(8);
    expect(firstTimeWeekForStage("change")).toBe(9);
    expect(firstTimeWeekForStage("jars")).toBe(10);
    expect(firstTimeWeekForStage("earn")).toBe(12);
    expect(firstTimeWeekForStage("choose")).toBe(13);
    expect(firstTimeWeekForStage("needs")).toBe(14);
    expect(firstTimeWeekForStage("cards")).toBe(15);
  });

  it("snaps clock hands and speaks the time in words", () => {
    expect(minuteFromAngle(0, "hour")).toBe(0);
    expect(minuteFromAngle(90, "five")).toBe(15);
    expect(minuteFromAngle(180, "half")).toBe(30);
    expect(hourFromAngle(0)).toBe(12);
    expect(hourFromAngle(30)).toBe(1);
    expect(snapMinute(22, "five")).toBe(20);
    expect(snapMinute(23, "five")).toBe(25);
    expect(handsMatch(1, 0, 1, 0)).toBe(true);
    expect(handsMatch(13, 0, 1, 0)).toBe(true);
    expect(handsMatch(12, 0, 1, 0)).toBe(false);
    expect(clockCue(2, 0)).toEqual({ id: "oclock-2", say: "two o'clock" });
    expect(clockCue(2, 30)).toEqual({ id: "half-2", say: "half past two" });
    expect(clockCue(2, 15)).toEqual({ id: "quarter-past-2", say: "quarter past two" });
    expect(clockCue(2, 45)).toEqual({ id: "quarter-to-3", say: "quarter to three" });
    expect(clockCue(2, 25)).toEqual({ id: "min-2-25", say: "two twenty-five" });
    expect(coinSum([{ cents: 1, count: 2 }, { cents: 5, count: 1 }])).toBe(7);
    expect(changeAmount(25, 15)).toBe(10);
    expect(canAfford(10, 25)).toBe(false);
    expect(canAfford(10, 5)).toBe(true);
    expect(saveGoalMet(2)).toBe(true);
    expect(saveGoalMet(1)).toBe(false);
    expect(saveAfterPay(4, 1)).toBe(3);
    expect(lessonForWeek(0).cardsOpen).toBe(false);
    expect(lessonForWeek(0).walletCents).toBe(10);
    expect(lessonForWeek(0).saveGoal).toBe(2);
  });

  it("keeps a coin sticker without finishing the reading lesson", () => {
    const now = new Date("2026-09-26T15:00:00.000Z");
    const child = createChild({ name: "Mia", ageRange: "4", animal: "fox" });
    const result = applyEffort(child, "coins", [{ kind: "coin", label: "Penny" }], now, "UTC", TIME);
    expect(result.awarded).toBe(true);
    expect(result.lessonComplete).toBe(false);
    expect(result.profile.stickers[0]).toMatchObject({ kind: "coin", label: "penny", subject: TIME });
    expect(dayProgress(result.profile, now, "UTC").letter).toBe(false);
    expect(result.profile.days[todayKey(now, "UTC")]?.reading).toBeUndefined();
    expect(sheetsFor(TIME).map((sheet) => sheet.id)).toEqual(["clock", "coins", "jars"]);
  });

  it("lists a neural line for every time prompt", () => {
    const book = manifest as { words: Record<string, { say: string; source: string }>; prompts: Record<string, { say: string; source: string }> };
    for (const entry of timeManifestEntries()) {
      const cue = book[entry.kind][entry.id];
      expect(cue?.say, entry.id).toBe(entry.say);
      expect(cue?.source, entry.id).toBe("neural");
    }
  });
});
