import { describe, expect, it } from "vitest";
import manifest from "./audioManifest.json";
import { lessonForWeek, mathWeekCount, shapeIds } from "./math";
import {
  ADD_PAIRS,
  addLineId,
  addRounds,
  COUNT_THINGS,
  countRounds,
  knowRounds,
  moreAnswer,
  moreRounds,
  numberLine,
  numberManifestEntries,
  numberWords,
  numeralChoices,
  shapeRounds,
  tenFrame,
} from "./numberGames";

const salts = Array.from({ length: 40 }, (_, index) => index * 37 + 1);
const weeks = Array.from({ length: mathWeekCount() }, (_, index) => index);
const levels = ["early", "later"] as const;

describe("numeral choices", () => {
  it("are three numbers in counting order with the answer among them, none repeated, none out of range", () => {
    for (const salt of salts) {
      for (let answer = 1; answer <= 10; answer += 1) {
        const choices = numeralChoices(answer, 1, 10, salt);
        expect(choices).toHaveLength(3);
        expect(choices).toContain(answer);
        expect(new Set(choices).size).toBe(3);
        expect([...choices].sort((a, b) => a - b)).toEqual(choices);
        expect(Math.min(...choices)).toBeGreaterThanOrEqual(1);
        expect(Math.max(...choices)).toBeLessThanOrEqual(10);
      }
    }
  });

  it("do not always put the answer in the same place", () => {
    const places = new Set(salts.map((salt) => numeralChoices(5, 1, 10, salt).indexOf(5)));
    expect(places.size).toBe(3);
  });
});

describe("count", () => {
  it("starts with this week's number, then other numbers, none twice, each a different thing", () => {
    for (const week of weeks) {
      const lesson = lessonForWeek(week);
      for (const level of levels) {
        for (const salt of salts) {
          const rounds = countRounds(lesson, level, salt);
          expect(rounds).toHaveLength(level === "later" ? 4 : 3);
          expect(rounds[0].count).toBe(lesson.count);
          expect(new Set(rounds.map((round) => round.count)).size).toBe(rounds.length);
          expect(new Set(rounds.map((round) => round.thing)).size).toBe(rounds.length);
          for (const round of rounds) {
            expect(round.count).toBeGreaterThanOrEqual(1);
            expect(round.count).toBeLessThanOrEqual(10);
            expect(round.choices).toContain(round.count);
          }
        }
      }
    }
  });

  it("differs from play to play", () => {
    const lesson = lessonForWeek(0);
    const plays = new Set(salts.map((salt) => JSON.stringify(countRounds(lesson, "early", salt))));
    expect(plays.size).toBeGreaterThan(10);
  });
});

describe("numbers to hear", () => {
  it("start with this week's number and never ask for one twice", () => {
    for (const week of weeks) {
      const lesson = lessonForWeek(week);
      for (const level of levels) {
        for (const salt of salts) {
          const rounds = knowRounds(lesson, level, salt);
          expect(rounds).toHaveLength(level === "later" ? 5 : 4);
          expect(rounds[0].hear).toBe(lesson.hear);
          expect(new Set(rounds.map((round) => round.hear)).size).toBe(rounds.length);
          for (const round of rounds) {
            expect(round.choices).toHaveLength(level === "later" ? 4 : 3);
            expect(round.choices).toContain(round.hear);
            expect(new Set(round.choices).size).toBe(round.choices.length);
          }
        }
      }
    }
  });

  it("show a number as dots, five to a row", () => {
    expect(tenFrame(0)).toEqual([]);
    expect(tenFrame(7)).toHaveLength(7);
    expect(tenFrame(7)[4]).toEqual({ row: 0, column: 4 });
    expect(tenFrame(7)[5]).toEqual({ row: 1, column: 0 });
  });
});

describe("shapes", () => {
  it("start with this week's shape; the three blocks are different shapes in different colors", () => {
    for (const week of weeks) {
      const lesson = lessonForWeek(week);
      for (const level of levels) {
        for (const salt of salts) {
          const rounds = shapeRounds(lesson, level, salt);
          expect(rounds).toHaveLength(level === "later" ? 4 : 3);
          expect(rounds[0].shape).toBe(lesson.shape);
          expect(new Set(rounds.map((round) => round.shape)).size).toBe(rounds.length);
          for (const round of rounds) {
            expect(round.choices).toHaveLength(3);
            expect(round.choices.map((choice) => choice.shape)).toContain(round.shape);
            expect(new Set(round.choices.map((choice) => choice.shape)).size).toBe(3);
            expect(new Set(round.choices.map((choice) => choice.tint)).size).toBe(3);
            for (const choice of round.choices) expect(shapeIds).toContain(choice.shape);
          }
        }
      }
    }
  });

  it("give a shape different colors on different plays, so it is matched by shape", () => {
    const lesson = lessonForWeek(0);
    const tints = new Set(salts.map((salt) => shapeRounds(lesson, "early", salt)[0].choices.find((choice) => choice.shape === lesson.shape)?.tint));
    expect(tints.size).toBeGreaterThan(2);
  });
});

