import { describe, expect, it } from "vitest";
import manifest from "./audioManifest.json";
import {
  activitiesForScience,
  BODY_PARTS,
  bodyRounds,
  FLOAT_THINGS,
  floatResult,
  floatRounds,
  GROW_NEEDS,
  GROW_STEPS,
  growAccepts,
  homeRounds,
  HOMES,
  LIFE_CYCLES,
  lifeRounds,
  lifeStages,
  SCIENCE_NOW,
  scienceActivities,
  scienceLevel,
  scienceManifestEntries,
  scienceStages,
  scienceSteps,
  scienceWords,
  senseRounds,
  SENSES,
  weatherRounds,
  WEATHERS,
  wordId,
} from "./science";
import { isSubjectKey } from "./subject";

const prompts = manifest.prompts as Record<string, { say: string; source: string }>;
const words = manifest.words as Record<string, { say: string }>;
const salts = Array.from({ length: 50 }, (_, index) => index * 11 + 3);

// What the banks held before the harder step and the new rows: a 5–7 play must be able to draw
// a round that was not there.
const OLD_HOMES = ["fish", "bird", "bee", "dog"];
const OLD_WEATHERS = ["rain", "sun", "snow", "wind"];
const OLD_LIVES = ["hen", "butterfly", "plant"];
const OLD_FLOATERS = ["leaf", "boat", "apple", "rock", "coin", "gem"];

describe("science", () => {
  it("opens six activities at every age, and keeps the ids of the four that are waiting", () => {
    expect(scienceLevel("3")).toBe("early");
    expect(scienceLevel("6-7")).toBe("later");
    expect(activitiesForScience("early")).toEqual([...SCIENCE_NOW]);
    expect(activitiesForScience("later")).toEqual([...SCIENCE_NOW]);
    for (const id of ["change", "predict", "chain", "water"]) expect(scienceActivities).toContain(id);
    // Every open activity has a stage a grown-up can read about, and is a step that can earn a star.
    for (const id of SCIENCE_NOW) {
      expect(scienceStages.some((stage) => stage.id === id), id).toBe(true);
      expect((scienceSteps as readonly string[]).includes(id)).toBe(true);
      expect(isSubjectKey(id)).toBe(true);
    }
  });
});

describe("growing", () => {
  it("is a seed, then water, then sun, then water again", () => {
    expect(GROW_STEPS.map((step) => step.need)).toEqual(["seed", "water", "sun", "water"]);
    expect(GROW_NEEDS).toEqual(["seed", "water", "sun"]);
    for (const [index, step] of GROW_STEPS.entries()) {
      for (const need of GROW_NEEDS) expect(growAccepts(index, need)).toBe(need === step.need);
    }
    // Nothing is taken once it is grown.
    for (const need of GROW_NEEDS) expect(growAccepts(GROW_STEPS.length, need)).toBe(false);
  });

  it("starts in the garden, then puts a life in order: one at ages 3 to 4; two, then a life of four, at 5 to 7", () => {
    for (const salt of salts) {
      const early = lifeRounds("early", salt);
      const later = lifeRounds("later", salt);
      expect(early.map((round) => round.kind)).toEqual(["grow", "order"]);
      expect(later.map((round) => round.kind)).toEqual(["grow", "order", "order", "order"]);
      for (const round of [...early, ...later]) {
        if (round.kind !== "order") continue;
        expect([...round.deal].map((stage) => stage.art).sort()).toEqual(round.stages.map((stage) => stage.art).sort());
        // Never handed over already in order.
        expect(round.deal.map((stage) => stage.art)).not.toEqual(round.stages.map((stage) => stage.art));
      }
      // The harder step, four pictures, is the last round at 5 to 7 and never comes at 3 to 4.
      const orders = later.flatMap((round) => (round.kind === "order" ? [round] : []));
      expect(orders.map((round) => round.stages.length)).toEqual([3, 3, 4]);
      expect(orders[2].id).toBe("plant");
      expect(orders[2].stages.map((stage) => stage.art)).toEqual(["seed", "sprout", "plant", "flower"]);
      expect(new Set(orders.map((round) => round.id)).size).toBe(3);
      for (const round of early) if (round.kind === "order") expect(round.stages).toHaveLength(3);
    }
  });

  it("has four lives; only the plant has a fourth picture, and the nut's life is drawn, not painted", () => {
    expect(LIFE_CYCLES.map((cycle) => cycle.id)).toEqual(["hen", "butterfly", "plant", "tree"]);
    expect(LIFE_CYCLES.filter((cycle) => cycle.more).map((cycle) => cycle.id)).toEqual(["plant"]);
    for (const cycle of LIFE_CYCLES) {
      expect(cycle.stages).toHaveLength(3);
      expect(lifeStages(cycle, false)).toEqual(cycle.stages);
      expect(lifeStages(cycle, true)).toHaveLength(cycle.more ? 4 : 3);
    }
    expect(LIFE_CYCLES.find((cycle) => cycle.id === "tree")?.painted).toBe(false);
    // A 5–7 play draws a life the old bank did not have.
    expect(salts.some((salt) => lifeRounds("later", salt).some((round) => round.kind === "order" && !OLD_LIVES.includes(round.id)))).toBe(true);
  });
});

