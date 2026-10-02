import { describe, expect, it } from "vitest";
import manifest from "./audioManifest.json";
import { hatchRound, wordBlank } from "./games";
import {
  assignLadderStep,
  blendList,
  countsForLadder,
  decodable,
  emptyLadder,
  ladderCap,
  ladderClips,
  ladderDetail,
  letterCard,
  letterCards,
  letterExample,
  normalizeLadder,
  phonicsOpen,
  pictureWords,
  pictureWordsForStep,
  recordLadderSuccess,
  sentencesForStep,
  wordsForStep,
  wordsToTrace,
} from "./ladder";
import { alphabetSize, letterPlanSize, letterSchedule, lettersIntroduced } from "./schedule";
import { wordGlyphs } from "./tracePractice";

const say = (kind: "words" | "sentences", id: string) =>
  (manifest[kind] as Record<string, { say: string; source: string; file: string }>)[id];

describe("word ladder lists", () => {
  it("has no one-letter words, then two-letter words, then short words", () => {
    // Step 1 is the letter cards. Its old words, "a" and "I", looked like a second A card and an I card.
    expect(wordsForStep(1)).toEqual([]);
    // "is" is not sounded out: its s says z.
    expect(wordsForStep(2).map((word) => word.word)).toEqual(["am", "at", "an", "in", "it", "on", "up"]);
    expect(wordsForStep(3).map((word) => word.word)).toEqual(
      expect.arrayContaining(["cat", "sun", "dog", "mat", "sat"]),
    );
    expect(wordsForStep(3).every((word) => word.word.length === 3)).toBe(true);
  });

  it("shows a drawing only when the drawing is that word", () => {
    // The first phone test: pin showed a toy, pan showed sand, sad showed a smiling child, an showed an ant.
    for (const step of [2, 3, 4, 5] as const) {
      for (const word of wordsForStep(step)) {
        if (!word.illustration) continue;
        const same = word.illustration === word.id;
        const known = { stop: "stopsign", jump: "jumper" }[word.id] === word.illustration;
        expect(same || known, `${word.id} shows ${word.illustration}`).toBe(true);
      }
    }
    expect(wordsForStep(2).every((word) => !word.illustration)).toBe(true);
    expect(pictureWordsForStep(2)).toEqual([]);
    expect(pictureWordsForStep(3).map((word) => word.id)).toEqual(expect.arrayContaining(["mat", "map", "pin", "pan", "sad"]));
    expect(pictureWords().every((word) => Boolean(word.illustration))).toBe(true);
  });

  it("uses four-letter words, then longer words and short sentences", () => {
    const four = wordsForStep(4).map((word) => word.word);
    expect(four).toEqual(expect.arrayContaining(["frog", "jump", "fish", "milk"]));
    expect(wordsForStep(4).every((word) => word.word.length === 4)).toBe(true);
    // Step 5 is longer words, and the words of the sound units (one tile per sound).
    expect(wordsForStep(5).every((word) => word.word.length >= 5 || word.letters.some((tile) => tile.silent || tile.char.length > 1))).toBe(true);
    const ship = wordsForStep(5).find((word) => word.id === "ship");
    expect(ship?.letters.map((tile) => `${tile.char}:${tile.phoneme}`)).toEqual(["sh:sh", "i:ih", "p:p"]);
    const cake = wordsForStep(5).find((word) => word.id === "cake");
    expect(cake?.letters.map((tile) => `${tile.char}${tile.silent ? "()" : `:${tile.phoneme}`}`)).toEqual(["c:k", "a:a_e", "k:k", "e()"]);
    // A magic-e word that was already on the ladder now sounds right too.
    const grape = wordsForStep(5).find((word) => word.id === "grape");
    expect(grape?.letters.map((tile) => tile.phoneme)).toEqual(["g", "r", "a_e", "p", "eh"]);
    expect(grape?.letters[4].silent).toBe(true);
    const fish = wordsForStep(4).find((word) => word.id === "fish");
    expect(fish?.letters.map((tile) => tile.char)).toEqual(["f", "i", "sh"]);
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

  it("gives every letter a bare sound clip for sounding out, sharing the letter's phrase", () => {
    const letters = manifest.letters as Record<string, { file: string; say: string }>;
    const sounds = manifest.sounds as Record<string, { file: string; say: string; source: string }>;
    for (const [id, cue] of Object.entries(letters)) {
      if (id.includes("-")) continue;
      expect(sounds[id], id).toBeTruthy();
      expect(sounds[id].file).toBe(cue.file.replace("letters/", "sounds/"));
      expect(sounds[id].say).toBe(cue.say);
      expect(sounds[id].source).toBe("neural");
    }
    expect(sounds.ae.file).toBe(sounds.a.file);
    expect(sounds.ks.file).toBe(sounds.x.file);
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
    // Phonics opens once the 26 letters are in, before the sound-unit weeks.
    expect(alphabetSize()).toBe(26);
    expect(phonicsOpen(alphabetSize())).toBe(true);
    expect(phonicsOpen(alphabetSize() - 1)).toBe(false);
    expect(phonicsOpen(letterPlanSize())).toBe(true);
  });

  it("lets a teacher set the step, including phonics", () => {
    expect(assignLadderStep({ step: 1, successes: 2 }, 3)).toEqual({ step: 3, successes: 0 });
    expect(assignLadderStep({ step: 2, successes: 1 }, 5).step).toBe(5);
  });

  it("moves up on blended words only, and never past what the letters taught can spell", () => {
    const am = wordsForStep(2).find((word) => word.id === "am")!;
    const mat = wordsForStep(3).find((word) => word.id === "mat")!;
    const sand = wordsForStep(4).find((word) => word.id === "sand")!;
    // A letter card is not a blend. It used to count, so the first lesson (M, A and one word) was a step up.
    expect(countsForLadder(letterCard("m"), 1)).toBe(false);
    expect(countsForLadder(sentencesForStep(5)[0], 5)).toBe(false);
    expect(countsForLadder(am, 1)).toBe(true);
    expect(countsForLadder(am, 2)).toBe(true);
    // A two-letter word is not evidence for four-letter words.
    expect(countsForLadder(am, 3)).toBe(false);
    expect(countsForLadder(mat, 3)).toBe(true);
    expect(countsForLadder(mat, 4)).toBe(false);
    expect(countsForLadder(sand, 4)).toBe(true);

    // Week 1 knows m and a: the only word is "am", so step 2 is as far as the ladder goes.
    expect(ladderCap(lettersIntroduced(0))).toBe(2);
    expect(ladderCap(lettersIntroduced(1))).toBe(3);
    expect(ladderCap(lettersIntroduced(2))).toBe(3);
    expect(ladderCap(lettersIntroduced(3))).toBe(4);
    expect(ladderCap(lettersIntroduced(13))).toBe(5);
    const held = recordLadderSuccess({ step: 2, successes: 2 }, { cap: 2 });
    expect(held.advanced).toBe(false);
    expect(held.ladder.step).toBe(2);
    expect(recordLadderSuccess({ step: 2, successes: 2 }, { cap: 3 }).ladder.step).toBe(3);
  });

  it("feeds hatch, spin, and tracing from picture words", () => {
    const early = hatchRound(["m", "a", "s", "t"], 1, pictureWords());
    expect(["m", "a", "s", "t"]).toContain(early.word.letters[0].char);
    expect(early.word.illustration).toBeTruthy();
    const two = wordBlank(["a", "t"], 1, pictureWords());
    expect(["a", "t"]).toContain(two.word.letters[0].char);
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
  });
});

describe("today's lesson list", () => {
  const ids = (words: { id: string }[]) => words.map((word) => word.id);
  const week = (index: number) => letterSchedule[index].newLetters;

  // The first phone test: week 1 had nothing to slide under but single letters and "a" and "I".
  it("is M, A, then am in the first week, on every step", () => {
    for (const step of [1, 2, 3, 4] as const) {
      expect(ids(blendList(step, week(0), [], lettersIntroduced(0), 0))).toEqual(["letter-m", "letter-a", "am"]);
    }
    // A child placed on step 5 also gets the one sentence m and a can make. "A cat." waits for c and t.
    expect(ids(blendList(5, week(0), [], lettersIntroduced(0), 0))).toEqual(["letter-m", "letter-a", "am", "i-am"]);
    expect(ids(blendList(5, week(4), [], lettersIntroduced(4), 0))).toEqual(expect.arrayContaining(["i-am", "a-cat"]));
  });

  it("leads with the week's letter cards on every step", () => {
    for (const step of [1, 2, 3, 4, 5] as const) {
      for (const index of [1, 4, 8, 13]) {
        const list = blendList(step, week(index), [], lettersIntroduced(index), 0);
        expect(ids(list.slice(0, week(index).length))).toEqual(week(index).map((letter) => `letter-${letter}`));
        expect(list.slice(week(index).length).some((word) => word.letterCard)).toBe(false);
      }
    }
  });

  it("holds only words the child can sound out with the letters taught so far", () => {
    for (let index = 0; index < letterSchedule.length; index += 1) {
      const taught = new Set(lettersIntroduced(index));
      for (const step of [1, 2, 3, 4, 5] as const) {
        for (const turn of [0, 1, 2]) {
          for (const word of blendList(step, week(index), [], lettersIntroduced(index), turn)) {
            if (word.letterCard || word.sentenceId) continue;
            expect(decodable(word, taught), `week ${index + 1} step ${step}: ${word.word}`).toBe(true);
          }
        }
      }
    }
    expect(decodable(wordsForStep(3).find((word) => word.id === "cat")!, new Set(["m", "a"]))).toBe(false);
    expect(decodable(wordsForStep(3).find((word) => word.id === "mat")!, new Set(["m", "a", "t"]))).toBe(true);
    // ship needs the sh unit, not the letters s and h.
    const ship = wordsForStep(5).find((word) => word.id === "ship")!;
    expect(decodable(ship, new Set(["s", "h", "i", "p"]))).toBe(false);
    expect(decodable(ship, new Set(["sh", "i", "p"]))).toBe(true);
  });

  it("keeps to the step's word length, and to a short list", () => {
    const week7 = lettersIntroduced(6);
    expect(blendList(1, week(6), [], week7, 0).filter((word) => !word.letterCard).every((word) => word.word.length <= 2)).toBe(true);
    expect(blendList(1, week(6), [], week7, 0).filter((word) => !word.letterCard).length).toBe(2);
    expect(blendList(2, week(6), [], week7, 0).filter((word) => !word.letterCard).every((word) => word.word.length <= 2)).toBe(true);
    const three = blendList(3, week(6), [], week7, 0).filter((word) => !word.letterCard);
    expect(three.length).toBe(6);
    expect(three.every((word) => word.word.length <= 3)).toBe(true);
    expect(blendList(4, week(6), [], week7, 0).some((word) => word.word.length === 4)).toBe(true);
    // Sentences are step 5 only.
    expect(blendList(4, week(6), [], week7, 0).some((word) => word.sentenceId)).toBe(false);
    expect(blendList(5, week(14), [], lettersIntroduced(14), 0).filter((word) => word.sentenceId).length).toBe(2);
  });

  it("mostly uses this week's letters, with a few older words kept in practice", () => {
    const list = blendList(3, week(4), [], lettersIntroduced(4), 0).filter((word) => !word.letterCard);
    const fresh = list.filter((word) => word.letters.some((tile) => tile.char === "o" || tile.char === "c"));
    expect(fresh.length).toBeGreaterThanOrEqual(3);
    expect(list.length - fresh.length).toBeGreaterThanOrEqual(1);
  });

  // The first phone test: the same words every day.
  it("changes from one day to the next", () => {
    const day = (turn: number) => ids(blendList(3, week(3), [], lettersIntroduced(3), turn)).join(",");
    expect(day(0)).not.toBe(day(1));
    expect(day(1)).not.toBe(day(2));
    // The same day is the same list, so a card is not swapped under the child.
    expect(day(1)).toBe(day(1));
    expect(blendList(3, week(3), [], lettersIntroduced(3), 1)[0]).toBe(blendList(3, week(3), [], lettersIntroduced(3), 2)[0]);
  });

  it("covers every decodable word of the step over a few days", () => {
    const seen = new Set<string>();
    for (let turn = 0; turn < 12; turn += 1) {
      for (const word of blendList(3, week(3), [], lettersIntroduced(3), turn)) if (!word.letterCard) seen.add(word.id);
    }
    for (const id of ["pan", "pin", "man", "nap", "mad", "sad", "ant", "and"]) expect(seen.has(id), id).toBe(true);
  });

  it("holds nothing back when no letters are given, for a sheet a grown-up builds", () => {
    const list = blendList(3, ["c", "a", "t"]);
    expect(ids(list.slice(0, 3))).toEqual(["letter-c", "letter-a", "letter-t"]);
    expect(list.length).toBe(9);
  });
});

describe("letter of the week cards", () => {
  it("names the example word from the letter phrase", () => {
    expect(letterExample("m")).toBe("moon");
    expect(letterExample("a")).toBe("apple");
    expect(letterExample("S")).toBe("sun");
  });

  it("builds one-tile cards, each with the drawing of its own word", () => {
    const m = letterCard("m");
    expect(m.id).toBe("letter-m");
    expect(m.letterCard).toBe(true);
    expect(m.word).toBe("moon");
    expect(m.illustration).toBe("moon");
    expect(m.glyph).toBeUndefined();
    expect(m.letters.map((tile) => tile.char)).toEqual(["m"]);
    expect(m.letters[0].phoneme).toBe("m");
    const a = letterCard("a");
    expect(a.illustration).toBe("apple");
    expect(a.letters[0].phoneme).toBe("ae");
    // The first phone test: twelve letters had no drawing, and the i card showed a pig.
    for (const letter of "abcdefghijklmnopqrstuvwxyz") {
      const card = letterCard(letter);
      expect(card.illustration, letter).toBeTruthy();
      expect(card.glyph, letter).toBeUndefined();
      expect(card.word).toBe(letterExample(letter));
    }
    expect(letterCard("i").illustration).toBe("igloo");
    expect(letterCard("p").illustration).toBe("pig");
  });

  it("plays each letter's own phrase, not its phoneme's", () => {
    // C and Q share the phoneme k. Their cards said "k, as in kite".
    expect(letterCard("c").letters[0]).toEqual({ char: "c", phoneme: "k", phraseId: "c" });
    expect(letterCard("q").letters[0].phraseId).toBe("q");
    expect(letterCard("k").letters[0].phraseId).toBe("k");
    const letters = manifest.letters as Record<string, { say: string }>;
    for (const letter of "abcdefghijklmnopqrstuvwxyz") {
      const tile = letterCard(letter).letters[0];
      expect(letters[tile.phraseId ?? ""].say).toBe(`${letter}, as in ${letterExample(letter)}`);
    }
  });

  it("is the same card whatever themes a child has picked", () => {
    expect(letterCards(["m", "a"]).map((card) => card.word)).toEqual(["moon", "apple"]);
    expect(blendList(1, ["m", "a"], ["bugs"])[0]).toBe(letterCard("m"));
    expect(blendList(1, ["M", "m", "?"]).filter((word) => word.letterCard).map((word) => word.id)).toEqual(["letter-m"]);
    expect(letterCards([]).length).toBe(0);
  });

  it("builds a card for a sound unit, and leads every step with it in its week", () => {
    const sh = letterCard("sh");
    expect(sh.id).toBe("letter-sh");
    expect(sh.word).toBe("ship");
    expect(sh.illustration).toBe("ship");
    expect(sh.letters).toEqual([{ char: "sh", phoneme: "sh" }]);
    const magic = letterCard("a_e");
    expect(magic.word).toBe("cake");
    expect(magic.letters).toEqual([{ char: "a-e", phoneme: "a_e" }]);
    expect(letterCards(["sh", "ch", "sh"]).map((card) => card.id)).toEqual(["letter-sh", "letter-ch"]);
    // Week 15 on step 5: the sh and ch cards, then words that use them, then the rest.
    const week15 = blendList(5, ["sh", "ch"], [], lettersIntroduced(14), 0);
    expect(week15.slice(0, 2).map((word) => word.id)).toEqual(["letter-sh", "letter-ch"]);
    const words = week15.slice(2);
    expect(words.length).toBeGreaterThanOrEqual(4);
    expect(words.slice(0, 4).every((word) => word.letters.some((tile) => tile.char === "sh" || tile.char === "ch"))).toBe(true);
    // A letter week on step 5 leads with its cards too: the week's letters are met on every step.
    expect(blendList(5, ["x", "q"], [], lettersIntroduced(13), 0).slice(0, 2).map((word) => word.id)).toEqual(["letter-x", "letter-q"]);
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
