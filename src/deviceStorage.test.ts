import { afterEach, describe, expect, it, vi } from "vitest";
import { deviceStorage, resetDeviceStorage, storageRefusedNotice } from "./deviceStorage";

afterEach(() => {
  vi.unstubAllGlobals();
  resetDeviceStorage();
});

describe("the device's storage", () => {
  it("is the browser's own when the browser hands it over", () => {
    const kept = new Map<string, string>();
    const own = { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => void kept.set(key, value), removeItem: (key: string) => void kept.delete(key) };
    vi.stubGlobal("localStorage", own);
    expect(deviceStorage()).toBe(own);
    expect(storageRefusedNotice()).toBeNull();
  });

  it("is kept in memory for the visit when the very mention of localStorage throws", () => {
    // Safari with "Block All Cookies": reading the property is what throws, not a call on it.
    const was = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("The operation is insecure.", "SecurityError");
      },
    });
    try {
      const store = deviceStorage();
      expect(store.getItem("a")).toBeNull();
      store.setItem("a", "1");
      // The same store each time, so what one part of the app writes another can read.
      expect(deviceStorage().getItem("a")).toBe("1");
      deviceStorage().removeItem("a");
      expect(store.getItem("a")).toBeNull();
      expect(storageRefusedNotice()).toContain("not letting LittleNest save");
    } finally {
      if (was) Object.defineProperty(globalThis, "localStorage", was);
      else Reflect.deleteProperty(globalThis, "localStorage");
    }
  });
});
