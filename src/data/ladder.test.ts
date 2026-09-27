import { describe, expect, it } from "vitest";
import manifest from "./audioManifest.json";
import { hatchRound, rhymeRound, wordBlank } from "./games";
import {
  assignLadderStep,
  blendList,
  emptyLadder,
  ladderClips,
  ladderDetail,
  letterCard,
  letterCards,
  letterExample,
  normalizeLadder,
  phonicsOpen,
  recordLadderSuccess,
  sentencesForStep,
  wordsForStep,
  wordsToTrace,
} from "./ladder";
import { letterPlanSize } from "./schedule";
import { wordGlyphs } from "./tracePractice";

const say = (kind: "words" | "sentences", id: string) =>
  (manifest[kind] as Record<string, { say: string; source: string; file: string }>)[id];

describe("word ladder lists", () => {
  it("starts with one-letter words, then two-letter words, then short words", () => {
    expect(wordsForStep(1).map((word) => word.word)).toEqual(["a", "I"]);
    expect(wordsForStep(2).map((word) => word.word)).toEqual(["at", "in", "it", "up", "on", "am", "is", "an"]);
    expect(wordsForStep(3).map((word) => word.word)).toEqual(
      expect.arrayContaining(["cat", "sun", "dog"]),
    );
    expect(wordsForStep(3).every((word) => word.word.length === 3)).toBe(true);
  });

  it("uses four-letter words, then longer words and short sentences", () => {
    const four = wordsForStep(4).map((word) => word.word);
    expect(four).toEqual(expect.arrayContaining(["frog", "jump", "fish", "milk"]));
    expect(wordsForStep(4).every((word) => word.word.length === 4)).toBe(true);
    expect(wordsForStep(5).every((word) => word.word.length >= 5)).toBe(true);
    expect(sentencesForStep(4)).toEqual([]);
    expect(sentencesForStep(5).map((line) => line.sentenceId)).toEqual(["i-am", "a-cat", "sun-is-up", "see-dog"]);
    expect(ladderDetail(5)).toMatch(/sentence/i);
  });

  it("gives every word and sentence a neural line", () => {
    const clips = ladderClips();
    expect(clips.length).toBeGreaterThan(20);
    for (const clip of clips) {
      const cue = say(clip.kind, clip.id);
      expect(cue, clip.id).toBeTruthy();
      expect(cue.say).toBe(clip.say);
      expect(cue.source).toBe("neural");
      expect(cue.file.endsWith(".mp3")).toBe(true);
    }
  });
});

describe("word ladder progression", () => {
  it("moves up after three successes and never moves back", () => {
    let ladder = emptyLadder();
    ladder = recordLadderSuccess(ladder).ladder;
    ladder = recordLadderSuccess(ladder).ladder;
    expect(ladder).toEqual({ step: 1, successes: 2 });
    const next = recordLadderSuccess(ladder);
    expect(next.advanced).toBe(true);
    expect(next.ladder).toEqual({ step: 2, successes: 0 });
    const stayed = recordLadderSuccess({ step: 2, successes: 0 });
    expect(stayed.ladder.step).toBeGreaterThanOrEqual(2);
  });

  it("keeps step 4 until phonics is open", () => {
    const waiting = recordLadderSuccess({ step: 4, successes: 2 }, { phonicsOpen: false });
    expect(waiting.advanced).toBe(false);
    expect(waiting.ladder).toEqual({ step: 4, successes: 3 });
    const opened = recordLadderSuccess({ step: 4, successes: 2 }, { phonicsOpen: true });
    expect(opened.advanced).toBe(true);
    expect(opened.ladder.step).toBe(5);
    expect(phonicsOpen(letterPlanSize())).toBe(true);
    expect(phonicsOpen(letterPlanSize() - 1)).toBe(false);
  });

  it("lets a teacher set the step, including phonics", () => {
    expect(assignLadderStep({ step: 1, successes: 2 }, 3)).toEqual({ step: 3, successes: 0 });
    expect(assignLadderStep({ step: 2, successes: 1 }, 5).step).toBe(5);
  });

  it("feeds hatch, spin, tracing, and rhyme from the same step", () => {
    const early = hatchRound(["m", "a", "s", "t"], 1, wordsForStep(1));
    expect(early.word.word).toBe("a");
    const two = wordBlank(["a", "t"], 1, wordsForStep(2));
    expect(two.word.word).toBe("at");
    expect(two.blank).toBe(0);
    const traced = wordsToTrace(
      [
        { kind: "word", label: "cat" },
        { kind: "word", label: "frog" },
      ],
      3,
    );
    expect(traced.map((word) => word.word)).toEqual(["cat"]);
    expect(wordGlyphs("I").map((glyph) => glyph.label)).toEqual(["I"]);
    const blends = blendList(1, ["m", "a"]);
    expect(blends.map((word) => word.word)).toEqual(["moon", "apple", "a", "I"]);
    expect(blends.filter((word) => !word.letterCard).map((word) => word.word)).toEqual(["a", "I"]);
    const rhymes = rhymeRound("abcdefghijklmnopqrstuvwxyz".split(""), 0, 4);
    expect(rhymes.some((card) => card.word.length === 4)).toBe(true);
    expect(rhymeRound(["m", "a", "s", "t", "p", "i", "n"], 0).map((card) => card.word).sort()).toEqual([
      "map",
      "pin",
      "tap",
      "tin",
    ]);
  });
});

