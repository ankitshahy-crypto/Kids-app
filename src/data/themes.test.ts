import { describe, expect, it } from "vitest";
import { blendList, letterCard, themedWordsForStep, wordsForStep, wordsToTrace } from "./ladder";
import { THEME_IDS, THEMES, normalizeThemes, themeForDay, themedLetterExample, themedStoryLine } from "./themes";
import { THEME_WORDS, themedEntries, themedWordCatalog } from "./themeWords";

describe("picking themes", () => {
  it("keeps one to three known themes in the order picked", () => {
    expect(normalizeThemes(["space", "dinosaurs"])).toEqual(["space", "dinosaurs"]);
    expect(normalizeThemes(["space", "space", "robots", 3, "bugs", "ocean", "castles"])).toEqual(["space", "bugs", "ocean"]);
    expect(normalizeThemes(undefined)).toEqual([]);
    expect(normalizeThemes("space")).toEqual([]);
  });

  it("names every theme with an object and a story line", () => {
    for (const id of THEME_IDS) {
      expect(THEMES[id].title.length).toBeGreaterThan(2);
      expect(THEMES[id].object.length).toBeGreaterThan(2);
      expect(THEMES[id].story.length).toBeGreaterThan(0);
      expect(Object.keys(THEMES[id].letters).length).toBeGreaterThan(5);
    }
  });
});

describe("themed words", () => {
  it("puts the theme's words first and keeps the regular words after them", () => {
    const words = themedWordsForStep(3, ["vehicles"]).map((word) => word.word);
    expect(words.slice(0, 4)).toEqual(["bus", "van", "jet", "cab"]);
    expect(words).toEqual(expect.arrayContaining(["cat", "sun", "dog"]));
    expect(words.length).toBe(wordsForStep(3).length + 3);
    expect(new Set(words).size).toBe(words.length);
  });

  it("follows the order the themes were picked, without repeats", () => {
    const first = themedWordsForStep(3, ["space", "vehicles"]).map((word) => word.word);
    expect(first.slice(0, 5)).toEqual(["sun", "jet", "bus", "van", "cab"]);
    const other = themedWordsForStep(3, ["vehicles", "space"]).map((word) => word.word);
    expect(other.slice(0, 5)).toEqual(["bus", "van", "jet", "cab", "sun"]);
  });

  it("falls back to the regular list when a theme has nothing for the step", () => {
    expect(themedWordsForStep(5, ["castles"])).toBe(wordsForStep(5));
    expect(themedWordsForStep(2, ["dinosaurs", "ocean"])).toBe(wordsForStep(2));
    expect(themedWordsForStep(3, [])).toBe(wordsForStep(3));
    expect(themedEntries(["castles"], 5)).toEqual([]);
  });

  it("reuses the regular card for a regular word that fits the theme", () => {
    const [bus] = themedWordsForStep(3, ["vehicles"]);
    expect(bus).toBe(wordsForStep(3).find((word) => word.id === "bus"));
    const [cat, dog] = themedWordsForStep(3, ["animals"]);
    expect(cat.id).toBe("cat");
    expect(dog.id).toBe("dog");
  });

  it("gives every themed word a picture and one sound per letter", () => {
    const catalog = themedWordCatalog();
    expect(catalog.length).toBeGreaterThan(15);
    for (const word of catalog) {
      expect(word.letters.map((letter) => letter.char).join(""), word.id).toBe(word.word);
      expect(word.illustration, word.id).toBeTruthy();
      expect(word.letters.every((letter) => letter.phoneme), word.id).toBe(true);
    }
    for (const steps of Object.values(THEME_WORDS)) {
      for (const [step, entries] of Object.entries(steps)) {
        for (const entry of entries) {
          if ("use" in entry) continue;
          if (Number(step) <= 4) expect(entry.word.length, entry.id).toBe(Number(step));
          else expect(entry.word.length, entry.id).toBeGreaterThanOrEqual(5);
        }
      }
    }
  });

  it("themes the blend list and the letter of the week card", () => {
    const blends = blendList(3, ["b", "u", "s"], ["vehicles"]).map((word) => word.word);
    expect(blends[0]).toBe("bus");
    expect(blends).toEqual(expect.arrayContaining(["van", "jet", "cab"]));
    const plain = blendList(3, ["b", "u", "s"]).map((word) => word.word);
    expect(plain).toContain("bus");
    expect(plain).not.toContain("van");

    const card = letterCard("d", ["dinosaurs"]);
    expect(card.word).toBe("dinosaur");
    expect(card.illustration).toBe("dinosaurs");
    expect(card.letters[0].say).toBe("d, as in dinosaur");
    expect(letterCard("d", ["dinosaurs"])).toBe(card);
    expect(letterCard("d").word).toBe("dog");
    expect(letterCard("d").letters[0].say).toBeUndefined();
    expect(letterCard("m", ["ocean"]).word).toBe("moon");
    expect(blendList(1, ["d", "a"], ["dinosaurs"]).map((word) => word.word)).toEqual(["dinosaur", "apple", "a", "I"]);
  });

  it("lets a blended themed word be traced later", () => {
    const traced = wordsToTrace([{ kind: "word", label: "egg" }, { kind: "word", label: "cat" }], 3);
    expect(traced.map((word) => word.word).sort()).toEqual(["cat", "egg"]);
    expect(wordsToTrace([{ kind: "word", label: "truck" }], 3)).toEqual([]);
  });
});

describe("letter examples and story lines by theme", () => {
  it("uses the first picked theme that names the letter", () => {
    expect(themedLetterExample("s", ["space", "bugs"])).toBe("star");
    expect(themedLetterExample("s", ["bugs", "space"])).toBe("spider");
    expect(themedLetterExample("z", ["space"])).toBeNull();
    expect(themedLetterExample("D", ["castles"])).toBe("dragon");
  });

  it("picks the same theme and line all day, and the plain line with no theme", () => {
    expect(themeForDay([], "2026-09-27")).toBeNull();
    expect(themeForDay(["ocean"], "2026-09-27")).toBe("ocean");
    const today = themeForDay(["space", "ocean", "bugs"], "2026-09-27");
    expect(today).toBe(themeForDay(["space", "ocean", "bugs"], "2026-09-27"));
    const days = new Set(["2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"].map((day) => themeForDay(["space", "ocean", "bugs"], day)));
    expect(days.size).toBeGreaterThan(1);
    expect(themedStoryLine("Mia's fox", [], "2026-09-27", "A story is coming next")).toBe("A story is coming next");
    const line = themedStoryLine("Mia's fox", ["ocean"], "2026-09-27", "A story is coming next");
    expect(line.startsWith("Mia's fox")).toBe(true);
    expect(THEMES.ocean.story.map((story) => story.replace("{hero}", "Mia's fox"))).toContain(line);
  });
});
