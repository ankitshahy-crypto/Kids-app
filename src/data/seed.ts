/**
 * Seeded choices for the games. A game takes a `salt` that is new each time it opens, so no two plays
 * are alike, and the same salt always gives the same rounds, so a test can know what to expect.
 */

/** A whole number from 0 up, scattered from the salt and the turn. */
export function mix(salt: number, turn = 0): number {
  const value = Math.imul((salt | 0) + 1 + turn * 7919, 2654435761) >>> 0;
  // `>>> 0` keeps it from going negative: a negative number would pick outside a list.
  return (value ^ (value >>> 15)) >>> 0;
}

export function shuffle<T>(items: readonly T[], salt: number): T[] {
  const out = [...items];
  for (let index = out.length - 1; index > 0; index -= 1) {
    const pick = mix(salt, index) % (index + 1);
    [out[index], out[pick]] = [out[pick], out[index]];
  }
  return out;
}

/** The first `count` of a shuffle: that many different items. */
export function take<T>(items: readonly T[], count: number, salt: number): T[] {
  return shuffle(items, salt).slice(0, count);
}

/** The answer among other choices, in a mixed order, with no repeats. */
export function among<T>(answer: T, others: readonly T[], count: number, salt: number): T[] {
  const rest = shuffle(
    others.filter((item) => item !== answer),
    salt,
  ).slice(0, Math.max(0, count - 1));
  return shuffle([answer, ...rest], salt + 17);
}
