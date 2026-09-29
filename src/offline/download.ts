import { AUDIO_CACHE, RUNTIME_CACHE, isAudioClip } from "./cacheName";
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
  /** Files still missing from the caches after the pass. */
  failed: number;
};

/** Ready means every file was saved: the whole list done, and nothing failed. */
export function isComplete(progress: { done: number; total: number; failed: number }): boolean {
  return progress.total > 0 && progress.done === progress.total && progress.failed === 0;
}

/** Which cache a file belongs in: sound clips in the untrimmed pack, the rest in the runtime cache. */
export function cacheFor(url: string): typeof AUDIO_CACHE | typeof RUNTIME_CACHE {
  try {
    return isAudioClip(new URL(url).pathname) ? AUDIO_CACHE : RUNTIME_CACHE;
  } catch {
    return RUNTIME_CACHE;
  }
}

/** A page link and its #fragment are the same file. */
function plainUrl(url: string): string {
  const hash = url.indexOf("#");
  return hash === -1 ? url : url.slice(0, hash);
}

/** The files from `urls` that are not in the cache they belong in. */
export function missingFrom(urls: readonly string[], audioKeys: ReadonlySet<string>, runtimeKeys: ReadonlySet<string>): string[] {
  return urls.filter((url) => !(cacheFor(url) === AUDIO_CACHE ? audioKeys : runtimeKeys).has(plainUrl(url)));
}

async function keySet(cache: Cache): Promise<Set<string>> {
  return new Set((await cache.keys()).map((request) => plainUrl(request.url)));
}

/**
 * Earlier versions kept sound clips in the runtime cache, which is trimmed to
 * 500 files. Move any still there into the audio pack, so a device that
 * downloaded before this change keeps what it has.
 */
export async function moveClipsToAudioCache(): Promise<number> {
  if (typeof caches === "undefined") return 0;
  if (!(await caches.has(RUNTIME_CACHE))) return 0;
  const runtime = await caches.open(RUNTIME_CACHE);
  const audio = await caches.open(AUDIO_CACHE);
  let moved = 0;
  for (const request of await runtime.keys()) {
    let path = "";
    try {
      path = new URL(request.url).pathname;
    } catch {
      continue;
    }
    if (!isAudioClip(path)) continue;
    const response = await runtime.match(request);
    if (response && !(await audio.match(request))) await audio.put(request, response);
    await runtime.delete(request);
    moved += 1;
  }
  return moved;
}

/** Keep the pack when the phone runs low on space, where the browser allows it. */
async function askToKeep(): Promise<void> {
  try {
    if (typeof navigator !== "undefined" && navigator.storage?.persist) await navigator.storage.persist();
  } catch {
    // Not every browser lets a page ask.
  }
}

/**
 * Save this device's files: sound clips into the untrimmed audio pack, the
 * rest into the runtime cache. A file already saved is counted without the
 * network. "Ready" is decided at the end by looking in the caches for every
 * file on the list, not by counting fetches, so a file trimmed or lost along
 * the way shows up as missing. A failure never throws to the page.
 */
export async function downloadForOffline(onProgress?: (progress: DownloadProgress) => void): Promise<DownloadResult> {
  if (typeof caches === "undefined") return { ready: false, done: 0, total: 0, failed: 0 };
  await moveClipsToAudioCache().catch(() => 0);
  const audio = await caches.open(AUDIO_CACHE);
  const runtime = await caches.open(RUNTIME_CACHE);
  const urls = offlineUrls();
  const check = async () => missingFrom(urls, await keySet(audio), await keySet(runtime));

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    const missing = await check();
    const progress = { done: urls.length - missing.length, total: urls.length, failed: missing.length };
    onProgress?.(progress);
    return { ready: missing.length === 0 && urls.length > 0, ...progress };
  }

  await askToKeep();
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
      const cache = cacheFor(url) === AUDIO_CACHE ? audio : runtime;
      try {
        if (!(await cache.match(url))) {
          // Straight from the server, not the browser's own cache, and at low
          // priority so a lesson's clip always goes first.
          const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000), priority: "low" });
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
  const missing = await check();
  const progress = { done, total: urls.length, failed: missing.length };
  onProgress?.(progress);
  return { ready: isComplete(progress), ...progress };
}
