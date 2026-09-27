import { describe, expect, it } from "vitest";
import { createChild } from "./profiles";
import { IDLE_MS, advanceReading, applyReadingCredit, type ReadingClock } from "./reading";

const zone = "UTC";
const t0 = Date.parse("2026-09-26T12:00:00.000Z");

function paused(visible = true): ReadingClock {
  return { startedAt: null, lastInteractionAt: t0, visible };
}

describe("active reading time", () => {
  it("counts time only until the idle limit, then stays paused", () => {
    const started = advanceReading({}, paused(), t0, zone, { interact: true });
    const idle = advanceReading(started.days, started.clock, t0 + 90_000, zone);
    expect(idle.days["2026-09-26"]).toBe(IDLE_MS);
    expect(idle.clock.startedAt).toBeNull();
    const later = advanceReading(idle.days, idle.clock, t0 + 120_000, zone);
    expect(later.addedMs).toBe(0);
    expect(later.days["2026-09-26"]).toBe(IDLE_MS);

    const resumed = advanceReading(later.days, later.clock, t0 + 120_000, zone, { interact: true });
    const more = advanceReading(resumed.days, resumed.clock, t0 + 130_000, zone);
    expect(more.days["2026-09-26"]).toBe(IDLE_MS + 10_000);
  });

  it("stops when the tab is hidden and does not fill that gap", () => {
    const started = advanceReading({}, paused(), t0, zone, { interact: true });
    const hidden = advanceReading(started.days, started.clock, t0 + 30_000, zone, { visible: false });
    expect(hidden.days["2026-09-26"]).toBe(30_000);
    expect(hidden.clock.startedAt).toBeNull();

    const still = advanceReading(hidden.days, hidden.clock, t0 + 50_000, zone);
    expect(still.addedMs).toBe(0);

    const shown = advanceReading(still.days, still.clock, t0 + 90_000, zone, { visible: true });
    expect(shown.clock.startedAt).toBeNull();
    expect(shown.addedMs).toBe(0);

    const tap = advanceReading(shown.days, shown.clock, t0 + 91_000, zone, { interact: true });
    const again = advanceReading(tap.days, tap.clock, t0 + 101_000, zone);
    expect(again.days["2026-09-26"]).toBe(40_000);
  });

  it("splits a stretch across local midnight", () => {
    const start = Date.parse("2026-09-26T23:59:50.000Z");
    const clock: ReadingClock = { startedAt: null, lastInteractionAt: start, visible: true };
    const started = advanceReading({}, clock, start, zone, { interact: true });
    const rolled = advanceReading(started.days, started.clock, start + 20_000, zone);
    expect(rolled.days["2026-09-26"]).toBe(10_000);
    expect(rolled.days["2026-09-27"]).toBe(10_000);
  });

  it("awards one star and one nest piece at the goal, then stops", () => {
    const child = createChild({ name: "Mia", ageRange: "4", animal: "fox" });
    const now = new Date("2026-09-26T15:00:00.000Z");
    const almost = applyReadingCredit(child, { "2026-09-26": 9 * 60_000 }, 10, now, zone);
    expect(almost.awardedNow).toBe(false);
    expect(almost.profile.stars).toBe(0);
    expect(almost.profile.nest).toHaveLength(0);

    const hit = applyReadingCredit(almost.profile, { "2026-09-26": 10 * 60_000 }, 10, now, zone);
    expect(hit.awardedNow).toBe(true);
    expect(hit.profile.stars).toBe(1);
    expect(hit.profile.nest.map((piece) => piece.date)).toEqual(["2026-09-26"]);
    expect(hit.profile.readingAwarded).toEqual(["2026-09-26"]);

    const extra = applyReadingCredit(hit.profile, { "2026-09-26": 25 * 60_000 }, 10, now, zone);
    expect(extra.awardedNow).toBe(false);
    expect(extra.profile.stars).toBe(1);
    expect(extra.profile.nest).toHaveLength(1);
    expect(extra.profile.readingMs["2026-09-26"]).toBe(25 * 60_000);
  });
});
