import { describe, expect, it } from "vitest";
import manifest from "./audioManifest.json";
import { isSubjectKey, readingSteps } from "./subject";
import {
  addBlock,
  buildLevel,
  buildManifestEntries,
  chefResult,
  loadBuild,
  moveResult,
  palette,
  playSteps,
  saveBuild,
  sceneResult,
} from "./build";

describe("picture blocks", () => {
  it("gives younger children the move blocks and older children a repeat and a pond", () => {
    expect(buildLevel("4")).toBe("early");
    expect(buildLevel("6-7")).toBe("later");
    expect(palette("move", "early")).toEqual(["walk", "jump", "spin", "dance", "sing"]);
    expect(palette("move", "later")).toContain("repeat");
    expect(palette("move", "later")).toContain("pond");
    expect(palette("music", "early")).toContain("repeat");
  });

  it("plays a repeat as the previous block three times", () => {
    expect(playSteps(["drum", "repeat"]).map((step) => step.block)).toEqual(["drum", "repeat", "drum", "drum"]);
    expect(playSteps(["repeat"]).map((step) => step.block)).toEqual([]);
    expect(addBlock(["walk"], "jump")).toEqual(["walk", "jump"]);
  });

  it("splashes only when the pond block runs after three walks", () => {
    expect(moveResult(["walk", "walk", "walk", "pond"])).toMatchObject({ steps: 3, splashed: true });
    expect(moveResult(["walk", "repeat", "pond"])).toMatchObject({ steps: 3, splashed: true });
    expect(moveResult(["pond", "walk", "walk", "walk"]).splashed).toBe(false);
    expect(moveResult(["walk", "walk", "pond"]).splashed).toBe(false);
  });

  it("grows the flower when rain comes before it", () => {
    expect(sceneResult(["rain", "flower"]).flower).toBe("grown");
    expect(sceneResult(["flower", "rain"]).flower).toBe("bud");
    expect(sceneResult(["rain", "sun", "flower"]).flower).toBe("bud");
  });

  it("makes a sandwich in order and a silly stack otherwise", () => {
    expect(chefResult(["bread", "spread"])).toBe("wait");
    expect(chefResult(["bread", "spread", "filling"])).toBe("sandwich");
    expect(chefResult(["filling", "bread", "spread"])).toBe("silly");
  });

  it("saves block ids on the device without a child name", () => {
    const raw = saveBuild("mia", "move", ["walk", "jump"], null);
    expect(raw).toContain("walk");
    expect(raw).not.toContain("Mia");
    expect(loadBuild("mia", "move", raw)).toEqual(["walk", "jump"]);
    expect(loadBuild("mia", "music", raw)).toEqual([]);
    expect(loadBuild("mia", "move", "{")).toEqual([]);
  });
});

describe("build it stays a game", () => {
  it("can earn a star without finishing the reading lesson", () => {
    for (const id of ["game-build-move", "game-build-music", "game-build-scene", "game-build-chef"]) {
      expect(isSubjectKey(id)).toBe(true);
      expect((readingSteps as readonly string[]).includes(id)).toBe(false);
    }
  });

  it("lists spoken lines for a natural voice later", () => {
    const prompts = manifest.prompts as Record<string, { say: string; source: string; file: string }>;
    for (const entry of buildManifestEntries()) {
      expect(prompts[entry.id]?.say).toBe(entry.say);
      expect(prompts[entry.id]?.source).toBe("neural");
      expect(prompts[entry.id]?.file).toBe(`prompts/${entry.id}.mp3`);
    }
  });
});
