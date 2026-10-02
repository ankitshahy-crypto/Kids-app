import { describe, expect, it } from "vitest";
import { lettersIntroduced } from "./schedule";
import { isSubjectKey, readingSteps } from "./subject";
import {
  assignHatchLevel,
  bonusPrize,
  colorChoices,
  countChoices,
  feedRound,
  glowLetter,
  hatchRound,
  kindAtRotation,
  memoryRound,
  nextBaby,
  pictureItems,
  popRound,
  recordHatch,
  RHYME_FAMILIES,
  rhymeRound,
  soundChoices,
  spinCount,
  spinTurn,
  wheelRotation,
  wordBlank,
} from "./games";
import { pictureWords } from "./ladder";

const taught = lettersIntroduced(3);

describe("hatch rounds follow taught letters", () => {
  const words = pictureWords();

  it("asks only for the first sound of a known letter, among three letters", () => {
    const round = hatchRound(taught, 1, words, 0);
    expect(taught).toContain(round.word.letters[0].char);
    expect(round.word.illustration).toBeTruthy();
    expect(round.blanks).toEqual([0]);
    expect(round.choices).toHaveLength(3);
    expect(round.choices).toContain(round.word.letters[0].char);
    expect(glowLetter(round, [])).toBe(round.word.letters[0].char);
    expect(glowLetter(round, [0])).toBeNull();
  });

  it("blanks the taught letters of a short word the child can spell", () => {
    const round = hatchRound(taught, 2, words, 0);
    expect(round.word.word).toBe("mat");
    expect(round.blanks).toEqual([0, 1, 2]);
    expect(round.choices).toHaveLength(6);
    for (const letter of ["m", "a", "t"]) expect(round.choices).toContain(letter);
  });

  it("uses a longer word once that level is reached", () => {
    const round = hatchRound(taught, 3, words, 0);
    expect(round.word.word).toBe("sand");
    expect(round.blanks).toEqual([0, 1, 2, 3]);
  });

  it("still builds a round when no letters are taught yet", () => {
    const round = hatchRound([], 1);
    expect(round.word.word.length).toBeGreaterThan(0);
    expect(round.blanks).toEqual([0]);
    expect(round.choices.length).toBeGreaterThan(1);
  });

  // The first phone test: every egg was the same word, with the answer on the first tile.
  it("is a different word, with the answer in a different place, from one egg to the next", () => {
    const rounds = [0, 1, 2, 3, 4, 5].map((salt) => hatchRound(taught, 1, words, salt));
    expect(new Set(rounds.map((round) => round.word.id)).size).toBeGreaterThan(3);
    const places = rounds.map((round) => round.choices.indexOf(round.word.letters[0].char));
    expect(new Set(places).size).toBeGreaterThan(1);
    expect(hatchRound(taught, 1, words, 3)).toEqual(hatchRound(taught, 1, words, 3));
  });

  it("only ever shows a word under its own drawing", () => {
    for (let salt = 0; salt < 40; salt += 1) {
      for (const level of [1, 2, 3] as const) {
        const round = hatchRound(lettersIntroduced(salt % 14), level, words, salt);
        expect(round.word.illustration, round.word.word).toBeTruthy();
        expect(round.word.letters.every((tile) => tile.char.length === 1 && !tile.silent)).toBe(true);
      }
    }
  });
});

describe("hatch level", () => {
  it("moves up after two eggs and never moves back", () => {
    const once = recordHatch({ hatch: 1, hatches: 0, spins: 0 });
    expect(once.advanced).toBe(false);
    expect(once.games).toEqual({ hatch: 1, hatches: 1, spins: 0 });
    const twice = recordHatch(once.games);
    expect(twice.advanced).toBe(true);
    expect(twice.games).toEqual({ hatch: 2, hatches: 0, spins: 0 });
    const stayed = recordHatch({ hatch: 1, hatches: 1, spins: 0 });
    expect(stayed.games.hatch).toBeGreaterThanOrEqual(1);
  });

  it("lets a teacher set the level", () => {
    expect(assignHatchLevel({ hatch: 1, hatches: 1, spins: 2 }, 3)).toEqual({ hatch: 3, hatches: 0, spins: 2 });
  });
});

