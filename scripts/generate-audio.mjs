#!/usr/bin/env node
/**
 * Offline voice generator using Google Cloud Text-to-Speech. Makes every
 * "neural" clip in src/data/audioManifest.json (letters, sounds, words,
 * sentences, numbers, prompts, colors, stories) and writes
 * src/data/audioAvailable.json so the app knows which files exist. The app
 * itself never calls Google.
 *
 *   GOOGLE_TTS_API_KEY=... node scripts/generate-audio.mjs             # an API key restricted to the Text-to-Speech API
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json node scripts/generate-audio.mjs   # or a service-account key
 *   node scripts/generate-audio.mjs --index-only        # rewrite the index, no network
 *   node scripts/generate-audio.mjs --dry-run --only letters   # print what would be sent, no network
 *   node scripts/generate-audio.mjs --force             # remake clips that exist
 *   node scripts/generate-audio.mjs --force letters,sounds --only letters,sounds,words
 *                                                       # remake those two kinds, add missing words
 *   node scripts/generate-audio.mjs --only words,stories
 *   node scripts/generate-audio.mjs --sample chirp3:Aoede,gemini-2.5-pro-tts:Kore --sample-dir samples
 *                                                       # a short comparison clip per voice, nothing in public/audio
 *
 * Voices (env or flags):
 *   GOOGLE_TTS_VOICE / --voice          Aoede (default). A Chirp 3 HD / Gemini voice name such as
 *                                       Aoede, Kore, Leda, Zephyr, Sulafat, or a full Google voice
 *                                       name (en-US-Chirp3-HD-Aoede, en-US-Neural2-F, ...).
 *   GOOGLE_TTS_MODEL / --model          chirp3 (default), gemini-2.5-pro-tts, gemini-2.5-flash-tts,
 *                                       or gemini-3.1-flash-tts-preview. The Gemini models take a
 *                                       style prompt (--prompt) and cost a little; Chirp 3 HD has a
 *                                       free monthly allowance that covers this whole set.
 *   --prompt                            Style prompt for the Gemini models.
 *   --letter-voice                      Voice for letter phrases and sound clips, which use SSML
 *                                       phonemes so "m, as in moon" says the sound /m/, not "em".
 *                                       Defaults to the main voice as a Chirp 3 HD voice (Gemini
 *                                       models cannot take SSML). Neural2 and Studio voices work too.
 *   --letter-style sound|name           "name" says letter names ("bee, as in ball") in the main voice.
 *   --speed                             speaking rate, default 0.95 (Chirp 3 HD, Neural2, Studio).
 *   --no-trim                           keep Google's leading and trailing silence. By default, when
 *                                       ffmpeg is installed, each clip is fetched as WAV, trimmed so it
 *                                       starts at once, and encoded to MP3 here.
 */

import { spawnSync } from "node:child_process";
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
  if (at !== -1 && argv[at + 1] !== undefined && !argv[at + 1].startsWith("--")) return argv[at + 1];
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

const GEMINI_MODELS = ["gemini-2.5-pro-tts", "gemini-2.5-flash-tts", "gemini-2.5-flash-lite-preview-tts", "gemini-3.1-flash-tts-preview"];
const FULL_VOICE = /^en-US-(Neural2-[A-Z]|Studio-[A-Z]|Chirp3-HD-[A-Za-z0-9]+|Chirp-HD-[A-Za-z0-9]+)$/;
const BARE_VOICE = /^[A-Z][a-z]+$/;
const DEFAULT_PROMPT =
  "You are the gentle narrator of a reading app for children aged three to seven. Speak slowly, warmly and clearly, like a kind teacher reading to one child. Say every word fully. Keep it calm, never theatrical.";

/**
 * One way of speaking: a Google voice plus, for the Gemini models, the model
 * name and a style prompt. "Aoede" alone means en-US-Chirp3-HD-Aoede.
 */
function resolveVoice(spec, modelName, prompt) {
  if (GEMINI_MODELS.includes(modelName)) {
    const name = FULL_VOICE.test(spec) ? spec.split("-").pop() : spec;
    if (!BARE_VOICE.test(name)) throw new Error(`Gemini voices are plain names such as Aoede or Kore. Got "${spec}".`);
    return { name, languageCode: "en-US", modelName, prompt, label: `${modelName} ${name}`, ssml: false, rate: false };
  }
  if (modelName !== "chirp3") throw new Error(`Unknown model "${modelName}". Use chirp3 or one of ${GEMINI_MODELS.join(", ")}.`);
  const name = BARE_VOICE.test(spec) ? `en-US-Chirp3-HD-${spec}` : spec;
  if (!FULL_VOICE.test(name)) throw new Error(`Voices must be en-US Neural2, Studio, Chirp HD, or Chirp 3 HD names, or a Chirp 3 HD voice such as Aoede. Got "${spec}".`);
  return { name, languageCode: "en-US", label: name, ssml: /Neural2|Studio|Chirp3-HD/.test(name), rate: true };
}

