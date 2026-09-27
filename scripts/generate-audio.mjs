#!/usr/bin/env node
/**
 * Offline voice generator using Google Cloud Text-to-Speech. Makes every
 * "neural" clip in src/data/audioManifest.json (letters, words, sentences,
 * numbers, prompts, colors, stories) and writes src/data/audioAvailable.json
 * so the app knows which files exist. The app itself never calls Google.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json node scripts/generate-audio.mjs
 *   node scripts/generate-audio.mjs --index-only        # rewrite the index, no network
 *   node scripts/generate-audio.mjs --force             # remake clips that exist
 *   node scripts/generate-audio.mjs --only words,stories
 *
 * Voices (env or flags):
 *   GOOGLE_TTS_VOICE / --voice          en-US-Chirp3-HD-Aoede (default), or any en-US
 *                                       Chirp3-HD, Chirp-HD, Studio, or Neural2 voice.
 *   GOOGLE_TTS_LETTER_VOICE / --letter-voice
 *                                       en-US-Neural2-F (default). Letter phrases use SSML
 *                                       with IPA so "b, as in ball" says the sound /b/, which
 *                                       the Chirp voices cannot do. Pass --letter-style name
 *                                       to say letter names instead, in the main voice.
 *   --speed                             speaking rate, default 0.95.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(root, "src/data/audioManifest.json");
const indexPath = join(root, "src/data/audioAvailable.json");
const audioRoot = resolve(root, "public/audio");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const argv = process.argv.slice(2);
const flags = new Set(argv.filter((arg) => !arg.includes("=") && arg.startsWith("--")));
const option = (name, fallback) => {
  const at = argv.indexOf(name);
  if (at !== -1 && argv[at + 1] && !argv[at + 1].startsWith("--")) return argv[at + 1];
  const pair = argv.find((arg) => arg.startsWith(`${name}=`));
  return pair ? pair.slice(name.length + 1) : fallback;
};

if (flags.has("--help") || flags.has("-h")) {
  console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0]);
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

if (flags.has("--index-only")) {
  const files = scan();
  writeIndex(files);
  console.log(`Indexed ${files.length} audio file${files.length === 1 ? "" : "s"}.`);
  process.exit(0);
}

const voiceName = option("--voice", process.env.GOOGLE_TTS_VOICE || "en-US-Chirp3-HD-Aoede");
const letterVoiceName = option("--letter-voice", process.env.GOOGLE_TTS_LETTER_VOICE || "en-US-Neural2-F");
const letterStyle = option("--letter-style", "sound");
const speed = Number(option("--speed", "0.95")) || 0.95;
const only = option("--only", "")
  .split(",")
  .map((kind) => kind.trim())
  .filter(Boolean);
const force = flags.has("--force");

const allowed = /^en-US-(Neural2-[A-Z]|Studio-[A-Z]|Chirp3-HD-[A-Za-z0-9]+|Chirp-HD-[A-Za-z0-9]+)$/;
for (const name of [voiceName, letterVoiceName]) {
  if (!allowed.test(name)) {
    console.error(`Voices must be en-US Neural2, Studio, Chirp HD, or Chirp 3 HD. Got "${name}".`);
    process.exit(1);
  }
}
const supportsSsml = (name) => /Neural2|Studio|Wavenet|Standard/.test(name);

/**
 * IPA for a letter's sound, for the SSML phoneme tag. A short schwa after a
 * stop ("bə") is how the sound is said to a child; continuants are held.
 */
const LETTER_IPA = {
  a: "æ", b: "bə", c: "kə", d: "də", e: "ɛ", f: "fː", g: "ɡə", h: "hə", i: "ɪ", j: "dʒə", k: "kə", l: "lː",
  m: "mː", n: "nː", o: "ɑ", p: "pə", q: "kwə", r: "ɹː", s: "sː", t: "tə", u: "ʌ", v: "vː", w: "wə", x: "ks",
  y: "jə", z: "zː", ae: "æ", eh: "ɛ", ih: "ɪ", aw: "ɑ", uh: "ʌ", ks: "ks",
};

