/** Runtime cache shared by the service worker and the download button, for everything but sound clips. It is trimmed. */
export const RUNTIME_CACHE = "littlenest-runtime";

/**
 * The offline pack of sound clips. Never trimmed: a child's clips are a
 * few thousand files, far past the runtime cache's limit, and a clip that
 * disappears means a silent lesson on a plane.
 */
export const AUDIO_CACHE = "littlenest-audio-v1";

/**
 * The shape of every clip's path inside public/audio/ ("letters/m.mp3",
 * "stories/w01-i-am/p1-fox.mp3"): lowercase letters, digits, and dashes.
 * The service worker's two routes in vite.config.ts repeat this pattern
 * (a route is copied into the worker, so it cannot import it), and
 * src/offline/offline.test.ts fails if the copies drift apart or a clip is
 * named outside it, since such a clip would fall into the trimmed cache.
 */
export const AUDIO_FILE = /^[a-z0-9]+(?:\/[a-z0-9-]+)*\.mp3$/;

const AUDIO_PATH = new RegExp(`\\/audio\\/${AUDIO_FILE.source.slice(1)}`);

/** A sound clip under the app's audio folder, not a source file that happens to sit under /audio/. */
export function isAudioClip(pathname: string): boolean {
  return AUDIO_PATH.test(pathname);
}
