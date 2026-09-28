/**
 * Rewrites the `stories` section of src/data/audioManifest.json from
 * src/data/stories.ts, and adds a `words` entry for every story word that has
 * none, so the voice workflow can make the clips. Run it after adding or
 * editing a reader:
 *
 *   npx tsx scripts/sync-story-manifest.ts
 *
 * A line that names the hero gets one clip per animal; the rest get one.
 * Clips already on disk are kept; the workflow makes the missing ones.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { animals } from "../src/data/animals";
import { STORIES, storyLineId, storyText, storyTitleId, storyWordList } from "../src/data/stories";

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

const words = manifest.words;
let added = 0;
for (const word of storyWordList()) {
  if (words[word]) continue;
  words[word] = { file: `words/${word}.mp3`, say: word, source: "neural" };
  added += 1;
}
for (const animal of animals) {
  if (words[animal.id]) continue;
  words[animal.id] = { file: `words/${animal.id}.mp3`, say: animal.id, source: "neural" };
  added += 1;
}

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
console.log(`${Object.keys(stories).length} story lines, ${added} words added.`);
