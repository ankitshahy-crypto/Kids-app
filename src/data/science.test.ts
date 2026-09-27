import { describe, expect, it } from "vitest";
import manifest from "./audioManifest.json";
import {
  CYCLE_KINDS,
  EXPERIMENTS,
  FOOD_CHAIN,
  GROWNUP_FIZZ,
  HOMES,
  PREDICT_QUESTION,
  WATER_CYCLE,
  acceptNext,
  activitiesForScience,
  bodyParts,
  bodyPrompt,
  clothesFor,
  cycleStages,
  floatSet,
  floatVerdict,
  foodMatch,
  heatWater,
  homeMatch,
  mixSoda,
  predictionOk,
  scienceLevel,
  scienceManifestEntries,
  scienceSteps,
  seasonFor,
  senseRounds,
  sortMatter,
  warmIce,
} from "./science";
import { isSubjectKey, readingSteps } from "./subject";

describe("LittleNest Science", () => {
  it("keeps ages 3 to 4 on pictures and ages 5 to 7 on predict, chains, and weather cycles", () => {
    expect(scienceLevel("3")).toBe("early");
    expect(scienceLevel("4")).toBe("early");
    expect(scienceLevel("5")).toBe("later");
    expect(scienceLevel("6-7")).toBe("later");
    expect(activitiesForScience("early")).toEqual(["life", "homes", "body", "change", "weather", "senses", "float"]);
    expect(activitiesForScience("later")).toEqual([
      "life",
      "homes",
      "body",
      "change",
      "weather",
      "senses",
      "float",
      "predict",
      "chain",
      "water",
    ]);
  });

  it("accepts the next life-cycle stage and rejects a skip", () => {
    expect(cycleStages("plant", "early")).toEqual(["seed", "sprout", "plant"]);
    expect(cycleStages("bird", "later")).toEqual(["egg", "chick", "bird"]);
    expect(cycleStages("butterfly", "early")).toEqual(["caterpillar", "chrysalis", "butterfly"]);
    expect(cycleStages("butterfly", "later")[0]).toBe("egg");
    const plant = cycleStages("plant", "early");
    const skipped = acceptNext([], "plant", plant);
    expect(skipped).toMatchObject({ ok: false, done: false, order: [] });
    const seeded = acceptNext([], "seed", plant);
    const grown = acceptNext(acceptNext(seeded.order, "sprout", plant).order, "plant", plant);
    expect(grown).toMatchObject({ ok: true, done: true, order: ["seed", "sprout", "plant"] });
    expect(CYCLE_KINDS).toEqual(["plant", "bird", "butterfly"]);
  });

  it("matches homes, foods, body parts, clothes, and states of matter", () => {
    expect(HOMES.fox).toBe("den");
    expect(homeMatch("bird", "nest")).toBe(true);
    expect(homeMatch("fish", "den")).toBe(false);
    expect(foodMatch("fox", "berries")).toBe(true);
    expect(foodMatch("bird", "worm")).toBe(true);
    expect(foodMatch("fish", "plant")).toBe(true);
    expect(bodyParts("early")).toEqual(["wing", "beak", "tail"]);
    expect(bodyParts("later")).toContain("paw");
    expect(bodyPrompt("wing")).toBe("Find the wing.");
    expect(bodyPrompt("wing")).not.toMatch(/Mia|name/i);
    expect(clothesFor("sun")).toBe("hat");
    expect(clothesFor("rain")).toBe("coat");
    expect(clothesFor("snow")).toBe("scarf");
    expect(seasonFor("sun")).toBe("summer");
    expect(seasonFor("rain")).toBe("spring");
    expect(seasonFor("snow")).toBe("winter");
    expect(sortMatter("rock", "solid")).toBe(true);
    expect(sortMatter("juice", "liquid")).toBe(true);
    expect(sortMatter("steam", "gas")).toBe(true);
    expect(sortMatter("rock", "gas")).toBe(false);
    expect(warmIce()).toBe("water");
    expect(heatWater()).toBe("steam");
    expect(mixSoda()).toBe("bubbles");
  });

  it("keeps sink or float here", () => {
    expect(floatSet("early")).toEqual(["leaf", "rock", "boat"]);
    expect(floatSet("later")).toContain("spoon");
    expect(floatVerdict("leaf", "float").ok).toBe(true);
    expect(floatVerdict("rock", "float")).toMatchObject({ ok: false, hint: "That one is heavy, so it sinks." });
    expect(floatVerdict("boat", "sink").hint).toBe("That one is light, so it floats.");
    expect(floatVerdict("spoon", "sink").ok).toBe(true);
  });

  it("checks a prediction before the result, then a food chain and the water cycle", () => {
    expect(PREDICT_QUESTION).toBe("What do you think will happen?");
    expect(predictionOk("ice", "melt")).toBe(true);
    expect(predictionOk("ice", "stay")).toBe(false);
    expect(predictionOk("seed", "grow")).toBe(true);
    expect(predictionOk("fizz", "bubbles")).toBe(true);
    expect(EXPERIMENTS.find((item) => item.id === "ice")?.result).toBe("melt");
    const chain = acceptNext(acceptNext(acceptNext([], "grass", FOOD_CHAIN).order, "rabbit", FOOD_CHAIN).order, "fox", FOOD_CHAIN);
    expect(chain.done).toBe(true);
    expect(acceptNext([], "fox", FOOD_CHAIN).ok).toBe(false);
    const water = WATER_CYCLE.reduce((order, piece) => acceptNext(order, piece, WATER_CYCLE).order, [] as string[]);
    expect(water).toEqual(["puddle", "vapor", "cloud", "rain"]);
  });

  it("tells a grown-up to help and does not invite a taste", () => {
    expect(GROWNUP_FIZZ).toBe("Do this with a grown-up. Do not taste it.");
    expect(GROWNUP_FIZZ.toLowerCase()).not.toMatch(/taste the|try a taste|drink|eat /);
    const rounds = senseRounds();
    expect(rounds.filter((round) => round.sense === "sound").map((round) => round.cue)).toEqual(["tweet", "drip", "boom"]);
    expect(rounds.find((round) => round.cue === "soft")?.answer).toBe("bunny");
    expect(rounds.find((round) => round.cue === "night")?.answer).toBe("moon");
  });

  it("can earn a star without finishing the reading lesson", () => {
    for (const id of [...scienceSteps, "predict", "chain", "water"]) {
      expect(isSubjectKey(id)).toBe(true);
      expect((readingSteps as readonly string[]).includes(id)).toBe(false);
    }
  });

  it("lists spoken lines for a natural voice later", () => {
    const prompts = manifest.prompts as Record<string, { say: string; source: string; file: string }>;
    for (const entry of scienceManifestEntries()) {
      expect(prompts[entry.id]?.say).toBe(entry.say);
      expect(prompts[entry.id]?.source).toBe("neural");
      expect(prompts[entry.id]?.file).toBe(`prompts/${entry.id}.mp3`);
    }
    expect(prompts["engineer-float"]).toBeUndefined();
  });
});
