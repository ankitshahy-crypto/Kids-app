import { describe, expect, it } from "vitest";
import { corruptKey, PROFILES_KEY } from "../storage";
import { awardStar, createChild, loadStore, saveStore } from "./profiles";

const now = new Date("2026-09-26T15:00:00.000Z");
const zone = "UTC";

function memory() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

describe("profile saves", () => {
  it("keeps unreadable JSON and stashes a copy", () => {
    const storage = memory();
    storage.setItem(PROFILES_KEY, "{not json");
    expect(loadStore(storage).profiles).toEqual([]);
    expect(storage.getItem(PROFILES_KEY)).toBe("{not json");
    expect(storage.getItem(corruptKey(PROFILES_KEY))).toBe("{not json");
  });

  it("does not drop an unknown child record from the saved document", () => {
    const child = createChild({ name: "Mia", ageRange: "4", animal: "fox" });
    const raw = JSON.stringify({
      activeId: child.id,
      profiles: [child, { id: "later", note: "not this version" }],
    });
    const storage = memory();
    storage.setItem(PROFILES_KEY, raw);
    const loaded = loadStore(storage);
    expect(loaded.profiles.map((profile) => profile.id)).toEqual([child.id]);
    expect(storage.getItem(PROFILES_KEY)).toBe(raw);
    expect(storage.getItem(corruptKey(PROFILES_KEY))).toBe(raw);
  });

  it("leaves a readable save alone", () => {
    const child = createChild({ name: "Mia", ageRange: "4", animal: "fox" });
    const raw = JSON.stringify({ activeId: child.id, profiles: [child] });
    const storage = memory();
    storage.setItem(PROFILES_KEY, raw);
    const writes: string[] = [];
    const watching = {
      getItem: (key: string) => storage.getItem(key),
      setItem: (key: string, value: string) => {
        writes.push(key);
        storage.setItem(key, value);
      },
    };
    expect(loadStore(watching).profiles).toHaveLength(1);
    expect(writes).toEqual([]);
    expect(storage.getItem(corruptKey(PROFILES_KEY))).toBeNull();
  });

  it("writes a real edit without erasing the corrupt stash", () => {
    const storage = memory();
    storage.setItem(corruptKey(PROFILES_KEY), "{not json");
    const child = createChild({ name: "Mia", ageRange: "4", animal: "fox" });
    saveStore({ activeId: child.id, profiles: [child] }, storage);
    expect(storage.getItem(corruptKey(PROFILES_KEY))).toBe("{not json");
    expect(JSON.parse(storage.getItem(PROFILES_KEY) ?? "").profiles[0].name).toBe("Mia");
  });

  it("refuses a step that is not on the allowlist", () => {
    const child = createChild({ name: "Mia", ageRange: "4", animal: "fox" });
    expect(awardStar(child, "spin-99", now, zone).stars).toBe(0);
    expect(awardStar(child, "letter", now, zone).stars).toBe(1);
  });
});
