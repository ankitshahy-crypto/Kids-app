import { describe, expect, it } from "vitest";
import { isNameSticker, stickerCue } from "./StickerBook";

describe("the child's own name sticker", () => {
  it("is the word sticker Trace your name leaves, matched however the name was typed", () => {
    expect(isNameSticker({ subject: "reading", kind: "word", label: "Mia" }, "Mia")).toBe(true);
    expect(isNameSticker({ subject: "reading", kind: "word", label: "Mia" }, " mia ")).toBe(true);
    expect(isNameSticker({ subject: "reading", kind: "word", label: "Anne" }, "Anne-Marie")).toBe(false);
    expect(isNameSticker({ subject: "reading", kind: "word", label: "Annemarie" }, "Anne-Marie")).toBe(true);
    expect(isNameSticker({ subject: "reading", kind: "word", label: "mat" }, "Mia")).toBe(false);
    expect(isNameSticker({ subject: "reading", kind: "letter", label: "m" }, "M")).toBe(false);
    expect(isNameSticker({ subject: "reading", kind: "word", label: "mia" }, "")).toBe(false);
  });

  it("says the recorded \"That's your name!\" and never the name itself", () => {
    const cue = stickerCue({ subject: "reading", kind: "word", label: "Mia" }, "Mia");
    expect(cue.src).toMatch(/prompts\/your-name\.mp3$/);
    expect(cue.text).toBe("That's your name!");
    expect(cue.text).not.toMatch(/mia/i);
  });

  it("leaves every other sticker as it was", () => {
    expect(stickerCue({ subject: "reading", kind: "word", label: "mat" }, "Mia").src).toMatch(/words\/mat\.mp3$/);
  });
});
