import { describe, expect, it } from "vitest";
import { answersIn, buildCheck, emptyTally, needsGrownupConfirm, partSettled, placeFromCheck, pictureFor, type CheckTally } from "./startCheck";

function tally(sound: [number, number], word: [number, number], long: [number, number]): CheckTally {
  return { sound: { right: sound[0], asked: sound[1] }, word: { right: word[0], asked: word[1] }, long: { right: long[0], asked: long[1] } };
}

describe("where to start check", () => {
  it("builds the same short check for the same seed, with the answer among three choices", () => {
    const rounds = buildCheck("mia:Sun Sep 27 2026");
    expect(rounds.map((round) => round.part)).toEqual(["sound", "sound", "sound", "sound", "word", "word", "word", "word", "long", "long"]);
    // Four different letters and four different words are asked, so one lucky tap cannot pass a part.
    expect(new Set(rounds.filter((round) => round.part === "sound").map((round) => round.answer)).size).toBe(4);
    expect(new Set(rounds.filter((round) => round.part === "word").map((round) => round.answer)).size).toBe(4);
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
    // Two right out of four is not yet known: a part needs three.
    expect(partSettled(tally([2, 2], [0, 0], [0, 0]), "sound")).toBeNull();
    expect(partSettled(tally([2, 3], [0, 0], [0, 0]), "sound")).toBeNull();
    expect(partSettled(tally([3, 3], [0, 0], [0, 0]), "sound")).toBe("pass");
    expect(partSettled(tally([3, 4], [0, 0], [0, 0]), "sound")).toBe("pass");
    // Two misses end the part: three right is out of reach.
    expect(partSettled(tally([0, 2], [0, 0], [0, 0]), "sound")).toBe("stop");
    expect(partSettled(tally([1, 3], [0, 0], [0, 0]), "sound")).toBe("stop");
    expect(partSettled(tally([2, 4], [0, 0], [0, 0]), "sound")).toBe("stop");
    expect(partSettled(tally([0, 0], [2, 2], [0, 0]), "word")).toBeNull();
    expect(partSettled(tally([0, 0], [3, 3], [0, 0]), "word")).toBe("pass");
    expect(partSettled(tally([0, 0], [2, 4], [0, 0]), "word")).toBe("stop");
    expect(partSettled(tally([0, 0], [0, 0], [1, 1]), "long")).toBe("pass");
    expect(partSettled(tally([0, 0], [0, 0], [0, 1]), "long")).toBeNull();
    expect(partSettled(tally([0, 0], [0, 0], [0, 2]), "long")).toBe("stop");
  });

  it("suggests a start that grows with each part passed", () => {
    expect(placeFromCheck(tally([0, 2], [0, 0], [0, 0]))).toMatchObject({ place: { weekIndex: 0 }, ladderStep: 1, cheerId: "check-great" });
    expect(placeFromCheck(tally([3, 3], [2, 4], [0, 0]))).toMatchObject({ place: { weekIndex: 1 }, ladderStep: 2, cheerId: "check-sounds" });
    expect(placeFromCheck(tally([3, 4], [3, 3], [0, 2]))).toMatchObject({ place: { weekIndex: 4 }, ladderStep: 3, cheerId: "check-words" });
    const top = placeFromCheck(tally([3, 3], [3, 3], [1, 1]));
    expect(top).toMatchObject({ place: { subject: "reading", weekIndex: 8 }, ladderStep: 4, cheerId: "check-read" });
    expect(top.summary).toBe("Week 9 · review e, i and u · Four letters");
    expect(top.cheer).toMatch(/read/);
    // Two lucky taps no longer pass the sounds.
    expect(placeFromCheck(tally([2, 2], [2, 2], [1, 1]))).toMatchObject({ place: { weekIndex: 0 }, ladderStep: 1 });
  });

  it("counts the answers behind a suggestion and asks a grown-up to confirm a start past week 3", () => {
    expect(answersIn(tally([3, 4], [3, 3], [1, 1]))).toBe(8);
    expect(needsGrownupConfirm(placeFromCheck(tally([0, 2], [0, 0], [0, 0])))).toBe(false);
    expect(needsGrownupConfirm(placeFromCheck(tally([3, 3], [1, 3], [0, 0])))).toBe(false);
    expect(needsGrownupConfirm(placeFromCheck(tally([3, 3], [3, 3], [0, 2])))).toBe(true);
    expect(needsGrownupConfirm(placeFromCheck(tally([3, 3], [3, 3], [1, 1])))).toBe(true);
  });
});
