import { existsSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import art from "./animalArt.json";
import { animals } from "./animals";

const FRAMES = ["idle", "cheer", "think", "wait", "blink", "sleepy", "wave", "silly"];
const file = (id: string, name: string) => existsSync(new URL(`../../public/animals/${id}/${name}`, import.meta.url));

describe("the painted animals", () => {
  it("every animal has a painted idle face, and every frame listed is there", () => {
    for (const { id } of animals) {
      const entry = (art as Record<string, { frames: string[]; body: boolean; head: Record<string, number>; places?: Record<string, number[]> }>)[id];
      expect(entry, `${id} has art`).toBeDefined();
      expect(entry.frames).toContain("idle");
      for (const frame of entry.frames) {
        expect(FRAMES, `${id}'s ${frame} is a frame the app knows`).toContain(frame);
        expect(file(id, `${frame}-face.webp`), `${id}/${frame}-face.webp`).toBe(true);
        if (entry.body) expect(file(id, `${frame}.webp`), `${id}/${frame}.webp`).toBe(true);
      }
      // And nothing is in its folder that the list does not know (a frame left behind by an earlier run).
      const onDisk = readdirSync(new URL(`../../public/animals/${id}/`, import.meta.url)).filter((name: string) => name.endsWith("-face.webp"));
      expect(onDisk.sort(), `${id}'s folder`).toEqual(entry.frames.map((frame) => `${frame}-face.webp`).sort());
      // The head sits at the top of the figure (its square box may poke past a narrow figure's sides).
      expect(entry.head.y).toBeGreaterThanOrEqual(0);
      expect(entry.head.y).toBeLessThan(0.2);
      expect(entry.head.h).toBeGreaterThan(0.25);
      expect(entry.head.y + entry.head.h).toBeLessThanOrEqual(1);
      expect(entry.head.x).toBeGreaterThan(-0.25);
      expect(entry.head.x + entry.head.w).toBeLessThan(1.25);
      expect(entry.head.w).toBeGreaterThan(0.4);
      // A round plush's mood frames keep their own crop; each says where the idle frame sits in it
      // (x, y, side as fractions): inside it, and not far off the idle's size.
      for (const [frame, place] of Object.entries(entry.places ?? {})) {
        expect(entry.frames, `${id}'s ${frame} is placed`).toContain(frame);
        expect(place).toHaveLength(3);
        const [x, y, side] = place;
        // Two renders draw the body up to a quarter bigger or smaller than each other.
        expect(side, `${id} ${frame}`).toBeGreaterThan(0.5);
        expect(side, `${id} ${frame}`).toBeLessThanOrEqual(1.3);
        expect(x, `${id} ${frame}`).toBeGreaterThanOrEqual(-0.2);
        expect(y, `${id} ${frame}`).toBeGreaterThanOrEqual(-0.2);
        expect(x + side, `${id} ${frame}`).toBeLessThanOrEqual(1.2);
        expect(y + side, `${id} ${frame}`).toBeLessThanOrEqual(1.2);
      }
    }
  });
});
