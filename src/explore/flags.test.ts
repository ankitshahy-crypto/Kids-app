import { describe, expect, it } from "vitest";
import { emptyDesk, exploreSectionsShown, setExploreVisibility } from "../auth/school";
import { sectionVisible, visibleExplore } from "./flags";
import { normalizeSettings } from "../settings";

describe("explore flags", () => {
  it("shows every section unless a flag or the director switch is off", () => {
    expect(visibleExplore()).toEqual(["math", "colors", "time", "money", "build", "science", "games"]);
    expect(sectionVisible("math", { math: false })).toBe(false);
    expect(sectionVisible("colors", { math: false })).toBe(true);
    expect(visibleExplore({}, false)).toEqual([]);
  });

  it("defaults the director switch and the device switch on", () => {
    expect(exploreSectionsShown(emptyDesk())).toBe(true);
    const hidden = setExploreVisibility(emptyDesk(), false);
    expect(exploreSectionsShown(hidden.desk)).toBe(false);
    expect(hidden.writes).toEqual([]);
    const school = setExploreVisibility({ ...emptyDesk(), school: { id: "s1", name: "Kids Villa", createdBy: "ada" } }, false);
    expect(school.writes[0]).toMatchObject({ op: "set", path: "schools/s1/settings/explore", data: { showExplore: false } });
    expect(normalizeSettings({}).showExplore).toBe(true);
    expect(normalizeSettings({ showExplore: false }).showExplore).toBe(false);
  });
});
