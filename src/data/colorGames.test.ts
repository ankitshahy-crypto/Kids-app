import { describe, expect, it } from "vitest";
import manifest from "./audioManifest.json";
import { colorLine, colorManifestEntries, MIXES, mixLineId, mixResult, mixRounds, mixTable, nameRounds, paintPots, wantLineId } from "./colorGames";
import { colorAudioId, colorFill, colorIds, colorLessonForWeek, colorWeekCount } from "./colors";

const salts = Array.from({ length: 40 }, (_, index) => index * 37 + 1);
const weeks = Array.from({ length: colorWeekCount() }, (_, index) => index);
const levels = ["early", "later"] as const;

describe("color names", () => {
  it("start with this week's color and never ask for one twice", () => {
    for (const week of weeks) {
      const lesson = colorLessonForWeek(week);
      for (const level of levels) {
        for (const salt of salts) {
          const rounds = nameRounds(lesson, level, salt);
          expect(rounds).toHaveLength(level === "later" ? 5 : 4);
          expect(rounds[0].hear).toBe(lesson.hear);
          expect(new Set(rounds.map((round) => round.hear)).size).toBe(rounds.length);
          for (const round of rounds) {
            expect(round.choices).toHaveLength(level === "later" ? 4 : 3);
            expect(round.choices).toContain(round.hear);
            expect(new Set(round.choices).size).toBe(round.choices.length);
            for (const choice of round.choices) expect(colorIds).toContain(choice);
          }
        }
      }
    }
  });

  it("moves the answer about", () => {
    const lesson = colorLessonForWeek(0);
    const places = new Set(salts.map((salt) => nameRounds(lesson, "early", salt)[0].choices.indexOf(lesson.hear)));
    expect(places.size).toBe(3);
  });
});

describe("mixing", () => {
  it("names the two paints that make each color, and they do make it", () => {
    for (const [result, [first, second]] of Object.entries(MIXES)) {
      expect(mixResult(first, second)).toBe(result);
      expect(mixResult(second, first)).toBe(result);
      expect(colorFill(result), result).toBeTruthy();
    }
  });

  it("makes nothing of a paint with itself", () => {
    expect(mixResult("red", "red")).toBeNull();
  });

  it("gives ages 3 and 4 three paints, enough for three different colors", () => {
    const table = mixTable("early");
    expect(table).toEqual(["red", "yellow", "blue"]);
    const makes = new Set<string>();
    for (const first of table) for (const second of table) if (first !== second) makes.add(mixResult(first, second) ?? "");
    expect(makes).toEqual(new Set(["orange", "green", "purple"]));
    expect(mixRounds("early", 1)).toEqual([{ kind: "find" }, { kind: "find" }, { kind: "find" }]);
  });

  it("gives ages 5 to 7 white too, then asks for two different colors by name", () => {
    expect(mixTable("later")).toContain("white");
    for (const salt of salts) {
      const rounds = mixRounds("later", salt);
      expect(rounds.map((round) => round.kind)).toEqual(["find", "find", "find", "make", "make"]);
      const wants = rounds.flatMap((round) => (round.kind === "make" ? [round.want] : []));
      expect(new Set(wants).size).toBe(2);
      // A color asked for can be made from the paints on the table.
      for (const want of wants) expect(MIXES[want].every((paint) => mixTable("later").includes(paint))).toBe(true);
    }
  });
});

describe("painting", () => {
  it("always has three paints, mixed or not", () => {
    expect(paintPots([])).toEqual(["red", "yellow", "blue"]);
  });

  it("offers the colors the child has mixed, newest first, and no color twice", () => {
    expect(paintPots(["orange"])).toEqual(["orange", "red", "yellow"]);
    expect(paintPots(["orange", "green", "orange"])).toEqual(["orange", "green", "red"]);
    expect(paintPots(["orange", "green", "purple", "light red", "light blue"])).toEqual(["light blue", "light red", "purple", "green"]);
  });

  it("can paint with every pot it offers", () => {
    for (const color of paintPots(["orange", "light red"])) expect(colorFill(color), color).toBeTruthy();
  });
});

describe("what the Colors games say", () => {
  const prompts = manifest.prompts as Record<string, { say: string }>;
  const colors = manifest.colors as Record<string, { say: string }>;

  it("has every line in the clip list, with the same words", () => {
    for (const entry of colorManifestEntries()) {
      expect(prompts[entry.id]?.say, entry.id).toBe(entry.say);
      expect(colorLine(entry.id)).toBe(entry.say);
    }
  });

  it("says each mix as one sentence, and asks for a color by name", () => {
    expect(colorLine(mixLineId("orange"))).toBe("Red and yellow make orange.");
    expect(colorLine(mixLineId("light red"))).toBe("Red and white make light red.");
    expect(colorLine(wantLineId("green"))).toBe("Make green. Which two paints?");
  });

  it("has a recorded name for every color that can be heard, mixed or painted with", () => {
    for (const color of [...colorIds, ...Object.keys(MIXES)]) expect(colors[colorAudioId(color)], color).toBeTruthy();
    expect(prompts.name, "name").toBeTruthy();
  });
});
