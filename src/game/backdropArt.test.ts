import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import art from "../data/backdropArt.json";

type Painting = { hold: number; still: boolean; floor?: number; front?: boolean };
const paintings = art as Record<string, Painting>;
const folder = new URL("../../public/backdrops/", import.meta.url);
const kit = readFileSync(new URL("./kit.tsx", import.meta.url), "utf8");
/** Every scene the kit knows, read from its `SceneKind`. */
const kinds = [...(kit.match(/export type SceneKind = ([^;]+);/)?.[1] ?? "").matchAll(/"([a-z]+)"/g)].map((match) => match[1]);
/** Scenes that are only ever a small drawn picture (the Day and night choices), so have no painting. */
const DRAWN_ONLY = ["night"];
const INDOORS = ["room", "shop", "stand", "table"];

describe("the games' painted scenes", () => {
  it("every scene has its painting, but the ones that are only ever drawn small", () => {
    expect(kinds.length).toBeGreaterThanOrEqual(14);
    expect(Object.keys(paintings).sort()).toEqual(kinds.filter((kind) => !DRAWN_ONLY.includes(kind)).sort());
    for (const kind of Object.keys(paintings)) expect(existsSync(new URL(`${kind}.webp`, folder)), `${kind}.webp`).toBe(true);
    // And nothing is in the folder that the list does not know (a painting left behind by an earlier
    // run): each painting, and the near layer of each scene that has one.
    const known = Object.entries(paintings).flatMap(([kind, painting]) => [`${kind}.webp`, ...(painting.front ? [`${kind}-front.webp`] : [])]);
    expect(readdirSync(folder).sort()).toEqual(known.sort());
  });

  it("a near layer is for a scene outdoors, where the painting drifts, and is small", () => {
    // (scripts/backdrop-front.py: the painting's own clover, larger, along the bottom edge.)
    const near = Object.entries(paintings).filter(([, painting]) => painting.front);
    expect(near.map(([kind]) => kind)).toContain("field");
    for (const [kind, painting] of near) {
      expect(painting.still, `${kind} has a near layer, so it drifts`).toBe(false);
      expect(statSync(new URL(`${kind}-front.webp`, folder)).size, `${kind}-front.webp`).toBeLessThan(90_000);
    }
  });

  it("each is held somewhere in its own width, and a line to stand on is in its lower half", () => {
    for (const [kind, painting] of Object.entries(paintings)) {
      expect(painting.hold, `${kind}'s hold`).toBeGreaterThanOrEqual(0);
      expect(painting.hold, `${kind}'s hold`).toBeLessThanOrEqual(100);
      if (painting.floor !== undefined) {
        expect(painting.floor, `${kind}'s floor`).toBeGreaterThan(0.5);
        expect(painting.floor, `${kind}'s floor`).toBeLessThan(0.95);
      }
    }
  });

  it("indoors nothing drifts, and outdoors everything does", () => {
    const still = Object.entries(paintings)
      .filter(([, painting]) => painting.still)
      .map(([kind]) => kind);
    expect(still.sort()).toEqual(INDOORS);
    // A scene that drifts is drawn a touch large, about its ground: it has no line that a game stands things on.
    for (const [kind, painting] of Object.entries(paintings)) if (!painting.still) expect(painting.floor, `${kind} drifts, so has no floor`).toBeUndefined();
  });

  it("the paintings are small enough to travel with the app's shell", () => {
    let total = 0;
    for (const kind of Object.keys(paintings)) {
      const bytes = statSync(new URL(`${kind}.webp`, folder)).size;
      expect(bytes, `${kind}.webp`).toBeLessThan(160_000);
      total += bytes;
    }
    expect(total).toBeLessThan(1_500_000);
  });
});
