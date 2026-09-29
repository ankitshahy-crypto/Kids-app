/**
 * Follow-along reading: which word of a story page the narrator is on.
 *
 * A page's words are the reader's buttons, in order (the same pattern as
 * storyTokens). Times come from src/data/storyTimings.json when the page's
 * clip has been timed: the start of each word in ms, then the end of the
 * last. Otherwise they are estimated from the clip's length, shared out by
 * letters, or followed from the device voice's word events.
 */

const WORD = /[A-Za-z']+/g;

export type LineTimes = readonly number[];

/** The words of a line, as the reader shows them. */
export function lineWords(text: string): string[] {
  return text.match(WORD) ?? [];
}

/** Where each word starts in the line, by letter position. */
export function wordOffsets(text: string): number[] {
  const offsets: number[] = [];
  for (const match of text.matchAll(WORD)) offsets.push(match.index ?? 0);
  return offsets;
}

/** Times that fit this line: one per word, then the end, never going backwards. */
export function fitsLine(times: LineTimes | undefined, words: number): times is LineTimes {
  if (!times || times.length !== words + 1 || words === 0) return false;
  for (let index = 1; index < times.length; index += 1) {
    if (!(times[index] >= times[index - 1])) return false;
  }
  return true;
}

/** A short beat before the first word, as a narrator takes a breath. */
const LEAD_MS = 150;
/** Room after the last word before the highlight lets go. */
const TAIL_MS = 150;

/**
 * Times for a line with no timing file: the clip's length shared out by
 * letters, with one extra share per word for the space between words.
 */
export function estimateTimes(words: readonly string[], durationMs: number): number[] {
  if (words.length === 0) return [0];
  const span = Math.max(words.length * 200, durationMs - LEAD_MS - TAIL_MS);
  const weights = words.map((word) => Math.max(1, word.replace(/[^A-Za-z]/g, "").length) + 1);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const times: number[] = [];
  let at = LEAD_MS;
  for (const weight of weights) {
    times.push(Math.round(at));
    at += (span * weight) / total;
  }
  times.push(Math.round(at));
  return times;
}

/** How long the device voice is likely to take over a line, at its rate. */
export function speechMs(text: string, rate: number): number {
  return Math.round((500 + text.length * 70) / Math.max(0.3, rate || 1));
}

/**
 * The word being read at `elapsedMs` into the line: its index, or null once
 * the line is over. The first word lights from the start, so the child sees
 * where to look before the first sound.
 */
export function wordAtTime(times: LineTimes, elapsedMs: number): number | null {
  const words = times.length - 1;
  if (words <= 0 || elapsedMs >= times[words]) return null;
  let index = 0;
  while (index + 1 < words && times[index + 1] <= elapsedMs) index += 1;
  return index;
}

/** The word the device voice has reached, from the letter position it reports. */
export function wordAtChar(offsets: readonly number[], charIndex: number): number | null {
  if (offsets.length === 0) return null;
  let index = 0;
  while (index + 1 < offsets.length && offsets[index + 1] <= charIndex) index += 1;
  return index;
}
