/** Runtime cache shared by the service worker and the download button, for everything but sound clips. It is trimmed. */
export const RUNTIME_CACHE = "littlenest-runtime";

/**
 * The offline pack of sound clips. Never trimmed: a child's clips are a
 * few thousand files, far past the runtime cache's limit, and a clip that
 * disappears means a silent lesson on a plane.
 */
export const AUDIO_CACHE = "littlenest-audio-v1";

/** A sound clip under the app's audio folder, not a source file that happens to sit under /audio/. */
export function isAudioClip(pathname: string): boolean {
  return /\/audio\/[a-z0-9]+(?:\/[a-z0-9-]+)*\.mp3$/.test(pathname);
}
