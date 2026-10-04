import { READING_PACKS, letterSchedule, type ReadingPack } from "./schedule";

/**
 * The long reading path: about 78 weeks at the steady pace (about two years
 * at the gentle pace) in seven phases, with an optional sound-play phase for
 * three-year-olds before it. Weeks are released in packs of about eight
 * (schedule.ts), each finished before families reach it: progress follows
 * the calendar, so content only has to stay ahead of the furthest family.
 *
 * `PLANNED_WEEKS` is the target. The weeks written so far are `letterSchedule`;
 * past the last written week the plan starts over, as it always has.
 */
export type ReadingPhase = {
  id: number;
  title: string;
  /** First and last plan week of the phase (1-based). Phase 0 has none: it comes before week 1. */
  weeks: readonly [number, number] | null;
  teaches: string;
};

export const READING_PHASES: readonly ReadingPhase[] = [
  { id: 0, title: "Sound play", weeks: null, teaches: "Rhymes, first sounds and clapping word parts, before any letters (optional, age 3)" },
  { id: 1, title: "Letter sounds and first blending", weeks: [1, 9], teaches: "Every single letter at 3 or 4 a week, short words, the first Nest words; week 9 reviews" },
  { id: 2, title: "Smooth short-word reading", weeks: [10, 16], teaches: "Four-letter words (sand, milk), -s endings, ss, ff, ll and ck, simple sentences" },
  { id: 3, title: "Two letters, one sound", weeks: [17, 24], teaches: "sh, ch, th, wh, ng, nk and qu" },
  { id: 4, title: "Blends", weeks: [25, 32], teaches: "st, sp, fl, tr, gr, -nd, -mp and -st (frog, stamp, crisp)" },
  { id: 5, title: "Long vowels", weeks: [33, 52], teaches: "Magic e, then ee and ea, ai and ay, oa and ow, igh and y, oo; a review every fifth week" },
  { id: 6, title: "Other vowel sounds", weeks: [53, 62], teaches: "ar, or, er, ir and ur, ou and ow, oi and oy, aw, soft c and g" },
  { id: 7, title: "Early fluency", weeks: [63, 78], teaches: "Two-part words, -ed and -ing, short non-fiction, rereading for speed" },
];

/** The path's length at the steady pace once every pack is written. */
export const PLANNED_WEEKS = 78;

/** Weeks per content pack. A pack is written, recorded and checked as one piece. */
export const PACK_WEEKS = 8;

/** How many plan weeks are written today. */
export function writtenWeeks(): number {
  return letterSchedule.length;
}

/** The pack a plan week (1-based) belongs to, or undefined past the last written pack. */
export function packForWeek(week: number): ReadingPack | undefined {
  return READING_PACKS.find((pack) => pack.weeks.some((plan) => plan.week === week));
}

/** The phase a plan week (1-based) belongs to, as written on that week. */
export function phaseForWeek(week: number): ReadingPhase | undefined {
  const plan = letterSchedule.find((item) => item.week === week);
  return plan ? READING_PHASES.find((phase) => phase.id === plan.phase) : undefined;
}

/**
 * Checks the packs fit together: weeks numbered 1, 2, 3… with no gap, no pack
 * longer than PACK_WEEKS, and every week's phase a real one. A new pack that
 * breaks this fails at load, before a family can meet it.
 */
export function checkPacks(packs: readonly ReadingPack[] = READING_PACKS): void {
  let expected = 1;
  for (const pack of packs) {
    if (pack.weeks.length === 0 || pack.weeks.length > PACK_WEEKS) throw new Error(`Pack ${pack.id} has ${pack.weeks.length} weeks`);
    for (const plan of pack.weeks) {
      if (plan.week !== expected) throw new Error(`Pack ${pack.id}: week ${plan.week} where week ${expected} was expected`);
      if (!READING_PHASES.some((phase) => phase.id === plan.phase && phase.id > 0)) throw new Error(`Week ${plan.week}: unknown phase ${plan.phase}`);
      if (plan.newLetters.length === 0 && !plan.kind) throw new Error(`Week ${plan.week} teaches nothing new and is not a review or practice week`);
      if (plan.kind && plan.reviewLetters.length === 0) throw new Error(`Week ${plan.week} is a ${plan.kind} week with nothing to review`);
      if (plan.nestWords.length > 3) throw new Error(`Week ${plan.week} has more than three new Nest words`);
      expected += 1;
    }
  }
  if (expected - 1 > PLANNED_WEEKS) throw new Error(`The packs run past the ${PLANNED_WEEKS}-week path`);
}

checkPacks();
