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

/** Signed area of a closed stroke. Negative means counterclockwise on screen, where y grows downward. */
function turn(stroke: { x: number; y: number }[]): number {
  let area = 0;
  for (let index = 0; index < stroke.length; index += 1) {
    const a = stroke[index];
    const b = stroke[(index + 1) % stroke.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area;
}

describe("letter shapes a child is taught", () => {
  it("draws lowercase e across first, then up and around to open on the right", () => {
    const [stroke] = letterForm("e", "lower").strokes;
    const start = stroke[0];
    const end = stroke[stroke.length - 1];
    const barEnd = stroke.find((point) => point.x >= 64);
    expect(start).toEqual({ x: 36, y: 69 });
    expect(barEnd?.y).toBe(69);
    // After the bar, the loop goes up first.
    const afterBar = stroke[stroke.indexOf(barEnd!) + 3];
    expect(afterBar.y).toBeLessThan(69);
    // It ends low on the right, leaving the opening there.
    expect(end.x).toBeGreaterThan(55);
    expect(end.y).toBeGreaterThan(75);
  });

  it("circles back (counterclockwise) for a, d, g, o, q, O and Q", () => {
    for (const [letter, casing] of [["a", "lower"], ["d", "lower"], ["g", "lower"], ["o", "lower"], ["q", "lower"], ["o", "upper"], ["q", "upper"]] as const) {
      const [ball] = letterForm(letter, casing).strokes;
      expect(turn(ball), `${casing} ${letter}`).toBeLessThan(0);
      // Starts at the upper right, like a clock's one.
      expect(ball[0].x, `${casing} ${letter}`).toBeGreaterThan((Math.min(...ball.map((p) => p.x)) + Math.max(...ball.map((p) => p.x))) / 2);
    }
  });

  it("circles forward (clockwise) for b and p, from the stick", () => {
    for (const letter of ["b", "p"]) {
      const ball = letterForm(letter, "lower").strokes[1];
      expect(turn(ball), letter).toBeGreaterThan(0);
    }
  });

  it("starts U and u at the top of the letter, and comes back up", () => {
    const [upper] = letterForm("u", "upper").strokes;
    expect(upper[0]).toEqual({ x: 30, y: 18 });
    expect(upper[upper.length - 1]).toEqual({ x: 70, y: 18 });
    const [lower] = letterForm("u", "lower").strokes;
    expect(lower[0]).toEqual({ x: 32, y: 54 });
    expect(lower[lower.length - 1]).toEqual({ x: 60, y: 54 });
  });

  it("keeps f on the baseline, r's arm on its stick, and G's bar on its curve", () => {
    const [stem] = letterForm("f", "lower").strokes;
    expect(Math.max(...stem.map((point) => point.y))).toBe(84);
    const [stick, arm] = letterForm("r", "lower").strokes;
    expect(arm[0].x).toBe(stick[0].x);
    expect(Math.min(...arm.map((point) => point.x))).toBe(stick[0].x);
    const g = letterForm("g", "upper").strokes;
    expect(g).toHaveLength(1);
    expect(g[0][g[0].length - 1]).toEqual({ x: 52, y: 51 });
  });
});

describe("ink follows the fingertip", () => {
  it("fills only as far as the finger, not a tolerance ahead of it", () => {
    const stroke = letterForm("l", "lower").strokes[0];
    const stations = strokeStations(stroke);
    expect(followStroke(stroke, 0, stations[0])).toBe(1);
    expect(followStroke(stroke, 1, stations[4])).toBe(5);
  });

  it("does not fill a round letter from a finger in its middle", () => {
    const [ball] = letterForm("o", "lower").strokes;
    const total = strokeStations(ball).length;
    const afterStart = followStroke(ball, 0, ball[0]);
    expect(afterStart).toBe(1);
    let covered = afterStart;
    for (let touch = 0; touch < 20; touch += 1) covered = followStroke(ball, covered, { x: 50, y: 69 });
    expect(covered).toBe(afterStart);
    expect(total).toBeGreaterThan(20);
  });

  it("does not jump from e's bar to the loop above it", () => {
    const [stroke] = letterForm("e", "lower").strokes;
    const stations = strokeStations(stroke);
    let covered = 0;
    for (const x of [36, 40, 44, 48]) covered = followStroke(stroke, covered, { x, y: 69 });
    // A wobble up toward the top of the loop, which is closer than the bar's end.
    covered = followStroke(stroke, covered, { x: 50, y: 60 });
    expect(stations[covered - 1].y).toBe(69);
  });

  it("finishes when the finger stops just short of the end", () => {
    const stroke = letterForm("l", "lower").strokes[0];
    const stations = strokeStations(stroke);
    let covered = 0;
    for (const point of stations.slice(0, stations.length - 3)) covered = followStroke(stroke, covered, point);
    expect(strokeComplete(stroke, covered)).toBe(true);
  });

  it("stays put while the finger rests on the ink's end", () => {
    const stroke = letterForm("l", "lower").strokes[0];
    const stations = strokeStations(stroke);
    let covered = traceProgress(stroke, stations.slice(0, 10));
    for (let touch = 0; touch < 20; touch += 1) covered = followStroke(stroke, covered, stations[9]);
    expect(covered).toBe(10);
  });

  it("follows a finger that runs beside the line, inside the lane", () => {
    const stroke = letterForm("l", "lower").strokes[0];
    const beside = strokeStations(stroke).map((point) => ({ x: point.x + 12, y: point.y }));
    expect(strokeComplete(stroke, traceProgress(stroke, beside))).toBe(true);
  });

  it("never moves back", () => {
    const stroke = letterForm("l", "lower").strokes[0];
    const stations = strokeStations(stroke);
    const covered = traceProgress(stroke, stations.slice(0, 10));
    expect(followStroke(stroke, covered, stations[2])).toBe(covered);
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

  it("speaks big and little with the letter sound and the letter's picture word", () => {
    expect(pairLine("a")).toBe("Big A and little a both say a, as in apple");
    expect(pairLine("W")).toBe("Big W and little w both say w, as in web");
    // No slashes: the voice read them aloud ("per meter slash").
    for (const letter of "abcdefghijklmnopqrstuvwxyz") expect(pairLine(letter)).not.toContain("/");
    expect(pairPromptId("A")).toBe("pair-a");
    for (const letter of "abcdefghijklmnopqrstuvwxyz") {
      const cue = manifest.prompts[pairPromptId(letter) as keyof typeof manifest.prompts];
      expect(cue.say).toBe(pairLine(letter));
      expect(cue.file).toBe(`prompts/pair-${letter}.mp3`);
      expect(cue.source).toBe("neural");
    }
  });
});