describe("letter of the week cards", () => {
  it("names the example word from the letter phrase", () => {
    expect(letterExample("m")).toBe("moon");
    expect(letterExample("a")).toBe("apple");
    expect(letterExample("S")).toBe("sun");
  });

  it("builds one-tile cards, with a drawing when it matches the phrase", () => {
    const m = letterCard("m");
    expect(m.id).toBe("letter-m");
    expect(m.letterCard).toBe(true);
    expect(m.word).toBe("moon");
    expect(m.glyph).toBe("M");
    expect(m.letters.map((tile) => tile.char)).toEqual(["m"]);
    expect(m.letters[0].phoneme).toBe("m");
    const a = letterCard("a");
    expect(a.illustration).toBe("apple");
    expect(a.glyph).toBeUndefined();
    expect(a.letters[0].phoneme).toBe("ae");
  });

  it("leads step 1 with the week's letters, then the one-letter words", () => {
    expect(blendList(1, ["m", "a"]).map((word) => word.id)).toEqual(["letter-m", "letter-a", "a", "i"]);
    expect(blendList(1, ["M", "m", "?"]).map((word) => word.id)).toEqual(["letter-m", "a", "i"]);
    expect(blendList(2, ["m", "a"]).some((word) => word.letterCard)).toBe(false);
    expect(letterCards([]).length).toBe(0);
  });
});

describe("one ladder try per word per day", () => {
  it("counts a replay once today and again tomorrow", () => {
    let ladder = recordLadderSuccess(emptyLadder(), { word: "cat", day: "2026-09-27" }).ladder;
    expect(ladder.successes).toBe(1);
    ladder = recordLadderSuccess(ladder, { word: "cat", day: "2026-09-27" }).ladder;
    ladder = recordLadderSuccess(ladder, { word: "CAT ", day: "2026-09-27" }).ladder;
    expect(ladder.successes).toBe(1);
    expect(ladder.words).toEqual(["cat"]);
    ladder = recordLadderSuccess(ladder, { word: "sun", day: "2026-09-27" }).ladder;
    expect(ladder.successes).toBe(2);
    const tomorrow = recordLadderSuccess(ladder, { word: "cat", day: "2026-09-28" });
    expect(tomorrow.advanced).toBe(true);
    expect(tomorrow.ladder.step).toBe(2);
    expect(tomorrow.ladder.day).toBe("2026-09-28");
    expect(tomorrow.ladder.words).toEqual(["cat"]);
  });

  it("keeps the day memo through storage and drops a stale one", () => {
    expect(normalizeLadder({ step: 2, successes: 1, day: "2026-09-27", words: ["at", "at", 3] })).toEqual({
      step: 2,
      successes: 1,
      day: "2026-09-27",
      words: ["at"],
    });
    expect(normalizeLadder({ step: 2, successes: 1, day: "yesterday", words: ["at"] })).toEqual({ step: 2, successes: 1 });
    expect(recordLadderSuccess(emptyLadder()).ladder).toEqual({ step: 1, successes: 1 });
  });
});
