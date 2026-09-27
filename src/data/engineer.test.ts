import { describe, expect, it } from "vitest";
import manifest from "./audioManifest.json";
import {
  activitiesFor,
  beamTorque,
  beamVerdict,
  bridgePlan,
  bridgeVerdict,
  engineerLevel,
  engineerManifestEntries,
  floatSet,
  floatVerdict,
  leverLifts,
  leverWeight,
  machinesReady,
  placeBeam,
  placeSpan,
  placeTower,
  pulleyLifts,
  rampGoal,
  rampVerdict,
  rollDistance,
  towerPlan,
  towerVerdict,
  wheelMoves,
  wheelNeed,
} from "./engineer";
import { isSubjectKey, readingSteps } from "./subject";

describe("LittleNest Build", () => {
  it("keeps coding out of this module and ages 3 to 4 on the simple kit", () => {
    expect(engineerLevel("3")).toBe("early");
    expect(engineerLevel("4")).toBe("early");
    expect(engineerLevel("5")).toBe("later");
    expect(engineerLevel("6-7")).toBe("later");
    expect(activitiesFor("early")).toEqual(["bridge", "tower", "ramp", "machines", "float"]);
    expect(activitiesFor("later")).toContain("balance");
  });

  it("lets a supported bridge cross and a long plank sag", () => {
    expect(bridgeVerdict(["plank", "plank"]).verdict).toBe("sag");
    expect(bridgeVerdict(["block", "plank"]).verdict).toBe("cross");
    expect(bridgeVerdict(["plank", "block"]).verdict).toBe("cross");
    expect(bridgeVerdict(["block", null]).verdict).toBe("wait");
    const later = bridgePlan("later");
    expect(later).toEqual({ gaps: 3, blocks: 1, planks: 2 });
    const placed = placeSpan([null, null, null], 1, "block", later);
    const bridged = placeSpan(placeSpan(placed, 0, "plank", later), 2, "plank", later);
    expect(bridged).toEqual(["plank", "block", "plank"]);
    expect(bridgeVerdict(bridged)).toMatchObject({ verdict: "cross" });
    expect(bridgeVerdict(["block", "plank", "plank"]).hint).toBe("A long plank sags. Put a block in the middle.");
    expect(placeSpan(bridged, 0, "block", later)).toEqual(bridged);
  });

  it("stands a wide tower and topples a narrow base", () => {
    const early = towerPlan("early");
    expect(towerVerdict(["wide", "medium", "narrow"], early.goal).verdict).toBe("reach");
    expect(towerVerdict(["narrow", "wide"], early.goal).verdict).toBe("topple");
    expect(towerVerdict(["wide", "narrow", "medium"], early.goal).hint).toBe("A wide block is sitting on a narrow one.");
    const later = towerPlan("later");
    const stack = placeTower(placeTower(placeTower(placeTower([], "wide", later), "wide", later), "medium", later), "narrow", later);
    expect(stack).toEqual(["wide", "wide", "medium", "narrow"]);
    expect(placeTower(stack, "wide", later)).toEqual(stack);
    expect(towerVerdict(stack, later.goal).verdict).toBe("reach");
    expect(towerVerdict(["wide", "medium"], later.goal).verdict).toBe("short");
  });

  it("rolls farther from a higher ramp", () => {
    expect(rollDistance(1)).toBe(2);
    expect(rollDistance(2)).toBe(4);
    expect(rollDistance(3)).toBe(6);
    expect(rampVerdict(1, rampGoal("early"))).toMatchObject({ verdict: "short", hint: "The ramp is too low." });
    expect(rampVerdict(2, rampGoal("early")).verdict).toBe("reach");
    expect(rampVerdict(2, rampGoal("later")).verdict).toBe("short");
    expect(rampVerdict(3, rampGoal("later")).verdict).toBe("reach");
  });

  it("lifts with a lever, a pulley, and a wheel", () => {
    expect(leverLifts("left")).toBe(true);
    expect(leverLifts("right")).toBe(false);
    expect(leverWeight("light").lifts).toBe(false);
    expect(leverWeight("heavy")).toMatchObject({ lifts: true });
    expect(pulleyLifts(true)).toBe(true);
    expect(wheelNeed("early")).toBe(1);
    expect(wheelNeed("later")).toBe(3);
    expect(wheelMoves(2, 3)).toBe(false);
    expect(wheelMoves(3, 3)).toBe(true);
    expect(machinesReady({ lever: true, pulley: true, wheel: false })).toBe(false);
    expect(machinesReady({ lever: true, pulley: true, wheel: true })).toBe(true);
  });

  it("checks a sink or float guess", () => {
    expect(floatSet("early")).toEqual(["leaf", "rock", "boat"]);
    expect(floatSet("later")).toContain("spoon");
    expect(floatVerdict("leaf", "float").ok).toBe(true);
    expect(floatVerdict("rock", "float")).toMatchObject({ ok: false, hint: "That one is heavy, so it sinks." });
    expect(floatVerdict("boat", "sink").hint).toBe("That one is light, so it floats.");
    expect(floatVerdict("spoon", "sink").ok).toBe(true);
  });

  it("balances when weight times distance matches", () => {
    const spots = placeBeam(placeBeam({}, -1, 2), 2, 1);
    expect(beamTorque(spots)).toBe(0);
    expect(beamVerdict(spots).verdict).toBe("balance");
    expect(beamVerdict(placeBeam({}, -2, 2))).toMatchObject({ verdict: "tilt", hint: "The left side is heavier." });
    expect(beamVerdict({}).verdict).toBe("wait");
    const moved = placeBeam(spots, 1, 2);
    expect(moved[-1]).toBeUndefined();
    expect(moved[1]).toBe(2);
  });

  it("can earn a star without finishing the reading lesson", () => {
    for (const id of ["bridge", "tower", "ramp", "machines", "float", "balance"]) {
      expect(isSubjectKey(id)).toBe(true);
      expect((readingSteps as readonly string[]).includes(id)).toBe(false);
    }
  });

  it("lists spoken lines for a natural voice later", () => {
    const prompts = manifest.prompts as Record<string, { say: string; source: string; file: string }>;
    for (const entry of engineerManifestEntries()) {
      expect(prompts[entry.id]?.say).toBe(entry.say);
      expect(prompts[entry.id]?.source).toBe("neural");
      expect(prompts[entry.id]?.file).toBe(`prompts/${entry.id}.mp3`);
    }
  });
});
