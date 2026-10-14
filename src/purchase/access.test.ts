import { describe, expect, it } from "vitest";
import { wordsThrough } from "../data/ladder";
import { FREE_WEEKS, activityOpen, playableWeek, tracedWordsOpen, weekOpen } from "./access";

describe("what is free before the unlock", () => {
  it("opens the first two reading weeks and holds a child there", () => {
    expect(FREE_WEEKS).toBe(2);
    expect(weekOpen(0, false)).toBe(true);
    expect(weekOpen(1, false)).toBe(true);
    expect(weekOpen(2, false)).toBe(false);
    expect(weekOpen(20, true)).toBe(true);
    expect(playableWeek(9, false)).toBe(1);
    expect(playableWeek(0, false)).toBe(0);
    expect(playableWeek(9, true)).toBe(9);
  });

  it("opens the first activity of each Explore area", () => {
    expect(activityOpen("math", "count", false)).toBe(true);
    expect(activityOpen("math", "know", false)).toBe(false);
    expect(activityOpen("colors", "name", false)).toBe(true);
    expect(activityOpen("colors", "mix", false)).toBe(false);
    expect(activityOpen("time", "day", false)).toBe(true);
    expect(activityOpen("money", "jars", false)).toBe(true);
    expect(activityOpen("money", "lemonade", false)).toBe(false);
    expect(activityOpen("build", "bridge", false)).toBe(true);
    expect(activityOpen("science", "life", false)).toBe(true);
    expect(activityOpen("science", "float", false)).toBe(false);
    expect(activityOpen("games", "hatch", false)).toBe(true);
    expect(activityOpen("games", "bird", false)).toBe(true);
    expect(activityOpen("games", "build", false)).toBe(true);
    // Read the code opens with the full app.
    expect(activityOpen("games", "code", false)).toBe(false);
    expect(activityOpen("games", "code", true)).toBe(true);
    expect(activityOpen("games", "pop", false)).toBe(false);
    expect(activityOpen("games", "pop", true)).toBe(true);
  });

  it("lets a child without the unlock trace only the words the free weeks' letters can spell", () => {
    const words = wordsThrough(3);
    const pick = (text: string) => {
      const word = words.find((entry) => entry.word === text);
      if (!word) throw new Error(`no ladder word ${text}`);
      return word;
    };
    // Weeks 1 and 2 teach m, a, s and t: "mat" and "sat" are theirs; "pit" and "sun" need later letters.
    const earned = [pick("mat"), pick("pit"), pick("sat"), pick("sun")];
    expect(tracedWordsOpen(earned, false).map((word) => word.word)).toEqual(["mat", "sat"]);
    expect(tracedWordsOpen(earned, true)).toEqual(earned);
    expect(tracedWordsOpen([], false)).toEqual([]);
  });
});
