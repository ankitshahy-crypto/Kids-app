import manifest from "../data/audioManifest.json";
import font400 from "../assets/fonts/fredoka-latin-400-normal.woff2?url";
import font600 from "../assets/fonts/fredoka-latin-600-normal.woff2?url";
import font700 from "../assets/fonts/fredoka-latin-700-normal.woff2?url";

type Cue = { file: string };

const groups = [manifest.letters, manifest.words, manifest.sentences, manifest.numbers, manifest.prompts, manifest.colors] as Record<
  string,
  Cue
>[];

/** Every recorded clip in the lesson manifest. Paths stay under audio/. */
export function lessonAudioFiles(): string[] {
  const files = new Set<string>();
  for (const group of groups) {
    for (const cue of Object.values(group)) files.add(cue.file);
  }
  return [...files].sort();
}

export function fontUrls(): string[] {
  return [font400, font600, font700];
}

/** Same-origin files a flight needs: shell, icons, fonts, and every lesson clip. */
export function offlineUrls(): string[] {
  const base = import.meta.env.BASE_URL;
  const urls = new Set<string>();
  const add = (value: string) => {
    try {
      const url = new URL(value, window.location.href);
      if (url.origin === window.location.origin) urls.add(url.href);
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
  for (const font of fontUrls()) add(font);
  for (const file of lessonAudioFiles()) add(`${base}audio/${file}`);
  for (const entry of performance.getEntriesByType("resource")) {
    add(entry.name);
  }
  return [...urls];
}