/**
 * IPA for a letter's sound, for the SSML phoneme tag. A short schwa after a
 * stop ("bə") is how the sound is said to a child; continuants are held.
 */
const LETTER_IPA = {
  a: "æ", b: "bə", c: "kə", d: "də", e: "ɛː", f: "f", g: "ɡə", h: "hə", i: "ɪː", j: "dʒə", k: "kə", l: "lː",
  m: "mː", n: "nː", o: "ɑ", p: "pə", q: "kwə", r: "ɹ", s: "s", t: "tə", u: "ʌ", v: "vː", w: "wə", x: "ks",
  y: "jə", z: "zː", ae: "æ", eh: "ɛː", ih: "ɪː", aw: "ɑ", uh: "ʌ", ks: "ks",
};
// Held /s/, /f/ and /r/ (sː) came out as three short pulses; a single phone is one clean sound.
// /ɛ/ and /ɪ/ alone were too short to hear, so they are held a little.

/** What a child might read on a phonics card: the sound written out, for a voice with no SSML. */
const LETTER_SOUNDS = {
  a: "a", b: "buh", c: "kuh", d: "duh", e: "eh", f: "fff", g: "guh", h: "huh", i: "ih", j: "juh", k: "kuh",
  l: "lll", m: "mmm", n: "nnn", o: "aw", p: "puh", q: "kwuh", r: "rrr", s: "sss", t: "tuh", u: "uh", v: "vvv",
  w: "wuh", x: "ks", y: "yuh", z: "zzz", ae: "a", eh: "eh", ih: "ih", aw: "aw", uh: "uh", ks: "ks",
};

const LETTER_NAMES = {
  a: "ay", b: "bee", c: "see", d: "dee", e: "ee", f: "eff", g: "jee", h: "aitch", i: "eye", j: "jay", k: "kay",
  l: "ell", m: "em", n: "en", o: "oh", p: "pee", q: "cue", r: "ar", s: "ess", t: "tee", u: "you",
  v: "vee", w: "double you", x: "ex", y: "why", z: "zee",
};

function escapeXml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function phonemeTag(char) {
  const ipa = LETTER_IPA[char] ?? char;
  return `<phoneme alphabet="ipa" ph="${ipa}">${escapeXml(LETTER_SOUNDS[char] ?? char)}</phoneme>`;
}

/** The letter in "m, as in moon", or in a sound id such as "ae". */
function letterOf(kind, id, say) {
  const match = say.match(/^([a-z]), as in (.+)$/i);
  if (kind === "sounds") {
    const char = (id in LETTER_IPA ? id : (match?.[1] ?? id)).toLowerCase();
    return { char, example: match?.[2]?.replace(/\.$/, "") };
  }
  if (kind === "letters" && match) return { char: match[1].toLowerCase(), example: match[2].replace(/\.$/, "") };
  return null;
}

/**
 * What to send for one clip: plain text for the main voice, or SSML with a
 * phoneme for a letter phrase ("m, as in moon" said as /m/) or a bare letter
 * sound (the /m/ alone, for sounding out a word).
 */
function inputFor(kind, id, say, main, letters, style) {
  const letter = letterOf(kind, id, say);
  if (letter) {
    const { char, example } = letter;
    if (kind === "letters" && style === "name") return { text: `${LETTER_NAMES[char] ?? char}, as in ${example}.`, voice: main };
    if (letters.ssml) {
      const ssml =
        kind === "sounds"
          ? `<speak>${phonemeTag(char)}</speak>`
          : `<speak>${phonemeTag(char)}<break time="250ms"/> as in ${escapeXml(example ?? "")}.</speak>`;
      const plain = kind === "sounds" ? `<speak>${phonemeTag(char)}.</speak>` : `<speak>${phonemeTag(char)}, as in ${escapeXml(example ?? "")}.</speak>`;
      return { ssml, plain, voice: letters };
    }
    const sound = LETTER_SOUNDS[char] ?? char;
    return { text: kind === "sounds" ? `${sound}.` : `${sound}, as in ${example}.`, voice: letters };
  }
  let text = say.trim();
  if (kind === "words" && text === "I") text = "I.";
  else if (text && !/[.!?]$/.test(text)) text = `${text}.`;
  return { text, voice: main };
}

