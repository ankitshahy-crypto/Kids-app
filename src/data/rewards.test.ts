import { describe, expect, it } from "vitest";
import { createChild } from "./profiles";
import { addNestPiece, addStickers, applyEffort, grantGift, milestonesBetween, wearItem } from "./rewards";

const now = new Date("2026-09-26T15:00:00.000Z");
const zone = "UTC";

function child(stars = 0) {
  return { ...createChild({ name: "Mia", ageRange: "4", animal: "fox" }), stars };
}

describe("effort rewards", () => {
  it("gives one star per step and does not take it back", () => {
    const once = applyEffort(child(), "draw", [], now, zone);
    expect(once.awarded).toBe(true);
    expect(once.profile.stars).toBe(1);
    const again = applyEffort(once.profile, "draw", [], now, zone);
    expect(again.awarded).toBe(false);
    expect(again.profile.stars).toBe(1);
    expect(again.profile).toBe(once.profile);
  });

  it("adds a letter and a word sticker once", () => {
    const learned = [
      { kind: "letter" as const, label: "S" },
      { kind: "word" as const, label: "Sun" },
    ];
    const first = applyEffort(child(), "letter", learned, now, zone);
    expect(first.stickersAdded).toBe(2);
    expect(first.profile.stickers.map((sticker) => sticker.label)).toEqual(["s", "sun"]);
    const second = applyEffort(first.profile, "letter", learned, now, zone);
    expect(second.stickersAdded).toBe(0);
    expect(second.profile.stickers).toHaveLength(2);
  });

  it("keeps a word read after the day's star was given, but not a prize", () => {
    // The lesson opens on a letter card, which takes the step's one star for the day.
    const first = applyEffort(child(), "letter", [{ kind: "letter" as const, label: "m" }], now, zone);
    expect(first.awarded).toBe(true);
    const word = applyEffort(first.profile, "letter", [{ kind: "word" as const, label: "am" }], now, zone);
    expect(word.awarded).toBe(false);
    expect(word.profile.stars).toBe(first.profile.stars);
    expect(word.stickersAdded).toBe(1);
    expect(word.profile.stickers.map((sticker) => sticker.label)).toEqual(["m", "am"]);
    // A prize still needs a star.
    const prize = applyEffort(word.profile, "letter", [{ kind: "animal" as const, label: "kitten" }], now, zone);
    expect(prize.stickersAdded).toBe(0);
  });

  it("adds one nest piece when the day is finished and keeps it", () => {
    let profile = child();
    for (const step of ["letter", "draw", "story"] as const) {
      profile = applyEffort(profile, step, [], now, zone).profile;
    }
    expect(profile.nest).toHaveLength(0);
    const done = applyEffort(profile, "moment", [], now, zone);
    expect(done.lessonComplete).toBe(true);
    expect(done.profile.nest).toEqual([{ date: "2026-09-26", piece: "twig" }]);
    const nextDay = new Date("2026-09-27T15:00:00.000Z");
    let later = done.profile;
    for (const step of ["letter", "draw", "story", "moment"] as const) {
      later = applyEffort(later, step, [], nextDay, zone).profile;
    }
    expect(later.nest.map((piece) => piece.piece)).toEqual(["twig", "egg"]);
    expect(addNestPiece(later, now, zone).nest).toHaveLength(2);
  });

  it("celebrates every 10 stars once", () => {
    expect(milestonesBetween(9, 10, [])).toEqual([10]);
    expect(milestonesBetween(10, 11, [10])).toEqual([]);
    const profile = applyEffort(child(9), "draw", [], now, zone);
    expect(profile.profile.stars).toBe(10);
    expect(profile.milestones).toEqual([10]);
    expect(profile.profile.celebrated).toEqual([10]);
    const again = applyEffort(profile.profile, "story", [], now, zone);
    expect(again.milestones).toEqual([]);
  });

  it("wears only items the stars have already earned", () => {
    const locked = wearItem(child(0), "hat-leaf");
    expect(locked.outfit.hat).toBeNull();
    const earned = wearItem(child(1), "hat-leaf");
    expect(earned.outfit.hat).toBe("hat-leaf");
    expect(wearItem(earned, "hat-leaf").outfit.hat).toBeNull();
    expect(addStickers(child(), []).stickers).toEqual([]);
    const gifted = grantGift(child(0), "scarf-stripe");
    expect(wearItem(gifted, "scarf-stripe").outfit.scarf).toBe("scarf-stripe");
  });
});
