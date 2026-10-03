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
  lifeRounds,
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

  it("starts in the garden, then puts a life in order: one at ages 3 to 4, two at 5 to 7", () => {
    for (const salt of salts) {
      const early = lifeRounds("early", salt);
      const later = lifeRounds("later", salt);
      expect(early.map((round) => round.kind)).toEqual(["grow", "order"]);
      expect(later.map((round) => round.kind)).toEqual(["grow", "order", "order"]);
      for (const round of later) {
        if (round.kind !== "order") continue;
        expect(round.stages).toHaveLength(3);
        expect([...round.deal].map((stage) => stage.art).sort()).toEqual(round.stages.map((stage) => stage.art).sort());
        // Never handed over already in order.
        expect(round.deal.map((stage) => stage.art)).not.toEqual(round.stages.map((stage) => stage.art));
      }
      const ids = later.flatMap((round) => (round.kind === "order" ? [round.id] : []));
      expect(new Set(ids).size).toBe(2);
    }
  });
});

describe("the picture questions", () => {
  it("asks where three or four animals live, with the home among three", () => {
    for (const salt of salts) {
      expect(homeRounds("early", salt)).toHaveLength(3);
      const rounds = homeRounds("later", salt);
      expect(rounds).toHaveLength(HOMES.length);
      expect(new Set(rounds.map((round) => round.id)).size).toBe(rounds.length);
      for (const round of rounds) {
        expect(round.choices.map((choice) => choice.art)).toContain(round.home.art);
        expect(new Set(round.choices.map((choice) => choice.art)).size).toBe(3);
      }
    }
  });

  it("asks for the parts of a bird: three for the youngest, all five later", () => {
    for (const salt of salts) {
      expect([...bodyRounds("early", salt)].sort()).toEqual(["beak", "tail", "wing"]);
      expect([...bodyRounds("later", salt)].sort()).toEqual([...BODY_PARTS].sort());
    }
    expect(new Set(salts.map((salt) => bodyRounds("later", salt).join(","))).size).toBeGreaterThan(5);
  });

  it("asks what to take for the weather, and each kind of weather has its own thing", () => {
    expect(new Set(WEATHERS.map((entry) => entry.thing.art)).size).toBe(WEATHERS.length);
    for (const salt of salts) {
      expect(weatherRounds("early", salt)).toHaveLength(3);
      for (const round of weatherRounds("later", salt)) {
        expect(round.choices.map((choice) => choice.art)).toContain(round.thing.art);
        expect(new Set(round.choices.map((choice) => choice.art)).size).toBe(3);
      }
    }
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

  it("drops as many things that float as things that sink", () => {
    for (const salt of salts) {
      for (const [level, each] of [["early", 2], ["later", 3]] as const) {
        const rounds = floatRounds(level, salt);
        expect(rounds).toHaveLength(each * 2);
        expect(rounds.filter((round) => round.floats)).toHaveLength(each);
        expect(new Set(rounds.map((round) => round.picture.art)).size).toBe(each * 2);
        for (const round of rounds) expect(floatResult(round)).toBe(round.floats ? "float" : "sink");
      }
    }
    expect(FLOAT_THINGS.filter((thing) => thing.floats)).toHaveLength(3);
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
  });

  it("has a recorded word for every picture that says its name", () => {
    for (const name of scienceWords()) expect(words[wordId(name)], name).toBeTruthy();
    expect(wordId("dog house")).toBe("dog-house");
  });
});
