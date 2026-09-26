#!/usr/bin/env node
/**
 * Offline audio generator for words and sentences.
 * The installed app never calls Google. Letter sounds are human-recorded.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json npm run generate-audio
 *   npm run generate-audio -- --index-only
 *   npm run generate-audio -- --force
 *
 * Optional: GOOGLE_TTS_VOICE (default en-US-Neural2-F).
 * Allowed: en-US Neural2, Studio, Chirp3-HD, or Chirp-HD.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(root, "src/data/audioManifest.json");
const indexPath = join(root, "src/data/audioAvailable.json");
const audioRoot = resolve(root, "public/audio");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const args = new Set(process.argv.slice(2));

if (args.has("--help") || args.has("-h")) {
  console.log(`Usage: npm run generate-audio -- [--index-only] [--force]

Pre-generates MP3s for manifest words and sentences with Google Cloud
Text-to-Speech. Reads GOOGLE_APPLICATION_CREDENTIALS. Does not synthesize
letter sounds. --index-only rewrites src/data/audioAvailable.json from
public/audio and does not contact Google.`);
  process.exit(0);
}

function scan() {
  const files = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      if (name.startsWith(".")) continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".mp3")) files.push(relative(audioRoot, full).split(sep).join("/"));
    }
  };
  walk(audioRoot);
  return files.sort();
}

function writeIndex(files) {
  writeFileSync(indexPath, `${JSON.stringify({ files }, null, 2)}\n`);
}

if (args.has("--index-only")) {
  const files = scan();
  writeIndex(files);
  console.log(`Indexed ${files.length} audio file${files.length === 1 ? "" : "s"}.`);
  process.exit(0);
}

const letterFiles = [...new Set(Object.values(manifest.letters).map((entry) => entry.file))].sort();
console.log(`Skipping ${letterFiles.length} letter-sound files. Record these with a person:`);
for (const file of letterFiles) console.log(`  public/audio/${file}`);

const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credentials) {
  console.error(
    "GOOGLE_APPLICATION_CREDENTIALS is not set. Point it at a service-account JSON file. The app itself does not call Google.",
  );
  process.exit(1);
}
if (!existsSync(credentials)) {
  console.error(`GOOGLE_APPLICATION_CREDENTIALS file was not found: ${credentials}`);
  process.exit(1);
}

const voiceName = process.env.GOOGLE_TTS_VOICE || "en-US-Neural2-F";
const allowed = /^en-US-(Neural2-[A-Z]|Studio-[A-Z]|Chirp3-HD-[A-Za-z0-9]+|Chirp-HD-[A-Za-z0-9]+)$/;
if (!allowed.test(voiceName)) {
  console.error(`GOOGLE_TTS_VOICE must be an en-US Neural2, Studio, or Chirp HD voice. Got "${voiceName}".`);
  process.exit(1);
}

const jobs = [];
for (const kind of ["words", "sentences"]) {
  for (const [id, entry] of Object.entries(manifest[kind])) {
    if (entry.source === "human" || letterFiles.includes(entry.file)) {
      console.log(`Skipping ${kind} ${id}; that clip is recorded by a person.`);
      continue;
    }
    jobs.push({ kind, id, file: entry.file, say: entry.say });
  }
}

const destinationFor = (file) => {
  if (typeof file !== "string" || file.includes("..") || file.startsWith("/") || !file.endsWith(".mp3")) {
    throw new Error(`Refusing unsafe audio path "${file}"`);
  }
  const dest = resolve(audioRoot, file);
  if (!dest.startsWith(`${audioRoot}${sep}`)) throw new Error(`Refusing unsafe audio path "${file}"`);
  return dest;
};

const { TextToSpeechClient } = await import("@google-cloud/text-to-speech");
const client = new TextToSpeechClient();
const force = args.has("--force");

async function synthesize(text) {
  const voice = { languageCode: "en-US", name: voiceName };
  const input = { text };
  try {
    const [response] = await client.synthesizeSpeech({
      input,
      voice,
      audioConfig: { audioEncoding: "MP3", speakingRate: 0.9, pitch: 0 },
    });
    return response.audioContent;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/pitch|speaking_?rate/i.test(message)) throw error;
    const [response] = await client.synthesizeSpeech({
      input,
      voice,
      audioConfig: { audioEncoding: "MP3" },
    });
    return response.audioContent;
  }
}

for (const job of jobs) {
  const dest = destinationFor(job.file);
  if (!force && existsSync(dest)) {
    console.log(`Keeping public/audio/${job.file}`);
    continue;
  }
  const audio = await synthesize(job.say);
  if (!audio || audio.length === 0) throw new Error(`Google returned empty audio for ${job.kind} ${job.id}`);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, Buffer.isBuffer(audio) ? audio : Buffer.from(audio));
  console.log(`Wrote public/audio/${job.file}`);
}

const files = scan();
writeIndex(files);
console.log(`Indexed ${files.length} audio file${files.length === 1 ? "" : "s"}.`);
