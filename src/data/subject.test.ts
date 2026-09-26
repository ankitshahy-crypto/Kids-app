import { afterEach, describe, expect, it, vi } from "vitest";
import { learningPlace } from "./path";
import {
  emptyPlacement,
  parsePlacement,
  resolvePlacement,
  withClassPlace,
} from "./placement";
import { awardStar, createChild, loadStore } from "./profiles";
import { applyReadingCredit } from "./reading";
import { applyEffort } from "./rewards";
import { sheetsFor } from "./sheets";
import { READING, defineSubject } from "./subject";

const PROFILES_KEY = "kids-app-profiles-v1";
const now = new Date("2026-09-26T15:00:00.000Z");
const zone = "UTC";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("subject key", () => {
  it("keeps reading on the path and leaves an unknown subject empty", () => {
    const reading = learningPlace(READING, 0);
    expect(reading.subject).toBe("reading");
    expect(reading.currentId).toBe("letters");
    expect(reading.stages).toHaveLength(4);

    const later = learningPlace("science", 3);
    expect(later.subject).toBe("science");
    expect(later.currentId).toBe("");
    expect(later.stages).toEqual([]);
    expect(later.introduced).toBe(0);
  });

  it("moves an older placement save under reading", () => {
    const loaded = parsePlacement({
      version: 1,
      origin: "device",
      classId: "device-class",
      updatedAt: now.toISOString(),
      classDefault: { stageId: "letters", weekIndex: 4 },
      byChildId: { mia: { stageId: "words", weekIndex: 8 } },
    });
    expect(loaded?.subjects.reading.classDefault).toEqual({
      subject: "reading",
      stageId: "blending",
      weekIndex: 4,
    });
    expect(loaded?.subjects.reading.byChildId.mia.subject).toBe("reading");
    expect(loaded?.subjects.reading.byChildId.mia.stageId).toBe("words");
  });

  it("loads a flat day and a sticker without a subject as reading", () => {
    const child = createChild({ name: "Mia", ageRange: "4", animal: "fox" });
    const saved = {
      activeId: child.id,
      profiles: [
        {
          ...child,
          stars: 1,
          days: {
            "2026-09-26": { letter: true, draw: false, story: false, moment: false },
          },
          stickers: [{ kind: "letter", label: "s" }],
          readingMs: { "2026-09-26": 1000 },
          readingAwarded: ["2026-09-25"],
        },
      ],
    };
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => (key === PROFILES_KEY ? JSON.stringify(saved) : null),
      setItem: () => undefined,
    });
    const loaded = loadStore().profiles[0];
    expect(loaded.days["2026-09-26"]?.reading?.letter).toBe(true);
    expect(loaded.stickers[0]).toEqual({ subject: "reading", kind: "letter", label: "s" });
    expect(loaded.practiceMs.reading["2026-09-26"]).toBe(1000);
    expect(loaded.readingMs["2026-09-26"]).toBe(1000);
    expect(loaded.practiceAwarded.reading).toContain("2026-09-25");

    const next = awardStar(loaded, "draw", now, zone);
    expect(next.stars).toBe(2);
    expect(next.days["2026-09-26"]?.reading?.draw).toBe(true);
    expect(awardStar(next, "draw", now, zone)).toBe(next);
  });

  it("does not award stars or time for a subject that is not registered", () => {
    const child = createChild({ name: "Mia", ageRange: "4", animal: "fox" });
    const starred = awardStar(child, "count", now, zone, "science");
    expect(starred).toBe(child);
    const effort = applyEffort(child, "count", [], now, zone, "science");
    expect(effort.awarded).toBe(false);
    expect(effort.profile).toBe(child);
    const credit = applyReadingCredit(child, { "2026-09-26": 60_000 }, 10, now, zone, "science");
    expect(credit.profile).toBe(child);
    expect(credit.awardedNow).toBe(false);
  });

  it("lists reading sheets and none for a subject that is not registered", () => {
    expect(sheetsFor(READING).map((sheet) => sheet.id)).toEqual(["letter", "blending", "word", "name"]);
    expect(sheetsFor("science")).toEqual([]);
  });

  it("stores reading time on the reading subject and keeps the reading mirror", () => {
    const child = createChild({ name: "Mia", ageRange: "4", animal: "fox" });
    const credit = applyReadingCredit(child, { "2026-09-26": 10 * 60_000 }, 10, now, zone);
    expect(credit.awardedNow).toBe(true);
    expect(credit.profile.practiceMs.reading["2026-09-26"]).toBe(10 * 60_000);
    expect(credit.profile.readingMs["2026-09-26"]).toBe(10 * 60_000);
    expect(credit.profile.practiceAwarded.reading).toEqual(["2026-09-26"]);
    expect(credit.profile.readingAwarded).toEqual(["2026-09-26"]);
  });

  it("lets a later subject use the same stars, time, path, and placement", () => {
    defineSubject({
      id: "plug",
      title: "Plug",
      stages: [{ id: "start", title: "Start", detail: "A later course.", size: 2 }],
      steps: ["try"],
    });
    const child = createChild({ name: "Mia", ageRange: "4", animal: "fox" });
    const effort = applyEffort(child, "try", [], now, zone, "plug");
    expect(effort.awarded).toBe(true);
    expect(effort.profile.days["2026-09-26"]?.plug?.try).toBe(true);
    expect(effort.profile.days["2026-09-26"]?.reading).toBeUndefined();
    expect(effort.lessonComplete).toBe(true);

    const place = learningPlace("plug", 1);
    expect(place.currentId).toBe("start");
    expect(place.stages).toHaveLength(1);

    const placed = withClassPlace(emptyPlacement(), { subject: "plug", stageId: "start", weekIndex: 0 }, now, "plug");
    expect(placed.subjects.reading.classDefault).toBeNull();
    expect(placed.subjects.plug.classDefault).toEqual({ subject: "plug", stageId: "start", weekIndex: 0 });
    const resolved = resolvePlacement(placed, child.id, child.createdAt, now, zone, "plug");
    expect(resolved.subject).toBe("plug");
    expect(resolved.stageId).toBe("start");
    expect(resolved.letters).toEqual([]);

    const credit = applyReadingCredit(effort.profile, { "2026-09-26": 60_000 }, 1, now, zone, "plug");
    expect(credit.profile.practiceMs.plug["2026-09-26"]).toBe(60_000);
    expect(credit.profile.readingMs["2026-09-26"]).toBeUndefined();
    expect(sheetsFor("plug")).toEqual([]);
  });
});
