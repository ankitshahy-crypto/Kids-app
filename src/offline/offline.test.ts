import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import config from "../../capacitor.config";
import available from "../data/audioAvailable.json";
import { animals } from "../data/animals";
import { animalsOnDevice, clipForDevice, describeBytes, hasChildOnDevice, lessonAudioFiles, offlineAudioBytes, offlineUrls, shippedAudioFiles } from "./assets";
import { isComplete } from "./download";
import { networkHold } from "./network";
import { enqueue, readOutbox, requestClassSync } from "./queue";
import { shareWordNest } from "../share";

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => data.clear(),
    key: (index: number) => [...data.keys()][index] ?? null,
    get length() {
      return data.size;
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("offline bundle", () => {
  it("keeps lesson clips on this device and the iOS app off a remote server", () => {
    const files = lessonAudioFiles();
    expect(files).toContain("letters/b.mp3");
    expect(files).toContain("sounds/b.mp3");
    expect(files).toContain("words/cat.mp3");
    expect(files).toContain("sentences/lets-read.mp3");
    expect(files).toContain("prompts/pair-a.mp3");
    expect(files).toContain("prompts/pair-z.mp3");
    for (const file of files) {
      expect(file).toMatch(/^[a-z0-9/-]+\.mp3$/);
      expect(file.startsWith("http")).toBe(false);
    }
    expect(config.webDir).toBe("dist");
    expect(config.server).toBeUndefined();
  });

  it("keeps story lines for this device's animals only", () => {
    const fox = new Set(["fox"]);
    expect(clipForDevice("letters/m.mp3", fox)).toBe(true);
    expect(clipForDevice("stories/w01-i-am/p2.mp3", fox)).toBe(true);
    expect(clipForDevice("stories/w01-i-am/p1-fox.mp3", fox)).toBe(true);
    expect(clipForDevice("stories/w01-i-am/title-fox.mp3", fox)).toBe(true);
    expect(clipForDevice("stories/w01-i-am/p1-bear.mp3", fox)).toBe(false);
    expect(clipForDevice("stories/w01-i-am/p1-bear.mp3", new Set())).toBe(false);
    expect(clipForDevice("stories/w01-i-am/p2.mp3", new Set())).toBe(true);
    const storage = memory();
    storage.setItem(
      "littlenest-profiles-v1",
      JSON.stringify({ activeId: "mia", profiles: [{ id: "mia", name: "Mia", ageRange: "4", animal: "bear", createdAt: "2026-09-07T15:00:00.000Z", stars: 0, days: {} }] }),
    );
    expect([...animalsOnDevice(storage)]).toEqual(["bear"]);
    expect([...animalsOnDevice(memory())]).toEqual([]);
  });

  it("prefetches only audio files listed as shipped", () => {
    const shipped = shippedAudioFiles();
    expect(shipped.length).toBeGreaterThan(0);
    expect(shipped).toContain("letters/m.mp3");
    expect(shipped).toContain("words/cat.mp3");
    for (const file of shipped) expect(file).toMatch(/^[a-z0-9/-]+\.mp3$/);
    expect(shippedAudioFiles(["letters/b.mp3", "../secret.mp3", "notes.txt", "words/cat.mp3"])).toEqual([
      "letters/b.mp3",
      "words/cat.mp3",
    ]);
    vi.stubGlobal("window", { location: new URL("http://127.0.0.1:5173/Kids-app/") });
    vi.stubGlobal("performance", {
      getEntriesByType: () => [
        { name: "http://127.0.0.1:5173/Kids-app/audio/letters/b.mp3" },
        { name: "http://127.0.0.1:5173/Kids-app/audio/words/not-recorded-yet.mp3" },
        { name: "http://127.0.0.1:5173/Kids-app/src/audio/manager.ts" },
        { name: "http://127.0.0.1:5173/Kids-app/favicon.svg" },
      ],
    });
    const urls = offlineUrls();
    expect(urls.some((url) => url.endsWith("/audio/letters/b.mp3"))).toBe(true);
    expect(urls.some((url) => url.includes("not-recorded-yet"))).toBe(false);
    expect(urls.some((url) => url.includes("/src/audio/manager.ts"))).toBe(true);
    expect(urls.some((url) => url.endsWith("/favicon.svg"))).toBe(true);
  });

  it("precaches the app shell only, and leaves the clips to the runtime cache", () => {
    const vite = readFileSync(new URL("../../vite.config.ts", import.meta.url), "utf8");
    const includeAssets = vite.match(/includeAssets:\s*\[([^\]]*)\]/)?.[1] ?? "";
    const globPatterns = vite.match(/globPatterns:\s*\[([^\]]*)\]/)?.[1] ?? "";
    expect(includeAssets).toContain("favicon.svg");
    expect(includeAssets).not.toContain("mp3");
    expect(globPatterns).toContain("js,css,html");
    expect(globPatterns).not.toContain("mp3");
    expect(vite).toContain('handler: "CacheFirst"');
    expect(vite).toContain("cacheName: RUNTIME_CACHE");
  });

  it("waits for a child before there is anything to download", () => {
    expect(hasChildOnDevice(memory())).toBe(false);
    const storage = memory();
    storage.setItem(
      "littlenest-profiles-v1",
      JSON.stringify({ activeId: "mia", profiles: [{ id: "mia", name: "Mia", ageRange: "4", animal: "fox", createdAt: "2026-09-07T15:00:00.000Z", stars: 0, days: {} }] }),
    );
    expect(hasChildOnDevice(storage)).toBe(true);
  });

  it("holds the automatic download on Low Data Mode or cellular, and lets Wi-Fi and older browsers go", () => {
    expect(networkHold(undefined)).toBeNull();
    expect(networkHold({ type: "wifi", effectiveType: "4g" })).toBeNull();
    expect(networkHold({ saveData: true, type: "wifi" })).toBe("saved-data");
    expect(networkHold({ type: "cellular", effectiveType: "4g" })).toBe("cellular");
    expect(networkHold({ effectiveType: "2g" })).toBe("cellular");
    expect(networkHold({ effectiveType: "slow-2g" })).toBe("cellular");
  });

  it("is ready only when every file was saved", () => {
    expect(isComplete({ done: 3, total: 3, failed: 0 })).toBe(true);
    expect(isComplete({ done: 3, total: 3, failed: 1 })).toBe(false);
    expect(isComplete({ done: 2, total: 3, failed: 0 })).toBe(false);
    expect(isComplete({ done: 0, total: 0, failed: 0 })).toBe(false);
  });

  it("estimates the download from the shared clips plus each animal on the device", () => {
    const sizes = { shared: 10_000_000, byAnimal: { fox: 4_500_000, bear: 5_000_000 } };
    expect(offlineAudioBytes(new Set(), sizes)).toBe(10_000_000);
    expect(offlineAudioBytes(new Set(["fox"]), sizes)).toBe(14_500_000);
    expect(offlineAudioBytes(new Set(["fox", "bear"]), sizes)).toBe(19_500_000);
    expect(offlineAudioBytes(new Set(["owl"]), sizes)).toBe(10_000_000);
    expect(describeBytes(14_500_000)).toBe("About 15 MB");
    expect(describeBytes(0)).toBe("");
    // The index on disk carries the sizes for every animal, so the estimate is real.
    const index = available as { bytes?: { shared: number; byAnimal: Record<string, number> } };
    expect(index.bytes?.shared).toBeGreaterThan(1_000_000);
    for (const animal of animals) expect(index.bytes?.byAnimal[animal.id], animal.id).toBeGreaterThan(1_000_000);
    expect(offlineAudioBytes(new Set(["fox"]))).toBeLessThan(40_000_000);
  });

  it("queues share and class sync while offline and does not throw", async () => {
    const storage = memory();
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("navigator", { onLine: false });
    enqueue("share", { url: "https://example.test" }, storage);
    enqueue("share", { url: "https://example.test/next" }, storage);
    expect(readOutbox(storage)).toHaveLength(1);
    requestClassSync({ classId: "device-class" });
    expect(readOutbox(storage).map((job) => job.kind).sort()).toEqual(["class-sync", "share"]);
    await expect(shareWordNest()).resolves.toBe("queued");
    expect(readOutbox(storage).some((job) => job.kind === "share")).toBe(true);
  });

  it("does not call the network for class sync while online", () => {
    const storage = memory();
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("navigator", { onLine: true });
    requestClassSync({ classId: "device-class" });
    expect(readOutbox(storage)).toEqual([]);
  });
});
