import type { ChildProfile, DayRecord } from "../data/profiles";
import { profilesFromBackup } from "../data/profiles";
import type { GameProgress } from "../data/games";
import type { LadderProgress } from "../data/ladder";
import type { WritingMap } from "../data/scaffold";
import { normalizeSettings, type Settings } from "../settings";
import { accountRole, type AccountRole } from "./prefs";

export type BackupDocument = {
  role: AccountRole;
  updatedAt: string;
  settings: Settings;
  children: ChildProfile[];
};

const DROPPED = ["photo", "photosrc", "image", "picture", "avatarurl", "lastname", "fullname", "email"];

function stamp(value: string): number {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

function unionDays(left: ChildProfile["days"], right: ChildProfile["days"]): ChildProfile["days"] {
  const days: ChildProfile["days"] = {};
  for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
    const merged: DayRecord = {};
    for (const subject of new Set([...Object.keys(left[key] ?? {}), ...Object.keys(right[key] ?? {})])) {
      const flags: Record<string, boolean> = {};
      const a = left[key]?.[subject] ?? {};
      const b = right[key]?.[subject] ?? {};
      for (const step of new Set([...Object.keys(a), ...Object.keys(b)])) {
        if (a[step] || b[step]) flags[step] = true;
      }
      if (Object.keys(flags).length > 0) merged[subject] = flags;
    }
    if (Object.keys(merged).length > 0) days[key] = merged;
  }
  return days;
}

function maxMap(left: Record<string, number>, right: Record<string, number>): Record<string, number> {
  const next: Record<string, number> = { ...left };
  for (const [key, value] of Object.entries(right)) next[key] = Math.max(next[key] ?? 0, value);
  return next;
}

function unionDates(left: string[], right: string[]): string[] {
  return [...new Set([...left, ...right])];
}

function mergePractice(
  left: ChildProfile,
  right: ChildProfile,
): Pick<ChildProfile, "readingMs" | "readingAwarded" | "practiceMs" | "practiceAwarded"> {
  const subjects = new Set([...Object.keys(left.practiceMs), ...Object.keys(right.practiceMs), "reading"]);
  const practiceMs: Record<string, Record<string, number>> = {};
  const practiceAwarded: Record<string, string[]> = {};
  for (const subject of subjects) {
    practiceMs[subject] = maxMap(left.practiceMs[subject] ?? {}, right.practiceMs[subject] ?? {});
    practiceAwarded[subject] = unionDates(left.practiceAwarded[subject] ?? [], right.practiceAwarded[subject] ?? []);
  }
  practiceMs.reading = maxMap(practiceMs.reading ?? {}, maxMap(left.readingMs, right.readingMs));
  practiceAwarded.reading = unionDates(practiceAwarded.reading ?? [], unionDates(left.readingAwarded, right.readingAwarded));
  return {
    readingMs: practiceMs.reading,
    readingAwarded: practiceAwarded.reading,
    practiceMs,
    practiceAwarded,
  };
}

function mergeWriting(left: WritingMap, right: WritingMap): WritingMap {
  const next: WritingMap = { ...left };
  for (const [key, item] of Object.entries(right)) {
    const other = next[key];
    if (!other || item.level > other.level || (item.level === other.level && item.successes >= other.successes)) {
      next[key] = item;
    }
  }
  return next;
}

function mergeGames(left: GameProgress, right: GameProgress): GameProgress {
  const further =
    right.hatch > left.hatch || (right.hatch === left.hatch && right.hatches >= left.hatches) ? right : left;
  return { hatch: further.hatch, hatches: further.hatches, spins: Math.max(left.spins, right.spins) };
}

function mergeLadder(left: LadderProgress, right: LadderProgress): LadderProgress {
  if (right.step > left.step || (right.step === left.step && right.successes >= left.successes)) return right;
  return left;
}

function stickerKey(sticker: ChildProfile["stickers"][number]): string {
  return `${sticker.subject}|${sticker.kind}|${sticker.label}`;
}

function mergeChild(primary: ChildProfile, secondary: ChildProfile): ChildProfile {
  const practice = mergePractice(primary, secondary);
  return {
    ...primary,
    stars: Math.max(primary.stars, secondary.stars),
    days: unionDays(primary.days, secondary.days),
    stickers: [...new Map([...secondary.stickers, ...primary.stickers].map((item) => [stickerKey(item), item])).values()],
    nest: [...new Map([...secondary.nest, ...primary.nest].map((item) => [item.date, item])).values()],
    celebrated: [...new Set([...primary.celebrated, ...secondary.celebrated])].sort((a, b) => a - b),
    gifts: [...new Set([...primary.gifts, ...secondary.gifts])],
    writing: mergeWriting(primary.writing, secondary.writing),
    games: mergeGames(primary.games, secondary.games),
    ladder: mergeLadder(primary.ladder, secondary.ladder),
    ...practice,
  };
}

/** The fields a backup is allowed to hold. Photos and emails are not in this list. */
export function toBackup(
  profiles: ChildProfile[],
  settings: Settings,
  role: AccountRole,
  updatedAt: string,
): BackupDocument {
  const children = profilesFromBackup(profiles).map((profile) => ({
    id: profile.id,
    name: profile.name,
    ageRange: profile.ageRange,
    animal: profile.animal,
    createdAt: profile.createdAt,
    stars: profile.stars,
    days: profile.days,
    outfit: profile.outfit,
    stickers: profile.stickers,
    nest: profile.nest,
    celebrated: profile.celebrated,
    readingMs: profile.readingMs,
    readingAwarded: profile.readingAwarded,
    practiceMs: profile.practiceMs,
    practiceAwarded: profile.practiceAwarded,
    writing: profile.writing,
    games: profile.games,
    ladder: profile.ladder,
    gifts: profile.gifts,
  }));
  return {
    role: accountRole(role),
    updatedAt,
    settings: normalizeSettings(settings),
    children,
  };
}

export function parseBackup(value: unknown): BackupDocument | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<BackupDocument>;
  if (typeof record.updatedAt !== "string") return null;
  const children = profilesFromBackup(record.children);
  return {
    role: accountRole(record.role),
    updatedAt: record.updatedAt,
    settings: normalizeSettings(record.settings),
    children,
  };
}

/** Stars and finished steps never go backwards. Name and settings follow the newer copy. */
export function mergeBackups(local: BackupDocument, remote: BackupDocument): BackupDocument {
  const localNewer = stamp(local.updatedAt) >= stamp(remote.updatedAt);
  const newer = localNewer ? local : remote;
  const older = localNewer ? remote : local;
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const child of [...newer.children, ...older.children]) {
    if (seen.has(child.id)) continue;
    seen.add(child.id);
    ids.push(child.id);
  }
  const children = ids.map((id) => {
    const primary = newer.children.find((child) => child.id === id);
    const secondary = older.children.find((child) => child.id === id);
    if (primary && secondary) return mergeChild(primary, secondary);
    return primary ?? secondary;
  });
  return {
    role: newer.role,
    updatedAt: newer.updatedAt,
    settings: normalizeSettings(newer.settings),
    children: children.filter((child): child is ChildProfile => Boolean(child)),
  };
}

export function backupHasDroppedKeys(value: unknown): boolean {
  const text = JSON.stringify(value).toLowerCase();
  return DROPPED.some((key) => text.includes(`"${key}"`));
}
