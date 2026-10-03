import { describe, expect, it } from "vitest";
import manifest from "./audioManifest.json";
import { stepAllowed } from "./profiles";
import { isSubjectKey, READING, readingSteps } from "./subject";
import {
  addBlock,
  buildLevel,
  buildManifestEntries,
  buildWords,
  codePalette,
  codeRounds,
  compile,
  firstDifference,
  lineCues,
  loadBuild,
  moveResult,
  palette,
  playSteps,
  pseudoCode,
  pseudoLine,
  pythonCode,
  sameProgram,
  saveBuild,
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

describe("hello world", () => {
  it("is one block that says hello, in words and in Python", () => {
    expect(palette("hello", "early")[0]).toBe("hello");
    expect(palette("hello", "later")[0]).toBe("hello");
    expect(playSteps(["hello"]).map((step) => step.block)).toEqual(["hello"]);
    expect(pseudoCode(["hello"])).toBe("say hello");
    expect(pseudoLine(["hello"], 0)).toBe("say hello");
    expect(pythonCode(["hello"])).toBe('print("Hello, world!")');
    expect(pythonCode(["hello", "repeat"])).toBe('for i in range(3):\n    print("Hello, world!")');
    expect(moveResult(["hello"])).toMatchObject({ steps: 0, pose: "hello" });
  });
});

describe("read the code", () => {
  it("starts with hello world and gives two more programs, shorter first", () => {
    for (const level of ["early", "later"] as const) {
      for (let salt = 0; salt < 40; salt += 1) {
        const rounds = codeRounds(level, salt);
        expect(rounds).toHaveLength(3);
        expect(rounds[0]).toEqual(["hello"]);
        expect(rounds[1]).not.toEqual(rounds[2]);
        expect(rounds[1].length).toBeLessThanOrEqual(rounds[2].length);
      }
    }
  });

  it("changes from one play to the next", () => {
    const seen = new Set<string>();
    for (let salt = 0; salt < 40; salt += 1) seen.add(JSON.stringify(codeRounds("early", salt)));
    expect(seen.size).toBeGreaterThan(5);
  });

  it("only asks for blocks the child is given, and programs that do something", () => {
    for (const level of ["early", "later"] as const) {
      for (let salt = 0; salt < 40; salt += 1) {
        for (const code of codeRounds(level, salt)) {
          // Five blocks, in one row on a phone: the program's own and others to choose between.
          const blocks = codePalette(level, code);
          expect(blocks).toHaveLength(5);
          expect(new Set(blocks).size).toBe(5);
          for (const block of code) expect(blocks.includes(block), `${level} ${block}`).toBe(true);
          // Short enough to fit a phone with the stage and Play.
          expect(code.length).toBeLessThanOrEqual(3);
          // Every line is a real line: no repeat without a step before it.
          expect(compile(code).length).toBeGreaterThan(0);
          expect(pseudoCode(code)).not.toMatch(/repeat 3 times$/m);
        }
      }
    }
    // Younger children get no repeat and no pond to read.
    for (let salt = 0; salt < 40; salt += 1) {
      for (const code of codeRounds("early", salt)) {
        expect(code).not.toContain("repeat");
        expect(code).not.toContain("pond");
      }
    }
  });

  it("matches the blocks to the code step for step", () => {
    expect(sameProgram(["walk", "jump"], ["walk", "jump"])).toBe(true);
    expect(sameProgram(["jump", "walk"], ["walk", "jump"])).toBe(false);
    expect(sameProgram(["walk"], ["walk", "jump"])).toBe(false);
    expect(sameProgram(["walk", "jump", "spin"], ["walk", "jump"])).toBe(false);
    expect(firstDifference(["walk", "jump"], ["walk", "jump"])).toBe(-1);
    expect(firstDifference(["walk", "spin"], ["walk", "jump"])).toBe(1);
    expect(firstDifference(["walk"], ["walk", "jump"])).toBe(1);
    expect(firstDifference([], ["hello"])).toBe(0);
  });

  it("says every line from a recorded clip", () => {
    const prompts = manifest.prompts as Record<string, { say: string }>;
    const words = manifest.words as Record<string, { say: string }>;
    for (const level of ["early", "later"] as const) {
      for (let salt = 0; salt < 40; salt += 1) {
        for (const code of codeRounds(level, salt)) {
          code.forEach((_, index) => {
            const cues = lineCues(code, index);
            expect(cues.length, `${code.join(" ")} line ${index}`).toBeGreaterThan(0);
            for (const cue of cues) {
              if (cue.kind === "prompt") expect(prompts[cue.id]?.say, cue.id).toBe(cue.say);
              else expect(words[cue.id], cue.id).toBeTruthy();
            }
          });
        }
      }
    }
    expect(lineCues(["walk", "repeat"], 1).map((cue) => cue.id)).toEqual(["code-repeat", "walk"]);
    expect(lineCues(["hello"], 0).map((cue) => cue.id)).toEqual(["code-say-hello"]);
  });
});

describe("build it stays a game", () => {
  it("can earn a star without finishing the reading lesson", () => {
    for (const id of ["game-build-hello", "game-build-move", "game-build-music", "game-code"]) {
      expect(isSubjectKey(id)).toBe(true);
      // A star step the app will accept: an id missing from the list earns nothing, silently.
      expect(stepAllowed(READING, id), id).toBe(true);
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
    // A tapped block says its name from a recorded clip, never the phone's own voice.
    const words = manifest.words as Record<string, { say: string }>;
    for (const word of buildWords()) expect(words[word], word).toBeTruthy();
  });
});
