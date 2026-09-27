/** The parent consent sentence. docs/sync-allowlist.md must contain this exact line. */
export const CONSENT_TEXT =
  "practice days, active minutes, and session length, as class totals, with no names";

/** Class totals a consented link may sync. No names, photos, or audio. */
export const ALLOWED_AGGREGATES = [
  "practiceDays",
  "activeMinutes",
  "sessionLengths",
  "medianSession",
  "lastActiveWeek",
] as const;

export const METRICS_FLOOR = 5;

export const NOT_ENOUGH_FAMILIES = "Not enough families linked yet";

export type PracticeSession = {
  avatarId: string;
  day: string;
  minutes: number;
};

export type ClassTotals = {
  practiceDays: number;
  activeMinutes: number;
  sessionLengths: number[];
  medianSession: number;
  lastActiveWeek: string;
};

export type MetricsView =
  | { status: "hidden"; message: string; totals: null }
  | { status: "ready"; message: ""; totals: ClassTotals };

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/** Class totals only. Per-child rows are not returned. */
export function classTotals(linked: number, sessions: PracticeSession[]): MetricsView {
  if (linked < METRICS_FLOOR) {
    return { status: "hidden", message: NOT_ENOUGH_FAMILIES, totals: null };
  }
  const days = new Set(sessions.map((session) => session.day));
  const minutes = sessions.reduce((sum, session) => sum + session.minutes, 0);
  const lengths = sessions.map((session) => session.minutes);
  const lastActiveWeek = sessions.reduce((latest, session) => (session.day > latest ? session.day : latest), "");
  return {
    status: "ready",
    message: "",
    totals: {
      practiceDays: days.size,
      activeMinutes: minutes,
      sessionLengths: lengths,
      medianSession: median(lengths),
      lastActiveWeek,
    },
  };
}

/** The document written to Firestore. Keys are the allowlist and nothing else. */
export function aggregatePayload(totals: ClassTotals): Record<(typeof ALLOWED_AGGREGATES)[number], number | number[] | string> {
  return {
    practiceDays: totals.practiceDays,
    activeMinutes: totals.activeMinutes,
    sessionLengths: totals.sessionLengths,
    medianSession: totals.medianSession,
    lastActiveWeek: totals.lastActiveWeek,
  };
}

export function payloadIsAllowlisted(payload: Record<string, unknown>): boolean {
  const keys = Object.keys(payload);
  if (keys.length !== ALLOWED_AGGREGATES.length) return false;
  return keys.every((key) => (ALLOWED_AGGREGATES as readonly string[]).includes(key));
}