describe("the picture questions", () => {
  it("asks where three or four animals live, out of eight, with the home among three", () => {
    expect(HOMES).toHaveLength(8);
    expect(new Set(HOMES.map((entry) => entry.home.art)).size).toBe(HOMES.length);
    for (const salt of salts) {
      const early = homeRounds("early", salt);
      expect(early).toHaveLength(3);
      expect(early.every((round) => round.kind === "lives")).toBe(true);
      const later = homeRounds("later", salt);
      expect(later.map((round) => round.kind)).toEqual(["lives", "lives", "lives", "lives", "empty"]);
      for (const rounds of [early, later]) {
        expect(new Set(rounds.map((round) => round.id)).size).toBe(rounds.length);
        for (const round of rounds) {
          expect(round.choices.map((choice) => choice.art)).toContain(round.home.art);
          expect(new Set(round.choices.map((choice) => choice.art)).size).toBe(3);
        }
      }
    }
    // A 5–7 play asks about an animal the old bank did not have.
    expect(salts.some((salt) => homeRounds("later", salt).some((round) => round.kind === "lives" && !OLD_HOMES.includes(round.id)))).toBe(true);
  });

  it("ends the homes at 5 to 7 with two animals at home and the empty place to find", () => {
    for (const salt of salts) {
      const last = homeRounds("later", salt).at(-1);
      expect(last?.kind).toBe("empty");
      if (last?.kind !== "empty") continue;
      expect(last.at).toHaveLength(2);
      // The two homes with an animal and the empty one are the three choices; the empty one is the answer.
      const taken = last.at.map((pair) => pair.home.art);
      expect(taken).not.toContain(last.home.art);
      expect([...last.choices.map((choice) => choice.art)].sort()).toEqual([...taken, last.home.art].sort());
      expect(last.ask).toBe("science-home-empty");
      expect(last.answer).toBe("science-home-nobody");
      // Each animal is at its own home.
      for (const pair of last.at) expect(HOMES.find((entry) => entry.animal.art === pair.animal.art)?.home.art).toBe(pair.home.art);
    }
  });

  it("asks for the parts of a bird: three for the youngest, all five later", () => {
    for (const salt of salts) {
      expect([...bodyRounds("early", salt)].sort()).toEqual(["beak", "tail", "wing"]);
      expect([...bodyRounds("later", salt)].sort()).toEqual([...BODY_PARTS].sort());
    }
    expect(new Set(salts.map((salt) => bodyRounds("later", salt).join(","))).size).toBeGreaterThan(5);
  });

  it("asks what to take for the weather, out of eight; at 5 to 7 the last two have a fourth, wrong thing among the choices", () => {
    expect(WEATHERS).toHaveLength(8);
    expect(new Set(WEATHERS.map((entry) => entry.thing.art)).size).toBe(WEATHERS.length);
    for (const salt of salts) {
      const early = weatherRounds("early", salt);
      expect(early).toHaveLength(3);
      expect(early.map((round) => round.choices.length)).toEqual([3, 3, 3]);
      const later = weatherRounds("later", salt);
      expect(later.map((round) => round.choices.length)).toEqual([3, 3, 3, 4, 4]);
      for (const round of [...early, ...later]) {
        expect(round.choices.map((choice) => choice.art)).toContain(round.thing.art);
        expect(new Set(round.choices.map((choice) => choice.art)).size).toBe(round.choices.length);
      }
      expect(new Set(later.map((round) => round.id)).size).toBe(5);
    }
    expect(salts.some((salt) => weatherRounds("later", salt).some((round) => !OLD_WEATHERS.includes(round.id)))).toBe(true);
  });

  it("asks which part of you does each of the five senses", () => {
    expect(new Set(SENSES.map((entry) => entry.part.art)).size).toBe(5);
    for (const salt of salts) {
      expect(senseRounds("early", salt)).toHaveLength(3);
      const rounds = senseRounds("later", salt);
      expect(rounds).toHaveLength(5);
      for (const round of rounds) expect(round.choices.map((choice) => choice.art)).toContain(round.part.art);
    }
  });

  it("drops as many things that float as things that sink, out of twelve, and no thing twice", () => {
    expect(FLOAT_THINGS).toHaveLength(12);
    expect(FLOAT_THINGS.filter((thing) => thing.floats)).toHaveLength(6);
    for (const salt of salts) {
      const early = floatRounds("early", salt);
      expect(early).toHaveLength(4);
      expect(early.every((round) => round.kind === "one")).toBe(true);
      const later = floatRounds("later", salt);
      expect(later.map((round) => round.kind)).toEqual(["one", "one", "one", "one", "pair", "pair"]);
      for (const rounds of [early, later]) {
        const singles = rounds.flatMap((round) => (round.kind === "one" ? [round] : []));
        expect(singles.filter((round) => round.floats)).toHaveLength(2);
        for (const round of singles) expect(floatResult(round)).toBe(round.floats ? "float" : "sink");
        const shown = rounds.flatMap((round) => (round.kind === "one" ? [round.picture.art] : round.things.map((thing) => thing.picture.art)));
        expect(new Set(shown).size).toBe(shown.length);
      }
      // The harder step: a pair, one that floats and one that sinks, the floating one the answer.
      for (const round of later) {
        if (round.kind !== "pair") continue;
        expect(round.things).toHaveLength(2);
        expect(round.things.filter((thing) => thing.floats)).toHaveLength(1);
        expect(floatResult(round)).toBe("float");
      }
    }
    expect(salts.some((salt) => floatRounds("later", salt).some((round) => round.kind === "one" && !OLD_FLOATERS.includes(round.picture.art)))).toBe(true);
  });
});

describe("what science says", () => {
  it("has a recorded line for every question and every answer", () => {
    const entries = scienceManifestEntries();
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length);
    for (const entry of entries) {
      expect(prompts[entry.id]?.say, entry.id).toBe(entry.say);
      expect(prompts[entry.id]?.source).toBe("neural");
    }
    for (const step of GROW_STEPS) expect(prompts[step.line]?.say).toBe(step.say);
    for (const entry of HOMES) expect(prompts[`science-home-${entry.id}`]?.say).toBe(entry.ask);
    for (const entry of WEATHERS) expect(prompts[`science-weather-${entry.id}`]?.say).toBe(entry.ask);
    for (const id of ["science-home-empty", "science-home-nobody", "science-float-which"]) expect(prompts[id]?.say, id).toBeTruthy();
  });

  it("has a recorded word for every picture that says its name", () => {
    for (const name of scienceWords()) expect(words[wordId(name)], name).toBeTruthy();
    expect(wordId("dog house")).toBe("dog-house");
  });
});
