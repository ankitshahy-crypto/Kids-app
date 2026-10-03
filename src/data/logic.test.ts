import { describe, expect, it } from "vitest";
import manifest from "./audioManifest.json";
import { readingSteps, isSubjectKey } from "./subject";
import {
  birdRounds,
  logicLevel,
  logicManifestEntries,
  logicPictures,
  logicWords,
  orderFits,
  orderRounds,
  patternRounds,
  patternSequence,
  program,
  reachesNest,
  ruleRounds,
  trail,
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
  it("starts with taps, then a turn, then a plan of four or five arrows", () => {
    const rounds = birdRounds("early");
    expect(rounds.map((round) => round.mode)).toEqual(["tap", "tap", "plan"]);
    expect(rounds[0].path.length).toBeLessThanOrEqual(2);
    expect(new Set(rounds[1].path).size).toBe(2);
    expect(rounds[2].path.length).toBeGreaterThanOrEqual(4);
    expect(rounds[2].path.length).toBeLessThanOrEqual(5);
    for (const round of rounds) expect(reachesNest(round, round.path)).toBe(true);
  });

  it("turns the boards from one play to the next, and every turned board can still be solved", () => {
    const corners = new Set<string>();
    for (let salt = 0; salt < 24; salt += 1) {
      for (const level of ["early", "later"] as const) {
        for (const round of birdRounds(level, salt)) {
          const dirs = round.mode === "loop" ? program(round, round.path, false) : round.path;
          expect(reachesNest(round, dirs), `${round.id} salt ${salt}`).toBe(true);
          if (round.mode === "bug") {
            expect(reachesNest(round, program(round, [], false))).toBe(false);
            expect(reachesNest(round, program(round, [], true))).toBe(true);
          }
        }
      }
      const first = birdRounds("early", salt)[2];
      corners.add(`${first.nest.x},${first.nest.y}`);
    }
    // The nest is not in the same corner every time.
    expect(corners.size).toBeGreaterThanOrEqual(3);
    expect(trail({ x: 0, y: 0 }, ["right", "right", "up"], 3, 3)).toEqual([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }]);
  });

  it("gives ages 5 to 7 a longer plan, a repeat of three, and one wrong arrow", () => {
    const rounds = birdRounds("later");
    expect(rounds.map((round) => round.mode)).toEqual(["plan", "loop", "bug"]);
    expect(rounds[0].path.length).toBeGreaterThanOrEqual(6);
    expect(reachesNest(rounds[0], rounds[0].path)).toBe(true);
    const loop = program(rounds[1], rounds[1].path, false);
    expect(loop).toEqual(["right", "right", "right"]);
    expect(rounds[1].repeat).toBe(3);
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

describe("patterns, order, and if-then", () => {
  it("continues AB, then ABB, then ABC, with pictures the app has", () => {
    expect(patternSequence("AB", ["red", "blue"], 4)).toEqual({ shown: ["red", "blue", "red", "blue"], answer: "red" });
    expect(patternSequence("ABB", ["circle", "square"], 5)).toEqual({
      shown: ["circle", "square", "square", "circle", "square"],
      answer: "square",
    });
    expect(patternSequence("ABC", ["fox", "bird", "nest"], 5)).toEqual({ shown: ["fox", "bird", "nest", "fox", "bird"], answer: "nest" });
    const firsts = new Set<string>();
    for (let salt = 0; salt < 20; salt += 1) {
      const rounds = patternRounds(salt);
      expect(rounds.map((round) => round.rule)).toEqual(["AB", "ABB", "ABC"]);
      for (const round of rounds) {
        // The answer is one of the choices, each choice is offered once, and every choice is a drawing.
        expect(round.choices).toContain(round.answer);
        expect(new Set(round.choices).size).toBe(round.choices.length);
        expect(round.choices).toHaveLength(3);
      }
      // Three rounds, three different sets of pictures.
      expect(new Set(rounds.map((round) => [...round.choices].sort().join())).size).toBe(3);
      firsts.add(rounds[0].shown[0]);
    }
    expect(firsts.size).toBeGreaterThan(3);
  });

  it("deals pictures out of order, and accepts only the next one", () => {
    const sets = new Set<string>();
    for (let salt = 0; salt < 20; salt += 1) {
      expect(orderRounds("early", salt)).toHaveLength(2);
      expect(orderRounds("later", salt)).toHaveLength(3);
      for (const round of orderRounds("later", salt)) {
        const order = round.cards.map((card) => card.art);
        expect([...round.deal].sort()).toEqual([...order].sort());
        expect(round.deal).not.toEqual(order);
        sets.add(round.id);
      }
    }
    expect(sets.size).toBe(5);
    const order = ["egg", "chick", "hen"];
    expect(orderFits(order, [], "hen", 0)).toBe(false);
    expect(orderFits(order, [], "egg", 0)).toBe(true);
    expect(orderFits(order, ["egg"], "chick", 1)).toBe(true);
    expect(orderFits(order, ["egg"], "chick", 2)).toBe(false);
    expect(orderFits(order, ["egg"], "hen", 1)).toBe(false);
  });

  it("offers the thing a rule calls for among two things other rules call for", () => {
    for (let salt = 0; salt < 20; salt += 1) {
      expect(ruleRounds("early", salt)).toHaveLength(3);
      const rounds = ruleRounds("later", salt);
      expect(rounds).toHaveLength(4);
      expect(new Set(rounds.map((round) => round.id)).size).toBe(4);
      for (const round of rounds) {
        const arts = round.choices.map((choice) => choice.art);
        expect(arts).toHaveLength(3);
        expect(new Set(arts).size).toBe(3);
        expect(arts).toContain(round.need.art);
        // The picture that sets the scene is never one of the answers.
        expect(arts).not.toContain(round.when.art);
      }
    }
  });

  it("names its pictures: a tapped picture is a word the app can say", () => {
    // That each picture is a drawing the app has is checked by the compiler (IllustrationName).
    expect(logicPictures().length).toBeGreaterThan(20);
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
    // A tapped picture says its name from a recorded clip, never the phone's own voice.
    const words = manifest.words as Record<string, { say: string }>;
    for (const word of logicWords()) expect(words[word], word).toBeTruthy();
  });
});
