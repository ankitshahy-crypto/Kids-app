import type { IllustrationName } from "../illustrations";
import { ladderTitle, type LadderStep } from "./ladder";
import { placeForWeek, type LessonPlace } from "./placement";
import { planForWeek } from "./schedule";
import { READING } from "./subject";

/**
 * A two-minute "where to start" check for a child who may already know some
 * letters or words. Three short parts, each stopping early when it is
 * clearly too hard, with no clock and nothing called wrong. The result is a
 * suggested lesson week and word-ladder step for a grown-up to accept.
 */
export type CheckPart = "sound" | "word" | "long";

export type CheckRound = {
  part: CheckPart;
  /** The letter, or the word to read. */
  answer: string;
  /** Letters to tap, or picture names to tap. */
  choices: string[];
};

export type CheckTally = Record<CheckPart, { right: number; asked: number }>;

/** Letters from the first seven weeks, taught before most children start school. */
const SOUND_LETTERS = ["m", "s", "t", "p", "n", "d", "c", "b", "g", "h"];

/** Picture words a child can read by blending. The picture is the check. */
const SHORT_WORDS: { word: string; picture: IllustrationName }[] = [
  { word: "cat", picture: "cat" },
  { word: "dog", picture: "dog" },
  { word: "sun", picture: "sun" },
  { word: "hat", picture: "hat" },
  { word: "pig", picture: "pig" },
  { word: "bus", picture: "bus" },
  { word: "cup", picture: "cup" },
  { word: "bed", picture: "bed" },
  { word: "fox", picture: "fox" },
];

const LONG_WORDS: { word: string; picture: IllustrationName }[] = [
  { word: "frog", picture: "frog" },
  { word: "fish", picture: "fish" },
  { word: "milk", picture: "milk" },
  { word: "nest", picture: "nest" },
  { word: "tent", picture: "tent" },
  { word: "sand", picture: "sand" },
  { word: "hand", picture: "hand" },
  { word: "drum", picture: "drum" },
];

export const ROUNDS_PER_PART: Record<CheckPart, number> = { sound: 3, word: 3, long: 2 };

function hash(text: string, seed: number): number {
  let value = seed;
  for (const char of text) value = (value * 33 + char.charCodeAt(0)) >>> 0;
  return value;
}

function shuffled<T>(items: readonly T[], seed: string): T[] {
  const out = [...items];
  for (let index = out.length - 1; index > 0; index -= 1) {
    const swap = hash(`${seed}:${index}`, 5) % (index + 1);
    [out[index], out[swap]] = [out[swap], out[index]];
  }
  return out;
}

export function pictureFor(word: string): IllustrationName {
  return [...SHORT_WORDS, ...LONG_WORDS].find((item) => item.word === word)?.picture ?? "apple";
}

/** The rounds for one check, in order. The same seed gives the same check. */
export function buildCheck(seed: string): CheckRound[] {
  const rounds: CheckRound[] = [];
  const letters = shuffled(SOUND_LETTERS, `${seed}:letters`);
  for (let index = 0; index < ROUNDS_PER_PART.sound; index += 1) {
    const answer = letters[index];
    const others = letters.filter((letter) => letter !== answer).slice(index * 2, index * 2 + 2);
    rounds.push({ part: "sound", answer, choices: shuffled([answer, ...others], `${seed}:s${index}`) });
  }
  const short = shuffled(SHORT_WORDS, `${seed}:short`);
  for (let index = 0; index < ROUNDS_PER_PART.word; index += 1) {
    const answer = short[index];
    const others = short.filter((item) => item !== answer).slice(index * 2, index * 2 + 2);
    rounds.push({ part: "word", answer: answer.word, choices: shuffled([answer, ...others], `${seed}:w${index}`).map((item) => item.word) });
  }
  const long = shuffled(LONG_WORDS, `${seed}:long`);
  for (let index = 0; index < ROUNDS_PER_PART.long; index += 1) {
    const answer = long[index];
    const others = long.filter((item) => item !== answer).slice(index * 2, index * 2 + 2);
    rounds.push({ part: "long", answer: answer.word, choices: shuffled([answer, ...others], `${seed}:l${index}`).map((item) => item.word) });
  }
  return rounds;
}

export function emptyTally(): CheckTally {
  return { sound: { right: 0, asked: 0 }, word: { right: 0, asked: 0 }, long: { right: 0, asked: 0 } };
}

/** A part is over when it is clearly known or clearly not, so the check stays short. */
export function partSettled(tally: CheckTally, part: CheckPart): "pass" | "stop" | null {
  const { right, asked } = tally[part];
  const total = ROUNDS_PER_PART[part];
  const need = part === "long" ? 1 : 2;
  if (right >= need) return "pass";
  if (asked - right > total - need) return "stop";
  if (asked >= total) return right >= need ? "pass" : "stop";
  return null;
}

export type CheckResult = {
  place: LessonPlace;
  ladderStep: LadderStep;
  /** One line for the grown-up: "Week 7 · Letters, short words". */
  summary: string;
  /** A friendly line for the child. */
  cheer: string;
};

/** Turn the tally into a start. Each part passed moves the start further along. */
export function placeFromCheck(tally: CheckTally): CheckResult {
  const sounds = partSettled(tally, "sound") === "pass";
  const words = sounds && partSettled(tally, "word") === "pass";
  const long = words && partSettled(tally, "long") === "pass";
  const weekIndex = long ? 9 : words ? 6 : sounds ? 2 : 0;
  const ladderStep: LadderStep = long ? 4 : words ? 3 : sounds ? 2 : 1;
  const place = placeForWeek(weekIndex, READING);
  const plan = planForWeek(weekIndex);
  return {
    place,
    ladderStep,
    summary: `Week ${weekIndex + 1} · ${plan.newLetters.length > 1 ? "letters" : "letter"} ${plan.newLetters.join(" and ")} · ${ladderTitle(ladderStep)}`,
    cheer: long ? "You can read so much already!" : words ? "You can read words!" : sounds ? "You know your sounds!" : "Great start!",
  };
}
