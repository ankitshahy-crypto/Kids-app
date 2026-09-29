import { describe, expect, it } from "vitest";
import { createChild, type ChildProfile } from "./profiles";
import { byNudge, checkInSounds, completion, lastActiveLabel, recordSoundCheck, saysSoundsHint, soundSummary } from "./progress";

const zone = "America/New_York";
// Thursday 1 October 2026, midday in New York. The week runs 28 Sep – 4 Oct.
const now = new Date("2026-10-01T16:00:00Z");

function child(patch: Partial<ChildProfile> = {}): ChildProfile {
  return { ...createChild({ name: "Mia", ageRange: "4", animal: "fox" }), ...patch };
}

const fullLesson = { reading: { letter: true, draw: true, story: true, moment: true } };

describe("completion", () => {
  it("counts whole lessons, practice days, and Explore areas this week", () => {
    const profile = child({
      days: {
        "2026-09-21": fullLesson,
        "2026-09-28": fullLesson,
        "2026-09-29": { reading: { letter: true }, math: { count: true } },
        "2026-10-01": { ...fullLesson, colors: { name: true }, reading: { ...fullLesson.reading, "game-hatch": true } },
      },
      practiceMs: { reading: { "2026-09-28": 300000, "2026-10-01": 240000 }, math: { "2026-09-29": 60000 } },
    });
    const done = completion(profile, now, zone);
    expect(done.lessonsTotal).toBe(3);
    expect(done.lessonsThisWeek).toBe(2);
    expect(done.practicedDays).toEqual([true, true, false, true, false, false, false]);
    expect(done.minutesThisWeek).toBe(10);
    expect(done.exploreThisWeek).toEqual(["math", "colors", "games"]);
    expect(done.lastActive).toBe("2026-10-01");
    expect(done.daysSinceActive).toBe(0);
  });

  it("counts a nest piece as a finished lesson", () => {
    const profile = child({ nest: [{ date: "2026-09-30", piece: "twig" }] });
    expect(completion(profile, now, zone).lessonsThisWeek).toBe(1);
  });

  it("says when a child has not started", () => {
    const done = completion(child(), now, zone);
    expect(done.lastActive).toBeNull();
    expect(lastActiveLabel(done.daysSinceActive)).toBe("Not started yet");
    expect(lastActiveLabel(0)).toBe("Today");
    expect(lastActiveLabel(1)).toBe("Yesterday");
    expect(lastActiveLabel(4)).toBe("4 days ago");
  });

  it("puts the child who has been away longest first", () => {
    const rows = [
      { id: "a", completion: { ...completion(child({ days: { "2026-10-01": fullLesson } }), now, zone) } },
      { id: "b", completion: { ...completion(child({ days: { "2026-09-25": fullLesson } }), now, zone) } },
      { id: "c", completion: { ...completion(child(), now, zone) } },
    ];
    expect(byNudge(rows).map((row) => row.id)).toEqual(["c", "b", "a"]);
  });
});

describe("quiet check-ins", () => {
  it("keep the latest try per sound", () => {
    let profile = child();
    profile = recordSoundCheck(profile, "m", true, now, zone);
    profile = recordSoundCheck(profile, "s", false, now, zone);
    profile = recordSoundCheck(profile, "sh", true, now, zone);
    profile = recordSoundCheck(profile, "s", true, now, zone);
    profile = recordSoundCheck(profile, "a_e", false, now, zone);
    expect(soundSummary(profile)).toEqual({ knows: ["m", "s", "sh"], practicing: ["a_e"] });
    expect(profile.soundChecks?.s).toEqual({ firstTry: true, date: "2026-10-01", got: 1, asked: 2 });
  });

  it("ignore anything that is not a sound", () => {
    const profile = recordSoundCheck(child(), "hello world", true, now, zone);
    expect(profile.soundChecks ?? {}).toEqual({});
  });

  it("pick this week's sounds first, then recent ones", () => {
    expect(checkInSounds(["p", "n"], ["m", "s", "a", "t", "p", "n"])).toEqual(["p", "n", "t", "a", "s"]);
  });
});

describe("who says the sounds in Sound It Out", () => {
  const friday = new Date("2026-10-02T16:00:00Z");
  const lastFriday = new Date("2026-09-25T16:00:00Z");

  function played(profile: ChildProfile, results: Record<string, boolean>, when: Date): ChildProfile {
    let next = profile;
    for (const [sound, firstTry] of Object.entries(results)) next = recordSoundCheck(next, sound, firstTry, when, zone);
    return next;
  }

  it("suggests nothing before any sound game", () => {
    expect(saysSoundsHint(child())).toEqual({ kind: "none" });
  });

  it("suggests the child is ready when every sound in the latest game was right on the first try", () => {
    const profile = played(child(), { m: true, s: true, t: true }, friday);
    expect(saysSoundsHint(profile)).toEqual({ kind: "ready", sounds: ["m", "s", "t"], date: "2026-10-02" });
  });

  it("needs three sounds, and a miss in the latest game holds it", () => {
    expect(saysSoundsHint(played(child(), { m: true, s: true }, friday)).kind).toBe("none");
    expect(saysSoundsHint(played(child(), { m: true, s: true, t: true, p: false }, friday)).kind).toBe("none");
  });

  it("goes by the latest game, not older ones", () => {
    const older = played(child(), { a: false, i: false }, lastFriday);
    expect(saysSoundsHint(played(older, { m: true, s: true, t: true }, friday)).kind).toBe("ready");
  });

  it("never suggests turning it on again once the child says the sounds", () => {
    const profile = played(child({ saysSounds: true }), { m: true, s: true, t: true }, friday);
    expect(saysSoundsHint(profile)).toEqual({ kind: "none" });
  });

  it("when the child says the sounds, two or more still practicing in the latest game suggests the app help again", () => {
    const one = played(child({ saysSounds: true }), { m: true, s: false, t: true }, friday);
    expect(saysSoundsHint(one)).toEqual({ kind: "none" });
    const two = played(child({ saysSounds: true }), { m: true, s: false, sh: false }, friday);
    expect(saysSoundsHint(two)).toEqual({ kind: "practicing", sounds: ["s", "sh"], date: "2026-10-02" });
  });
});
