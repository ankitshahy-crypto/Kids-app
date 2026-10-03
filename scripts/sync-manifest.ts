/**
 * Keeps src/data/audioManifest.json in step with the app's content, so the
 * voice workflow can make every clip the app can ask for:
 *
 *  - `letters` and `sounds` say each letter's picture word from
 *    src/data/letterWords.ts ("t, as in tent"), and get an entry for every
 *    sound unit in src/data/units.ts ("sh, as in ship", and the bare "sh");
 *  - `prompts` gets the big-and-little line for each letter
 *    (src/data/letterPairs.ts);
 *  - `words` gets an entry for every ladder word, unit example word, story
 *    word and animal name that has none;
 *  - `stories` is rewritten from src/data/stories.ts. A line that names the
 *    hero gets one clip per animal; the rest get one.
 *
 * Run it after adding or editing a reader, a ladder word, or a unit:
 *
 *   npx tsx scripts/sync-manifest.ts
 *
 * Clips already on disk are kept; the workflow makes the missing ones. When a
 * line's words change, its old clip is deleted here, so the workflow records
 * the new words and the app can never play a clip that says something else
 * (the letter card for i showed an igloo while its clip said "as in pig").
 */

import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { animals } from "../src/data/animals";
import { ladderClips } from "../src/data/ladder";
import { pairLine, pairPromptId } from "../src/data/letterPairs";
import { LETTER_WORDS } from "../src/data/letterWords";
import { buildManifestEntries, buildWords } from "../src/data/build";
import { logicManifestEntries, logicWords } from "../src/data/logic";
import { surpriseManifestEntries } from "../src/data/surprise";
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

/** Clips whose words changed. The old recording is removed so it is made again. */
const stale: string[] = [];
/** Clips the app no longer asks for. */
const retired: string[] = [];
function drop(file: string, list: string[] = stale): void {
  const path = join(root, "public/audio", file);
  if (existsSync(path)) rmSync(path);
  if (!list.includes(file)) list.push(file);
}

// A story page whose words changed, or whose story is gone, loses its recording too. Before, a
// rewritten page kept its old clip, so the narrator read the old sentence under the new one.
for (const [id, before] of Object.entries(manifest.stories ?? {})) {
  const now = stories[id];
  if (!now) drop(before.file, retired);
  else if (now.say !== before.say) drop(before.file);
}

// Each letter says its picture word. The vowels and x are also listed under
// their phoneme id (ae, eh, ih, aw, uh, ks), which shares the letter's clip.
const PHONEME_ALIAS: Record<string, string> = { a: "ae", e: "eh", i: "ih", o: "aw", u: "uh", x: "ks" };
for (const { letter, word } of Object.values(LETTER_WORDS)) {
  const say = `${letter}, as in ${word}`;
  const ids = PHONEME_ALIAS[letter] ? [letter, PHONEME_ALIAS[letter]] : [letter];
  for (const id of ids) {
    const before = manifest.letters[id];
    if (before && before.say !== say) drop(before.file);
    manifest.letters[id] = { file: `letters/${letter}.mp3`, say, source: "neural" };
    // The bare sound keeps its clip: the sound of t is the same whether the word is top or tent.
    manifest.sounds[id] = { file: `sounds/${letter}.mp3`, say, source: "neural" };
  }
  const pair = pairPromptId(letter);
  const line = pairLine(letter);
  const had = manifest.prompts[pair];
  if (had && had.say !== line) drop(had.file);
  manifest.prompts[pair] = { file: `prompts/${pair}.mp3`, say: line, source: "neural" };
}

// Themed letter phrases ("d, as in dinosaur") are gone: a letter has one
// picture word (see letterCard in src/data/ladder.ts). Their ids are a letter,
// a dash and a word; a unit id uses an underscore (a_e).
for (const id of Object.keys(manifest.letters)) {
  if (!/^[a-z]-[a-z-]+$/.test(id)) continue;
  drop(manifest.letters[id].file, retired);
  delete manifest.letters[id];
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

// The coding games', Build It's and the daily surprise's spoken lines come from the code that says them, so a new or reworded
// line cannot be missing from the clip list. (They were added to the list by hand.)
const live = new Set<string>();
for (const entry of [...logicManifestEntries(), ...buildManifestEntries(), ...surpriseManifestEntries()]) {
  live.add(entry.id);
  const before = manifest.prompts[entry.id];
  if (before && before.say !== entry.say) drop(before.file);
  manifest.prompts[entry.id] = { file: `prompts/${entry.id}.mp3`, say: entry.say, source: "neural" };
}
for (const id of Object.keys(manifest.prompts)) {
  if (!/^(code|build|surprise)-/.test(id) || live.has(id)) continue;
  drop(manifest.prompts[id].file, retired);
  delete manifest.prompts[id];
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
// A letter card ends by saying its picture word on its own ("igloo").
for (const { word } of Object.values(LETTER_WORDS)) addWord(word.toLowerCase().replace(/\s+/g, "-"), word);
for (const word of storyWordList()) addWord(word);
for (const animal of animals) addWord(animal.id);
// A picture tapped in a coding game, or a block in Build It, says its name.
for (const word of [...logicWords(), ...buildWords()]) addWord(word);

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
if (retired.length > 0) console.log(`${retired.length} clips removed: the app no longer uses them.`);
if (stale.length > 0) {
  console.log(`${stale.length} clips removed because their words changed. Run "Voice clips (Google)" with force=false to record them:`);
  for (const file of stale) console.log(`  ${file}`);
}