describe("more and fewer", () => {
  it("start with this week's pair; groups are never the same size", () => {
    for (const week of weeks) {
      const lesson = lessonForWeek(week);
      for (const level of levels) {
        for (const salt of salts) {
          const rounds = moreRounds(lesson, level, salt);
          expect(rounds).toHaveLength(level === "later" ? 4 : 3);
          expect(rounds[0]).toMatchObject({ ask: "more", left: lesson.moreLeft, right: lesson.moreRight });
          for (const round of rounds.slice(1)) {
            expect(round.left).not.toBe(round.right);
            expect(Math.min(round.left, round.right)).toBeGreaterThanOrEqual(1);
            expect(Math.max(round.left, round.right)).toBeLessThanOrEqual(level === "later" ? 9 : 6);
            // Ages 3 and 4 compare groups that are plainly different.
            if (level === "early") expect(Math.abs(round.left - round.right)).toBeGreaterThanOrEqual(2);
          }
        }
      }
    }
  });

  it("asks only for more at ages 3 and 4, and for fewer too at ages 5 to 7", () => {
    const lesson = lessonForWeek(0);
    for (const salt of salts) {
      expect(moreRounds(lesson, "early", salt).every((round) => round.ask === "more")).toBe(true);
      expect(moreRounds(lesson, "later", salt).map((round) => round.ask)).toEqual(["more", "fewer", "more", "fewer"]);
    }
  });

  it("knows which side is the answer", () => {
    expect(moreAnswer({ ask: "more", left: 5, right: 2 })).toBe("left");
    expect(moreAnswer({ ask: "more", left: 2, right: 5 })).toBe("right");
    expect(moreAnswer({ ask: "fewer", left: 5, right: 2 })).toBe("right");
    expect(moreAnswer({ ask: "fewer", left: 2, right: 5 })).toBe("left");
  });

  it("puts the bigger group on each side", () => {
    const lesson = lessonForWeek(0);
    const sides = new Set(salts.flatMap((salt) => moreRounds(lesson, "early", salt).slice(1).map((round) => (round.left > round.right ? "left" : "right"))));
    expect(sides).toEqual(new Set(["left", "right"]));
  });
});

describe("adding", () => {
  it("starts with this week's sum, stays within five, and never repeats a pair", () => {
    for (const week of weeks) {
      const lesson = lessonForWeek(week);
      for (const level of levels) {
        for (const salt of salts) {
          const rounds = addRounds(lesson, level, salt);
          expect(rounds).toHaveLength(level === "later" ? 4 : 3);
          expect(rounds[0]).toMatchObject({ left: lesson.addLeft, right: lesson.addRight });
          expect(new Set(rounds.map((round) => `${round.left}+${round.right}`)).size).toBe(rounds.length);
          for (const round of rounds) {
            expect(round.sum).toBe(round.left + round.right);
            expect(round.sum).toBeLessThanOrEqual(5);
            expect(round.choices).toContain(round.sum);
            expect(round.choices).toHaveLength(3);
          }
        }
      }
    }
  });

  it("covers every pair a week can ask for", () => {
    for (const week of weeks) {
      const lesson = lessonForWeek(week);
      expect(ADD_PAIRS.some(([left, right]) => left === lesson.addLeft && right === lesson.addRight)).toBe(true);
    }
  });

  it("says a sum as one sentence", () => {
    expect(numberLine(addLineId(2, 1))).toBe("Two and one make three.");
    expect(numberLine(addLineId(1, 4))).toBe("One and four make five.");
  });
});

describe("what the Numbers games say", () => {
  const prompts = manifest.prompts as Record<string, { say: string }>;
  const words = manifest.words as Record<string, { say: string }>;

  it("has every line in the clip list, with the same words", () => {
    for (const entry of numberManifestEntries()) {
      expect(prompts[entry.id]?.say, entry.id).toBe(entry.say);
      expect(numberLine(entry.id)).toBe(entry.say);
    }
  });

  it("has a recorded word for each thing to count", () => {
    expect(numberWords()).toEqual([...COUNT_THINGS]);
    for (const word of numberWords()) expect(words[word], word).toBeTruthy();
  });

  it("has the lines the games already had", () => {
    for (const id of ["know", "shape", "more", "add", ...shapeIds]) expect(prompts[id], id).toBeTruthy();
  });
});
