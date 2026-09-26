import { describe, expect, it } from "vitest";
import manifest from "./audioManifest.json";
import { isSubjectKey, readingSteps } from "./subject";
import {
  addBlock,
  buildLevel,
  buildManifestEntries,
  chefResult,
  compile,
  loadBuild,
  moveResult,
  palette,
  playSteps,
  pseudoCode,
  pseudoLine,
  pythonCode,
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

describe("one program, three views", () => {
  it("matches the block run, the pseudo line, and the Python", () => {
    const script = ["walk", "repeat", "pond"] as const;
    expect(compile([...script])).toEqual([
      { type: "repeat", times: 3, index: 1, body: { type: "do", action: "walk", index: 0 } },
      { type: "if", when: "at-pond", index: 2, body: { type: "do", action: "splash", index: 2 } },
    ]);
    expect(pseudoCode([...script])).toBe("repeat 3 times: walk\nif at pond: splash");
    expect(pythonCode([...script])).toBe("for i in range(3):\n    bird.walk()\nif bird.at_pond():\n    bird.splash()");
    expect(playSteps([...script]).map((step) => step.block)).toEqual(["walk", "repeat", "walk", "walk", "pond"]);
    expect(moveResult([...script])).toMatchObject({ steps: 3, splashed: true });
  });

  it("uses the sample lines for a jump loop and a pond splash", () => {
    expect(pseudoLine(["jump", "repeat"], 1)).toBe("repeat 3 times: jump");
    expect(pythonCode(["jump", "repeat"])).toBe("for i in range(3):\n    bird.jump()");
    expect(pseudoLine(["pond"], 0)).toBe("if at pond: splash");
    expect(pythonCode(["pond"])).toBe("if bird.at_pond():\n    bird.splash()");
    expect(pseudoCode(["pond", "repeat"])).toBe("repeat 3 times: if at pond: splash");
    expect(pythonCode(["pond", "repeat"])).toBe("for i in range(3):\n    if bird.at_pond():\n        bird.splash()");
    expect(playSteps(["drum", "repeat", "repeat"]).map((step) => step.block)).toEqual(["drum", "repeat", "drum", "drum"]);
    expect(pseudoCode(["drum", "repeat", "repeat"])).toBe("repeat 3 times: drum");
    expect(pseudoLine(["drum", "repeat", "repeat"], 2)).toBe("repeat 3 times");
    expect(pythonCode(["drum", "repeat", "repeat"])).toBe("for i in range(3):\n    play.drum()");
    expect(pythonCode(["repeat"])).toBe("");
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
