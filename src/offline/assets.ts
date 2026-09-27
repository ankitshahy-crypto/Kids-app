import available from "../data/audioAvailable.json";
import manifest from "../data/audioManifest.json";
import font400 from "../assets/fonts/fredoka-latin-400-normal.woff2?url";
import font600 from "../assets/fonts/fredoka-latin-600-normal.woff2?url";
import font700 from "../assets/fonts/fredoka-latin-700-normal.woff2?url";

type Cue = { file: string };

const groups = [manifest.letters, manifest.words, manifest.sentences, manifest.numbers, manifest.prompts, manifest.colors] as Record<
  string,
  Cue
>[];

const SHIPPED_AUDIO = /^[a-z0-9]+(?:\/[a-z0-9-]+)*\.mp3$/;

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

function unshippedAudio(name: string, shipped: ReadonlySet<string>): boolean {
  try {
    const url = new URL(name, window.location.href);
    const marker = "/audio/";
    const index = url.pathname.indexOf(marker);
    if (index === -1) return false;
    const file = decodeURIComponent(url.pathname.slice(index + marker.length));
    return !shipped.has(file);
  } catch {
    return false;
  }
}

/** Same-origin files a flight needs: shell, icons, fonts, and shipped lesson clips. */
export function offlineUrls(): string[] {
  const base = import.meta.env.BASE_URL;
  const shipped = new Set(shippedAudioFiles());
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
  add(`${base}icons/module-words.png`);
  add(`${base}icons/module-numbers.png`);
  add(`${base}icons/module-colors.png`);
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
