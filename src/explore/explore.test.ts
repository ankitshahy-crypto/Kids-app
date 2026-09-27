import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { requestReward, resetRewardRequests } from "../rewards/request";
import { ExploreBoundary } from "./boundary";
import { sectionVisible, visibleExplore } from "./flags";
import { readSection, sectionStorageKey, writeSection } from "./sectionStore";
import { exploreImportViolations, forbiddenSpecifier, valueSpecifiers } from "./importRule";
import { sectionForScreen } from "./sections";

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

describe("explore isolation", () => {
  it("clears a crash when the section changes", () => {
    expect(ExploreBoundary.getDerivedStateFromError()).toEqual({ failed: true });
    expect(
      ExploreBoundary.getDerivedStateFromProps(
        { section: "colors", children: null },
        { failed: true, section: "math" },
      ),
    ).toEqual({ failed: false, section: "colors" });
    expect(
      ExploreBoundary.getDerivedStateFromProps({ section: "math", children: null }, { failed: true, section: "math" }),
    ).toBeNull();
    expect(readFileSync("src/explore/frame.tsx", "utf8")).toContain("key={section}");
    expect(sectionForScreen("letter")).toBeNull();
    expect(sectionForScreen("count")).toBe("math");
    expect(sectionForScreen("paint")).toBe("colors");
  });

  it("scans the files lazy.tsx imports and skips import type", () => {
    expect(forbiddenSpecifier("../data/profiles")).toBe(true);
    expect(forbiddenSpecifier("../../data/rewards")).toBe(true);
    expect(forbiddenSpecifier("../storage")).toBe(true);
    expect(forbiddenSpecifier("../rewards/request")).toBe(false);
    expect(valueSpecifiers('import type { ChildProfile } from "../data/profiles";\nimport { MATH } from "../data/math";')).toEqual([
      "../data/math",
    ]);
    expect(exploreImportViolations()).toEqual([]);
  });

  it("writes only the section key", () => {
    const storage = memory();
    storage.setItem("littlenest-profiles-v1", "Mia");
    const key = writeSection("math", "child", "mia", storage);
    expect(key).toBe("littlenest.section.math.child");
    expect(readSection("math", "child", storage)).toBe("mia");
    expect(storage.getItem("littlenest-profiles-v1")).toBe("Mia");
    expect(() => sectionStorageKey("math", "../profiles")).toThrow(/own keys/);
  });

  it("shows math and colors unless a flag is off", () => {
    expect(visibleExplore()).toEqual(["math", "colors"]);
    expect(sectionVisible("math", { math: false })).toBe(false);
    expect(sectionVisible("colors", { math: false })).toBe(true);
    expect(visibleExplore({}, false)).toEqual([]);
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
