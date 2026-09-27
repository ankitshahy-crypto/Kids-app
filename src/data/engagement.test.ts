import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { metricsSyncEnabled } from "../auth/aggregateSync";
import {
  ALLOWED_AGGREGATES,
  CONSENT_TEXT,
  METRICS_FLOOR,
  NOT_ENOUGH_FAMILIES,
  aggregatePayload,
  classTotals,
  payloadIsAllowlisted,
} from "./aggregates";
import { letterOfTheWeekIndex } from "./schedule";

describe("letter of the week", () => {
  it("is the same week for every child on the same day", () => {
    const now = new Date("2026-09-27T15:00:00.000Z");
    expect(letterOfTheWeekIndex(now, "UTC")).toBe(letterOfTheWeekIndex(now, "UTC"));
    expect(letterOfTheWeekIndex(now, "UTC")).toBeGreaterThanOrEqual(0);
    expect(letterOfTheWeekIndex(now, "UTC")).toBeLessThan(14);
  });
});

describe("class aggregates", () => {
  const sessions = [
    { avatarId: "fox", day: "2026-09-21", minutes: 6 },
    { avatarId: "owl", day: "2026-09-22", minutes: 10 },
    { avatarId: "bear", day: "2026-09-22", minutes: 4 },
  ];

  it("hides totals until five families are linked", () => {
    const hidden = classTotals(METRICS_FLOOR - 1, sessions);
    expect(hidden.status).toBe("hidden");
    expect(hidden.message).toBe(NOT_ENOUGH_FAMILIES);
    expect(hidden.totals).toBeNull();
  });

  it("returns class totals only, with an allowlisted payload", () => {
    const ready = classTotals(5, sessions);
    expect(ready.status).toBe("ready");
    expect(ready.totals?.practiceDays).toBe(2);
    expect(ready.totals?.activeMinutes).toBe(20);
    expect(ready.totals?.medianSession).toBe(6);
    const payload = aggregatePayload(ready.totals!);
    expect(payloadIsAllowlisted(payload)).toBe(true);
    expect(JSON.stringify(payload)).not.toMatch(/mia|photo|audio|email|firstName/i);
    expect(Object.keys(payload).sort()).toEqual([...ALLOWED_AGGREGATES].sort());
  });

  it("keeps the consent sentence identical to the allowlist doc", () => {
    const doc = readFileSync(new URL("../../docs/sync-allowlist.md", import.meta.url), "utf8");
    expect(doc).toContain(CONSENT_TEXT);
    expect(CONSENT_TEXT).toBe("practice days, active minutes, and session length, as class totals, with no names");
  });

  it("keeps aggregate sync behind the sign-in flag", () => {
    expect(metricsSyncEnabled()).toBe(false);
  });
});
