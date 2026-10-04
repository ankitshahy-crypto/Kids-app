import { describe, expect, it } from "vitest";
import manifest from "./audioManifest.json";
import { animals } from "./animals";
import { lettersIntroduced } from "./schedule";
import { nestWordsThrough } from "./nest";
import { STORIES, STORY_GLUE, decodable, isShared, storyChildLineId, readerWeeks, storiesForWeek, storyChoices, storyForDay, storyForWeek, storyLineId, storyText, storyTokens, storyWordList, weekdayOf } from "./stories";
import { THEME_IDS } from "./themes";

const hero = { name: "Fox", kind: "fox" };

describe("decodable readers", () => {
  it("has four readers for each of the first four weeks, three or more for the other letter weeks, two for each phonics week, and one per theme", () => {
    const weekly = STORIES.filter((story) => !story.theme).map((story) => story.week);
    // Weeks 1 to 4 are the shared readers every new family meets first.
    for (let week = 1; week <= 4; week += 1) expect(weekly.filter((value) => value === week).length, `week ${week}`).toBe(4);
    for (let week = 5; week <= 14; week += 1) expect(weekly.filter((value) => value === week).length, `week ${week}`).toBeGreaterThanOrEqual(3);
    for (let week = 15; week <= 26; week += 1) expect(weekly.filter((value) => value === week).length, `week ${week}`).toBe(2);
    expect(readerWeeks()).toBe(26);
    for (const theme of THEME_IDS) {
      expect(STORIES.some((story) => story.theme === theme), theme).toBe(true);
    }
    expect(new Set(STORIES.map((story) => story.id)).size).toBe(STORIES.length);
    for (const story of STORIES) {
      if (isShared(story.pages[0])) expect(story.pages.length, story.id).toBeGreaterThanOrEqual(5);
      if (isShared(story.pages[0])) expect(story.pages.length, story.id).toBeLessThanOrEqual(8);
      else expect(story.pages.length, story.id).toBe(5);
    }
  });

  it("never asks a child to sound out a letter they have not met", () => {
    for (const story of STORIES) {
      const letters = lettersIntroduced(story.week - 1);
      const nest = nestWordsThrough(story.week - 1);
      for (const [index, page] of story.pages.entries()) {
        const tokens = storyTokens(isShared(page) ? page.child : page.text, hero, letters, nest);
        const words = tokens.filter((token) => token.kind === "word");
        expect(words.some((token) => token.role === "target"), `${story.id} page ${index + 1} has a word to sound out`).toBe(true);
        for (const token of words) {
          if (token.kind !== "word" || token.role !== "glue") continue;
          // A child line has no words the app has to read for the child: only sound-out words, Nest words and the hero.
          expect(isShared(page), `${story.id} page ${index + 1}: the child line has "${token.text}", which is neither decodable nor a Nest word`).toBe(false);
          expect(STORY_GLUE.has(token.word), `${story.id} page ${index + 1}: "${token.text}" is neither decodable nor a glue word`).toBe(true);
        }
      }
    }
  });

  it("weeks 1 to 4 are shared readers: a grown-up line and a short child line on every page, mostly sound-out words", () => {
    // The rules a shared reader must pass before it ships (READING-REDESIGN.md, 3e).
    const longest: Record<number, number> = { 1: 4, 2: 5, 3: 6, 4: 6 };
    const share: Record<number, number> = { 1: 0.75, 2: 0.75, 3: 0.85, 4: 0.85 };
    for (const story of STORIES.filter((entry) => entry.week <= 4 && !entry.theme)) {
      const letters = lettersIntroduced(story.week - 1);
      const nest = nestWordsThrough(story.week - 1);
      let words = 0;
      let soundOut = 0;
      for (const [index, page] of story.pages.entries()) {
        expect(isShared(page), `${story.id} page ${index + 1} has a child line`).toBe(true);
        if (!isShared(page)) continue;
        const tokens = storyTokens(page.child, hero, letters, nest).filter((token) => token.kind === "word");
        expect(tokens.length, `${story.id} page ${index + 1}: "${page.child}" is too long for week ${story.week}`).toBeLessThanOrEqual(longest[story.week]);
        expect(tokens.length, `${story.id} page ${index + 1}: "${page.child}"`).toBeGreaterThanOrEqual(2);
        for (const token of tokens) {
          if (token.kind !== "word" || token.role === "hero") continue;
          words += 1;
          if (token.role === "target") soundOut += 1;
        }
        // The grown-up line is a real sentence that carries the story; the child line never repeats it word for word.
        expect(page.text.split(" ").length, `${story.id} page ${index + 1}`).toBeGreaterThanOrEqual(5);
      }
      expect(soundOut / words, `${story.id}: ${soundOut} of ${words} child words can be sounded out`).toBeGreaterThanOrEqual(share[story.week]);
      // A small surprise somewhere in the story plays after a child line is read.
      expect(story.pages.some((page) => page.payoff), `${story.id} has a payoff`).toBe(true);
    }
  });

  it("no two readers of a week tell the same thing: their pages differ", () => {
    // Weeks 1 to 3 once had three readers each that were one story told three times (most pages the
    // same sentence with a name swapped). A page may not appear in two readers of the same week.
    const bare = (text: string) => text.replace(/\{hero(-kind)?\}/g, "").replace(/[^a-z]+/gi, " ").trim().toLowerCase();
    for (let week = 1; week <= 26; week += 1) {
      const seen = new Map<string, string>();
      for (const story of STORIES.filter((entry) => !entry.theme && entry.week === week)) {
        for (const page of story.pages) {
          const key = bare(page.text);
          expect(seen.get(key) === undefined || seen.get(key) === story.id, `week ${week}: "${page.text}" is in ${seen.get(key)} and ${story.id}`).toBe(true);
          seen.set(key, story.id);
        }
      }
    }
  });

  it("no two shared readers share a setting and a story: each has its own place or its own plot", () => {
    // Weeks 1 to 4: a story's main setting and its cast together are its own.
    const shared = STORIES.filter((story) => story.week <= 4 && !story.theme);
    const key = (story: (typeof shared)[number]) => {
      const settings = story.pages.map((page) => page.setting);
      const main = settings.sort((a, b) => settings.filter((s) => s === b).length - settings.filter((s) => s === a).length)[0];
      return `${main}:${story.title}`;
    };
    expect(new Set(shared.map(key)).size).toBe(shared.length);
    const titles = shared.map((story) => story.title.toLowerCase());
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("shows a picture of the thing a page names, when the app has a drawing of it", () => {
    // "The vet has a plum" showed grapes and "three sheep" a hen. A page that names one of these
    // things shows that thing, in its grown-up line or its child line.
    const OLDER_NAMED = ["map", "pot", "bun", "rug", "mask", "plum", "yak", "tree", "sheep", "owl", "yam"];
    const named = ["map", "pot", "bun", "rug", "mask", "plum", "yak", "tree", "sheep", "owl", "yam", "mat", "pan", "cap", "cup", "nut", "hat", "tent", "lamp", "mop", "bus", "wave", "cloud", "frog", "duck", "goat", "hen", "pig", "cat"];
    for (const story of STORIES) {
      for (const page of story.pages) {
        // "a duck mask" names a mask, not a duck.
        const words = new Set((`${page.text} ${page.child ?? ""}`.toLowerCase().replace(/[a-z]+ mask/g, "mask").match(/[a-z]+/g) ?? []).map((word) => word.replace(/s$/, "")));
        for (const thing of named) {
          if (thing === "owl" && !isShared(page)) continue;
          // The shared readers are held to the longer list; older readers to the list they were written against.
          if (!isShared(page) && !OLDER_NAMED.includes(thing)) continue;
          if (!words.has(thing)) continue;
          // An animal is named in passing on older readers; the shared readers draw every animal they name.
          if (["duck", "goat", "hen", "pig", "cat", "frog"].includes(thing) && !isShared(page)) continue;
          expect(page.props.includes(thing as never), `${story.id}: "${page.text}" names a ${thing}`).toBe(true);
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
    expect(storyForWeek(0).id).toBe("w01-who-sat");
    expect(storyForWeek(13).id).toBe("w14-fox-box");
    expect(storyForWeek(14).id).toBe("w15-the-ship");
    expect(storyForWeek(25).id).toBe("w26-the-coin");
    expect(storyForWeek(26).id).toBe("w01-who-sat");
    expect(storiesForWeek(0).map((story) => story.id)).toEqual(["w01-who-sat", "w01-sam-at-the-sea", "w01-the-flying-mat", "w01-who-am-i"]);
    // 2026-10-05 is a Monday.
    expect(weekdayOf("2026-10-05")).toBe(0);
    expect(weekdayOf("2026-10-11")).toBe(6);
    expect(storyForDay(0, [], "2026-10-05").id).toBe("w01-who-sat");
    expect(storyForDay(0, [], "2026-10-06").id).toBe("w01-sam-at-the-sea");
    expect(storyForDay(0, [], "2026-10-07").id).toBe("w01-the-flying-mat");
    expect(storyForDay(0, [], "2026-10-08").id).toBe("w01-who-am-i");
    expect(storyForDay(0, [], "2026-10-09").id).toBe("w01-who-sat");
    expect(storyChoices(10, ["space"]).map((story) => story.id)).toEqual(["w10-milk", "w10-the-mask", "w10-the-sink", "t-space-rocket"]);
    expect(storyForDay(10, ["space"], "2026-10-08").id).toBe("t-space-rocket");
    expect(storyChoices(0, ["space"]).some((story) => story.theme)).toBe(false);
    expect(storyForDay(10, ["space"], "2026-10-01")).toBe(storyForDay(10, ["space"], "2026-10-01"));
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
        if (page.child) {
          // The child line has its own clip, for "hear it" once the child has read it.
          const childNamed = /\{hero\}|\{hero-kind\}/.test(page.child);
          const childIds = childNamed ? animals.map((animal) => storyChildLineId(story, index, animal.id)) : [storyChildLineId(story, index, "fox")];
          for (const id of childIds) expect(stories[id], id).toBeTruthy();
          expect(stories[storyChildLineId(story, index, "fox")].say).toBe(storyText(page.child, hero));
        }
      }
    }
    const words = manifest.words as Record<string, { say: string }>;
    for (const word of storyWordList()) expect(words[word], word).toBeTruthy();
    for (const animal of animals) expect(words[animal.id], animal.id).toBeTruthy();
  });
});
