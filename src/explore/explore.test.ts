import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ExploreBoundary } from "./boundary";
import { FORBIDDEN_IMPORT, exploreImportViolations, forbiddenSpecifier } from "./importRule";
import { readSection, sectionStorageKey, writeSection } from "./sectionStore";
import { sectionForScreen } from "./sections";
import { requestReward, resetRewardRequests } from "../rewards/request";

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    keys: () => [...data.keys()],
  };
}

describe("explore isolation", () => {
  it("catches a section crash without touching reading", () => {
    expect(ExploreBoundary.getDerivedStateFromError()).toEqual({ failed: true });
    expect(sectionForScreen("letter")).toBeNull();
    expect(sectionForScreen("count")).toBe("math");
    expect(sectionForScreen("story")).toBeNull();
  });

  it("refuses a forbidden import", () => {
    expect(forbiddenSpecifier("../data/profiles")).toBe(true);
    expect(forbiddenSpecifier("../../data/rewards")).toBe(true);
    expect(forbiddenSpecifier("../storage")).toBe(true);
    expect(forbiddenSpecifier("../rewards/request")).toBe(false);
    expect(forbiddenSpecifier("./sectionStore")).toBe(false);
    expect(exploreImportViolations()).toEqual([]);
    expect(readFileSync("scripts/check-explore-imports.mjs", "utf8")).toContain(FORBIDDEN_IMPORT.source);
  });

  it("refuses a write outside the section namespace", () => {
    const storage = memory();
    storage.setItem("littlenest-profiles-v1", "Mia");
    const key = writeSection("math", "child", "mia", storage);
    expect(key).toBe("littlenest.section.math.child");
    expect(readSection("math", "child", storage)).toBe("mia");
    expect(storage.getItem("littlenest-profiles-v1")).toBe("Mia");
    expect(() => sectionStorageKey("math", "../profiles")).toThrow(/own keys/);
    expect(() => writeSection("math", "stars", "9", storage)).not.toThrow();
    expect(storage.keys().some((item) => item.startsWith("littlenest-profiles"))).toBe(true);
  });
});

describe("requestReward", () => {
  it("grants one effort star and refuses the rest", () => {
    resetRewardRequests();
    expect(requestReward({ section: "math", reason: "finished" }, 1_000)).toEqual({ granted: true, stars: 1 });
    expect(requestReward({ section: "math", reason: "finished" }, 1_500)).toEqual({ granted: false, stars: 0 });
    expect(requestReward({ section: "colors", reason: "tried" }, 1_500)).toEqual({ granted: true, stars: 1 });
    expect(requestReward({ section: "math", reason: "bought" }, 3_000)).toEqual({ granted: false, stars: 0 });
    expect(requestReward({ section: "letter", reason: "finished" }, 3_000)).toEqual({ granted: false, stars: 0 });
    expect(requestReward({ section: "math", reason: "finished" }, 3_000)).toEqual({ granted: true, stars: 1 });
  });
});
