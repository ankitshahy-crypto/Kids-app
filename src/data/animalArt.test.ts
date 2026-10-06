import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import art from "./animalArt.json";
import { animals } from "./animals";

const FRAMES = ["idle", "cheer", "think", "wait", "blink", "wave", "silly"];
const file = (id: string, name: string) => existsSync(new URL(`../../public/animals/${id}/${name}`, import.meta.url));

describe("the painted animals", () => {
  it("every animal has a painted idle face, and every frame listed is there", () => {
    for (const { id } of animals) {
      const entry = (art as Record<string, { frames: string[]; body: boolean; head: Record<string, number> }>)[id];
      expect(entry, `${id} has art`).toBeDefined();
      expect(entry.frames).toContain("idle");
      for (const frame of entry.frames) {
        expect(FRAMES, `${id}'s ${frame} is a frame the app knows`).toContain(frame);
        expect(file(id, `${frame}-face.webp`), `${id}/${frame}-face.webp`).toBe(true);
        if (entry.body) expect(file(id, `${frame}.webp`), `${id}/${frame}.webp`).toBe(true);
      }
      // The head sits at the top of the figure (its square box may poke past a narrow figure's sides).
      expect(entry.head.y).toBeGreaterThanOrEqual(0);
      expect(entry.head.y).toBeLessThan(0.2);
      expect(entry.head.h).toBeGreaterThan(0.25);
      expect(entry.head.y + entry.head.h).toBeLessThanOrEqual(1);
      expect(entry.head.x).toBeGreaterThan(-0.25);
      expect(entry.head.x + entry.head.w).toBeLessThan(1.25);
      expect(entry.head.w).toBeGreaterThan(0.4);
    }
  });
});