const modelName = option("--model", process.env.GOOGLE_TTS_MODEL || "chirp3");
const prompt = option("--prompt", process.env.GOOGLE_TTS_PROMPT || DEFAULT_PROMPT);
const mainVoice = resolveVoice(option("--voice", process.env.GOOGLE_TTS_VOICE || "Aoede"), modelName, prompt);
const letterSpec = option("--letter-voice", process.env.GOOGLE_TTS_LETTER_VOICE || "");
const letterVoice = letterSpec ? resolveVoice(letterSpec, "chirp3") : mainVoice.ssml ? mainVoice : resolveVoice(mainVoice.name, "chirp3");
const letterStyle = option("--letter-style", "sound");
const speed = Number(option("--speed", "0.95")) || 0.95;
const only = option("--only", "")
  .split(",")
  .map((kind) => kind.trim())
  .filter(Boolean);
const forceValue = option("--force", "");
const forceAll = forceValue === "true" || (flags.has("--force") && forceValue === "");
const forceKinds = new Set(forceValue.split(",").map((kind) => kind.trim()).filter((kind) => kind && kind !== "true" && kind !== "false"));
const force = forceAll;
const shouldForce = (kind) => forceAll || forceKinds.has(kind);
const dryRun = flags.has("--dry-run");
const sampleSpecs = option("--sample", "")
  .split(",")
  .map((spec) => spec.trim())
  .filter(Boolean);
const sampleDir = resolve(root, option("--sample-dir", "samples"));

const apiKey = process.env.GOOGLE_TTS_API_KEY?.trim();
const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

function requireCredentials() {
  if (!apiKey && (!credentials || !existsSync(credentials))) {
    console.error(
      "Set GOOGLE_TTS_API_KEY (an API key restricted to the Text-to-Speech API) or GOOGLE_APPLICATION_CREDENTIALS (a service-account JSON file). The app itself does not call Google.",
    );
    process.exit(1);
  }
}

/** With an API key, call the REST endpoint directly. With a key file, use the client library. */
let synthesizeRaw;
async function connect() {
  if (synthesizeRaw) return;
  requireCredentials();
  if (apiKey) {
    synthesizeRaw = async (request) => {
      const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error?.message || `Text-to-Speech returned ${response.status}`);
      }
      return Buffer.from(body.audioContent ?? "", "base64");
    };
  } else {
    const { TextToSpeechClient } = await import("@google-cloud/text-to-speech");
    const client = new TextToSpeechClient();
    synthesizeRaw = async (request) => {
      const [response] = await client.synthesizeSpeech(request);
      return response.audioContent;
    };
  }
}

const hasFfmpeg = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;
const trim = hasFfmpeg && !flags.has("--no-trim");
if (!trim && !flags.has("--index-only")) console.log(hasFfmpeg ? "Keeping Google's silence (--no-trim)." : "ffmpeg not found: clips keep Google's leading silence.");

/**
 * Google leaves about 0.4 s of silence before a clip. Trim it (keeping a
 * short lead-in) and encode to MP3 here, so a sound starts the moment a
 * child taps. Falls back to the untrimmed audio if trimming leaves nothing.
 */
function trimAndEncode(wav, label) {
  const filter =
    "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.06," +
    "areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12,areverse";
  const encode = (args) =>
    spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "wav", "-i", "pipe:0", ...args, "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", "64k", "-f", "mp3", "pipe:1"], {
      input: wav,
      maxBuffer: 64 * 1024 * 1024,
    });
  const trimmed = encode(["-af", filter]);
  if (trimmed.status === 0 && trimmed.stdout.length > 800) return trimmed.stdout;
  const whole = encode([]);
  if (whole.status !== 0) throw new Error(`ffmpeg could not encode ${label}: ${whole.stderr}`);
  return whole.stdout;
}

async function synthesize({ text, ssml, plain, voice }, label = "") {
  await connect();
  const input = ssml ? { ssml } : voice.modelName ? { prompt: voice.prompt, text } : { text };
  const audioConfig = { audioEncoding: trim ? "LINEAR16" : "MP3", sampleRateHertz: 24000, ...(voice.rate ? { speakingRate: speed } : {}) };
  const request = {
    input,
    voice: { languageCode: voice.languageCode, name: voice.name, ...(voice.modelName ? { modelName: voice.modelName } : {}) },
    audioConfig,
  };
  let audio;
  try {
    audio = await synthesizeRaw(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // A voice that takes SSML but not <break>: say it with a comma instead.
    if (ssml && plain && /break|ssml|tag|unsupported|invalid/i.test(message)) {
      audio = await synthesizeRaw({ ...request, input: { ssml: plain } });
    } else if (/speaking_?rate|sample_?rate|pitch/i.test(message)) {
      audio = await synthesizeRaw({ ...request, audioConfig: { audioEncoding: audioConfig.audioEncoding } });
    } else {
      throw error;
    }
  }
  if (!audio || audio.length === 0) return audio;
  return trim ? trimAndEncode(Buffer.isBuffer(audio) ? audio : Buffer.from(audio), label) : audio;
}

function writeClip(dest, audio, label) {
  if (!audio || audio.length === 0) throw new Error(`Google returned empty audio for ${label}`);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, Buffer.isBuffer(audio) ? audio : Buffer.from(audio));
}

