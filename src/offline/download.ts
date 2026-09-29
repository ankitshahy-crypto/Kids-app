import { RUNTIME_CACHE } from "./cacheName";
import { offlineUrls } from "./assets";

export type DownloadProgress = {
  done: number;
  total: number;
  /** Files that could not be saved this pass. "Ready" needs this to be zero. */
  failed: number;
};

export type DownloadResult = {
  /** Every file this device needs is in the cache. */
  ready: boolean;
  done: number;
  total: number;
  failed: number;
};

async function shellIsCached(cache: Cache): Promise<boolean> {
  const base = new URL(import.meta.env.BASE_URL, window.location.href).href;
  const found = (await cache.match(window.location.href)) || (await cache.match(base));
  if (found) return true;
  const keys = await cache.keys();
  return keys.length > 0;
}

/** Ready means every file was saved: the whole list done, and nothing failed. */
export function isComplete(progress: { done: number; total: number; failed: number }): boolean {
  return progress.total > 0 && progress.done === progress.total && progress.failed === 0;
}

/**
 * Fetch same-origin lesson files into the runtime cache. A file already in
 * the cache is counted without touching the network, so a second pass (a new
 * child with a new animal) only fetches what is new. A failure never throws
 * to the page; it is counted, and the panel offers to try again.
 */
export async function downloadForOffline(onProgress?: (progress: DownloadProgress) => void): Promise<DownloadResult> {
  if (typeof caches === "undefined") return { ready: false, done: 0, total: 0, failed: 0 };
  const cache = await caches.open(RUNTIME_CACHE);
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    const ready = await shellIsCached(cache);
    onProgress?.({ done: ready ? 1 : 0, total: 1, failed: ready ? 0 : 1 });
    return { ready, done: ready ? 1 : 0, total: 1, failed: ready ? 0 : 1 };
  }
  const urls = offlineUrls();
  let done = 0;
  let failed = 0;
  const pending = [...urls];
  const report = () => onProgress?.({ done, total: urls.length, failed });
  report();
  // Four at a time: enough to finish in a few minutes, without crowding out the lesson's own clips.
  const workers = Array.from({ length: 4 }, async () => {
    for (;;) {
      const url = pending.shift();
      if (!url) return;
      try {
        const kept = await cache.match(url);
        if (!kept) {
          // Low priority: a lesson's own clip always goes first.
          const response = await fetch(url, { signal: AbortSignal.timeout(8000), priority: "low" });
          if (!response.ok) throw new Error(`Could not save ${url}`);
          await cache.put(url, response);
        }
      } catch {
        // Offline, a slow response, or a clip that is not bundled yet.
        failed += 1;
      }
      done += 1;
      report();
    }
  });
  await Promise.all(workers);
  const progress = { done, total: urls.length, failed };
  const shell = await shellIsCached(cache);
  return { ready: shell && isComplete(progress), ...progress };
}
