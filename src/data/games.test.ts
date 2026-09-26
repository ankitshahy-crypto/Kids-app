import { describe, expect, it } from "vitest";
import { lettersIntroduced } from "./schedule";
import { isSubjectKey, readingSteps } from "./subject";
import {
  assignHatchLevel,
  feedRound,
  glowLetter,
  hatchRound,
  memoryRound,
  nextBaby,
  popRound,
  recordHatch,
  rhymeRound,
} from "./games";

const taught = lettersIntroduced(3);

describe("hatch rounds follow taught letters", () => {
  it("asks only for the first sound of a known letter", () => {
    const round = hatchRound(taught, 1);
    expect(round.word.word).toBe("dog");
    expect(round.blanks).toEqual([0]);
    expect(round.choices[0]).toBe("d");
    expect(glowLetter(round, [])).toBe("d");
    expect(glowLetter(round, [0])).toBeNull();
  });

  it("blanks taught letters in a short word and shows the rest", () => {
    const round = hatchRound(taught, 2);
    expect(round.word.word).toBe("cat");
    expect(round.blanks).toEqual([1, 2]);
    expect(round.choices.slice(0, 2)).toEqual(["a", "t"]);
  });

  it("uses a longer word once that level is reached", () => {
    const round = hatchRound(taught, 3);
    expect(round.word.word).toBe("apple");
    expect(round.blanks).toEqual([0, 1, 2]);
  });

  it("still builds a round when no letters are taught yet", () => {
    const round = hatchRound([], 1);
    expect(round.word.word.length).toBeGreaterThan(0);
    expect(round.blanks).toEqual([0]);
    expect(round.choices.length).toBeGreaterThan(1);
  });
});

describe("hatch level", () => {
  it("moves up after two eggs and never moves back", () => {
    const once = recordHatch({ hatch: 1, hatches: 0 });
    expect(once.advanced).toBe(false);
    expect(once.games).toEqual({ hatch: 1, hatches: 1 });
    const twice = recordHatch(once.games);
    expect(twice.advanced).toBe(true);
    expect(twice.games).toEqual({ hatch: 2, hatches: 0 });
    const stayed = recordHatch({ hatch: 1, hatches: 1 });
    expect(stayed.games.hatch).toBeGreaterThanOrEqual(1);
  });

  it("lets a teacher set the level", () => {
    expect(assignHatchLevel({ hatch: 1, hatches: 1 }, 3)).toEqual({ hatch: 3, hatches: 0 });
  });
});

describe("the other games", () => {
  it("pops balloons for the first taught sound", () => {
    const round = popRound(taught);
    expect(round.target).toBe("m");
    expect(round.balloons.filter((balloon) => balloon.target).length).toBe(3);
  });

  it("offers foods that start with a taught letter", () => {
    const round = feedRound(taught);
    expect(round.target).toBe("m");
    expect(round.foods.some((food) => food.label === "milk")).toBe(true);
    expect(round.foods.filter((food) => food.letter === "m").length).toBeGreaterThan(0);
  });

  it("matches rhymes that start with taught letters", () => {
    const cards = rhymeRound(taught, 0);
    const words = cards.map((card) => card.word).sort();
    expect(words).toEqual(["map", "pin", "tap", "tin"]);
    expect(new Set(cards.map((card) => card.pair)).size).toBe(2);
  });

  it("flips letter pairs or a number with its dots", () => {
    const letters = memoryRound(taught, "letters", 0);
    expect(letters).toHaveLength(6);
    expect(letters.filter((card) => card.face === "upper").map((card) => card.value)).toEqual(
      expect.arrayContaining(["M", "A", "S"]),
    );
    const numbers = memoryRound(taught, "numbers", 0);
    expect(numbers.filter((card) => card.face === "dots")).toHaveLength(3);
    expect(numbers.filter((card) => card.face === "numeral")).toHaveLength(3);
  });

  it("keeps game stars off the daily lesson", () => {
    for (const id of ["game-hatch", "game-pop", "game-feed", "game-rhyme", "game-memory"]) {
      expect(isSubjectKey(id)).toBe(true);
      expect((readingSteps as readonly string[]).includes(id)).toBe(false);
    }
  });

  it("picks the next baby animal that is not in the sticker book", () => {
    expect(nextBaby([])).toBe("kitten");
    expect(nextBaby(["kitten", "puppy"])).toBe("fawn");
  });
});
