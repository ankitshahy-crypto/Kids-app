import { describe, expect, it } from "vitest";
import manifest from "./audioManifest.json";
import {
  activitiesFor,
  balanceRounds,
  balanceTilt,
  bridgeRounds,
  buildStages,
  engineerLevel,
  engineerLine,
  engineerManifestEntries,
  engineerWords,
  MACHINE_JOBS,
  machineRounds,
  plankFit,
  rampRounds,
  rampTry,
  rollDistance,
  towerNext,
  towerRounds,
} from "./engineer";

const prompts = manifest.prompts as Record<string, { say: string; source: string }>;
const words = manifest.words as Record<string, { say: string }>;
const salts = Array.from({ length: 50 }, (_, index) => index * 13 + 2);

describe("build", () => {
  it("opens four games at ages 3 to 4, and Balance as well at 5 to 7", () => {
    expect(engineerLevel("4")).toBe("early");
    expect(engineerLevel("5")).toBe("later");
    expect(activitiesFor("early")).toEqual(["bridge", "tower", "ramp", "machines"]);
    expect(activitiesFor("later")).toEqual(["bridge", "tower", "ramp", "machines", "balance"]);
    for (const id of activitiesFor("later")) expect(buildStages.some((stage) => stage.id === id)).toBe(true);
  });
});

describe("the bridge", () => {
  it("has exactly one plank that fits each river", () => {
    for (const level of ["early", "later"] as const) {
      for (const salt of salts) {
        const rounds = bridgeRounds(level, salt);
        expect(rounds).toHaveLength(level === "later" ? 4 : 3);
        expect(new Set(rounds.map((round) => round.gap)).size).toBe(rounds.length);
        for (const round of rounds) {
          expect(round.planks).toHaveLength(3);
          expect(round.planks.filter((plank) => plankFit(round.gap, plank) === "fits")).toHaveLength(1);
          // Shortest to longest, so the eye can compare them.
          expect([...round.planks].sort((a, b) => a - b)).toEqual(round.planks);
        }
      }
    }
    expect(plankFit(3, 2)).toBe("short");
    expect(plankFit(3, 3)).toBe("fits");
    expect(plankFit(3, 4)).toBe("long");
  });
});

describe("the tower", () => {
  it("goes up widest first, and the blocks are never handed over in that order", () => {
    for (const [level, sizes] of [["early", [3, 4]], ["later", [4, 5]]] as const) {
      for (const salt of salts) {
        const rounds = towerRounds(level, salt);
        expect(rounds.map((round) => round.blocks.length)).toEqual(sizes);
        for (const round of rounds) {
          expect(new Set(round.blocks).size).toBe(round.blocks.length);
          const sorted = [...round.blocks].sort((a, b) => b - a);
          expect(round.blocks).not.toEqual(sorted);
          const placed: number[] = [];
          for (const want of sorted) {
            expect(towerNext(round.blocks, placed)).toBe(want);
            placed.push(want);
          }
          expect(towerNext(round.blocks, placed)).toBe(0);
        }
      }
    }
  });
});

describe("the ramp", () => {
  it("rolls farther from higher up, and every flag can be reached", () => {
    expect([1, 2, 3].map((height) => rollDistance(height as 1 | 2 | 3))).toEqual([1, 2, 3]);
    expect(rampTry(1, 2)).toBe("short");
    expect(rampTry(2, 2)).toBe("reach");
    expect(rampTry(3, 2)).toBe("far");
    for (const salt of salts) {
      const early = rampRounds("early", salt);
      expect(early.map((round) => round.flag).sort()).toEqual([1, 2, 3]);
      const later = rampRounds("later", salt);
      expect(later).toHaveLength(4);
      expect(later[3].flag).not.toBe(later[2].flag);
    }
  });
});

describe("machines", () => {
  it("gives each job the machine that does it, among all three", () => {
    for (const salt of salts) {
      const rounds = machineRounds(salt);
      expect(rounds.map((round) => round.id).sort()).toEqual(["box", "bucket", "rock"]);
      for (const round of rounds) {
        expect([...round.choices].sort()).toEqual(["lever", "pulley", "wheel"]);
        expect(MACHINE_JOBS.find((job) => job.id === round.id)?.machine).toBe(round.machine);
      }
    }
    expect(new Set(salts.map((salt) => machineRounds(salt).map((round) => round.id).join())).size).toBeGreaterThan(3);
  });
});

describe("balance", () => {
  it("leans to the heavier side and is level when the piles match", () => {
    expect(balanceTilt(2, 1)).toBe("left");
    expect(balanceTilt(2, 2)).toBe("level");
    expect(balanceTilt(2, 3)).toBe("right");
    for (const salt of salts) {
      const rounds = balanceRounds(salt);
      expect(rounds).toHaveLength(3);
      expect(new Set(rounds.map((round) => round.left)).size).toBe(3);
      for (const round of rounds) {
        expect(round.choices).toContain(round.left);
        expect(new Set(round.choices).size).toBe(3);
      }
    }
  });
});

describe("what build says", () => {
  it("has a recorded line for every question and every result", () => {
    const entries = engineerManifestEntries();
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length);
    for (const entry of entries) {
      expect(prompts[entry.id]?.say, entry.id).toBe(entry.say);
      expect(engineerLine(entry.id)).toBe(entry.say);
    }
  });

  it("has a recorded word for each machine", () => {
    for (const word of engineerWords()) expect(words[word], word).toBeTruthy();
  });
});