const LETTER_NAMES = {
  a: "ay", b: "bee", c: "see", d: "dee", e: "ee", f: "eff", g: "jee", h: "aitch", i: "eye", j: "jay", k: "kay",
  l: "ell", m: "em", n: "en", o: "oh", p: "pee", q: "cue", r: "ar", s: "ess", t: "tee", u: "you",
  v: "vee", w: "double you", x: "ex", y: "why", z: "zee",
};

function escapeXml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** What to send for one clip: plain text, or SSML for a letter sound. */
function inputFor(kind, id, say) {
  const match = kind === "letters" ? say.match(/^([a-z]), as in (.+)$/i) : null;
  if (match) {
    const char = match[1].toLowerCase();
    const example = match[2].replace(/\.$/, "");
    if (letterStyle === "name") return { text: `${LETTER_NAMES[char] ?? char}, as in ${example}.`, voice: voiceName };
    if (supportsSsml(letterVoiceName)) {
      const ipa = LETTER_IPA[char] ?? char;
      return {
        ssml: `<speak><phoneme alphabet="ipa" ph="${ipa}">${char}</phoneme><break time="250ms"/> as in ${escapeXml(example)}.</speak>`,
        voice: letterVoiceName,
      };
    }
    return { text: `${LETTER_NAMES[char] ?? char}, as in ${example}.`, voice: letterVoiceName };
  }
  let text = say.trim();
  if (kind === "words" && text === "I") text = "I.";
  else if (text && !/[.!?]$/.test(text)) text = `${text}.`;
  return { text, voice: voiceName };
}

const jobs = new Map();
for (const [kind, entries] of Object.entries(manifest)) {
  if (only.length > 0 && !only.includes(kind)) continue;
  for (const [id, entry] of Object.entries(entries)) {
    if (entry.source !== "neural") continue;
    if (typeof entry.file !== "string" || entry.file.includes("..") || entry.file.startsWith("/") || !entry.file.endsWith(".mp3")) {
      throw new Error(`Refusing unsafe audio path "${entry.file}"`);
    }
    // Several ids share one file (a and ae). One clip per file.
    if (!jobs.has(entry.file)) jobs.set(entry.file, { kind, id, say: entry.say });
  }
}
const todo = [...jobs.entries()].filter(([file]) => force || !existsSync(resolve(audioRoot, file)));
console.log(`${jobs.size} clips in the manifest, ${todo.length} to make. Voice ${voiceName}; letters ${letterStyle === "name" ? "as names" : `as sounds via ${letterVoiceName}`}.`);
if (todo.length === 0) {
  const files = scan();
  writeIndex(files);
  console.log(`Indexed ${files.length} audio files.`);
  process.exit(0);
}

const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credentials || !existsSync(credentials)) {
  console.error("GOOGLE_APPLICATION_CREDENTIALS must point at a service-account JSON file. The app itself does not call Google.");
  process.exit(1);
}

const { TextToSpeechClient } = await import("@google-cloud/text-to-speech");
const client = new TextToSpeechClient();

async function synthesize({ text, ssml, voice }) {
  const request = {
    input: ssml ? { ssml } : { text },
    voice: { languageCode: "en-US", name: voice },
    audioConfig: { audioEncoding: "MP3", speakingRate: speed, sampleRateHertz: 24000 },
  };
  try {
    const [response] = await client.synthesizeSpeech(request);
    return response.audioContent;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/speaking_?rate|sample_?rate|pitch/i.test(message)) throw error;
    const [response] = await client.synthesizeSpeech({ ...request, audioConfig: { audioEncoding: "MP3" } });
    return response.audioContent;
  }
}

let made = 0;
for (const [file, job] of todo) {
  const dest = resolve(audioRoot, file);
  if (!dest.startsWith(`${audioRoot}${sep}`)) throw new Error(`Refusing unsafe audio path "${file}"`);
  const input = inputFor(job.kind, job.id, job.say);
  const audio = await synthesize(input);
  if (!audio || audio.length === 0) throw new Error(`Google returned empty audio for ${job.kind} ${job.id}`);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, Buffer.isBuffer(audio) ? audio : Buffer.from(audio));
  made += 1;
  if (made % 50 === 0 || made === todo.length) console.log(`${made}/${todo.length}  public/audio/${file}`);
}

const files = scan();
writeIndex(files);
console.log(`Made ${made} clips. Indexed ${files.length} audio files.`);
