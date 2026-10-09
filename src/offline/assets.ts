import available from "../data/audioAvailable.json";
import manifest from "../data/audioManifest.json";
import { loadStore } from "../data/profiles";
import font400 from "../assets/fonts/fredoka-latin-400-normal.woff2?url";
import font600 from "../assets/fonts/fredoka-latin-600-normal.woff2?url";
import font700 from "../assets/fonts/fredoka-latin-700-normal.woff2?url";
import { AUDIO_FILE } from "./cacheName";

type Cue = { file: string };

const groups = [manifest.letters, manifest.sounds, manifest.words, manifest.sentences, manifest.numbers, manifest.prompts, manifest.colors] as Record<
  string,
  Cue
>[];

const SHIPPED_AUDIO = AUDIO_FILE;

/** Every recorded clip in the lesson manifest. Paths stay under audio/. */
export function lessonAudioFiles(): string[] {
  const files = new Set<string>();
  for (const group of groups) {
    for (const cue of Object.values(group)) files.add(cue.file);
  }
  return [...files].sort();
}

/** Clips that are actually in the app. An empty list means skip audio prefetch. */
export function shippedAudioFiles(files: readonly string[] = available.files): string[] {
  return files.filter((file) => SHIPPED_AUDIO.test(file)).sort();
}

export function fontUrls(): string[] {
  return [font400, font600, font700];
}

type Storage = { getItem(key: string): string | null; setItem(key: string, value: string): void };

/** True once a child has been added on this device. Before that there is nothing to download for. */
export function hasChildOnDevice(storage?: Storage): boolean {
  try {
    return loadStore(storage ?? localStorage).profiles.length > 0;
  } catch {
    return false;
  }
}

type SizeIndex = { shared?: number; byAnimal?: Record<string, number> };

/**
 * How much the sound clips for this device's children add up to: the clips
 * every device keeps, plus the story lines that name each of their animals.
 */
export function offlineAudioBytes(animals: ReadonlySet<string>, sizes: SizeIndex = (available as { bytes?: SizeIndex }).bytes ?? {}): number {
  let total = sizes.shared ?? 0;
  for (const animal of animals) total += sizes.byAnimal?.[animal] ?? 0;
  return total;
}

/** "About 24 MB", rounded up so the estimate is never smaller than the download. */
export function describeBytes(bytes: number): string {
  if (bytes <= 0) return "";
  const mb = Math.ceil(bytes / 1_000_000);
  return `About ${mb} MB`;
}

/**
 * The animals of the children on this device, for the story lines to keep.
 * A story line that names the hero has one clip per animal (p1-fox.mp3);
 * only the animals here are downloaded, and the rest play from the network
 * or the device voice. A device with no child yet keeps the unnamed lines.
 */
export function animalsOnDevice(storage?: { getItem(key: string): string | null; setItem(key: string, value: string): void }): Set<string> {
  try {
    return new Set(loadStore(storage ?? localStorage).profiles.map((profile) => profile.animal));
  } catch {
    return new Set();
  }
}

/** Keep a story clip when it names no animal, or one of this device's animals. Other clips are always kept. */
export function clipForDevice(file: string, animals: ReadonlySet<string>): boolean {
  const match = file.match(/^stories\/[a-z0-9-]+\/(?:title|p\d+)(?:-([a-z]+))?\.mp3$/);
  if (!match) return true;
  return !match[1] || animals.has(match[1]);
}

function unshippedAudio(name: string, shipped: ReadonlySet<string>): boolean {
  try {
    const url = new URL(name, window.location.href);
    const marker = "/audio/";
    const index = url.pathname.indexOf(marker);
    if (index === -1) return false;
    const file = decodeURIComponent(url.pathname.slice(index + marker.length));
    // Source modules such as /src/audio/manager.ts also contain /audio/.
    // Only public clips (letters/b.mp3) are optional; the app must still cache its code.
    if (!SHIPPED_AUDIO.test(file)) return false;
    return !shipped.has(file);
  } catch {
    return false;
  }
}

/**
 * Same-origin files a flight needs: shell, icons, fonts, and shipped lesson
 * clips. Story lines are kept for this device's animals only, which is most
 * of the difference between a few hundred clips and a few thousand.
 */
export function offlineUrls(): string[] {
  const base = import.meta.env.BASE_URL;
  const animals = animalsOnDevice();
  const shipped = new Set(shippedAudioFiles().filter((file) => clipForDevice(file, animals)));
  const urls = new Set<string>();
  const add = (value: string) => {
    try {
      const url = new URL(value, window.location.href);
      if (url.origin !== window.location.origin || unshippedAudio(url.href, shipped)) return;
      urls.add(url.href);
    } catch {
      // Skip a path the browser cannot resolve.
    }
  };
  add(base);
  add(window.location.href);
  add(`${base}favicon.svg`);
  add(`${base}manifest.webmanifest`);
  add(`${base}icons/icon-192.png`);
  add(`${base}icons/icon-512.png`);
  add(`${base}icons/icon-maskable-512.png`);
  add(`${base}icons/apple-touch-icon.png`);
  add(`${base}icons/module-words.svg`);
  add(`${base}icons/module-numbers.svg`);
  add(`${base}icons/module-colors.svg`);
  add(`${base}icons/module-time.svg`);
  add(`${base}icons/module-build.svg`);
  add(`${base}icons/module-science.svg`);
  for (const font of fontUrls()) add(font);
  for (const file of shipped) add(`${base}audio/${file}`);
  for (const entry of performance.getEntriesByType("resource")) {
    add(entry.name);
  }
  return [...urls];
}
