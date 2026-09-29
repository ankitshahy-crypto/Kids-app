import { RUNTIME_CACHE } from "./cacheName";
import { offlineUrls } from "./assets";

export type DownloadProgress = {
  done: number;
  total: number;
};

async function shellIsCached(cache: Cache): Promise<boolean> {
  const base = new URL(import.meta.env.BASE_URL, window.location.href).href;
  const found = (await cache.match(window.location.href)) || (await cache.match(base));
  if (found) return true;
  const keys = await cache.keys();
  return keys.length > 0;
}

/**
 * Fetch same-origin lesson files into the runtime cache.
 * Missing recordings are skipped. A failure never throws to the page.
 */
export async function downloadForOffline(onProgress?: (progress: DownloadProgress) => void): Promise<boolean> {
  if (typeof caches === "undefined") return false;
  const cache = await caches.open(RUNTIME_CACHE);
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    const ready = await shellIsCached(cache);
    onProgress?.({ done: ready ? 1 : 0, total: 1 });
    return ready;
  }
  const urls = offlineUrls();
  let done = 0;
  const pending = [...urls];
  const report = () => onProgress?.({ done, total: urls.length });
  report();
  // Four at a time: enough to finish in a few minutes, without crowding out the lesson's own clips.
  const workers = Array.from({ length: 4 }, async () => {
    for (;;) {
      const url = pending.shift();
      if (!url) return;
      try {
        // Low priority: a lesson's own clip always goes first.
        const response = await fetch(url, { signal: AbortSignal.timeout(8000), priority: "low" });
        if (response.ok) await cache.put(url, response);
      } catch {
        // Offline, a slow response, or a clip that is not bundled yet.
      }
      done += 1;
      report();
    }
  });
  await Promise.all(workers);
  return shellIsCached(cache);
}
