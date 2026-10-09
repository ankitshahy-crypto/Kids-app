import { describe, expect, it } from "vitest";
import manifest from "./audioManifest.json";
import { readingSteps, isSubjectKey } from "./subject";
import {
  birdRounds,
  boardFamily,
  boardLibrary,
  bugPlan,
  checkPlan,
  chipSteps,
  logicLevel,
  nextStepHome,
  predictChoices,
  logicManifestEntries,
  logicPictures,
  logicWords,
  LONG_ORDER_SETS,
  orderFits,
  orderRounds,
  patternRounds,
  patternSequence,
  POND_RULE,
  program,
  reachesNest,
  reuseBoards,
  reuseChips,
  reusePlaces,
  reuseRound,
  routineAt,
  routineFits,
  ruleRounds,
  trail,
  walk,
} from "./logic";
import type { BirdRound, Chip, Dir } from "./logic";

const DIRS: Dir[] = ["up", "down", "left", "right"];

function turnsOf(path: Dir[]): number {
  return path.filter((dir, index) => index > 0 && dir !== path[index - 1]).length;
}

/** What the child does to a bug round's plan: fills the empty place, takes the extra arrow off, or turns the wrong one. */
function mend(round: BirdRound): Dir[] {
  const plan = bugPlan(round);
  const at = round.bugIndex ?? 0;
  if (round.bugKind === "extra") return [...plan.slice(0, at), ...plan.slice(at + 1)].filter((dir): dir is Dir => dir !== null);
  return plan.map((dir, index) => (index === at ? round.fix : dir)).filter((dir): dir is Dir => dir !== null);
}

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
    expect(rounds.map((round) => round.mode)).toEqual(["tap", "tap", "plan", "plan", "predict"]);
    expect(rounds[0].path.length).toBe(2);
    expect(new Set(rounds[0].path).size).toBe(1);
    expect(rounds[1].path.length).toBe(3);
    expect(new Set(rounds[1].path).size).toBe(2);
    expect(rounds[2].path.length).toBe(2);
    expect(rounds[3].path.length).toBe(3);
    for (const round of rounds) expect(reachesNest(round, round.path)).toBe(true);
    // The ending to predict: one arrow given, two to pick, from two endings that look different.
    const predict = rounds[4];
    expect(predict.shown).toHaveLength(1);
    expect(predict.choices).toHaveLength(2);
    expect(new Set(predict.path).size).toBe(2);
  });

  it("offers endings to a plan of which exactly one gets home, each a one-arrow change of it", () => {
    for (const level of ["early", "later"] as const) {
      for (let salt = 0; salt < 40; salt += 1) {
        const round = birdRounds(level, salt).find((item) => item.mode === "predict")!;
        const tail = round.path.length - round.shown.length;
        expect(round.shown).toEqual(round.path.slice(0, round.shown.length));
        expect(round.choices).toHaveLength(level === "early" ? 2 : 3);
        const right = round.choices.filter((ending) => checkPlan(round, program(round, ending)).ok);
        expect(right, `${level} ${salt}`).toHaveLength(1);
        for (const ending of round.choices) {
          expect(ending).toHaveLength(tail);
          const differs = ending.map((dir, index) => (dir !== right[0][index] ? index : -1)).filter((index) => index >= 0);
          expect(differs.length).toBeLessThanOrEqual(1);
          // A wrong ending goes wrong at the arrow that differs, so that is the arrow marked when it is walked.
          if (differs.length === 1) {
            const check = checkPlan(round, program(round, ending));
            expect(check.ok).toBe(false);
            if (!check.ok) expect(check.at).toBe(round.shown.length + differs[0]);
          }
        }
        expect(new Set(round.choices.map((ending) => ending.join())).size).toBe(round.choices.length);
        // Nothing runs until an ending is picked.
        expect(program(round, [])).toEqual([]);
      }
    }
    // The ending to predict can be as short as one arrow.
    const board = boardLibrary("early")[0];
    expect(predictChoices(board, 1, 2, 0)).toHaveLength(2);
  });

  it("picks different boards from one play to the next, and every one can be solved", () => {
    const corners = new Set<string>();
    const plays = new Set<string>();
    for (let salt = 0; salt < 24; salt += 1) {
      for (const level of ["early", "later"] as const) {
        const rounds = birdRounds(level, salt);
        plays.add(`${level}:${rounds.map((round) => `${round.start.x}${round.start.y}${round.path.join("")}`).join("|")}`);
        for (const round of rounds) {
          const dirs = round.mode === "loop" ? program(round, round.path) : round.path;
          expect(reachesNest(round, dirs), `${round.id} salt ${salt}`).toBe(true);
          if (round.mode === "bug") {
            // As first shown it does not get home; mended (each kind its own way), it does.
            expect(reachesNest(round, program(round, bugPlan(round)))).toBe(false);
            expect(reachesNest(round, program(round, mend(round)))).toBe(true);
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

  it("gives ages 5 to 7 a plan, a short one to keep, a long one to use it in, an ending to pick, a repeat of three, and one wrong arrow", () => {
    const rounds = birdRounds("later");
    expect(rounds.map((round) => round.mode)).toEqual(["plan", "keep", "reuse", "predict", "loop", "bug"]);
    expect(rounds[0].path).toHaveLength(4);
    // The kept plan is three steps with a turn: worth keeping. The reuse board is a longer way home
    // (five or six) with those three in it as one run, and the routine chip takes one place for them.
    expect(rounds[1].path).toHaveLength(3);
    expect(turnsOf(rounds[1].path)).toBe(1);
    expect(rounds[2].routine).toEqual(rounds[1].path);
    expect(rounds[2].path.length).toBeGreaterThanOrEqual(5);
    expect(rounds[2].path.length).toBeLessThanOrEqual(6);
    expect(routineAt(rounds[2])).toBeGreaterThanOrEqual(0);
    expect(reuseChips(rounds[2])).toHaveLength(reusePlaces(rounds[2]));
    expect(reuseChips(rounds[2]).filter((chip) => chip === "routine")).toHaveLength(1);
    for (const round of rounds.slice(0, 3)) expect(reachesNest(round, round.path)).toBe(true);
    expect(rounds[3].shown).toHaveLength(2);
    expect(rounds[3].choices).toHaveLength(3);
    const loop = program(rounds[4], rounds[4].path);
    expect(loop).toEqual(["right", "right", "right"]);
    expect(rounds[4].repeat).toBe(3);
    expect(reachesNest(rounds[4], loop)).toBe(true);
    const bug = rounds[5];
    expect(bug.bugIndex).not.toBeNull();
    // Never the first or the last arrow: there is a step to watch before it goes wrong.
    expect(bug.bugIndex).toBeGreaterThan(0);
    expect(bug.bugIndex).toBeLessThan(bug.path.length - 1);
    const shown = bugPlan(bug);
    const wrong = program(bug, shown);
    expect(reachesNest(bug, wrong)).toBe(false);
    expect(reachesNest(bug, bug.path)).toBe(true);
    if (bug.bugKind === "missing") {
      // One arrow is missing: an empty place where it goes, and the plan stops short.
      expect(shown).toHaveLength(bug.path.length);
      expect(shown[bug.bugIndex ?? -1]).toBeNull();
      expect(bug.fix).toBe(bug.path[bug.bugIndex ?? -1]);
      const check = checkPlan(bug, wrong);
      expect(check.ok).toBe(false);
    } else {
      // A wrong or an extra arrow is seen to be wrong: the animal walks away from the nest, or off
      // the edge, at that very arrow.
      expect(shown).toHaveLength(bug.bugKind === "extra" ? bug.path.length + 1 : bug.path.length);
      const check = checkPlan(bug, wrong);
      expect(check.ok).toBe(false);
      if (!check.ok) expect(check.at).toBe(bug.bugIndex);
    }
  });

  it("makes a reuse board for whichever shortest way the child kept, with the routine not always first", () => {
    // Every way a child could get home on a keep board (any shortest way counts, not only the drawn one).
    const keeps = boardLibrary("early").filter((board) => board.path.length === 3 && turnsOf(board.path) === 1);
    const ways = new Set<string>();
    for (const board of keeps) for (const a of DIRS) for (const b of DIRS) for (const c of DIRS) if (checkPlan(board, [a, b, c]).ok) ways.add([a, b, c].join(","));
    expect(ways.size).toBeGreaterThanOrEqual(16);
    for (const way of ways) {
      const routine = way.split(",") as Dir[];
      const boards = reuseBoards(routine);
      expect(boards.length, way).toBeGreaterThanOrEqual(10);
      for (const board of boards) {
        expect(board.mode).toBe("reuse");
        expect(board.routine).toEqual(routine);
        expect(board.path.length).toBeGreaterThanOrEqual(5);
        expect(board.path.length).toBeLessThanOrEqual(6);
        // A way a child can read: two turns, or one more than the routine's own.
        expect(turnsOf(board.path)).toBeLessThanOrEqual(Math.max(2, turnsOf(routine) + 1));
        // Its own way home is a shortest one, and the chips (the routine as one) walk it.
        expect(checkPlan(board, board.path).ok).toBe(true);
        expect(checkPlan(board, program(board, reuseChips(board))).ok).toBe(true);
        expect(reuseChips(board)).toHaveLength(reusePlaces(board));
      }
      // Where the routine sits varies with the salt: at the start, in the middle, at the end.
      const at = new Set<number>();
      for (let salt = 0; salt < 40; salt += 1) at.add(routineAt(reuseRound(routine, salt)));
      expect(at.size).toBeGreaterThanOrEqual(2);
    }
  });

  it("runs the routine chip as its steps, knows which chip each step is from, and says when the routine fits", () => {
    const round = birdRounds("later", 4)[2];
    const at = routineAt(round);
    const chips = reuseChips(round);
    expect(program(round, chips)).toEqual(round.path);
    expect(program(round, [null, "routine"])).toEqual(round.routine);
    // The steps of the routine chip are that chip, numbered inside it; an arrow's step is its own.
    const steps = chipSteps(round, chips);
    expect(steps).toHaveLength(round.path.length);
    expect(steps.slice(at, at + round.routine.length)).toEqual(round.routine.map((_, sub) => ({ chip: at, sub })));
    for (const [index, step] of steps.entries()) if (index < at || index >= at + round.routine.length) expect(step.sub).toBe(-1);
    // An empty place is no step.
    expect(chipSteps(round, [null, ...chips])).toHaveLength(round.path.length);
    // The routine fits after the arrows before it, and not after a step the wrong way.
    const before = round.path.slice(0, at) as Chip[];
    expect(routineFits(round, before)).toBe(true);
    const astray = DIRS.find((dir) => {
      const check = checkPlan(round, [...round.path.slice(0, at), dir]);
      return !check.ok && check.why !== "short";
    });
    expect(astray).toBeDefined();
    expect(routineFits(round, [...before, astray as Dir])).toBe(false);
  });

  it("has all three kinds of bug across plays, and each is mended by one change", () => {
    const kinds = new Set<string>();
    for (let salt = 0; salt < 60; salt += 1) {
      const bug = birdRounds("later", salt)[5];
      kinds.add(bug.bugKind ?? "none");
      const shown = bugPlan(bug);
      const mended = mend(bug);
      expect(mended, `${bug.id} salt ${salt}`).toEqual(bug.path);
      // A wrong or an extra arrow is seen to be wrong at that very arrow, in every play.
      if (bug.bugKind !== "missing") expect(checkPlan(bug, program(bug, shown)), `${bug.id} salt ${salt}`).toMatchObject({ ok: false, at: bug.bugIndex });
      // One change: the plans differ in one place (a turn or a fill), or by one arrow (an extra).
      if (bug.bugKind === "extra") {
        expect(shown).toHaveLength(mended.length + 1);
        expect([...shown.slice(0, bug.bugIndex ?? 0), ...shown.slice((bug.bugIndex ?? 0) + 1)]).toEqual(mended);
      } else {
        expect(shown.filter((dir, index) => dir !== mended[index])).toHaveLength(1);
      }
    }
    expect([...kinds].sort()).toEqual(["extra", "missing", "turn"]);
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
  it("continues AB at ages 3 to 4; at 5 to 7 AB, then the harder step, ABB and then ABC", () => {
    expect(patternSequence("AB", ["red", "blue"], 4)).toEqual({ shown: ["red", "blue", "red", "blue"], answer: "red" });
    expect(patternSequence("ABB", ["circle", "square"], 5)).toEqual({
      shown: ["circle", "square", "square", "circle", "square"],
      answer: "square",
    });
    expect(patternSequence("ABC", ["fox", "bird", "nest"], 5)).toEqual({ shown: ["fox", "bird", "nest", "fox", "bird"], answer: "nest" });
    const firsts = new Set<string>();
    for (let salt = 0; salt < 20; salt += 1) {
      const early = patternRounds("early", salt);
      const later = patternRounds("later", salt);
      expect(early.map((round) => round.rule)).toEqual(["AB", "AB", "AB"]);
      expect(later.map((round) => round.rule)).toEqual(["AB", "ABB", "ABC"]);
      // Three times AB is not the same row three times: the answer is A, then B, then A.
      expect(early.map((round) => round.shown.length)).toEqual([4, 5, 4]);
      for (const rounds of [early, later]) {
        for (const round of rounds) {
          // The answer is one of the choices, each choice is offered once, and every choice is a drawing.
          expect(round.choices).toContain(round.answer);
          expect(new Set(round.choices).size).toBe(round.choices.length);
          expect(round.choices).toHaveLength(3);
        }
        // Three rounds, three different sets of pictures.
        expect(new Set(rounds.map((round) => [...round.choices].sort().join())).size).toBe(3);
      }
      firsts.add(later[0].shown[0]);
    }
    expect(firsts.size).toBeGreaterThan(3);
  });

  it("deals pictures out of order, and accepts only the next one", () => {
    const sets = new Set<string>();
    const longs = new Set<string>();
    for (let salt = 0; salt < 20; salt += 1) {
      const early = orderRounds("early", salt);
      const later = orderRounds("later", salt);
      expect(early).toHaveLength(2);
      expect(later).toHaveLength(4);
      // Ages 3–4 stay on three pictures; at 5–7 the last round is the harder step, four pictures.
      expect(early.map((round) => round.cards.length)).toEqual([3, 3]);
      expect(later.map((round) => round.cards.length)).toEqual([3, 3, 3, 4]);
      for (const round of [...early, ...later]) {
        const order = round.cards.map((card) => card.art);
        expect([...round.deal].sort()).toEqual([...order].sort());
        expect(round.deal).not.toEqual(order);
        if (round.cards.length === 3) sets.add(round.id);
        else longs.add(round.id);
      }
      // No set of three in a play is most of its set of four.
      const longArts = new Set(later[3].cards.map((card) => card.art));
      for (const round of later.slice(0, 3)) expect(round.cards.filter((card) => longArts.has(card.art)).length).toBeLessThan(2);
    }
    expect(sets.size).toBe(5);
    expect(longs.size).toBe(LONG_ORDER_SETS.length);
    for (const set of LONG_ORDER_SETS) expect(set.cards).toHaveLength(4);
    const order = ["egg", "chick", "hen"];
    expect(orderFits(order, [], "hen", 0)).toBe(false);
    expect(orderFits(order, [], "egg", 0)).toBe(true);
    expect(orderFits(order, ["egg"], "chick", 1)).toBe(true);
    expect(orderFits(order, ["egg"], "chick", 2)).toBe(false);
    expect(orderFits(order, ["egg"], "hen", 1)).toBe(false);
  });

  it("offers the thing a rule calls for among two things other rules call for", () => {
    for (let salt = 0; salt < 20; salt += 1) {
      const early = ruleRounds("early", salt);
      expect(early).toHaveLength(3);
      expect(early.every((round) => !round.then)).toBe(true);
      const rounds = ruleRounds("later", salt);
      expect(rounds).toHaveLength(5);
      expect(new Set(rounds.map((round) => round.id)).size).toBe(5);
      const steps = [...early, ...rounds.flatMap((round) => (round.then ? [round, round.then] : [round]))];
      for (const round of steps) {
        const arts = round.choices.map((choice) => choice.art);
        expect(arts).toHaveLength(3);
        expect(new Set(arts).size).toBe(3);
        expect(arts).toContain(round.need.art);
        // The picture that sets the scene is never one of the answers.
        expect(arts).not.toContain(round.when.art);
      }
      // The harder step is the last round at 5–7: two rules in a row, the life rule not yet asked and
      // then the pond rule, the one Build's pond block does.
      expect(rounds.slice(0, 4).every((round) => !round.then)).toBe(true);
      const chain = rounds[4];
      expect(chain.then).toBeTruthy();
      expect(rounds.slice(0, 4).map((round) => round.id)).not.toContain(chain.id);
      expect(chain.id).not.toBe("splash");
      expect(chain.ask).toBe(`code-if-${chain.id}`);
      expect(chain.then?.id).toBe("splash");
      // The pond is for ages 5–7 only: never asked, and never a wrong answer, at 3–4.
      for (const round of early) {
        expect(round.id).not.toBe("splash");
        expect(round.choices.map((choice) => choice.art)).not.toContain("splash");
      }
    }
  });

  it("shares one rule with Build's pond block, said from the block's own clip", () => {
    expect(POND_RULE.rule).toBe("If at the pond, splash.");
    expect(POND_RULE.line).toBe("code-if-pond");
    const prompts = manifest.prompts as Record<string, { say: string }>;
    expect(prompts["code-if-pond"]?.say).toBe(POND_RULE.rule);
    expect(prompts["code-if-splash"]?.say).toBe(POND_RULE.ask);
    const chain = ruleRounds("later", 3)[4];
    expect(chain.then?.rule).toBe("code-if-pond");
    expect(chain.then?.ask).toBe("code-if-splash");
    expect(chain.then?.when.art).toBe("pond");
    expect(chain.then?.need.art).toBe("splash");
    // No rule of its own in the list: the clip is Build's.
    expect(logicManifestEntries().map((entry) => entry.id)).not.toContain("code-then-splash");
    expect(logicManifestEntries().map((entry) => entry.id)).toContain("code-if-splash");
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
