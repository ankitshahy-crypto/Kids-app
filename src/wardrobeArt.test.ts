import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import art from "./data/wardrobeArt.json";
import { wardrobe } from "./data/wardrobe";

describe("the painted dress-up pieces", () => {
  it("each is a real piece of the closet, with its picture, placed on the face", () => {
    const entries = Object.entries(art as Record<string, { x: number; y: number; w: number; h: number }>);
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
    }
  });
});
