import { describe, expect, it } from "vitest";
import manifest from "./audioManifest.json";
import { LETTER_WORDS, letterWord } from "./letterWords";
import { pairLine, pairPromptId } from "./letterPairs";
import { letterSchedule } from "./schedule";
import { pictureForLetter } from "./sheets";
import { lettersOnly } from "./units";
import { readTip } from "../content/tips";

type Cue = { file: string; say: string };
const letters = manifest.letters as Record<string, Cue>;
const words = manifest.words as Record<string, Cue>;
const prompts = manifest.prompts as Record<string, Cue>;

/**
 * One picture word per letter, everywhere. The first phone test found the
 * card, the Draw line, the tip and the printable sheet each naming a
 * different word for the same letter.
 */
describe("the picture word for each letter", () => {
  it("covers the 26 letters of the plan, each with a drawing no other letter uses", () => {
    const planned = lettersOnly(letterSchedule.flatMap((week) => week.newLetters));
    expect(Object.keys(LETTER_WORDS).sort()).toEqual([...planned].sort());
    const drawings = Object.values(LETTER_WORDS).map((entry) => entry.illustration);
    // That each name is a real drawing is checked by its type (IllustrationName) when the app is built.
    expect(new Set(drawings).size).toBe(26);
  });

  it("starts with its letter's sound (x ends its word)", () => {
    for (const { letter, word } of Object.values(LETTER_WORDS)) {
      if (letter === "x") expect(word.endsWith("x")).toBe(true);
      else expect(word.toLowerCase().startsWith(letter), `${letter}: ${word}`).toBe(true);
    }
    // A short vowel is heard at the start of its word, not in the middle (i was "pig", o was "dog").
    expect(["a", "e", "i", "o", "u"].map((vowel) => letterWord(vowel).word)).toEqual(["apple", "egg", "igloo", "octopus", "umbrella"]);
  });

  it("is the word in the letter's clip, its own word clip, the Draw line, the tip and the sheet", () => {
    for (const { letter, word } of Object.values(LETTER_WORDS)) {
      expect(letters[letter].say, letter).toBe(`${letter}, as in ${word}`);
      expect(words[word.toLowerCase().replace(/\s+/g, "-")]?.say, word).toBe(word);
      expect(prompts[pairPromptId(letter)].say).toBe(pairLine(letter));
      expect(pairLine(letter).endsWith(`as in ${word}`)).toBe(true);
      expect(readTip("letter", "end", letter).text).toContain(word);
      expect(pictureForLetter(letter).word).toBe(word);
    }
  });
});
