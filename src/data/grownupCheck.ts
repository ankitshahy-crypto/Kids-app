const NUMBER_WORDS = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine"] as const;

export type GrownupCheck = {
  kind: "word" | "sum" | "recover";
  prompt: string;
  choices: number[];
  answer: number;
};

function index(random: () => number, length: number): number {
  return Math.floor(random() * length);
}

function shuffle(values: number[], random: () => number): number[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = index(random, i + 1);
    const current = copy[i];
    copy[i] = copy[j];
    copy[j] = current;
  }
  return copy;
}

function distractors(answer: number, random: () => number, min: number, max: number): number[] {
  const pool: number[] = [];
  for (let value = min; value <= max; value += 1) {
    if (value !== answer) pool.push(value);
  }
  const picked: number[] = [];
  while (picked.length < 3 && pool.length > 0) {
    picked.push(pool.splice(index(random, pool.length), 1)[0]);
  }
  return picked;
}

/**
 * A fresh grown-up check, answered by typing the number. Half the time the
 * number is written as a word, so a child who cannot read cannot copy it;
 * otherwise it is a small sum. Typing beats a row of buttons: four choices
 * and five tries let random taps through most of the time. `choices` stays
 * for anything that still wants a multiple-choice form.
 */
export function createGrownupCheck(random: () => number = Math.random): GrownupCheck {
  if (random() < 0.5) {
    const answer = 1 + index(random, NUMBER_WORDS.length);
    return {
      kind: "word",
      prompt: `Type the number ${NUMBER_WORDS[answer - 1]}`,
      choices: shuffle([answer, ...distractors(answer, random, 1, 9)], random),
      answer,
    };
  }
  const left = 2 + index(random, 6);
  const right = 2 + index(random, 6);
  const answer = left + right;
  return {
    kind: "sum",
    prompt: `${left} + ${right}`,
    choices: shuffle([answer, ...distractors(answer, random, 1, 16)], random),
    answer,
  };
}

/** Forgot PIN. Two-digit multiplication, typed in. Then the grown-up picks a new PIN. */
export function createPinRecovery(random: () => number = Math.random): GrownupCheck {
  const left = 12 + index(random, 18);
  const right = 12 + index(random, 18);
  return {
    kind: "recover",
    prompt: `${left} × ${right}`,
    choices: [],
    answer: left * right,
  };
}
