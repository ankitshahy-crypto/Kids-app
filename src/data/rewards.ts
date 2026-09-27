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

/** Wear an earned item, or take it off. A locked item stays in the closet. */
export function wearItem(profile: ChildProfile, itemId: string): ChildProfile {
  const item = wardrobeItem(itemId);
  if (!item || profile.stars < item.stars) return profile;
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
  if (awarded && learned.length > 0) next = addStickers(next, learned, subject);
  const stickersAdded = next.stickers.length - beforeStickers;
  const steps = next.days[todayKey(now, timeZone)]?.[subject] ?? {};
  const lessonComplete = definition.steps.every((item) => steps[item] === true);
  if (awarded && lessonComplete) next = addNestPiece(next, now, timeZone);
  const milestones = awarded ? milestonesBetween(before, next.stars, next.celebrated) : [];
  if (milestones.length > 0) next = { ...next, celebrated: [...next.celebrated, ...milestones] };
  return { profile: next, awarded, lessonComplete, milestones, stickersAdded };
}

export { wardrobe };
