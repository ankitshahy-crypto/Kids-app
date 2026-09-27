import { describe, expect, it } from "vitest";
import manifest from "./audioManifest.json";
import { animals } from "./animals";
import { lettersIntroduced } from "./schedule";
import { STORIES, STORY_GLUE, decodable, storyForDay, storyForWeek, storyLineId, storyText, storyTokens, storyWordList } from "./stories";
import { THEME_IDS } from "./themes";

const hero = { name: "Fox", kind: "fox" };

describe("decodable readers", () => {
  it("has a reader for each of the fourteen letter weeks and one per theme", () => {
    const weekly = STORIES.filter((story) => !story.theme).map((story) => story.week).sort((a, b) => a - b);
    expect(weekly).toEqual(Array.from({ length: 14 }, (_, index) => index + 1));
    for (const theme of THEME_IDS) {
      expect(STORIES.some((story) => story.theme === theme), theme).toBe(true);
    }
    expect(new Set(STORIES.map((story) => story.id)).size).toBe(STORIES.length);
    for (const story of STORIES) expect(story.pages.length, story.id).toBe(5);
  });

  it("never asks a child to sound out a letter they have not met", () => {
    for (const story of STORIES) {
      const letters = lettersIntroduced(story.week - 1);
      for (const [index, page] of story.pages.entries()) {
        const tokens = storyTokens(page.text, hero, letters);
        const words = tokens.filter((token) => token.kind === "word");
        expect(words.some((token) => token.role === "target"), `${story.id} page ${index + 1} has a word to sound out`).toBe(true);
        for (const token of words) {
          if (token.kind !== "word" || token.role !== "glue") continue;
          expect(STORY_GLUE.has(token.word), `${story.id} page ${index + 1}: "${token.text}" is neither decodable nor a glue word`).toBe(true);
        }
      }
    }
  });

  it("marks words the child can blend and reads the rest", () => {
    expect(decodable("am", ["m", "a"])).toBe(true);
    expect(decodable("sat", ["m", "a"])).toBe(false);
    expect(decodable("moon", ["m", "o", "n"])).toBe(false);
    const tokens = storyTokens("Hi! I am {hero}.", hero, ["m", "a"]);
    expect(tokens.map((token) => (token.kind === "word" ? `${token.text}:${token.role}` : token.text))).toEqual([
      "Hi:glue",
      "! ",
      "I:glue",
      " ",
      "am:target",
      " ",
      "Fox:hero",
      ".",
    ]);
    expect(storyText("{hero} is a {hero-kind}.", hero)).toBe("Fox is a fox.");
  });

  it("picks the week's reader, brings in themed readers once their letters are taught, and repeats by day", () => {
    expect(storyForWeek(0).id).toBe("w01-i-am");
    expect(storyForWeek(13).id).toBe("w14-fox-box");
    expect(storyForWeek(14).id).toBe("w01-i-am");
    expect(storyForDay(0, ["space"], "2026-09-27").id).toBe("w01-i-am");
    const picks = new Set(["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06"].map((day) => storyForDay(9, ["space"], day).id));
    expect(picks).toContain("w10-milk");
    expect(picks).toContain("t-space-rocket");
    expect(storyForDay(9, ["space"], "2026-10-01")).toBe(storyForDay(9, ["space"], "2026-10-01"));
  });

  it("names a narration clip for every page, with the hero's animal when the line names the hero", () => {
    const stories = manifest.stories as Record<string, { say: string; source: string }>;
    for (const story of STORIES) {
      for (const [index, page] of story.pages.entries()) {
        const named = /\{hero\}|\{hero-kind\}/.test(page.text);
        const ids = named ? animals.map((animal) => storyLineId(story, index, animal.id)) : [storyLineId(story, index, "fox")];
        for (const id of ids) {
          expect(stories[id], id).toBeTruthy();
          expect(stories[id].source).toBe("neural");
        }
        expect(stories[storyLineId(story, index, "fox")].say).toBe(storyText(page.text, hero));
      }
    }
    const words = manifest.words as Record<string, { say: string }>;
    for (const word of storyWordList()) expect(words[word], word).toBeTruthy();
    for (const animal of animals) expect(words[animal.id], animal.id).toBeTruthy();
  });
});
