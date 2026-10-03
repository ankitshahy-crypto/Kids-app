import { describe, expect, it } from "vitest";
import { MODULE_BUILD, MODULE_CODE, MODULE_COLORS, MODULE_NUMBERS, MODULE_SCIENCE, MODULE_TIME, MODULE_WORDS, PRODUCT_NAME } from "../brand";
import { EXPLORE_SECTIONS, type ExploreSection } from "../explore/sections";
import { aboutContent, aboutFor, aboutSubjects, dailyLessonHelp, series, type Hidden } from "./about";

/**
 * A section can be held back from the app people install (HELD_BACK in src/explore/flags.ts).
 * Review of #134 found that About and the Help page went on describing held-back sections, and
 * counted "seven sections" by hand. These tests hold sections back and read the copy.
 */

const hide = (...sections: ExploreSection[]): Hidden => (section) => sections.includes(section);

/** The name each Explore section goes by in the copy. */
const NAMES: Record<ExploreSection, string> = {
  math: MODULE_NUMBERS,
  colors: MODULE_COLORS,
  time: MODULE_TIME,
  build: MODULE_BUILD,
  science: MODULE_SCIENCE,
  games: MODULE_CODE,
};

/** The paragraphs of About and the Help page for a build. */
function paragraphs(hidden: Hidden): string[] {
  const about = aboutFor(hidden);
  return [about.description, about.teaches, about.disclaimer, ...about.features.map((feature) => feature.body), dailyLessonHelp(hidden)];
}

/** Every word of that copy, feature titles included, as one string. */
function everything(hidden: Hidden): string {
  return [...paragraphs(hidden), ...aboutFor(hidden).features.map((feature) => feature.title)].join("\n");
}

/** Copy put together from pieces must still read as sentences: no gaps, no stray commas, a full stop at the end. */
function expectTidy(hidden: Hidden, label: string) {
  for (const paragraph of paragraphs(hidden)) {
    expect(paragraph, label).not.toMatch(/ {2}| [,.]|,,|\.\.|, and\.|\band and\b/);
    expect(paragraph, label).toMatch(/[.!”]$/);
  }
}

describe("About with nothing held back", () => {
  it("names every section and counts seven", () => {
    const text = everything(() => false);
    for (const name of [MODULE_WORDS, ...Object.values(NAMES)]) expect(text).toContain(name);
    expect(aboutContent.teaches.startsWith(`${PRODUCT_NAME} has seven sections. `)).toBe(true);
    expect(aboutContent.description).toContain("first steps into letters, numbers, colors, games and coding, time and money, building, and science, one small step");
    expect(aboutContent.disclaimer).toContain("is reading, math, colors, games and coding, time and money, building, and science practice");
    expect(aboutSubjects(() => false)).toEqual(["math", "colors", "time", "build", "science"]);
    expectTidy(() => false, "nothing held back");
  });

  it("is the copy the store listing uses", () => {
    expect(aboutContent).toEqual(aboutFor(() => false));
  });
});

describe("About with a section held back", () => {
  for (const section of EXPLORE_SECTIONS) {
    it(`does not mention ${section} anywhere, and counts six`, () => {
      const hidden = hide(section);
      const text = everything(hidden);
      expect(text).not.toContain(NAMES[section]);
      // The others are all still there.
      for (const other of EXPLORE_SECTIONS) if (other !== section) expect(text, other).toContain(NAMES[other]);
      expect(aboutFor(hidden).teaches.startsWith(`${PRODUCT_NAME} has six sections. `)).toBe(true);
      expect(aboutFor(hidden).features.map((feature) => feature.id)).not.toContain(section);
      expect(aboutSubjects(hidden)).not.toContain(section);
      expectTidy(hidden, section);
    });
  }

  it("leaves out Time & Money, Build and Science together, as the build after the first phone test did", () => {
    const hidden = hide("time", "build", "science");
    const about = aboutFor(hidden);
    const text = everything(hidden);
    for (const section of ["time", "build", "science"] as const) expect(text).not.toContain(NAMES[section]);
    // Nothing of theirs is promised either: not their games, not their stickers.
    expect(text).not.toMatch(/clock|coin|money|lemonade|bridge|tower|\bramps?\b|simple machines|seed|sink or float|weather|five senses/i);
    expect(about.teaches.startsWith(`${PRODUCT_NAME} has four sections. `)).toBe(true);
    expect(about.description).toContain("first steps into letters, numbers, colors, and games and coding, one small step");
    expect(about.description).toContain("and harder coding work for ages 5 to 7");
    expect(about.disclaimer).toContain("is reading, math, colors, and games and coding practice");
    expect(about.features.find((feature) => feature.id === "rewards")?.body).toContain("a sticker book of letters, numbers, colors, and baby animals, and a growing nest");
    expect(about.features.map((feature) => feature.id)).toEqual(["hero", "voice", "calm", "themes", "blend", "lesson", "stars", "rewards", "math", "colors", "games", "classroom", "grownups"]);
    expect(aboutSubjects(hidden)).toEqual(["math", "colors"]);
    expect(dailyLessonHelp(hidden)).toContain(`Explore adds ${MODULE_NUMBERS}, ${MODULE_COLORS}, and ${MODULE_CODE}.`);
    expectTidy(hidden, "time, build and science");
  });

  it("still reads as sentences with only reading left", () => {
    const about = aboutFor(() => true);
    const text = everything(() => true);
    for (const name of Object.values(NAMES)) expect(text).not.toContain(name);
    expect(text).toContain(MODULE_WORDS);
    expect(about.teaches.startsWith(`${PRODUCT_NAME} has one section. `)).toBe(true);
    expect(about.description).toContain("first steps into letters, one small step");
    expect(about.description).toContain("a gentle start for ages 3 to 5 and longer words and sentences for ages 5 to 7.");
    expect(about.disclaimer).toContain("is reading practice for young children.");
    expect(dailyLessonHelp(() => true)).not.toContain("Explore adds");
    expect(aboutSubjects(() => true)).toEqual([]);
    expectTidy(() => true, "everything held back");
  });
});

describe("the Help page's daily lesson paragraph", () => {
  it("names what is in the app now", () => {
    const help = dailyLessonHelp(() => false);
    expect(help).toContain(`Explore adds ${MODULE_NUMBERS}, ${MODULE_COLORS}, ${MODULE_TIME}, ${MODULE_BUILD}, ${MODULE_SCIENCE}, and ${MODULE_CODE}.`);
    // The experiment that fizzed left Science when it was rebuilt. The paragraph still described it.
    expect(help).not.toMatch(/fizz/i);
    expect(help).toContain("The daily goal counts time on all of them.");
  });
});

describe("series", () => {
  it("joins one, two and more with commas and an and", () => {
    expect(series([])).toBe("");
    expect(series(["a"])).toBe("a");
    expect(series(["a", "b"])).toBe("a and b");
    expect(series(["a", "b", "c"])).toBe("a, b, and c");
  });
});
