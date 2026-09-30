import { describe, expect, it } from "vitest";
import { createChild, type ChildProfile } from "./profiles";
import { byNudge, checkInSounds, completion, lastActiveLabel, recordSoundCheck, saysSoundsHint, soFar, soFarLine, soundSummary } from "./progress";

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
  it("keep the day's first try per sound: a replay the same day, after seeing the answer, changes nothing", () => {
    let profile = child();
    profile = recordSoundCheck(profile, "m", true, now, zone);
    profile = recordSoundCheck(profile, "s", false, now, zone);
    profile = recordSoundCheck(profile, "sh", true, now, zone);
    profile = recordSoundCheck(profile, "s", true, now, zone);
    profile = recordSoundCheck(profile, "a_e", false, now, zone);
    expect(soundSummary(profile)).toEqual({ knows: ["m", "sh"], practicing: ["s", "a_e"] });
    expect(profile.soundChecks?.s).toEqual({ firstTry: false, date: "2026-10-01", got: 0, asked: 1, friday: { firstTry: false, date: "2026-10-01" } });
  });

  it("take the latest day's first try", () => {
    const nextWeek = new Date("2026-10-08T16:00:00Z");
    let profile = recordSoundCheck(child(), "s", false, now, zone);
    profile = recordSoundCheck(profile, "s", true, nextWeek, zone);
    expect(soundSummary(profile)).toEqual({ knows: ["s"], practicing: [] });
    expect(profile.soundChecks?.s).toEqual({ firstTry: true, date: "2026-10-08", got: 1, asked: 2, friday: { firstTry: true, date: "2026-10-08" } });
  });

  it("keep the Where to start check's try and the Friday game's apart", () => {
    let profile = recordSoundCheck(child(), "m", true, now, zone, "start");
    expect(profile.soundChecks?.m).toEqual({ firstTry: true, date: "2026-10-01", got: 1, asked: 1, start: { firstTry: true, date: "2026-10-01" } });
    profile = recordSoundCheck(profile, "s", true, now, zone);
    expect(profile.soundChecks?.s).toEqual({ firstTry: true, date: "2026-10-01", got: 1, asked: 1, friday: { firstTry: true, date: "2026-10-01" } });
    // The list of what they know counts both.
    expect(soundSummary(profile)).toEqual({ knows: ["m", "s"], practicing: [] });
  });

  it("on one day, the Where to start check and the Friday game each keep their own try of the same sound", () => {
    let profile = recordSoundCheck(child(), "m", true, now, zone, "start");
    profile = recordSoundCheck(profile, "m", false, now, zone);
    expect(profile.soundChecks?.m).toEqual({
      firstTry: false,
      date: "2026-10-01",
      got: 1,
      asked: 2,
      start: { firstTry: true, date: "2026-10-01" },
      friday: { firstTry: false, date: "2026-10-01" },
    });
    // The other way round, too: the game first, then the check, and the game's try is still there.
    let other = recordSoundCheck(child(), "m", true, now, zone);
    other = recordSoundCheck(other, "m", false, now, zone, "start");
    expect(other.soundChecks?.m?.friday).toEqual({ firstTry: true, date: "2026-10-01" });
    expect(other.soundChecks?.m?.start).toEqual({ firstTry: false, date: "2026-10-01" });
    // A replay of either the same day still changes nothing.
    expect(recordSoundCheck(other, "m", true, now, zone, "start")).toBe(other);
    expect(recordSoundCheck(other, "m", false, now, zone)).toBe(other);
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

  it("does not count the Where to start check: a new child is not 'ready' on day one", () => {
    let profile = child();
    for (const sound of ["m", "s", "t", "p"]) profile = recordSoundCheck(profile, sound, true, friday, zone, "start");
    expect(saysSoundsHint(profile)).toEqual({ kind: "none" });
    // A Friday game later on counts, on its own.
    const nextFriday = new Date("2026-10-09T16:00:00Z");
    const later = played(profile, { n: true, d: true, c: true }, nextFriday);
    expect(saysSoundsHint(later)).toEqual({ kind: "ready", sounds: ["c", "d", "n"], date: "2026-10-09" });
  });

  it("goes by the Friday game's own tries when the Where to start check happens the same day", () => {
    // Added on a Friday: the check first, all right; then the game, with a miss. Not ready.
    let profile = child();
    for (const sound of ["m", "s", "t", "p"]) profile = recordSoundCheck(profile, sound, true, friday, zone, "start");
    expect(saysSoundsHint(played(profile, { m: true, s: false, t: true }, friday))).toEqual({ kind: "none" });
    // The game first, all right; then the check, with misses. Still ready: the check does not hide the game.
    let other = played(child(), { m: true, s: true, t: true }, friday);
    for (const sound of ["m", "s"]) other = recordSoundCheck(other, sound, false, friday, zone, "start");
    expect(saysSoundsHint(other)).toEqual({ kind: "ready", sounds: ["m", "s", "t"], date: "2026-10-02" });
  });

  it("is not fooled by a replay the same day", () => {
    let profile = played(child(), { m: true, s: false, t: true }, friday);
    expect(saysSoundsHint(profile).kind).toBe("none");
    profile = played(profile, { m: true, s: true, t: true }, friday);
    expect(saysSoundsHint(profile).kind).toBe("none");
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

describe("what a child has done so far, for the unlock page", () => {
  const reading = "reading";
  it("counts letters, words, read-alongs and days of practice from the device, claiming no more than it knows", () => {
    const profile = child({
      stickers: [
        { subject: reading, kind: "letter", label: "m" },
        { subject: reading, kind: "letter", label: "s" },
        { subject: reading, kind: "letter", label: "sh" },
        { subject: reading, kind: "word", label: "sam" },
        { subject: reading, kind: "word", label: "mass" },
        { subject: "math", kind: "number", label: "3" },
      ],
      days: {
        "2026-09-28": { reading: { letter: true, draw: true, story: true, moment: true } },
        "2026-09-29": { reading: { letter: true, draw: false, story: false, moment: false } },
        "2026-09-30": { math: { count: true } },
        "2026-10-01": { reading: { letter: false, draw: false, story: false, moment: false } },
      },
      // A minute of practice counts as a day; a glance at the screen does not, and two short spells add up.
      practiceMs: { reading: { "2026-09-28": 300000, "2026-10-02": 120000, "2026-10-03": 1000, "2026-10-04": 40000 }, math: { "2026-10-04": 25000 } },
    });
    expect(soFar(profile)).toEqual({ letters: ["m", "s", "sh"], words: 2, stories: 1, days: 5 });
    expect(soFarLine(profile)).toBe("worked on M, S, SH and 2 words · read along once · 5 days of practice");
  });

  it("says nothing for a child with nothing done yet, and a second on screen is not a day of practice", () => {
    expect(soFarLine(child())).toBeNull();
    expect(soFar(child())).toEqual({ letters: [], words: 0, stories: 0, days: 0 });
    expect(soFarLine(child({ practiceMs: { reading: { "2026-10-01": 1200 } } }))).toBeNull();
  });

  it("leaves out empty parts, and keeps a long list of letters short", () => {
    const letters = ["m", "s", "a", "t", "p", "n", "d", "c", "b", "g"].map((label) => ({ subject: reading, kind: "letter" as const, label }));
    const profile = child({ stickers: letters, days: { "2026-09-28": { reading: { letter: true, draw: false, story: false, moment: false } } } });
    expect(soFarLine(profile)).toBe("worked on M, S, A, T, P, N, D, C and 2 more · 1 day of practice");
    const words = child({ stickers: [{ subject: reading, kind: "word", label: "cat" }], days: { "2026-09-28": { reading: { story: true } }, "2026-09-29": { reading: { story: true } } } });
    expect(soFarLine(words)).toBe("worked on 1 word · read along 2 times · 2 days of practice");
  });
});
