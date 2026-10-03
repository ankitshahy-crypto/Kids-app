import {
  awardStar,
  todayKey,
  type ChildProfile,
  type LessonStep,
  type Sticker,
  type StickerInput,
} from "./profiles";
import { READING, subjectDefinition, type SubjectId } from "./subject";
import { deviceTimeZone } from "./time";
import { wardrobe, wardrobeItem, type WardrobeId } from "./wardrobe";

export type EffortResult = {
  profile: ChildProfile;
  awarded: boolean;
  lessonComplete: boolean;
  milestones: number[];
  stickersAdded: number;
};

/** Star totals that deserve a cheer. Counting starts at 10 and steps by 10. */
export function milestonesBetween(before: number, after: number, already: readonly number[]): number[] {
  const seen = new Set(already);
  const hits: number[] = [];
  for (let mark = 10; mark <= after; mark += 10) {
    if (before < mark && after >= mark && !seen.has(mark)) hits.push(mark);
  }
  return hits;
}

export function unlocked(stars: number, itemId: WardrobeId): boolean {
  const item = wardrobeItem(itemId);
  return Boolean(item && stars >= item.stars);
}

/** A star cost or a wheel gift opens the item. */
export function itemUnlocked(profile: Pick<ChildProfile, "stars" | "gifts">, itemId: string): boolean {
  const item = wardrobeItem(itemId);
  if (!item) return false;
  return profile.stars >= item.stars || (profile.gifts ?? []).includes(item.id);
}

/** Keep a dress-up item the wheel awarded. Stars are not required. */
export function grantGift(profile: ChildProfile, itemId: string): ChildProfile {
  const item = wardrobeItem(itemId);
  if (!item || profile.gifts.includes(item.id)) return profile;
  return { ...profile, gifts: [...profile.gifts, item.id] };
}

/** Wear an earned item, or take it off. A locked item stays in the closet. */
export function wearItem(profile: ChildProfile, itemId: string): ChildProfile {
  const item = wardrobeItem(itemId);
  if (!item || !itemUnlocked(profile, item.id)) return profile;
  const wearing = profile.outfit[item.slot] === item.id;
  return {
    ...profile,
    outfit: { ...profile.outfit, [item.slot]: wearing ? null : item.id },
  };
}

export function addStickers(profile: ChildProfile, incoming: StickerInput[], subject: SubjectId = READING): ChildProfile {
  const have = new Set(profile.stickers.map((sticker) => `${sticker.subject}:${sticker.kind}:${sticker.label}`));
  const added: Sticker[] = [];
  for (const sticker of incoming) {
    const label = sticker.label.trim().toLowerCase();
    if (!label) continue;
    const stickerSubject = sticker.subject ?? subject;
    const key = `${stickerSubject}:${sticker.kind}:${label}`;
    if (have.has(key)) continue;
    have.add(key);
    added.push({ subject: stickerSubject, kind: sticker.kind, label });
  }
  if (added.length === 0) return profile;
  return { ...profile, stickers: [...profile.stickers, ...added] };
}

/** One piece per finished day. A missed day adds nothing and removes nothing. */
export function addNestPiece(profile: ChildProfile, now = new Date(), timeZone = deviceTimeZone()): ChildProfile {
  const date = todayKey(now, timeZone);
  if (profile.nest.some((piece) => piece.date === date)) return profile;
  const piece = profile.nest.length % 2 === 0 ? "twig" : "egg";
  return { ...profile, nest: [...profile.nest, { date, piece }] };
}

/**
 * One star for a finished step. Letters and the blended word become stickers.
 * The fourth step of the day adds a nest piece. Stars are never removed.
 */
export function applyEffort(
  profile: ChildProfile,
  step: LessonStep | string,
  learned: StickerInput[] = [],
  now = new Date(),
  timeZone = deviceTimeZone(),
  subject: SubjectId = READING,
): EffortResult {
  const definition = subjectDefinition(subject);
  if (!definition) return { profile, awarded: false, lessonComplete: false, milestones: [], stickersAdded: 0 };
  const before = profile.stars;
  let next = awardStar(profile, step, now, timeZone, subject);
  const awarded = next.stars !== before;
  const beforeStickers = next.stickers.length;
  // A letter or a word the child has read is always kept, star or no star. Stickers used to be saved only
  // with a new star, and a step gives one star a day: the first card finished took it, so every word
  // read after that left no sticker, and "Trace a word" (which lists the words read) never filled up.
  // Prizes (a baby animal from the wheel) still come with a star only, so a game cannot be farmed for them.
  const kept = awarded ? learned : learned.filter((sticker) => sticker.kind === "letter" || sticker.kind === "word");
  if (kept.length > 0) next = addStickers(next, kept, subject);
  const stickersAdded = next.stickers.length - beforeStickers;
  const steps = next.days[todayKey(now, timeZone)]?.[subject] ?? {};
  const lessonComplete = definition.steps.every((item) => steps[item] === true);
  if (awarded && lessonComplete) next = addNestPiece(next, now, timeZone);
  const milestones = awarded ? milestonesBetween(before, next.stars, next.celebrated) : [];
  if (milestones.length > 0) next = { ...next, celebrated: [...next.celebrated, ...milestones] };
  return { profile: next, awarded, lessonComplete, milestones, stickersAdded };
}

export { wardrobe };
