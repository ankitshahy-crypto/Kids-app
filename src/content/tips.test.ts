import { describe, expect, it } from "vitest";
import { readTip } from "./tips";

describe("read-together tips", () => {
  it("uses the letter prompt at the end of a letter lesson", () => {
    expect(readTip("letter", "end", "B").text).toBe("Ask: what other words start with /b/?");
    expect(readTip("letter", "end", "m").id).toBe("letter-m-end");
  });

  it("uses the lesson line when a letter prompt is not the end of sound-it-out", () => {
    expect(readTip("draw", "start").text).toContain("air");
    expect(readTip("story", "end").id).toBe("story-end");
    expect(readTip("letter", "end").text).toContain("this sound");
  });
});
