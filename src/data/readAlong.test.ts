import { describe, expect, it } from "vitest";
import manifest from "./audioManifest.json";
import timings from "./storyTimings.json";
import { animals } from "./animals";
import { estimateTimes, fitsLine, lineWords, speechMs, wordAtChar, wordAtTime, wordOffsets } from "./readAlong";
import { STORIES, storyLineId, storyText, storyTokens } from "./stories";

describe("follow-along reading", () => {
  it("lights the first word from the start, each word at its time, and lets go at the end", () => {
    const times = [120, 480, 700, 900, 1300];
    expect(wordAtTime(times, 0)).toBe(0);
    expect(wordAtTime(times, 479)).toBe(0);
    expect(wordAtTime(times, 480)).toBe(1);
    expect(wordAtTime(times, 899)).toBe(2);
    expect(wordAtTime(times, 1299)).toBe(3);
    expect(wordAtTime(times, 1300)).toBeNull();
    expect(wordAtTime([0], 10)).toBeNull();
  });

  it("shares a clip's length out by letters when a page has no times yet", () => {
    const words = ["I", "am", "Fox."];
    const times = estimateTimes(words, 1600);
    expect(times).toHaveLength(4);
    expect(fitsLine(times, 3)).toBe(true);
    expect(times[0]).toBe(150);
    // A longer word gets a longer turn.
    expect(times[3] - times[2]).toBeGreaterThan(times[1] - times[0]);
    expect(times[3]).toBeLessThanOrEqual(1600);
    // A very short clip still gives every word a moment.
    expect(estimateTimes(["a", "b", "c"], 100).at(-1)! - 150).toBeGreaterThanOrEqual(600);
    expect(speechMs("Fox has a hat.", 1)).toBeGreaterThan(speechMs("Fox has a hat.", 2));
  });

  it("follows the device voice by letter position", () => {
    const text = "Fox has a big hat.";
    const offsets = wordOffsets(text);
    expect(offsets).toEqual([0, 4, 8, 10, 14]);
    expect(wordAtChar(offsets, 0)).toBe(0);
    expect(wordAtChar(offsets, 4)).toBe(1);
    expect(wordAtChar(offsets, 11)).toBe(3);
    expect(wordAtChar(offsets, 99)).toBe(4);
    expect(wordAtChar([], 3)).toBeNull();
  });

  it("only uses times that fit the page", () => {
    expect(fitsLine([0, 100, 200], 2)).toBe(true);
    expect(fitsLine([0, 100], 2)).toBe(false);
    expect(fitsLine([0, 300, 200], 2)).toBe(false);
    expect(fitsLine(undefined, 2)).toBe(false);
    expect(fitsLine([0], 0)).toBe(false);
  });

  it("counts the same words the reader shows as buttons, on every page for every animal", () => {
    for (const story of STORIES) {
      story.pages.forEach((page, index) => {
        for (const animal of animals) {
          const hero = { name: animal.name, kind: animal.id };
          const buttons = storyTokens(page.text, hero, []).filter((token) => token.kind === "word").length;
          const spoken = lineWords(storyText(page.text, hero)).length;
          expect(spoken, `${story.id} p${index + 1} ${animal.id}`).toBe(buttons);
          // The narrator's clip says the same line, so its words line up with the buttons.
          const cue = (manifest.stories as Record<string, { say: string }>)[storyLineId(story, index, animal.id)];
          expect(cue, storyLineId(story, index, animal.id)).toBeTruthy();
          expect(lineWords(cue.say).length, storyLineId(story, index, animal.id)).toBe(buttons);
        }
      });
    }
  });

  it("keeps word times only for story pages that exist, one per word plus the end", () => {
    const lines = (timings as { version: number; lines: Record<string, number[]> }).lines;
    const stories = manifest.stories as Record<string, { say: string }>;
    for (const [id, times] of Object.entries(lines)) {
      expect(stories[id], id).toBeTruthy();
      expect(fitsLine(times, lineWords(stories[id].say).length), id).toBe(true);
    }
  });
});
