import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import available from "../data/audioAvailable.json";
import manifest from "../data/audioManifest.json";
import timings from "../data/storyTimings.json";
import { lineWords, fitsLine } from "../data/readAlong";
import { SPOKEN_CENTS, TIME_LINES } from "../data/timeGames";
import { surpriseManifestEntries } from "../data/surprise";
import { DEFAULT_SETTINGS } from "../settings";
import { playLine, spellCue } from "./player";

/**
 * There is no device voice any more (player.ts): a line the code uses without a clip would be a
 * chime and a caption on a child's screen. These checks fail first.
 */
type Entry = { file: string; say: string; source: string };
const book = manifest as unknown as Record<string, Record<string, Entry>>;
const onDisk = new Set<string>((available as { files: string[] }).files);
const hasClip = (kind: string, id: string) => {
  const entry = book[kind]?.[id];
  return Boolean(entry && onDisk.has(entry.file));
};

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sources(full);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
  });
}

/** Every line id written out in the code: promptCue("know"), playPrompt("game-feed"), sayLine("shop-costs") ... */
function idsInCode(): { kind: string; id: string; where: string }[] {
  const calls: [RegExp, string][] = [
    [/\b(?:promptCue|playPrompt|sayLine)\(\s*"([^"]+)"/g, "prompts"],
    [/\b(?:wordCue|playWordId|sayWord)\(\s*"([^"]+)"/g, "words"],
    [/\bplaySentence\(\s*"([^"]+)"/g, "sentences"],
  ];
  const root = join(__dirname, "..");
  const found: { kind: string; id: string; where: string }[] = [];
  for (const file of sources(root)) {
    const text = readFileSync(file, "utf8");
    for (const [pattern, kind] of calls) {
      for (const match of text.matchAll(pattern)) found.push({ kind, id: match[1], where: file.slice(root.length + 1) });
    }
  }
  return found;
}

describe("every line the app says has a clip", () => {
  it("finds the line ids in the code", () => {
    expect(idsInCode().length).toBeGreaterThan(20);
  });

  it("has a clip for every line id written in the code", () => {
    const missing = idsInCode()
      .filter(({ kind, id }) => !hasClip(kind, id))
      .map(({ kind, id, where }) => `${kind}/${id} (${where})`);
    expect(missing).toEqual([]);
  });

  it("has a clip for every dynamic line: amounts, clock times, surprise visitors", () => {
    const ids = [
      ...SPOKEN_CENTS.map((cents) => `cents-${cents}`),
      ...Object.keys(TIME_LINES),
      ...surpriseManifestEntries().map((entry) => entry.id),
      "one-dollar",
      "five-dollars",
    ];
    expect(ids.filter((id) => !hasClip("prompts", id))).toEqual([]);
  });

  it("has a name clip for every letter, so a child's name is always spelled in the recorded voice", () => {
    const missing = "abcdefghijklmnopqrstuvwxyz".split("").filter((letter) => !spellCue(letter).src);
    expect(missing).toEqual([]);
  });

  it("has read-along times for every story page clip", () => {
    const lines = (timings as { lines: Record<string, number[]> }).lines;
    const pages = Object.entries(book.stories).filter(([id, entry]) => !/-title(-[a-z]+)?$/.test(id) && onDisk.has(entry.file));
    const untimed = pages.filter(([id, entry]) => !fitsLine(lines[id], lineWords(entry.say).length)).map(([id]) => id);
    expect(untimed).toEqual([]);
  });

  it("fails, never falls back to another voice, when a line has no clip", async () => {
    expect(spellCue("é").src).toBeUndefined();
    await expect(playLine([{ text: "Hello" }], { ...DEFAULT_SETTINGS, voice: true }, new AbortController().signal)).rejects.toThrow(/No playable clip/);
  });
});
