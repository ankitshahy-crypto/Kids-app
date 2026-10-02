import { describe, expect, it } from "vitest";
import {
  DEVICE_CLASS_ID,
  PLACEMENT_STORAGE_KEY,
  emptyPlacement,
  loadPlacement,
  placeForStage,
  resolvePlacement,
  savePlacement,
  withChildPlace,
  withClassPlace,
} from "./placement";
import { isReviewDay, planForWeek, practiceLetters, weekIndex } from "./schedule";
import { letterCard } from "./ladder";
import { blendingWords, pictureForLetter, scheduleLetters } from "./sheets";

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

const created = "2026-09-01T15:00:00.000Z";
const now = new Date("2026-09-26T15:00:00.000Z");

describe("lesson placement", () => {
  it("starts each stage on the lesson week after the previous stage", () => {
    expect(placeForStage("letters")).toEqual({ subject: "reading", stageId: "letters", weekIndex: 0 });
    expect(placeForStage("blending")).toEqual({ subject: "reading", stageId: "blending", weekIndex: 4 });
    expect(placeForStage("words")).toEqual({ subject: "reading", stageId: "words", weekIndex: 8 });
    expect(placeForStage("stories")).toEqual({ subject: "reading", stageId: "stories", weekIndex: 11 });
  });

  it("saves a class place and a per-child override", () => {
    const storage = memory();
    const start = loadPlacement(storage);
    expect(start.subjects.reading.classDefault).toBeNull();
    expect(start.classId).toBe(DEVICE_CLASS_ID);
    const placed = withChildPlace(
      withClassPlace({ ...start, origin: "server", classId: "class-room" }, placeForStage("blending"), now),
      "mia",
      placeForStage("words"),
      now,
    );
    savePlacement(placed, storage);
    const loaded = loadPlacement(storage);
    expect(loaded.origin).toBe("server");
    expect(loaded.classId).toBe("class-room");
    expect(loaded.subjects.reading.classDefault).toEqual({ subject: "reading", stageId: "blending", weekIndex: 4 });
    expect(loaded.subjects.reading.byChildId.mia).toEqual({ subject: "reading", stageId: "words", weekIndex: 8 });
    expect(storage.getItem(PLACEMENT_STORAGE_KEY)).toContain("class-room");

    const child = resolvePlacement(loaded, "mia", created, now, "UTC");
    expect(child.source).toBe("child");
    expect(child.stageId).toBe("words");
    expect(child.letters[0]).toBe("f");

    const classmate = resolvePlacement(withChildPlace(loaded, "mia", null, now), "leo", created, now, "UTC");
    expect(classmate.source).toBe("class");
    expect(classmate.letters[0]).toBe("o");

    const calendar = resolvePlacement(emptyPlacement(), "mia", created, now, "UTC");
    expect(calendar.source).toBe("calendar");
    expect(calendar.weekIndex).toBe(weekIndex(created, now, "UTC"));
    expect(calendar.letters).toEqual(practiceLetters(planForWeek(calendar.weekIndex), isReviewDay(now, "UTC")));
  });

  it("trusts the lesson week when a saved stage does not match", () => {
    const storage = memory();
    storage.setItem(
      PLACEMENT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        origin: "device",
        classId: DEVICE_CLASS_ID,
        updatedAt: now.toISOString(),
        classDefault: { stageId: "letters", weekIndex: 4 },
        byChildId: { mia: { stageId: "stories", weekIndex: 99 } },
      }),
    );
    const loaded = loadPlacement(storage);
    expect(loaded.subjects.reading.classDefault).toEqual({ subject: "reading", stageId: "blending", weekIndex: 4 });
    // Week 99 lands on the last week of the plan, which is a phonics week.
    expect(loaded.subjects.reading.byChildId.mia.stageId).toBe("phonics");
    expect(loaded.subjects.reading.byChildId.mia.weekIndex).toBe(25);
  });

  it("ignores a broken save", () => {
    const storage = memory();
    storage.setItem(PLACEMENT_STORAGE_KEY, "{");
    expect(loadPlacement(storage).subjects.reading.classDefault).toBeNull();
  });
});

describe("printable sheets", () => {
  it("has a picture word for every scheduled letter and a blending list", () => {
    for (const letter of scheduleLetters()) {
      const picture = pictureForLetter(letter);
      expect(picture.word.length).toBeGreaterThan(1);
      // The sheet shows the same drawing as the letter's card.
      expect(picture.illustration).toBe(letterCard(letter).illustration);
      expect(picture.word).toBe(letterCard(letter).word);
    }
    const blends = blendingWords(["c", "a", "t"], 3, ["c", "a", "t"]);
    expect(blends.map((word) => word.word)).toEqual(["cat", "at"]);
    expect(blendingWords(["c", "a", "t"]).every((word) => !word.letterCard && !word.sentenceId)).toBe(true);
    // With the letters a child has been taught, the sheet holds only words they can sound out.
    expect(blendingWords(["m", "a"], 3, ["m", "a"]).map((word) => word.word)).toEqual(["am"]);
  });
});
