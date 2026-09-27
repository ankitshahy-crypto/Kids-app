import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { animals, isAnimalId } from "./animals";
import { createChild, lessonName, sameLessonName } from "./profiles";

describe("animal choices", () => {
  it("offers twelve animals, each with a face color", () => {
    expect(animals.length).toBe(12);
    const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
    const palette = readFileSync(new URL("../palette.ts", import.meta.url), "utf8");
    for (const animal of animals) {
      expect(css, animal.id).toMatch(new RegExp(`--face-${animal.id}:\\s*#[0-9a-fA-F]{6}`));
      expect(palette, animal.id).toContain(`${animal.id}: "var(--face-${animal.id})"`);
      expect(isAnimalId(animal.id)).toBe(true);
    }
    expect(new Set(animals.map((animal) => animal.name)).size).toBe(animals.length);
  });

  it("keeps a saved child on a new animal readable", () => {
    const child = createChild({ name: "M", ageRange: "4", animal: "penguin" });
    expect(child.animal).toBe("penguin");
    expect(lessonName(child)).toBe("Penguin");
  });
});

describe("two children the app could not tell apart", () => {
  const others = [
    { name: "M", animal: "fox" as const },
    { name: "Mia", animal: "cat" as const },
  ];

  it("stops a second initial-only child on the same animal", () => {
    expect(sameLessonName({ name: "J", animal: "fox" }, others)).toEqual({ name: "M", animal: "fox" });
    expect(sameLessonName({ name: "j", animal: "fox" }, others)).toEqual({ name: "M", animal: "fox" });
  });

  it("stops the same first name on the same animal, but not on a different one", () => {
    expect(sameLessonName({ name: "mia", animal: "cat" }, others)).toEqual({ name: "Mia", animal: "cat" });
    expect(sameLessonName({ name: "Mia", animal: "fox" }, others)).toBeNull();
    expect(sameLessonName({ name: "Mia Lopez", animal: "cat" }, others)).toEqual({ name: "Mia", animal: "cat" });
  });

  it("lets a first name share an animal with an initial, and ignores a blank name", () => {
    expect(sameLessonName({ name: "Max", animal: "fox" }, others)).toBeNull();
    expect(sameLessonName({ name: "J", animal: "cat" }, others)).toBeNull();
    expect(sameLessonName({ name: "  ", animal: "fox" }, others)).toBeNull();
    expect(sameLessonName({ name: "J", animal: "fox" }, [])).toBeNull();
  });
});
