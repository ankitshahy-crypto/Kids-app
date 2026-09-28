/**
 * Keeps src/data/audioManifest.json in step with the app's content, so the
 * voice workflow can make every clip the app can ask for:
 *
 *  - `letters` and `sounds` get an entry for every sound unit in
 *    src/data/units.ts ("sh, as in ship", and the bare "sh" sound);
 *  - `words` gets an entry for every ladder word, unit example word, story
 *    word and animal name that has none;
 *  - `stories` is rewritten from src/data/stories.ts. A line that names the
 *    hero gets one clip per animal; the rest get one.
 *
 * Run it after adding or editing a reader, a ladder word, or a unit:
 *
 *   npx tsx scripts/sync-manifest.ts
 *
 * Clips already on disk are kept; the workflow makes the missing ones.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { animals } from "../src/data/animals";
import { ladderClips } from "../src/data/ladder";
import { STORIES, storyLineId, storyText, storyTitleId, storyWordList } from "../src/data/stories";
import { SOUND_UNITS } from "../src/data/units";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(root, "src/data/audioManifest.json");
const text = readFileSync(manifestPath, "utf8");
const manifest = JSON.parse(text) as Record<string, Record<string, { file: string; say: string; source: string }>>;

type Cue = { file: string; say: string; source: "neural" };
const stories: Record<string, Cue> = {};
const named = (line: string) => /\{hero\}|\{hero-kind\}/.test(line);
const heroes = animals.map((animal) => ({ id: animal.id, name: animal.name, kind: animal.id }));

for (const story of STORIES) {
  const titleHeroes = named(story.title) ? heroes : [{ id: "fox", name: "Fox", kind: "fox" }];
  for (const hero of titleHeroes) {
    const id = storyTitleId(story, hero.id);
    stories[id] = { file: `stories/${story.id}/${id.slice(story.id.length + 1)}.mp3`, say: storyText(story.title, hero), source: "neural" };
  }
  story.pages.forEach((page, index) => {
    const pageHeroes = named(page.text) ? heroes : [{ id: "fox", name: "Fox", kind: "fox" }];
    for (const hero of pageHeroes) {
      const id = storyLineId(story, index, hero.id);
      stories[id] = { file: `stories/${story.id}/${id.slice(story.id.length + 1)}.mp3`, say: storyText(page.text, hero), source: "neural" };
    }
  });
}

// A letter phrase and a bare sound for every unit, in the schedule's order after the letters.
let units = 0;
for (const unit of SOUND_UNITS) {
  const say = `${unit.label}, as in ${unit.example}`;
  // File names take a dash where the id has an underscore: letters/a-e.mp3 for a_e.
  const name = unit.id.replace(/_/g, "-");
  if (!manifest.letters[unit.id]) {
    manifest.letters[unit.id] = { file: `letters/${name}.mp3`, say, source: "neural" };
    units += 1;
  }
  if (!manifest.sounds[unit.id]) manifest.sounds[unit.id] = { file: `sounds/${name}.mp3`, say, source: "neural" };
}

const words = manifest.words;
let added = 0;
const addWord = (id: string, say = id) => {
  if (words[id]) return;
  words[id] = { file: `words/${id}.mp3`, say, source: "neural" };
  added += 1;
};
for (const clip of ladderClips()) {
  if (clip.kind === "words") addWord(clip.id, clip.say);
}
for (const unit of SOUND_UNITS) addWord(unit.example);
for (const word of storyWordList()) addWord(word);
for (const animal of animals) addWord(animal.id);

// Keep the file's compact one-line-per-entry style.
const line = (id: string, cue: Cue | { file: string; say: string; source: string }) =>
  `    ${JSON.stringify(id)}: { "file": ${JSON.stringify(cue.file)}, "say": ${JSON.stringify(cue.say)}, "source": ${JSON.stringify(cue.source)} }`;
const block = (name: string, entries: Record<string, { file: string; say: string; source: string }>) =>
  `  ${JSON.stringify(name)}: {\n${Object.entries(entries)
    .map(([id, cue]) => line(id, cue))
    .join(",\n")}\n  }`;

const order = Object.keys(manifest);
const out = `{\n${order
  .map((name) => block(name, name === "stories" ? stories : name === "words" ? words : manifest[name]))
  .join(",\n")}\n}\n`;
JSON.parse(out);
writeFileSync(manifestPath, out);
console.log(`${Object.keys(stories).length} story lines, ${units} units added, ${added} words added.`);