/**
 * Comparison clips: the same few lines in each requested voice, written as
 * samples/<label>/NN-<part>.mp3 for a workflow to join. The letter parts
 * always come from a Chirp 3 HD voice of the same name, since the Gemini
 * models cannot take SSML; that is also how a real build would be made.
 */
async function makeSamples() {
  const parts = [
    ["letter", "letters", "m", "m, as in moon"],
    ["letter", "letters", "s", "s, as in sun"],
    ["sound", "sounds", "m", "m, as in moon"],
    ["sound", "sounds", "a", "a, as in apple"],
    ["sound", "sounds", "t", "t, as in top"],
    ["word", "words", "mat", "mat"],
    ["word", "words", "sun", "sun"],
    ["prompt", "prompts", "tap-sound", "Tap the letter that makes this sound."],
    ["prompt", "prompts", "well-done", "Well done. You read it!"],
    ["story", "stories", "p1", "Hi! I am Fox. I am up on the hill. Can you see me?"],
    ["story", "stories", "p2", "Sam sat in the sun. A big red bug sat on Sam. Sam did not fuss."],
  ];
  let failed = 0;
  for (const spec of sampleSpecs) {
    const [modelPart, voicePart] = spec.includes(":") ? spec.split(":") : ["chirp3", spec];
    const label = `${modelPart}-${voicePart}`.replace(/[^A-Za-z0-9.-]+/g, "-");
    try {
      const main = resolveVoice(voicePart, modelPart, prompt);
      const letters = main.ssml ? main : resolveVoice(voicePart, "chirp3");
      let count = 0;
      for (const [part, kind, id, say] of parts) {
        count += 1;
        const dest = join(sampleDir, label, `${String(count).padStart(2, "0")}-${part}-${id}.mp3`);
        if (existsSync(dest) && !force) continue;
        const input = inputFor(kind, id, say, main, letters, letterStyle);
        if (dryRun) {
          console.log(`${relative(root, dest)}  ${input.voice.label}  ${JSON.stringify(input.ssml ?? input.text)}`);
          continue;
        }
        const audio = await synthesize(input);
        writeClip(dest, audio, `${label} ${part} ${id}`);
      }
      console.log(`${label}: ${count} sample clips in ${relative(root, join(sampleDir, label))}`);
    } catch (error) {
      // One voice or model that fails (not enabled, not allowed for this key)
      // should not stop the others. The note travels with the samples.
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`${label}: ${message}`);
      mkdirSync(sampleDir, { recursive: true });
      writeFileSync(join(sampleDir, `${label}.error.txt`), `${message}\n`);
    }
  }
  if (failed === sampleSpecs.length) process.exit(1);
}

if (sampleSpecs.length > 0) {
  await makeSamples();
  process.exit(0);
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
const todo = [...jobs.entries()].filter(([file, job]) => shouldForce(job.kind) || !existsSync(resolve(audioRoot, file)));
console.log(
  `${jobs.size} clips in the manifest, ${todo.length} to make. Voice ${mainVoice.label}; letters ${letterStyle === "name" ? "as names" : `as sounds via ${letterVoice.label}`}.`,
);
if (todo.length === 0) {
  const files = scan();
  writeIndex(files);
  console.log(`Indexed ${files.length} audio files.`);
  process.exit(0);
}

let made = 0;
for (const [file, job] of todo) {
  const dest = resolve(audioRoot, file);
  if (!dest.startsWith(`${audioRoot}${sep}`)) throw new Error(`Refusing unsafe audio path "${file}"`);
  const input = inputFor(job.kind, job.id, job.say, mainVoice, letterVoice, letterStyle);
  if (dryRun) {
    console.log(`${file}  ${input.voice.label}  ${JSON.stringify(input.ssml ?? input.text)}`);
    continue;
  }
  const audio = await synthesize(input, `${job.kind} ${job.id}`);
  writeClip(dest, audio, `${job.kind} ${job.id}`);
  made += 1;
  if (made % 50 === 0 || made === todo.length) console.log(`${made}/${todo.length}  public/audio/${file}`);
}

if (dryRun) {
  console.log(`Dry run: ${todo.length} clips would be made.`);
  process.exit(0);
}
const files = scan();
writeIndex(files);
console.log(`Made ${made} clips. Indexed ${files.length} audio files.`);
