import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const file = (name: string) => new URL(`../../public/games/${name}`, import.meta.url);
const source = (name: string) => readFileSync(new URL(name, import.meta.url), "utf8");

describe("the games' painted props", () => {
  it("every coin face the money games name is there", () => {
    const faces = [...source("./money.tsx").matchAll(/face: "(copper|silver)"/g)].map((match) => match[1]);
    expect(new Set(faces)).toEqual(new Set(["copper", "silver"]));
    for (const face of new Set(faces)) expect(existsSync(file(`coin-${face}.webp`)), `coin-${face}.webp`).toBe(true);
  });

  it("every garden picture the garden names is there", () => {
    const names = source("../components/ScienceGames.tsx").match(/gardenArt = \(name: ([^)]+)\)/)?.[1] ?? "";
    const list = [...names.matchAll(/"([a-z]+)"/g)].map((match) => match[1]);
    expect(list.length).toBeGreaterThanOrEqual(7);
    for (const name of list) expect(existsSync(file(`garden/${name}.webp`)), `garden/${name}.webp`).toBe(true);
  });
});
