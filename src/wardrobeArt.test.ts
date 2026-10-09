import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import art from "./data/wardrobeArt.json";
import { animals } from "./data/animals";
import { wardrobe } from "./data/wardrobe";
import { wearArt } from "./wardrobeArt";

type Place = { x: number; y: number; w: number; h: number; rotate?: number };
const { fits, ...pieces } = art as unknown as Record<string, Place> & { fits: Record<string, Record<string, { dx?: number; dy?: number; rotate?: number }>> };

describe("the painted dress-up pieces", () => {
  it("each is a real piece of the closet, with its picture, placed on the face", () => {
    const entries = Object.entries(pieces as Record<string, Place>);
    expect(entries.length).toBeGreaterThan(0);
    for (const [id, place] of entries) {
      const item = wardrobe.find((piece) => piece.id === id);
      expect(item, `${id} is in the closet`).toBeDefined();
      expect(item?.slot).not.toBe("color");
      expect(existsSync(new URL(`../public/wardrobe/${id}.webp`, import.meta.url)), `${id}.webp`).toBe(true);
      // On the face (a scarf hangs a little below it), never off to a side.
      expect(place.x).toBeGreaterThanOrEqual(0);
      expect(place.x + place.w).toBeLessThanOrEqual(1);
      expect(place.y).toBeGreaterThanOrEqual(0);
      expect(place.y + place.h).toBeLessThanOrEqual(1.3);
      expect(place.w).toBeGreaterThan(0.1);
      expect(place.h).toBeGreaterThan(0.05);
      // Stood up straight at most a little: a turn is a correction, not a tilt.
      expect(Math.abs(place.rotate ?? 0)).toBeLessThanOrEqual(10);
    }
  });

  it("an animal's own fit for a piece moves it a little on the face and turns it a little", () => {
    for (const [animal, byPiece] of Object.entries(fits)) {
      expect(animals.some((entry) => entry.id === animal), animal).toBe(true);
      for (const [id, fit] of Object.entries(byPiece)) {
        expect(pieces, `${id} is a painted piece`).toHaveProperty(id);
        expect(Math.abs(fit.dx ?? 0)).toBeLessThanOrEqual(0.15);
        expect(Math.abs(fit.dy ?? 0)).toBeLessThanOrEqual(0.2);
        expect(Math.abs(fit.rotate ?? 0)).toBeLessThanOrEqual(10);
        // The piece, moved, still sits on the face.
        const placed = wearArt(id as never, animal as never)?.place;
        expect(placed).toBeDefined();
        expect(placed!.x).toBeGreaterThanOrEqual(0);
        expect(placed!.x + placed!.w).toBeLessThanOrEqual(1);
        expect(placed!.y).toBeGreaterThanOrEqual(0);
        expect(placed!.y + placed!.h).toBeLessThanOrEqual(1.3);
      }
    }
    // The bunny's glasses sit lower than the fox's, level on its nose; its crown sits on its head, between the ears.
    const bunny = wearArt("glasses-round", "bunny")!.place;
    const fox = wearArt("glasses-round", "fox")!.place;
    expect(bunny.y).toBeGreaterThan(fox.y);
    expect(wearArt("hat-crown", "bunny")!.place.y).toBeGreaterThan(wearArt("hat-crown", "fox")!.place.y);
  });
});
