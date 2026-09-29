import { describe, expect, it } from "vitest";
import { learningPlace, showsLaterReading, stagesForAge } from "./path";
import { MATH } from "./math";
import { TIME } from "./timeMoney";
import { READING } from "./subject";

describe("a path sized to the child's age", () => {
  it("stops a four-year-old's reading and time paths where the calendar stops, and says how many wait", () => {
    const reading = learningPlace(READING, 3).stages;
    const four = stagesForAge(reading, READING, "4");
    expect(four.shown.map((stage) => stage.id)).toEqual(["letters", "blending", "words", "stories"]);
    expect(four.hidden).toBe(1);
    const time = stagesForAge(learningPlace(TIME, 2).stages, TIME, "4");
    expect(time.shown.at(-1)?.id).toBe("shop");
    expect(time.hidden).toBeGreaterThan(0);
  });

  it("keeps a stage a grown-up placed the child on, even past the age's stop", () => {
    const placed = learningPlace(TIME, 22).stages;
    expect(placed.find((stage) => stage.state === "current")?.id).toBe("hours");
    expect(stagesForAge(placed, TIME, "4").shown.at(-1)?.id).toBe("hours");
  });

  it("shows the whole path from age five, and longer stories only at six and seven", () => {
    const reading = learningPlace(READING, 3).stages;
    expect(stagesForAge(reading, READING, "5").hidden).toBe(0);
    expect(stagesForAge(learningPlace(MATH, 3).stages, MATH, "4").hidden).toBe(0);
    expect(stagesForAge(learningPlace(MATH, 3).stages, MATH, "3").shown.at(-1)?.id).toBe("shapes");
    expect(showsLaterReading("6-7")).toBe(true);
    expect(showsLaterReading("5")).toBe(false);
    expect(showsLaterReading("4")).toBe(false);
  });
});
