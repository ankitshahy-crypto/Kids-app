import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const file = (name: string) => new URL(`../../public/games/${name}`, import.meta.url);
const source = (name: string) => readFileSync(new URL(name, import.meta.url), "utf8");

describe("the games' painted props", () => {
  it("every coin face the money games name is there", () => {
    const faces = [...source("./money.tsx").matchAll(/face: "(copper|silver)"/g)].map((match) => match[1]);
    expect(new Set(faces)).toEqual(new Set(["copper", "silver"]));
    for (const face of new Set(faces)) expect(existsSync(file(`coin-${face}.webp`)), `coin-${face}.webp`).toBe(true);
  });

  it("the bill and the jar the money games name are there", () => {
    const names = source("./money.tsx").match(/moneyArt = \(name: ([^)]+)\)/)?.[1] ?? "";
    const list = [...names.matchAll(/"([a-z]+)"/g)].map((match) => match[1]);
    expect(list.sort()).toEqual(["bill", "jar"]);
    for (const name of list) expect(existsSync(file(`${name}.webp`)), `${name}.webp`).toBe(true);
  });

  it("every garden picture the garden names is there, the ground and the flower on its own among them", () => {
    const names = source("../components/ScienceGames.tsx").match(/gardenArt = \(name: ([^)]+)\)/)?.[1] ?? "";
    const list = [...names.matchAll(/"([a-z]+)"/g)].map((match) => match[1]);
    expect(list.length).toBeGreaterThanOrEqual(9);
    expect(list).toContain("ground");
    expect(list).toContain("bloom");
    for (const name of list) expect(existsSync(file(`garden/${name}.webp`)), `garden/${name}.webp`).toBe(true);
    // The plant's life in order uses the garden's seed and sprout, and the flower on its own.
    const life = source("../components/ScienceGames.tsx").match(/PAINTED_LIFE[^=]*= (\{[^}]+\})/)?.[1] ?? "";
    expect(life).toBe('{ seed: "seed", sprout: "sprout", flower: "bloom" }');
  });

  it("nothing is in the folder that no game names", () => {
    const named = new Set([
      "coin-copper.webp",
      "coin-silver.webp",
      "bill.webp",
      "jar.webp",
      ...[...(source("../components/ScienceGames.tsx").match(/gardenArt = \(name: ([^)]+)\)/)?.[1] ?? "").matchAll(/"([a-z]+)"/g)].map((match) => `garden/${match[1]}.webp`),
    ]);
    const folder = fileURLToPath(file(""));
    const found = (readdirSync(folder, { recursive: true }) as string[]).filter((path) => statSync(join(folder, path)).isFile());
    expect(found.sort()).toEqual([...named].sort());
  });
});
