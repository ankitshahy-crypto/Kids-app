import { describe, expect, it } from "vitest";
import manifest from "./audioManifest.json";
import { animals } from "./animals";
import { lettersIntroduced } from "./schedule";
import { STORIES, STORY_GLUE, decodable, readerWeeks, storiesForWeek, storyChoices, storyForDay, storyForWeek, storyLineId, storyText, storyTokens, storyWordList, weekdayOf } from "./stories";
import { THEME_IDS } from "./themes";

const hero = { name: "Fox", kind: "fox" };

describe("decodable readers", () => {
  it("has three readers for each of the fourteen letter weeks, two for each phonics week, and one per theme", () => {
    const weekly = STORIES.filter((story) => !story.theme).map((story) => story.week);
    for (let week = 1; week <= 14; week += 1) {
      expect(weekly.filter((value) => value === week).length, `week ${week}`).toBe(3);
    }
    for (let week = 15; week <= 26; week += 1) {
      expect(weekly.filter((value) => value === week).length, `week ${week}`).toBe(2);
    }
    expect(readerWeeks()).toBe(26);
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
    // Sound units: a word waits for its team, and a sight word is always read whole.
    expect(decodable("moon", ["m", "o", "n", "oo"])).toBe(true);
    expect(decodable("ship", ["s", "h", "i", "p"])).toBe(false);
    expect(decodable("ship", ["s", "h", "i", "p", "sh"])).toBe(true);
    expect(decodable("cake", ["c", "a", "k", "e"])).toBe(false);
    expect(decodable("cake", ["c", "a", "k", "e", "a_e"])).toBe(true);
    expect(decodable("kick", ["k", "i", "c"])).toBe(true);
    expect(decodable("the", ["t", "h", "e", "th"])).toBe(false);
    expect(decodable("cow", ["c", "o", "w"])).toBe(false);
    expect(decodable("happy", ["h", "a", "p", "y", "ee"])).toBe(true);
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

  it("picks among the week's readers, brings in themed readers once their letters are taught, and repeats by day", () => {
    expect(storyForWeek(0).id).toBe("w01-i-am");
    expect(storyForWeek(13).id).toBe("w14-fox-box");
    expect(storyForWeek(14).id).toBe("w15-the-ship");
    expect(storyForWeek(25).id).toBe("w26-the-coin");
    expect(storyForWeek(26).id).toBe("w01-i-am");
    expect(storiesForWeek(0).map((story) => story.id)).toEqual(["w01-i-am", "w01-am-i-big", "w01-look-at-me"]);
    // 2026-10-05 is a Monday.
    expect(weekdayOf("2026-10-05")).toBe(0);
    expect(weekdayOf("2026-10-11")).toBe(6);
    expect(storyForDay(0, [], "2026-10-05").id).toBe("w01-i-am");
    expect(storyForDay(0, [], "2026-10-06").id).toBe("w01-am-i-big");
    expect(storyForDay(0, [], "2026-10-07").id).toBe("w01-look-at-me");
    expect(storyForDay(0, [], "2026-10-08").id).toBe("w01-i-am");
    expect(storyChoices(9, ["space"]).map((story) => story.id)).toEqual(["w10-milk", "w10-the-mask", "w10-the-sink", "t-space-rocket"]);
    expect(storyForDay(9, ["space"], "2026-10-08").id).toBe("t-space-rocket");
    expect(storyChoices(0, ["space"]).some((story) => story.theme)).toBe(false);
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
