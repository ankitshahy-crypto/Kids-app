import { describe, expect, it } from "vitest";
import { PROFILES_KEY, readStored, writeStored } from "./storage";

function memory() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

describe("stored progress", () => {
  it("reads an older kids-app save and keeps writing both keys", () => {
    const storage = memory();
    storage.setItem("kids-app-profiles-v1", "{\"activeId\":null}");
    expect(readStored(storage, PROFILES_KEY)).toBe("{\"activeId\":null}");
    expect(storage.data.get(PROFILES_KEY)).toBe("{\"activeId\":null}");
    writeStored(storage, PROFILES_KEY, "{\"activeId\":\"mia\"}");
    expect(storage.data.get(PROFILES_KEY)).toBe("{\"activeId\":\"mia\"}");
    expect(storage.data.get("kids-app-profiles-v1")).toBe("{\"activeId\":\"mia\"}");
    expect(readStored(storage, PROFILES_KEY)).toBe("{\"activeId\":\"mia\"}");
  });

  it("does not throw when the browser refuses the write", () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(() => writeStored(storage, PROFILES_KEY, "{\"activeId\":null}")).not.toThrow();
  });
});
