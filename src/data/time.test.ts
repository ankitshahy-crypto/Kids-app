import { describe, expect, it } from "vitest";
import { awardStar, createChild, starsThisWeek, todayKey } from "./profiles";
import { isReviewDay, weekIndex } from "./schedule";
import {
  deviceTimeZone,
  isFriday,
  isValidTimeZone,
  localDateKey,
  monthKey,
  startOfLocalDay,
  utcTimestamp,
  weekDateKeys,
} from "./time";

const NEW_YORK = "America/New_York";
const TOKYO = "Asia/Tokyo";

function child(createdAt: string) {
  return {
    ...createChild({ name: "Ada", ageRange: "4" as const, animal: "fox" as const }),
    createdAt,
    stars: 0,
    days: {},
  };
}

describe("daylight saving", () => {
  it("keeps both calendar days across the spring-forward, with a 23-hour local midnight gap", () => {
    const march8 = startOfLocalDay(new Date("2026-03-08T17:00:00.000Z"), NEW_YORK);
    const march9 = startOfLocalDay(new Date("2026-03-09T17:00:00.000Z"), NEW_YORK);
    expect(march8.toISOString()).toBe("2026-03-08T05:00:00.000Z");
    expect(march9.toISOString()).toBe("2026-03-09T04:00:00.000Z");
    expect(march9.getTime() - march8.getTime()).toBe(23 * 60 * 60 * 1000);

    const beforeJump = new Date("2026-03-08T06:30:00.000Z");
    const afterJump = new Date("2026-03-08T07:30:00.000Z");
    expect(localDateKey(beforeJump, NEW_YORK)).toBe("2026-03-08");
    expect(localDateKey(afterJump, NEW_YORK)).toBe("2026-03-08");

    const created = "2026-03-02T15:00:00.000Z";
    expect(weekIndex(created, afterJump, NEW_YORK)).toBe(0);
    expect(weekIndex(created, new Date("2026-03-09T04:30:00.000Z"), NEW_YORK)).toBe(1);
  });

  it("does not award a second star for the repeated hour in the fall-back", () => {
    const firstOneThirty = new Date("2026-11-01T05:30:00.000Z");
    const secondOneThirty = new Date("2026-11-01T06:30:00.000Z");
    expect(localDateKey(firstOneThirty, NEW_YORK)).toBe("2026-11-01");
    expect(localDateKey(secondOneThirty, NEW_YORK)).toBe("2026-11-01");

    const november1 = startOfLocalDay(firstOneThirty, NEW_YORK);
    const november2 = startOfLocalDay(new Date("2026-11-02T17:00:00.000Z"), NEW_YORK);
    expect(november1.toISOString()).toBe("2026-11-01T04:00:00.000Z");
    expect(november2.toISOString()).toBe("2026-11-02T05:00:00.000Z");
    expect(november2.getTime() - november1.getTime()).toBe(25 * 60 * 60 * 1000);

    const once = awardStar(child("2026-10-01T15:00:00.000Z"), "letter", firstOneThirty, NEW_YORK);
    const twice = awardStar(once, "letter", secondOneThirty, NEW_YORK);
    expect(twice).toBe(once);
    expect(twice.stars).toBe(1);
    expect(twice.days["2026-11-01"]?.reading?.letter).toBe(true);

    const nextMorning = new Date("2026-11-02T05:30:00.000Z");
    const nextDay = awardStar(twice, "letter", nextMorning, NEW_YORK);
    expect(nextDay.stars).toBe(2);
    expect(todayKey(nextMorning, NEW_YORK)).toBe("2026-11-02");
  });
});

describe("Friday review", () => {
  it("is Friday in New York and already Saturday in Tokyo", () => {
    const instant = new Date("2026-09-26T03:30:00.000Z");
    expect(isFriday(instant, NEW_YORK)).toBe(true);
    expect(isReviewDay(instant, NEW_YORK)).toBe(true);
    expect(localDateKey(instant, NEW_YORK)).toBe("2026-09-25");
    expect(isFriday(instant, TOKYO)).toBe(false);
    expect(isReviewDay(instant, TOKYO)).toBe(false);
    expect(localDateKey(instant, TOKYO)).toBe("2026-09-26");
    expect(isReviewDay(new Date("2026-09-26T04:00:00.000Z"), NEW_YORK)).toBe(false);
  });
});

describe("Monday week and travel", () => {
  it("counts lessons in the local Monday–Sunday week and advances letters on Monday", () => {
    const fridayNight = new Date("2026-09-26T03:30:00.000Z");
    expect(weekDateKeys(fridayNight, NEW_YORK)).toEqual([
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
      "2026-09-27",
    ]);

    const created = "2026-09-23T15:00:00.000Z";
    expect(weekIndex(created, fridayNight, NEW_YORK)).toBe(0);
    const monday = new Date("2026-09-28T04:30:00.000Z");
    expect(weekIndex(created, monday, NEW_YORK)).toBe(1);
    expect(localDateKey(monday, NEW_YORK)).toBe("2026-09-28");

    const profile = awardStar(child(created), "letter", fridayNight, NEW_YORK);
    expect(starsThisWeek(profile, fridayNight, NEW_YORK)).toBe(1);
    expect(starsThisWeek(profile, monday, NEW_YORK)).toBe(0);
    expect(profile.days["2026-09-25"]?.reading?.letter).toBe(true);
  });

  it("keeps an earlier local day when travel moves the clock, and does not award that day again", () => {
    const nyFriday = new Date("2026-09-26T03:30:00.000Z");
    const friday = awardStar(child("2026-09-01T15:00:00.000Z"), "letter", nyFriday, NEW_YORK);
    expect(todayKey(nyFriday, TOKYO)).toBe("2026-09-26");

    const traveled = awardStar(friday, "letter", nyFriday, TOKYO);
    expect(traveled.stars).toBe(2);
    expect(traveled.days["2026-09-25"]?.reading?.letter).toBe(true);
    expect(traveled.days["2026-09-26"]?.reading?.letter).toBe(true);

    const backHome = awardStar(traveled, "letter", nyFriday, NEW_YORK);
    expect(backHome).toBe(traveled);
    expect(backHome.stars).toBe(2);
  });

  it("uses the class zone for the month and the week", () => {
    const newYear = new Date("2026-01-01T03:30:00.000Z");
    expect(monthKey(newYear, NEW_YORK)).toBe("2025-12");
    expect(monthKey(newYear, TOKYO)).toBe("2026-01");
    expect(weekDateKeys(newYear, NEW_YORK)[0]).toBe("2025-12-29");
    expect(weekDateKeys(newYear, TOKYO)[0]).toBe("2025-12-29");
    expect(isValidTimeZone(NEW_YORK)).toBe(true);
    expect(isValidTimeZone("Not/AZone")).toBe(false);
    expect(isValidTimeZone(deviceTimeZone())).toBe(true);
  });
});

describe("stored instants", () => {
  it("stores profile creation as a UTC ISO string", () => {
    expect(utcTimestamp(new Date("2026-03-08T06:30:00.000Z"))).toBe("2026-03-08T06:30:00.000Z");
    expect(createChild({ name: "Ada", ageRange: "4", animal: "fox" }).createdAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });
});
