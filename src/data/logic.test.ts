import { describe, expect, it } from "vitest";
import manifest from "./audioManifest.json";
import { readingSteps, isSubjectKey } from "./subject";
import {
  birdRounds,
  gardenRounds,
  logicLevel,
  logicManifestEntries,
  morningDeal,
  morningFits,
  morningOrder,
  patternRounds,
  patternSequence,
  program,
  reachesNest,
  walk,
} from "./logic";

describe("think and code levels", () => {
  it("keeps ages 3 and 4 on short puzzles and ages 5 to 7 on the longer set", () => {
    expect(logicLevel("3")).toBe("early");
    expect(logicLevel("4")).toBe("early");
    expect(logicLevel("5")).toBe("later");
    expect(logicLevel("6-7")).toBe("later");
  });
});

describe("guide the bird home", () => {
  it("starts with one or two taps, then a plan of four or five arrows", () => {
    const rounds = birdRounds("early");
    expect(rounds.map((round) => round.mode)).toEqual(["tap", "plan"]);
    expect(rounds[0].path.length).toBeGreaterThanOrEqual(1);
    expect(rounds[0].path.length).toBeLessThanOrEqual(2);
    expect(rounds[1].path.length).toBeGreaterThanOrEqual(4);
    expect(rounds[1].path.length).toBeLessThanOrEqual(5);
    for (const round of rounds) expect(reachesNest(round, round.path)).toBe(true);
  });

  it("gives ages 5 to 7 a longer plan, a repeat of three, and one wrong arrow", () => {
    const rounds = birdRounds("later");
    expect(rounds.map((round) => round.mode)).toEqual(["plan", "loop", "bug"]);
    expect(rounds[0].path.length).toBeGreaterThanOrEqual(6);
    expect(reachesNest(rounds[0], rounds[0].path)).toBe(true);
    const loop = program(rounds[1], rounds[1].path, false);
    expect(loop).toEqual(["right", "right", "right"]);
    expect(reachesNest(rounds[1], loop)).toBe(true);
    const bug = rounds[2];
    expect(bug.bugIndex).not.toBeNull();
    const wrong = program(bug, [], false);
    const fixed = program(bug, [], true);
    expect(wrong).not.toEqual(fixed);
    expect(wrong.filter((dir, index) => dir !== fixed[index])).toHaveLength(1);
    expect(reachesNest(bug, wrong)).toBe(false);
    expect(reachesNest(bug, fixed)).toBe(true);
  });

  it("stops a walk that would leave the grid", () => {
    const result = walk({ x: 0, y: 0 }, ["left"], 3, 3);
    expect(result.blocked).toBe(true);
    expect(result.end).toEqual({ x: 0, y: 0 });
  });
});

describe("patterns, morning order, and if-then", () => {
  it("continues AB, then ABB, then ABC", () => {
    expect(patternSequence("AB", ["red", "blue"], 4)).toEqual({
      shown: ["red", "blue", "red", "blue"],
      answer: "red",
    });
    expect(patternSequence("ABB", ["circle", "square"], 5)).toEqual({
      shown: ["circle", "square", "square", "circle", "square"],
      answer: "square",
    });
    expect(patternSequence("ABC", ["fox", "bird", "nest"], 5)).toEqual({
      shown: ["fox", "bird", "nest", "fox", "bird"],
      answer: "nest",
    });
    const rounds = patternRounds();
    expect(rounds.map((round) => round.rule)).toEqual(["AB", "ABB", "ABC"]);
    expect(rounds.map((round) => round.kind)).toEqual(["color", "shape", "animal"]);
  });

  it("deals morning pictures out of order and accepts only the next one", () => {
    const early = morningOrder("early").map((card) => card.id);
    const later = morningOrder("later").map((card) => card.id);
    expect(early).toEqual(["wake", "brush", "eat"]);
    expect(later).toEqual(["wake", "brush", "eat", "school"]);
    expect(morningDeal("early")).not.toEqual(early);
    expect([...morningDeal("early")].sort()).toEqual([...early].sort());
    expect(morningFits(early, [], "eat", 0)).toBe(false);
    expect(morningFits(early, [], "wake", 0)).toBe(true);
    expect(morningFits(early, ["wake"], "brush", 1)).toBe(true);
    expect(morningFits(early, ["wake"], "eat", 1)).toBe(false);
  });

  it("grows a flower in the rain and melts ice in the sun", () => {
    const rounds = gardenRounds();
    expect(rounds[0]).toMatchObject({ cause: "rain", effect: "flower" });
    expect(rounds[1]).toMatchObject({ cause: "sun", effect: "melt" });
    expect(rounds[0].other).not.toBe(rounds[0].cause);
  });
});

describe("think and code stays a game", () => {
  it("can earn a star without finishing the reading lesson", () => {
    for (const id of ["game-bird", "game-pattern", "game-morning", "game-garden"]) {
      expect(isSubjectKey(id)).toBe(true);
      expect((readingSteps as readonly string[]).includes(id)).toBe(false);
    }
  });

  it("lists spoken lines for a natural voice later", () => {
    const prompts = manifest.prompts as Record<string, { say: string; source: string; file: string }>;
    for (const entry of logicManifestEntries()) {
      expect(prompts[entry.id]?.say).toBe(entry.say);
      expect(prompts[entry.id]?.source).toBe("neural");
      expect(prompts[entry.id]?.file).toBe(`prompts/${entry.id}.mp3`);
    }
  });
});
