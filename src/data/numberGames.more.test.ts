import { describe, expect, it } from "vitest";
import { animals } from "./animals";
import { BAKERY_CUSTOMERS, bakeryLineId, bakeryRounds, bakeryVerdict, dotRow, numberLine, numberManifestEntries, peekRounds, PLATE_MAX } from "./numberGames";

const salts = Array.from({ length: 60 }, (_, index) => index * 41 + 3);
const levels = ["early", "later"] as const;

describe("peek", () => {
  it("shows 1 to 4 at ages 3–4 and 1 to 5 at 5–7, never the same group twice in a row", () => {
    for (const salt of salts) {
      for (const level of levels) {
        const rounds = peekRounds(level, salt);
        expect(rounds).toHaveLength(level === "later" ? 5 : 4);
        rounds.forEach((round, index) => {
          expect(round.count).toBeGreaterThanOrEqual(1);
          expect(round.count).toBeLessThanOrEqual(level === "later" ? 5 : 4);
          expect(round.spots).toHaveLength(round.count);
          if (index > 0) expect(round.count).not.toBe(rounds[index - 1].count);
        });
      }
    }
  });

  it("offers three different numbers with the answer among them, and moves the answer from round to round", () => {
    for (const salt of salts) {
      const rounds = peekRounds("early", salt);
      for (const round of rounds) {
        expect(new Set(round.choices).size).toBe(3);
        expect(round.choices).toContain(round.count);
        for (const value of round.choices) expect(value).toBeGreaterThanOrEqual(1);
      }
      for (let index = 1; index < rounds.length; index += 1) {
        expect(rounds[index].choices.indexOf(rounds[index].count)).not.toBe(rounds[index - 1].choices.indexOf(rounds[index - 1].count));
      }
    }
  });

  it("keeps every ladybug on the leaf and apart from the others", () => {
    for (const salt of salts) {
      for (const level of levels) {
        for (const round of peekRounds(level, salt)) {
          for (const [index, spot] of round.spots.entries()) {
            expect(spot.x).toBeGreaterThanOrEqual(15);
            expect(spot.x).toBeLessThanOrEqual(85);
            expect(spot.y).toBeGreaterThanOrEqual(15);
            expect(spot.y).toBeLessThanOrEqual(85);
            for (const other of round.spots.slice(index + 1)) expect(Math.hypot(spot.x - other.x, spot.y - other.y)).toBeGreaterThanOrEqual(22);
          }
        }
      }
    }
  });

  it("differs between plays", () => {
    const seen = new Set(salts.map((salt) => peekRounds("early", salt).map((round) => `${round.count}:${round.choices.join("")}`).join("|")));
    expect(seen.size).toBeGreaterThan(20);
  });

  it("draws a number's dots in one row up to three, then two rows", () => {
    expect(dotRow(3).every((dot) => dot.y === 0)).toBe(true);
    expect(Math.max(...dotRow(5).map((dot) => dot.y))).toBe(1);
    expect(dotRow(4)).toHaveLength(4);
  });
});

describe("bakery", () => {
  it("asks for 1 to 5 at ages 3–4 (starting with three or fewer) and 2 to 8 at 5–7, no order twice", () => {
    for (const salt of salts) {
      const early = bakeryRounds("early", salt);
      expect(early).toHaveLength(3);
      expect(early[0].ask).toBeLessThanOrEqual(3);
      expect(new Set(early.map((round) => round.ask)).size).toBe(3);
      for (const round of early) expect(round.ask).toBeGreaterThanOrEqual(1);
      for (const round of early) expect(round.ask).toBeLessThanOrEqual(5);
      const later = bakeryRounds("later", salt);
      expect(later).toHaveLength(4);
      expect(new Set(later.map((round) => round.ask)).size).toBe(4);
      for (const round of later) expect(round.ask).toBeGreaterThanOrEqual(2);
      for (const round of later) expect(round.ask).toBeLessThanOrEqual(PLATE_MAX);
    }
  });

  it("sends a different customer each time, never the child's own animal", () => {
    const ids = new Set(animals.map((animal) => animal.id as string));
    for (const customer of BAKERY_CUSTOMERS) expect(ids.has(customer)).toBe(true);
    for (const salt of salts) {
      const rounds = bakeryRounds("later", salt, "bear");
      expect(new Set(rounds.map((round) => round.customer)).size).toBe(rounds.length);
      expect(rounds.map((round) => round.customer)).not.toContain("bear");
    }
  });

  it("says when the plate is right, short or over", () => {
    expect(bakeryVerdict(3, 3)).toBe("right");
    expect(bakeryVerdict(3, 0)).toBe("more");
    expect(bakeryVerdict(3, 2)).toBe("more");
    expect(bakeryVerdict(3, 4)).toBe("less");
  });

  it("orders in a whole sentence, one strawberry or more strawberries", () => {
    expect(numberLine(bakeryLineId(1))).toBe("One strawberry, please!");
    expect(numberLine(bakeryLineId(4))).toBe("Four strawberries, please!");
    const ids = numberManifestEntries().map((entry) => entry.id);
    for (let ask = 1; ask <= 8; ask += 1) expect(ids).toContain(bakeryLineId(ask));
    for (const id of ["num-peek", "num-peek-again", "num-bake-bell", "num-bake-more", "num-bake-less", "num-bake-yum"]) expect(ids).toContain(id);
  });
});
