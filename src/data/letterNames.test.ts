import { describe, expect, it } from "vitest";
import manifest from "./audioManifest.json";
import { LETTER_NAMES, letterName, nameLetters } from "./letterNames";
import { nameGlyphs } from "./tracePractice";

const spell = (manifest as unknown as { spell: Record<string, { file: string; say: string }> }).spell;

describe("letter names", () => {
  it("names every letter, and the clip list spells each one the same way", () => {
    expect(Object.keys(LETTER_NAMES).join("")).toBe("abcdefghijklmnopqrstuvwxyz");
    for (const [letter, name] of Object.entries(LETTER_NAMES)) {
      expect(spell[letter], letter).toEqual({ file: `spell/${letter}.mp3`, say: name, source: "neural" });
      expect(letterName(letter)).toBe(name);
      expect(letterName(letter.toUpperCase())).toBe(name);
    }
    expect(letterName("-")).toBe("-");
  });

  it("spells a name with the letters it traces, in order", () => {
    expect(nameLetters("Mia")).toEqual(["m", "i", "a"]);
    expect(nameLetters("Mary-Jo")).toEqual(["m", "a", "r", "y", "j", "o"]);
    for (const name of ["Mia", "Leo", "Mary-Jo", "Zoë"]) {
      expect(nameLetters(name)).toEqual(nameGlyphs(name).map((glyph) => glyph.label.toLowerCase()));
    }
  });
});