describe("the other games", () => {
  it("pops three balloons of one taught letter among three others, and moves on each play", () => {
    const round = popRound(taught, 0);
    expect(round.target).toBe("m");
    expect(round.balloons).toHaveLength(6);
    expect(round.balloons.filter((balloon) => balloon.target).length).toBe(3);
    expect(popRound(taught, 1).target).toBe("a");
    // The same three places every time taught "tap these three": the layout changes too.
    const layouts = [0, 8, 16, 24].map((salt) => popRound(taught, salt).balloons.map((balloon) => (balloon.target ? "x" : "o")).join(""));
    expect(new Set(layouts).size).toBeGreaterThan(1);
    // Two letters taught: the round still has three other letters to leave alone.
    expect(popRound(["m", "a"], 0).balloons.filter((balloon) => !balloon.target)).toHaveLength(3);
  });

  it("feeds the animal pictures that start with a taught letter", () => {
    const round = feedRound(taught, 0);
    expect(round.target).toBe("m");
    expect(round.items).toHaveLength(4);
    const right = round.items.filter((item) => item.letter === "m");
    expect(right.length).toBeGreaterThan(0);
    expect(right.length).toBeLessThan(4);
    for (const item of round.items) expect(item.illustration).toBeTruthy();
    expect(feedRound(taught, 1).target).toBe("a");
  });

  it("names every picture by a letter that says its own sound there", () => {
    const items = pictureItems();
    expect(items.length).toBeGreaterThan(80);
    for (const item of items) expect(item.label.toLowerCase().startsWith(item.letter), item.label).toBe(true);
    const ids = items.map((item) => item.id);
    // ship starts with sh, chick with ch, and the g of gem says j: none is a first-letter picture.
    for (const id of ["ship", "chick", "whale", "gem", "fox-x"]) expect(ids).not.toContain(id);
    expect(items.find((item) => item.id === "fox")?.letter).toBe("f");
    // A cat and a kite start with one sound, so a kite is never the wrong answer for c.
    for (let salt = 0; salt < 30; salt += 1) {
      const round = feedRound(["c", "k", "m"], salt);
      if (round.target === "c") expect(round.items.some((item) => item.letter === "k")).toBe(false);
      if (round.target === "k") expect(round.items.some((item) => item.letter === "c")).toBe(false);
    }
  });

  it("matches two rhyming pairs of pictures", () => {
    for (let salt = 0; salt < 34; salt += 1) {
      const cards = rhymeRound(salt);
      expect(cards).toHaveLength(4);
      expect(new Set(cards.map((card) => card.pair)).size).toBe(2);
      for (const pair of ["0", "1"]) {
        const [a, b] = cards.filter((card) => card.pair === pair).map((card) => card.word);
        const family = RHYME_FAMILIES.find((item) => item.words.includes(a));
        expect(family?.words, `${a} and ${b}`).toContain(b);
      }
      for (const card of cards) expect(card.illustration).toBeTruthy();
    }
    expect(rhymeRound(0).map((card) => card.word).sort()).not.toEqual(rhymeRound(1).map((card) => card.word).sort());
  });

  it("only pairs words that end with the same sound", () => {
    for (const family of RHYME_FAMILIES) {
      for (const word of family.words) expect(word.endsWith(family.ending), `${word} in -${family.ending}`).toBe(true);
    }
  });

  it("flips letter pairs or a number with its dots", () => {
    const letters = memoryRound(taught, "letters", 0);
    expect(letters).toHaveLength(6);
    const upper = letters.filter((card) => card.face === "upper").map((card) => card.value.toLowerCase());
    expect(upper).toHaveLength(3);
    for (const letter of upper) expect(taught).toContain(letter);
    expect(letters.filter((card) => card.face === "lower").map((card) => card.value).sort()).toEqual([...upper].sort());
    const numbers = memoryRound(taught, "numbers", 0);
    expect(numbers.filter((card) => card.face === "dots")).toHaveLength(3);
    expect(numbers.filter((card) => card.face === "numeral")).toHaveLength(3);
    expect(memoryRound(taught, "numbers", 1).map((card) => card.id)).not.toEqual(numbers.map((card) => card.id));
  });

  it("keeps game stars off the daily lesson", () => {
    for (const id of ["game-hatch", "game-pop", "game-feed", "game-rhyme", "game-memory", "spin-1"]) {
      expect(isSubjectKey(id)).toBe(true);
      expect((readingSteps as readonly string[]).includes(id)).toBe(false);
    }
  });

  it("spins onto the next learned challenge and keeps a bonus kind", () => {
    expect(spinTurn(0)).toBe("sound");
    expect(spinTurn(5)).toBe("bonus");
    expect(kindAtRotation(wheelRotation(2, 40))).toBe("count");
    expect(wheelRotation(1, wheelRotation(0))).toBeGreaterThan(wheelRotation(0));
    const sound = soundChoices(taught, 0);
    expect(sound.target).toBe("m");
    expect(sound.choices).toHaveLength(3);
    expect(sound.choices).toContain("m");
    const blank = wordBlank(taught, 1, pictureWords(), 0);
    expect(taught).toContain(blank.word.letters[0].char);
    expect(blank.blank).toBe(0);
    expect(blank.choices).toHaveLength(3);
    expect(blank.choices).toContain(blank.word.letters[0].char);
    expect(countChoices(6).choices).toContain(6);
    expect(colorChoices("green", ["green", "red", "blue"]).target).toBe("green");
    expect(bonusPrize(5, [], []).kind).toBe("sticker");
    const outfit = bonusPrize(11, [], [], 0);
    expect(outfit.kind).toBe("outfit");
    if (outfit.kind === "outfit") expect(outfit.id).toBe("scarf-stripe");
  });

  // The first phone test: "it's the same for all of the spin the wheel, no different options each time".
  it("changes each kind of spin challenge from one spin to the next", () => {
    const salts = [0, 7, 14, 21];
    expect(new Set(salts.map((salt) => soundChoices(taught, salt).target)).size).toBeGreaterThan(1);
    expect(new Set(salts.map((salt) => wordBlank(taught, 1, pictureWords(), salt).word.id)).size).toBeGreaterThan(1);
    expect(new Set(salts.map((salt) => spinCount(4, salt))).size).toBeGreaterThan(1);
    expect(new Set(salts.map((salt) => colorChoices("red", ["red", "blue", "yellow"], salt).target)).size).toBeGreaterThan(1);
    // The right answer is not always the first button.
    const first = (choices: readonly (string | number)[], answer: string | number) => choices.indexOf(answer);
    expect(new Set(salts.map((salt) => first(soundChoices(taught, salt).choices, soundChoices(taught, salt).target))).size).toBeGreaterThan(1);
    expect(new Set([0, 1, 2, 3, 4, 5].map((salt) => first(countChoices(5, salt).choices, 5))).size).toBeGreaterThan(1);
    for (const salt of salts) {
      const count = spinCount(4, salt);
      expect(count).toBeGreaterThanOrEqual(1);
      expect(count).toBeLessThanOrEqual(10);
      expect(countChoices(count, salt).choices).toContain(count);
      const color = colorChoices("red", ["red", "blue", "yellow"], salt);
      expect(color.choices).toContain(color.target);
      expect(color.choices).toHaveLength(3);
    }
  });

  it("picks the next baby animal that is not in the sticker book", () => {
    expect(nextBaby([])).toBe("kitten");
    expect(nextBaby(["kitten", "puppy"])).toBe("fawn");
  });
});
