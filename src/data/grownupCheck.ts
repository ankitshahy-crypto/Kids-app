export type GrownupCheck = {
  kind: "product" | "recover";
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
 * Used until a grown-up sets a PIN. One-digit multiplication, not a number word
 * or a small sum.
 */
export function createGrownupCheck(random: () => number = Math.random): GrownupCheck {
  const left = 2 + index(random, 8);
  const right = 2 + index(random, 8);
  const answer = left * right;
  return {
    kind: "product",
    prompt: `${left} × ${right}`,
    choices: shuffle([answer, ...distractors(answer, random, 4, 81)], random),
    answer,
  };
}

/** Forgot PIN. Two-digit multiplication, then the grown-up picks a new PIN. */
export function createPinRecovery(random: () => number = Math.random): GrownupCheck {
  const left = 12 + index(random, 18);
  const right = 12 + index(random, 18);
  const answer = left * right;
  const low = Math.max(100, answer - 40);
  const high = answer + 40;
  return {
    kind: "recover",
    prompt: `${left} × ${right}`,
    choices: shuffle([answer, ...distractors(answer, random, low, high)], random),
    answer,
  };
}
