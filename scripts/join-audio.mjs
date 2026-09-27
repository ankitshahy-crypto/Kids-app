#!/usr/bin/env node
/**
 * Joins the MP3 clips in a folder into one file with a short gap between
 * them, so a set of voice samples can be heard in one go. Needs ffmpeg.
 *
 *   node scripts/join-audio.mjs samples/chirp3-Aoede            # writes samples/chirp3-Aoede.mp3
 *   node scripts/join-audio.mjs samples/chirp3-Aoede --gap 0.8
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

const argv = process.argv.slice(2);
const dir = argv.find((arg) => !arg.startsWith("--"));
const gapAt = argv.indexOf("--gap");
const gap = gapAt !== -1 ? Number(argv[gapAt + 1]) || 0.6 : 0.6;

if (!dir || !existsSync(dir)) {
  console.error("Usage: node scripts/join-audio.mjs <folder of mp3s> [--gap seconds]");
  process.exit(1);
}

const clips = readdirSync(dir)
  .filter((name) => name.endsWith(".mp3"))
  .sort()
  .map((name) => join(dir, name));
if (clips.length === 0) {
  console.error(`No mp3 files in ${dir}`);
  process.exit(1);
}

const out = join(dirname(resolve(dir)), `${basename(resolve(dir))}.mp3`);
const inputs = clips.flatMap((clip) => ["-i", clip]);
// Decode every clip, pad each with silence, then concatenate: robust to
// clips made with different settings, unlike the concat demuxer.
const chain = clips.map((_, index) => `[${index}:a]aresample=24000,aformat=channel_layouts=mono,apad=pad_dur=${gap}[a${index}]`).join(";");
const concat = `${clips.map((_, index) => `[a${index}]`).join("")}concat=n=${clips.length}:v=0:a=1[out]`;
execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-filter_complex", `${chain};${concat}`, "-map", "[out]", "-c:a", "libmp3lame", "-q:a", "3", out], {
  stdio: "inherit",
});
console.log(`${out}: ${clips.length} clips`);
