import { describe, expect, it } from "vitest";
import { laterPath, learningPlace, pathCoversLetterPlan, placeForChild } from "./path";
import { READING } from "./subject";

describe("learning path", () => {
  it("covers the letter plan and moves Letters, then Blending, then Words, then Stories", () => {
    expect(pathCoversLetterPlan()).toBe(true);
    expect(learningPlace(READING, 0).currentId).toBe("letters");
    expect(learningPlace(READING, 0).subject).toBe(READING);
    expect(learningPlace(READING, 2).stages[0].progress).toBeCloseTo(0.25);
    expect(learningPlace(READING, 8).currentId).toBe("blending");
    expect(learningPlace(READING, 8).stages[0].state).toBe("done");
    expect(learningPlace(READING, 16).currentId).toBe("words");
    expect(learningPlace(READING, 22).currentId).toBe("stories");
    const done = learningPlace(READING, 26);
    expect(done.currentId).toBe("stories");
    expect(done.stages.find((stage) => stage.id === "stories")?.progress).toBe(1);
    expect(laterPath.id).toBe("phonics");
  });

  it("places a new child in Letters", () => {
    const place = placeForChild("2026-09-07T15:00:00.000Z", new Date("2026-09-07T18:00:00.000Z"), "UTC");
    expect(place.subject).toBe(READING);
    expect(place.currentId).toBe("letters");
    expect(place.introduced).toBe(2);
  });
});
