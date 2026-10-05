import { describe, expect, it } from "vitest";
import manifest from "./audioManifest.json";
import { readingSteps, isSubjectKey } from "./subject";
import {
  birdRounds,
  boardFamily,
  boardLibrary,
  checkPlan,
  logicLevel,
  nextStepHome,
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

/** A path's turns: one fewer than its runs of one direction. */
function turns(path: string[]): number {
  return path.filter((dir, index) => index > 0 && dir !== path[index - 1]).length;
}

describe("guide the bird home", () => {
  it("has a library of boards, not five: dozens a level, every one solved by its own path", () => {
    for (const level of ["early", "later"] as const) {
      const boards = boardLibrary(level);
      expect(boards.length, level).toBeGreaterThanOrEqual(12);
      expect(new Set(boards.map((board) => board.id)).size).toBe(boards.length);
      for (const board of boards) {
        expect(reachesNest(board, board.path), board.id).toBe(true);
        // A board's own path is a shortest way home, never a detour.
        expect(checkPlan(board, board.path), board.id).toEqual({ ok: true });
        expect(board.width, board.id).toBeLessThanOrEqual(4);
      }
    }
    // Ages 3–4: two or three steps, straight or one turn. Ages 5–7: four to six, one or two turns.
    for (const board of boardLibrary("early")) {
      expect(board.path.length).toBeGreaterThanOrEqual(2);
      expect(board.path.length).toBeLessThanOrEqual(3);
      expect(turns(board.path)).toBeLessThanOrEqual(1);
    }
    for (const board of boardLibrary("later")) {
      expect(board.path.length).toBeGreaterThanOrEqual(4);
      expect(board.path.length).toBeLessThanOrEqual(6);
      expect(turns(board.path)).toBeGreaterThanOrEqual(1);
      expect(turns(board.path)).toBeLessThanOrEqual(2);
    }
  });

  it("starts ages 3 and 4 with two taps, straight then with a turn, and then two plans", () => {
    const rounds = birdRounds("early");
    expect(rounds.map((round) => round.mode)).toEqual(["tap", "tap", "plan", "plan"]);
    expect(rounds[0].path.length).toBe(2);
    expect(new Set(rounds[0].path).size).toBe(1);
    expect(rounds[1].path.length).toBe(3);
    expect(new Set(rounds[1].path).size).toBe(2);
    expect(rounds[2].path.length).toBe(2);
    expect(rounds[3].path.length).toBe(3);
    for (const round of rounds) expect(reachesNest(round, round.path)).toBe(true);
  });

  it("picks different boards from one play to the next, and every one can be solved", () => {
    const corners = new Set<string>();
    const plays = new Set<string>();
    for (let salt = 0; salt < 24; salt += 1) {
      for (const level of ["early", "later"] as const) {
        const rounds = birdRounds(level, salt);
        plays.add(`${level}:${rounds.map((round) => `${round.start.x}${round.start.y}${round.path.join("")}`).join("|")}`);
        for (const round of rounds) {
          const dirs = round.mode === "loop" ? program(round, round.path, false) : round.path;
          expect(reachesNest(round, dirs), `${round.id} salt ${salt}`).toBe(true);
          if (round.mode === "bug") {
            expect(reachesNest(round, program(round, [], false))).toBe(false);
            expect(reachesNest(round, program(round, [], true))).toBe(true);
          }
        }
        // No two boards of one play are the same board, turned or not.
        const families = rounds.filter((round) => round.mode !== "loop").map((round) => boardFamily(round));
        expect(new Set(families).size).toBe(families.length);
      }
      const first = birdRounds("early", salt)[2];
      corners.add(`${first.nest.x},${first.nest.y}`);
    }
    // 48 plays, no two alike; and the nest is not in the same corner every time.
    expect(plays.size).toBe(48);
    expect(corners.size).toBeGreaterThanOrEqual(3);
    expect(trail({ x: 0, y: 0 }, ["right", "right", "up"], 3, 3)).toEqual([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }]);
  });

  it("gives ages 5 to 7 three plans that grow, a repeat of three, and one wrong arrow", () => {
    const rounds = birdRounds("later");
    expect(rounds.map((round) => round.mode)).toEqual(["plan", "plan", "plan", "loop", "bug"]);
    expect(rounds.slice(0, 3).map((round) => round.path.length)).toEqual([4, 5, 6]);
    for (const round of rounds.slice(0, 3)) expect(reachesNest(round, round.path)).toBe(true);
    const loop = program(rounds[3], rounds[3].path, false);
    expect(loop).toEqual(["right", "right", "right"]);
    expect(rounds[3].repeat).toBe(3);
    expect(reachesNest(rounds[3], loop)).toBe(true);
    const bug = rounds[4];
    expect(bug.bugIndex).not.toBeNull();
    // Never the first or the last arrow: there is a step to watch before it goes wrong.
    expect(bug.bugIndex).toBeGreaterThan(0);
    expect(bug.bugIndex).toBeLessThan(bug.path.length - 1);
    const wrong = program(bug, [], false);
    const fixed = program(bug, [], true);
    expect(wrong).not.toEqual(fixed);
    expect(wrong.filter((dir, index) => dir !== fixed[index])).toHaveLength(1);
    expect(reachesNest(bug, wrong)).toBe(false);
    expect(reachesNest(bug, fixed)).toBe(true);
    // The wrong arrow is seen to be wrong: the animal walks away from the nest, or off the edge, right there.
    const check = checkPlan(bug, wrong);
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.at).toBe(bug.bugIndex);
  });

  it("says where a plan goes wrong: off the edge, away from the nest, or short of it", () => {
    const board = birdRounds("early")[2];
    const { path } = board;
    expect(checkPlan(board, path)).toEqual({ ok: true });
    expect(checkPlan(board, path.slice(0, 1))).toEqual({ ok: false, why: "short", at: 1 });
    expect(checkPlan(board, [])).toEqual({ ok: false, why: "short", at: 0 });
    const back = { up: "down", down: "up", left: "right", right: "left" }[path[0]] as (typeof path)[number];
    // Straight back the other way: off the edge or away from the nest at the first step.
    const first = checkPlan(board, [back]);
    expect(first.ok).toBe(false);
    if (!first.ok) expect(first.at).toBe(0);
    // Too far: the step past the nest is wrong, not the plan's length.
    const past = checkPlan(board, [...path, path[path.length - 1]]);
    expect(past.ok).toBe(false);
    if (!past.ok) expect(past.at).toBe(path.length);
  });

  it("shows the way home from wherever the animal is", () => {
    const board = birdRounds("later")[0];
    // From the start, the board's own first step; from the nest, nothing.
    expect(nextStepHome(board, board.start)).toBe(board.path[0]);
    expect(nextStepHome(board, board.nest)).toBeNull();
    // From anywhere, a step that brings the nest nearer, and never off the grid.
    for (let y = 0; y < board.height; y += 1) {
      for (let x = 0; x < board.width; x += 1) {
        const way = nextStepHome(board, { x, y });
        if (x === board.nest.x && y === board.nest.y) continue;
        expect(way).not.toBeNull();
        const check = checkPlan({ ...board, start: { x, y } }, [way!]);
        expect(check.ok || check.why === "short", `${x},${y}`).toBe(true);
      }
    }
  });

  it("takes any shortest way home, not only the one the board was drawn with", () => {
    // A corner-to-corner board: up then right is as good as right then up.
    const board = boardLibrary("later").find((round) => round.width === 4 && round.height === 4 && turns(round.path) === 1 && round.path.length === 6);
    expect(board).toBeDefined();
    if (!board) return;
    const other = [...board.path.slice(3), ...board.path.slice(0, 3)];
    expect(other).not.toEqual(board.path);
    expect(checkPlan(board, other)).toEqual({ ok: true });
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
