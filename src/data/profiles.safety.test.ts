import { describe, expect, it } from "vitest";
import { corruptKey, PROFILES_KEY } from "../storage";
import { awardStar, corruptProfileNotice, createChild, loadStore, saveStore } from "./profiles";

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

function keptDay() {
  return { letter: true, draw: false, story: false, moment: false };
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

  it("keeps a child when one day record cannot be read", () => {
    const child = createChild({ name: "Mia", ageRange: "4", animal: "fox" });
    const storage = memory();
    storage.setItem(
      PROFILES_KEY,
      JSON.stringify({
        activeId: child.id,
        profiles: [{ ...child, days: { "2026-09-26": "nope", "2026-09-27": keptDay() } }],
      }),
    );
    const loaded = loadStore(storage);
    expect(loaded.profiles.map((profile) => profile.name)).toEqual(["Mia"]);
    expect(loaded.profiles[0]?.days["2026-09-26"]).toBeUndefined();
    expect(loaded.profiles[0]?.days["2026-09-27"]?.reading.letter).toBe(true);
    expect(storage.getItem(corruptKey(PROFILES_KEY))).toBeNull();
  });

  it("merges a corrupt stash this version can read and clears it", () => {
    const child = createChild({ name: "Mia", ageRange: "4", animal: "fox" });
    const storage = memory();
    storage.setItem(corruptKey(PROFILES_KEY), JSON.stringify({ activeId: child.id, profiles: [child] }));
    const loaded = loadStore(storage);
    expect(loaded.profiles.map((profile) => profile.id)).toEqual([child.id]);
    expect(storage.getItem(corruptKey(PROFILES_KEY))).toBeNull();
    expect(JSON.parse(storage.getItem(PROFILES_KEY) ?? "{}").profiles[0].name).toBe("Mia");
    expect(corruptProfileNotice(storage)).toBeNull();
  });

  it("reports a corrupt stash this version still cannot read", () => {
    const storage = memory();
    storage.setItem(corruptKey(PROFILES_KEY), "{not json");
    expect(loadStore(storage).profiles).toEqual([]);
    expect(storage.getItem(corruptKey(PROFILES_KEY))).toBe("{not json");
    expect(corruptProfileNotice(storage)).toBe("A saved profile on this device could not be read.");
  });

  it("refuses a step that is not on the allowlist", () => {
    const child = createChild({ name: "Mia", ageRange: "4", animal: "fox" });
    expect(awardStar(child, "spin-99", now, zone).stars).toBe(0);
    expect(awardStar(child, "letter", now, zone).stars).toBe(1);
  });
});

describe("quiet check-ins", () => {
  it("keeps each check's own try, and reads older saves as the Friday game's, or the start check's when marked", () => {
    const storage = memory();
    const child = {
      ...createChild({ name: "Mia", ageRange: "4", animal: "fox" }),
      soundChecks: {
        // Both checks on record.
        m: { firstTry: false, date: "2026-09-25", got: 1, asked: 2, friday: { firstTry: false, date: "2026-09-25" }, start: { firstTry: true, date: "2026-09-21" } },
        // A save with the older `start: true` mark.
        s: { firstTry: true, date: "2026-09-25", got: 1, asked: 1, start: true },
        // A save with an odd mark, or none: the Friday game's.
        t: { firstTry: true, date: "2026-09-25", got: 1, asked: 1, start: "yes" },
        p: { firstTry: true, date: "2026-09-25", got: 1, asked: 1 },
        // A broken try is dropped, and the latest try stands in.
        n: { firstTry: true, date: "2026-09-25", got: 1, asked: 1, friday: { firstTry: "yes", date: "2026-09-25" } },
      },
    };
    storage.setItem(PROFILES_KEY, JSON.stringify({ activeId: child.id, profiles: [child] }));
    const loaded = loadStore(storage).profiles[0];
    expect(loaded.soundChecks?.m).toEqual(child.soundChecks.m);
    expect(loaded.soundChecks?.s).toEqual({ firstTry: true, date: "2026-09-25", got: 1, asked: 1, start: { firstTry: true, date: "2026-09-25" } });
    expect(loaded.soundChecks?.t).toEqual({ firstTry: true, date: "2026-09-25", got: 1, asked: 1, friday: { firstTry: true, date: "2026-09-25" } });
    expect(loaded.soundChecks?.p).toEqual({ firstTry: true, date: "2026-09-25", got: 1, asked: 1, friday: { firstTry: true, date: "2026-09-25" } });
    expect(loaded.soundChecks?.n).toEqual({ firstTry: true, date: "2026-09-25", got: 1, asked: 1, friday: { firstTry: true, date: "2026-09-25" } });
  });
});

describe("who says the sounds", () => {
  it("keeps a grown-up's choice and reads anything else as the app saying them", () => {
    const storage = memory();
    const on = { ...createChild({ name: "Mia", ageRange: "4", animal: "fox" }), saysSounds: true };
    const odd = { ...createChild({ name: "Leo", ageRange: "5", animal: "owl" }), saysSounds: "yes" };
    const off = createChild({ name: "Ava", ageRange: "6-7", animal: "cat" });
    storage.setItem(PROFILES_KEY, JSON.stringify({ activeId: on.id, profiles: [on, odd, off] }));
    const loaded = loadStore(storage).profiles;
    expect(loaded.map((profile) => profile.saysSounds)).toEqual([true, undefined, undefined]);
  });
});
