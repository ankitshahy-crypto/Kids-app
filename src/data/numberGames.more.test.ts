import { describe, expect, it } from "vitest";
import { dotRow, peekBand, peekRounds } from "./numberGames";

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

  it("numbers the ladybugs in reading order: top row first, left to right", () => {
    for (const level of ["early", "later"] as const) {
      for (const salt of salts) {
        for (const round of peekRounds(level, salt)) {
          round.spots.forEach((spot, index) => {
            if (index === 0) return;
            const prev = round.spots[index - 1];
            const sameRow = peekBand(prev.y) === peekBand(spot.y);
            expect(sameRow ? spot.x > prev.x : peekBand(spot.y) > peekBand(prev.y)).toBe(true);
          });
        }
      }
    }
  });

  it("draws a number's dots in one row up to three, then two rows", () => {
    expect(dotRow(3).every((dot) => dot.y === 0)).toBe(true);
    expect(Math.max(...dotRow(5).map((dot) => dot.y))).toBe(1);
    expect(dotRow(4)).toHaveLength(4);
  });
});
