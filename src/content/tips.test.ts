import { describe, expect, it } from "vitest";
import { LETTER_WORDS } from "../data/letterWords";
import { drawTip, readTip } from "./tips";

describe("read-together tips", () => {
  it("asks about the letter's own picture word after a letter card", () => {
    expect(readTip("letter", "end", "B").text).toBe("Ask: what else starts like bus?");
    expect(readTip("letter", "end", "i").text).toBe("Ask: what else starts like igloo?");
    expect(readTip("letter", "end", "x").text).toBe("Ask: can you hear the last sound in fox?");
    expect(readTip("letter", "end", "m").id).toBe("letter-m-end");
  });

  it("has a tip for every letter, in plain words", () => {
    for (const { letter, word } of Object.values(LETTER_WORDS)) {
      const tip = readTip("letter", "end", letter);
      expect(tip.id).toBe(`letter-${letter}-end`);
      expect(tip.text).toContain(word);
      // No phoneme notation: a grown-up reads this, and a voice once read the slashes aloud.
      expect(tip.text).not.toContain("/");
    }
  });

  it("uses the lesson line everywhere else, a finished word included", () => {
    expect(readTip("draw", "start").text).toContain("finger");
    expect(readTip("story", "end").id).toBe("story-end");
    expect(readTip("letter", "end").id).toBe("letter-end");
    expect(readTip("letter", "end").text).toContain("once more");
    expect(readTip("letter", "end", "sh").id).toBe("letter-end");
  });

  it("tells the grown-up what the Draw card on screen does: tracing copy only on the tracing card", () => {
    expect(drawTip("trace", "m", "w")).toEqual(readTip("draw", "start"));
    expect(drawTip("trace", "m", "w").text).toMatch(/^Trace/);
    const tap = drawTip("reversal", "m", "w");
    expect(tap.id).toBe("draw-reversal");
    expect(tap.text).toBe("Tap the little letter, m. Little w looks alike and is there to pass over.");
    expect(tap.text).not.toMatch(/trace/i);
    expect(drawTip("reversal", "B", null).text).toBe("Tap the little letter, b.");
    const match = drawTip("match", "s");
    expect(match.id).toBe("draw-match");
    expect(match.text).not.toMatch(/trace/i);
    expect(match.text).toContain("little letter");
  });
});
