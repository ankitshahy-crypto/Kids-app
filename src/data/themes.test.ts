import { describe, expect, it } from "vitest";
import { blendList, decodable, letterCard, wordsForStep, wordsToTrace } from "./ladder";
import { lettersIntroduced } from "./schedule";
import { THEME_IDS, THEMES, normalizeThemes, themeForDay, themedStoryLine } from "./themes";
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
    }
  });
});

describe("themed words", () => {
  // Week 9: every letter of bus, van, jet and cab has been taught except v and j.
  const all = lettersIntroduced(13);
  const words = (themes: Parameters<typeof blendList>[2], turn = 0) =>
    blendList(3, ["x", "q"], themes, all, turn)
      .filter((word) => !word.letterCard)
      .map((word) => word.word);

  it("opens the lesson's words with up to two of the theme's words", () => {
    expect(words(["vehicles"]).slice(0, 2)).toEqual(["bus", "van"]);
    // The next day brings the theme's next two.
    expect(words(["vehicles"], 1).slice(0, 2)).toEqual(["jet", "cab"]);
    expect(new Set(words(["vehicles"])).size).toBe(words(["vehicles"]).length);
    expect(words(["vehicles"])).toHaveLength(6);
  });

  it("follows the order the themes were picked, without repeats", () => {
    expect(words(["space", "vehicles"]).slice(0, 2)).toEqual(["sun", "jet"]);
    expect(words(["vehicles", "space"]).slice(0, 2)).toEqual(["bus", "van"]);
  });

  it("falls back to the regular list when a theme has nothing for the step", () => {
    expect(themedEntries(["castles"], 5)).toEqual([]);
    expect(words([])).toEqual(words(["castles"]).length === 6 ? words([]) : []);
    expect(blendList(2, ["m", "a"], ["dinosaurs", "ocean"], lettersIntroduced(0), 0).map((word) => word.id)).toEqual(["letter-m", "letter-a", "am"]);
  });

  it("reuses the regular card for a regular word that fits the theme", () => {
    const bus = blendList(3, ["x", "q"], ["vehicles"], all, 0).find((word) => word.id === "bus");
    expect(bus).toBe(wordsForStep(3).find((word) => word.id === "bus"));
    expect(words(["animals"]).slice(0, 2)).toEqual(["cat", "dog"]);
  });

  it("never shows a themed word the child cannot sound out yet", () => {
    // Week 1 knows m and a: a child who picked trucks still starts with M, A and am, not bus and van.
    for (const theme of THEME_IDS) {
      for (let week = 0; week < 14; week += 1) {
        const taught = new Set(lettersIntroduced(week));
        for (const word of blendList(4, [...taught].slice(-2), [theme], [...taught], week)) {
          if (word.letterCard) continue;
          expect(decodable(word, taught), `${theme}, week ${week + 1}: ${word.word}`).toBe(true);
        }
      }
    }
  });

  it("gives every themed word a picture and one sound per letter", () => {
    const catalog = themedWordCatalog();
    // Most themed words are regular ladder words reused; a few (egg, truck, star) are the theme's own.
    expect(catalog.length).toBeGreaterThan(3);
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

  it("themes the words, and leaves the letter card as it is", () => {
    const blends = blendList(3, ["b", "u", "s"], ["vehicles"]).map((word) => word.word);
    expect(blends).toContain("bus");
    expect(blends).toEqual(expect.arrayContaining(["van"]));
    // A letter has one picture word for every child: "d, as in dog", never "d, as in dinosaur" for some.
    expect(blendList(1, ["d", "a"], ["dinosaurs"]).slice(0, 2)).toEqual([letterCard("d"), letterCard("a")]);
    expect(letterCard("d").word).toBe("dog");
    expect(letterCard("m").word).toBe("moon");
  });

  it("lets a blended themed word be traced later", () => {
    const traced = wordsToTrace([{ kind: "word", label: "egg" }, { kind: "word", label: "cat" }], 3);
    expect(traced.map((word) => word.word).sort()).toEqual(["cat", "egg"]);
    expect(wordsToTrace([{ kind: "word", label: "truck" }], 3)).toEqual([]);
  });
});

describe("story lines by theme", () => {
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
