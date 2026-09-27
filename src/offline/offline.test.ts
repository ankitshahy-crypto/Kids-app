import { afterEach, describe, expect, it, vi } from "vitest";
import config from "../../capacitor.config";
import { lessonAudioFiles, offlineUrls, shippedAudioFiles } from "./assets";
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

  it("prefetches only audio files listed as shipped", () => {
    expect(shippedAudioFiles()).toEqual([]);
    expect(shippedAudioFiles(["letters/b.mp3", "../secret.mp3", "notes.txt", "words/cat.mp3"])).toEqual([
      "letters/b.mp3",
      "words/cat.mp3",
    ]);
    vi.stubGlobal("window", { location: new URL("http://127.0.0.1:5173/Kids-app/") });
    vi.stubGlobal("performance", {
      getEntriesByType: () => [
        { name: "http://127.0.0.1:5173/Kids-app/audio/letters/b.mp3" },
        { name: "http://127.0.0.1:5173/Kids-app/src/audio/manager.ts" },
        { name: "http://127.0.0.1:5173/Kids-app/favicon.svg" },
      ],
    });
    const urls = offlineUrls();
    expect(urls.some((url) => url.includes("/audio/letters/"))).toBe(false);
    expect(urls.some((url) => url.includes("/src/audio/manager.ts"))).toBe(true);
    expect(urls.some((url) => url.endsWith("/favicon.svg"))).toBe(true);
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
