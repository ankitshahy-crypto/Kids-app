import { describe, expect, it } from "vitest";
import { buildCheck, emptyTally, partSettled, placeFromCheck, pictureFor, type CheckTally } from "./startCheck";

function tally(sound: [number, number], word: [number, number], long: [number, number]): CheckTally {
  return { sound: { right: sound[0], asked: sound[1] }, word: { right: word[0], asked: word[1] }, long: { right: long[0], asked: long[1] } };
}

describe("where to start check", () => {
  it("builds the same short check for the same seed, with the answer among three choices", () => {
    const rounds = buildCheck("mia:Sun Sep 27 2026");
    expect(rounds.map((round) => round.part)).toEqual(["sound", "sound", "sound", "word", "word", "word", "long", "long"]);
    for (const round of rounds) {
      expect(round.choices.length).toBe(3);
      expect(round.choices).toContain(round.answer);
      expect(new Set(round.choices).size).toBe(3);
      if (round.part !== "sound") expect(pictureFor(round.answer)).not.toBe("apple");
    }
    expect(buildCheck("mia:Sun Sep 27 2026")).toEqual(rounds);
    expect(buildCheck("sam:Sun Sep 27 2026")).not.toEqual(rounds);
  });

  it("settles a part as soon as it is clearly known or clearly too hard", () => {
    expect(partSettled(emptyTally(), "sound")).toBeNull();
    expect(partSettled(tally([1, 2], [0, 0], [0, 0]), "sound")).toBeNull();
    expect(partSettled(tally([2, 2], [0, 0], [0, 0]), "sound")).toBe("pass");
    expect(partSettled(tally([0, 2], [0, 0], [0, 0]), "sound")).toBe("stop");
    expect(partSettled(tally([1, 3], [0, 0], [0, 0]), "sound")).toBe("stop");
    expect(partSettled(tally([0, 0], [0, 0], [1, 1]), "long")).toBe("pass");
    expect(partSettled(tally([0, 0], [0, 0], [0, 1]), "long")).toBeNull();
    expect(partSettled(tally([0, 0], [0, 0], [0, 2]), "long")).toBe("stop");
  });

  it("suggests a start that grows with each part passed", () => {
    expect(placeFromCheck(tally([0, 2], [0, 0], [0, 0]))).toMatchObject({ place: { weekIndex: 0 }, ladderStep: 1 });
    expect(placeFromCheck(tally([2, 2], [1, 3], [0, 0]))).toMatchObject({ place: { weekIndex: 2 }, ladderStep: 2 });
    expect(placeFromCheck(tally([3, 3], [2, 2], [0, 2]))).toMatchObject({ place: { weekIndex: 6 }, ladderStep: 3 });
    const top = placeFromCheck(tally([2, 2], [2, 2], [1, 1]));
    expect(top).toMatchObject({ place: { subject: "reading", weekIndex: 9 }, ladderStep: 4 });
    expect(top.summary).toBe("Week 10 · letter k · Four letters");
    expect(top.cheer).toMatch(/read/);
  });
});
