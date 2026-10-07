import { existsSync, readdirSync, readFileSync } from "node:fs";
import { sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { THINGS } from "../data/timeGames";

const file = (name: string) => new URL(`../../public/games/${name}`, import.meta.url);
const source = (name: string) => readFileSync(new URL(name, import.meta.url), "utf8");
/** The names a picture helper in ScienceGames.tsx takes: `<helper> = (name: "a" | "b" ...)`. */
const names = (helper: string) => [...(source("../components/ScienceGames.tsx").match(new RegExp(`${helper} = \\(name: ([^)]+)\\)`))?.[1] ?? "").matchAll(/"([a-z]+)"/g)].map((match) => match[1]);
const gardenNames = () => names("gardenArt");
const lifeNames = () => names("lifeArt");

describe("the games' painted props", () => {
  it("every coin face the money games name is there", () => {
    const faces = [...source("./money.tsx").matchAll(/face: "(copper|silver)"/g)].map((match) => match[1]);
    expect(new Set(faces)).toEqual(new Set(["copper", "silver"]));
    for (const face of new Set(faces)) expect(existsSync(file(`coin-${face}.webp`)), `coin-${face}.webp`).toBe(true);
  });

  it("the bills and the jar the money games name are there", () => {
    const names = source("./money.tsx").match(/moneyArt = \(name: ([^)]+)\)/)?.[1] ?? "";
    const list = [...names.matchAll(/"([a-z-]+)"/g)].map((match) => match[1]);
    expect(list.sort()).toEqual(["bill", "bill-five", "jar"]);
    for (const name of list) expect(existsSync(file(`${name}.webp`)), `${name}.webp`).toBe(true);
  });

  it("every thing of the money games has its painting", () => {
    expect(THINGS).toHaveLength(14);
    expect(new Set(THINGS).size).toBe(14);
    for (const id of THINGS) expect(existsSync(file(`goods/${id}.webp`)), `goods/${id}.webp`).toBe(true);
    // Everything the games put up for sale, or ask about in Need or want, is among them.
    const data = source("../data/timeGames.ts");
    const goods = [...(data.match(/export type GoodId = ([^;]+);/)?.[1] ?? "").matchAll(/"([a-z]+)"/g)].map((match) => match[1]);
    expect(goods.length).toBeGreaterThanOrEqual(12);
    const needs = [...(data.match(/NEED_ITEMS: NeedItem\[\] = \[([^\]]+)\]/)?.[1] ?? "").matchAll(/id: "([a-z]+)"/g)].map((match) => match[1]);
    expect(needs.length).toBeGreaterThanOrEqual(8);
    for (const id of [...goods, ...needs]) expect(THINGS, id).toContain(id);
  });

  it("every garden picture the garden names is there, the ground and the flower on its own among them", () => {
    const list = gardenNames();
    expect(list.length).toBeGreaterThanOrEqual(9);
    expect(list).toContain("ground");
    expect(list).toContain("bloom");
    for (const name of list) expect(existsSync(file(`garden/${name}.webp`)), `garden/${name}.webp`).toBe(true);
  });

  it("the three lives put in order are painted, each stage from the garden or the life folder", () => {
    const life = source("../components/ScienceGames.tsx").match(/PAINTED_LIFE[^=]*= (\{[^}]+\})/)?.[1] ?? "";
    const stages: Record<string, string> = Object.fromEntries([...life.matchAll(/(\w+): (gardenArt|lifeArt)\("(\w+)"\)/g)].map((match) => [match[1], `${match[2] === "gardenArt" ? "garden" : "life"}/${match[3]}.webp`]));
    expect(Object.keys(stages).sort()).toEqual(["butterfly", "caterpillar", "chick", "chrysalis", "egg", "flower", "hen", "seed", "sprout"]);
    expect(stages.flower).toBe("garden/bloom.webp");
    for (const [stage, path] of Object.entries(stages)) expect(existsSync(file(path)), `${stage}: ${path}`).toBe(true);
    // And every stage of every life the data knows is among them.
    const cycles = source("../data/science.ts").match(/LIFE_CYCLES[^=]*= \[([\s\S]+?)\];/)?.[1] ?? "";
    const arts = [...cycles.matchAll(/art: "(\w+)"/g)].map((match) => match[1]);
    expect(arts.length).toBe(9);
    for (const art of arts) expect(stages, art).toHaveProperty(art);
    expect(lifeNames().sort()).toEqual(["butterfly", "caterpillar", "chick", "chrysalis", "egg", "hen"]);
  });

  it("nothing is in the folder that no game names", () => {
    const named = new Set([
      "coin-copper.webp",
      "coin-silver.webp",
      "bill.webp",
      "bill-five.webp",
      "jar.webp",
      ...gardenNames().map((name) => `garden/${name}.webp`),
      ...lifeNames().map((name) => `life/${name}.webp`),
      ...THINGS.map((id) => `goods/${id}.webp`),
    ]);
    const folder = fileURLToPath(file(""));
    // Pictures only (a Finder's .DS_Store is not a stray), with the folder's own separator.
    const found = (readdirSync(folder, { recursive: true }) as string[]).filter((path) => path.endsWith(".webp")).map((path) => path.split(sep).join("/"));
    expect(found.sort()).toEqual([...named].sort());
  });
});
