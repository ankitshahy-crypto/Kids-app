import { describe, expect, it } from "vitest";
import manifest from "./audioManifest.json";
import { alphabetForms, letterForm } from "./handwriting";
import { pairLine, pairPromptId } from "./letterPairs";
import {
  followStroke,
  matchDistractor,
  reversalPairs,
  reversalPartner,
  strokeComplete,
  strokeStations,
  traceProgress,
} from "./trace";

describe("manuscript strokes", () => {
  it("has ball-and-stick paths for every uppercase and lowercase letter", () => {
    const forms = alphabetForms();
    expect(forms).toHaveLength(52);
    for (const form of forms) {
      expect(form.strokes.length).toBeGreaterThan(0);
      for (const stroke of form.strokes) {
        expect(stroke.length).toBeGreaterThan(1);
        for (const point of stroke) {
          expect(point.x).toBeGreaterThanOrEqual(4);
          expect(point.x).toBeLessThanOrEqual(96);
          expect(point.y).toBeGreaterThanOrEqual(4);
          expect(point.y).toBeLessThanOrEqual(104);
        }
      }
    }
  });
});

describe("tracing tolerance", () => {
  const stroke = letterForm("a", "upper").strokes[0];
  const stations = strokeStations(stroke);

  it("completes when the finger follows the stroke", () => {
    const covered = traceProgress(stroke, stations);
    expect(strokeComplete(stroke, covered)).toBe(true);
  });

  it("does not complete a stroke drawn far off the path", () => {
    const far = stations.map((point) => ({ x: point.x + 45, y: point.y }));
    const covered = traceProgress(stroke, far);
    expect(covered).toBe(0);
    expect(strokeComplete(stroke, covered)).toBe(false);
  });

  it("stops advancing when the finger leaves the path", () => {
    const partial = [...stations.slice(0, 3), { x: 4, y: 4 }, { x: 6, y: 6 }];
    const covered = traceProgress(stroke, partial);
    expect(covered).toBeGreaterThan(0);
    expect(covered).toBeLessThan(stations.length);
    expect(followStroke(stroke, covered, { x: 97, y: 97 })).toBe(covered);
  });

  it("does not skip ahead to the end before the start is touched", () => {
    const end = stations[stations.length - 1];
    expect(followStroke(stroke, 0, end)).toBe(0);
  });
});

describe("upper and lower pairs", () => {
  it("keeps the commonly reversed letters together", () => {
    expect(reversalPairs).toEqual([
      ["b", "d"],
      ["p", "q"],
      ["n", "u"],
      ["m", "w"],
    ]);
    expect(reversalPartner("b")).toBe("d");
    expect(reversalPartner("d")).toBe("b");
    expect(reversalPartner("a")).toBeNull();
    expect(matchDistractor("b")).toBe("d");
    expect(matchDistractor("a", ["a", "m"])).toBe("m");
  });

  it("speaks big and little with the letter sound and a picture word", () => {
    expect(pairLine("a")).toBe("Big A and little a both say /a/, like apple");
    expect(pairPromptId("A")).toBe("pair-a");
    for (const letter of "abcdefghijklmnopqrstuvwxyz") {
      const cue = manifest.prompts[pairPromptId(letter) as keyof typeof manifest.prompts];
      expect(cue.say).toBe(pairLine(letter));
      expect(cue.file).toBe(`prompts/pair-${letter}.mp3`);
      expect(cue.source).toBe("neural");
    }
  });
});
