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
 *   node scripts/generate-audio.mjs --voice Achernar --try tries.txt --sample-dir samples
 *                                                       # experiments: each line "label=text or <speak>ssml</speak>"
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
 *   --letter-voice                      Voice for letter phrases and sound clips (see SOUND_PLAN
 *                                       below for how a bare sound is made). Defaults to the main
 *                                       voice as a Chirp 3 HD voice; the Gemini models cannot do it.
 *   --letter-style sound|name           "name" says letter names ("bee, as in ball") in the main voice.
 *   --speed                             speaking rate, default 0.95 (Chirp 3 HD, Neural2, Studio).
 *   --no-trim                           keep Google's leading and trailing silence. By default, when
 *                                       ffmpeg is installed, each clip is fetched as WAV, trimmed so it
 *                                       starts at once, and encoded to MP3 here. Letter sounds need
 *                                       ffmpeg and python3 with numpy either way.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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
 * How each letter's sound is made. Google's voices cannot say a consonant on
 * its own: a pronunciation with no vowel is rejected, and text such as "sss"
 * is read as letter names ("ess, ess, ess"). So each sound is one of:
 *  - pron:  a short syllable given in IPA through a custom pronunciation
 *           ("buh" said as /bʌ/), or a vowel on its own.
 *  - text:  plain text the voice already says as a sound ("mmm" is a hum).
 *  - carve: a carrier syllable ("ahs", "een") from which scripts/carve-sound.py
 *           cuts the consonant and holds it steady.
 * l, r and z end in a short "uh" here; a person's recording of those three
 * (saved as public/audio/sounds/l.mp3 and so on) is the upgrade.
 */
const SOUND_PLAN = {
  a: { pron: ["aa", "æ"] },
  e: { pron: ["eh", "ɛ"] },
  i: { pron: ["ih", "ɪ"] },
  o: { pron: ["aw", "ɑ"] },
  u: { pron: ["uh", "ʌ"] },
  b: { pron: ["buh", "bʌ"] },
  c: { pron: ["kuh", "kʌ"] },
  d: { pron: ["duh", "dʌ"] },
  g: { pron: ["guh", "ɡʌ"] },
  h: { pron: ["huh", "hʌ"] },
  j: { pron: ["juh", "dʒʌ"] },
  k: { pron: ["kuh", "kʌ"] },
  p: { pron: ["puh", "pʌ"] },
  q: { pron: ["kwuh", "kwʌ"] },
  t: { pron: ["tuh", "tʌ"] },
  w: { pron: ["wuh", "wʌ"] },
  y: { pron: ["yuh", "jʌ"] },
  l: { pron: ["luh", "lʌ"] },
  r: { pron: ["ruh", "ɹʌ"] },
  z: { pron: ["zuh", "zʌ"] },
  m: { text: "mmm" },
  s: { carve: ["ahh", "ɑs", "coda-noise"], fallback: ["suh", "sʌ"] },
  f: { carve: ["ahh", "ɑf", "coda-noise"], fallback: ["fuh", "fʌ"] },
  x: { carve: ["ahh", "ɑks", "coda-burst"], fallback: ["ks", "ɛks"] },
  n: { carve: ["ahh", "ɑn", "coda-voiced"], fallback: ["nuh", "nʌ"] },
  v: { carve: ["ahha", "ɑvɑ", "mid"], fallback: ["vuh", "vʌ"] },
};
// A carve that fails three times (the voice renders a carrier a little
// differently each time) falls back to the syllable, with a warning.
const SOUND_ALIAS = { ae: "a", eh: "e", ih: "i", aw: "o", uh: "u", ks: "x" };

const LETTER_NAMES = {
  a: "ay", b: "bee", c: "see", d: "dee", e: "ee", f: "eff", g: "jee", h: "aitch", i: "eye", j: "jay", k: "kay",
  l: "ell", m: "em", n: "en", o: "oh", p: "pee", q: "cue", r: "ar", s: "ess", t: "tee", u: "you",
  v: "vee", w: "double you", x: "ex", y: "why", z: "zee",
};

function escapeXml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** The letter in "m, as in moon", or in a sound id such as "ae". */
function letterOf(kind, id, say) {
  const match = say.match(/^([a-z]), as in (.+)$/i);
  if (kind === "sounds") {
    const raw = id.toLowerCase();
    const char = SOUND_ALIAS[raw] ?? (raw in SOUND_PLAN ? raw : (match?.[1] ?? raw).toLowerCase());
    return { char, example: match?.[2]?.replace(/\.$/, "") };
  }
  if (kind === "letters" && match) return { char: match[1].toLowerCase(), example: match[2].replace(/\.$/, "") };
  return null;
}

/**
 * A syllable for the letter voice: a custom pronunciation on a Chirp 3 HD
 * voice, or an SSML phoneme on a Neural2 or Studio voice (which honour
 * phonemes for whole syllables, though not for a bare consonant).
 */
function syllable(voice, token, ipa, rest = "") {
  if (/Chirp3-HD/.test(voice.name)) return { text: `${token}${rest}`, pron: { [token]: ipa }, voice };
  return { ssml: `<speak><phoneme alphabet="ipa" ph="${ipa}">${escapeXml(token)}</phoneme>${escapeXml(rest)}</speak>`, voice };
}

/**
 * Steps for one clip. Most clips are a single request in the main voice;
 * a letter sound or phrase may be a carrier to carve, or two parts to join.
 */
function planFor(kind, id, say, main, letters, style) {
  const letter = letterOf(kind, id, say);
  if (letter) {
    const { char, example } = letter;
    const plan = SOUND_PLAN[char];
    if (kind === "letters" && style === "name") return { say: [{ text: `${LETTER_NAMES[char] ?? char}, as in ${example}.`, voice: main }] };
    if (!plan) throw new Error(`No sound plan for letter "${char}"`);
    const tail = kind === "letters" ? `, as in ${example}.` : ".";
    if (plan.text) return { say: [{ text: `${plan.text}${tail}`, voice: letters }] };
    if (plan.pron) return { say: [syllable(letters, plan.pron[0], plan.pron[1], tail)] };
    const [token, ipa, mode] = plan.carve;
    const carrier = { ...syllable(letters, token, ipa, "."), carve: mode, fallback: syllable(letters, plan.fallback[0], plan.fallback[1], tail) };
    if (kind === "sounds") return { say: [carrier] };
    return { say: [carrier, { gap: 0.25 }, { text: `as in ${example}.`, voice: letters }] };
  }
  let text = say.trim();
  if (kind === "words" && text === "I") text = "I.";
  else if (text && !/[.!?]$/.test(text)) text = `${text}.`;
  return { say: [{ text, voice: main }] };
}

function describe(plan) {
  return plan.say
    .map((step) => {
      if (step.gap) return `(${step.gap}s)`;
      const what = step.ssml ?? step.text;
      const pron = step.pron ? ` {${Object.entries(step.pron).map(([k, v]) => `${k}=${v}`).join(",")}}` : "";
      return `${JSON.stringify(what)}${pron}${step.carve ? ` carve:${step.carve}` : ""} [${step.voice.label}]`;
    })
    .join(" + ");
}

const modelName = option("--model", process.env.GOOGLE_TTS_MODEL || "chirp3");
const prompt = option("--prompt", process.env.GOOGLE_TTS_PROMPT || DEFAULT_PROMPT);
const mainVoice = resolveVoice(option("--voice", process.env.GOOGLE_TTS_VOICE || "Aoede"), modelName, prompt);
const letterSpec = option("--letter-voice", process.env.GOOGLE_TTS_LETTER_VOICE || "");
const letterVoice = letterSpec ? resolveVoice(letterSpec, "chirp3") : mainVoice.modelName ? resolveVoice(mainVoice.name, "chirp3") : mainVoice;
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
const tryFile = option("--try", "");

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
  const fakeDir = process.env.GOOGLE_TTS_FAKE_DIR;
  if (fakeDir) {
    // Offline test of the pipeline: serve WAVs from a folder, named after the request.
    synthesizeRaw = async (body) => {
      const pron = (body.input.customPronunciations?.pronunciations ?? []).map((item) => `${item.phrase}=${item.pronunciation}`).join(",");
      const name = `${body.input.text ?? body.input.ssml ?? ""}${pron ? ` {${pron}}` : ""}`.replace(/[^A-Za-z0-9æɛɪɑʌɡʒɹ=,{} .-]+/g, "_");
      const file = join(fakeDir, `${name}.wav`);
      if (!existsSync(file)) throw new Error(`fake voice has no file for ${JSON.stringify(name)}`);
      return readFileSync(file);
    };
    return;
  }
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
const workDir = mkdtempSync(join(tmpdir(), "littlenest-voice-"));

function ffmpeg(args, input) {
  const run = spawnSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { input, maxBuffer: 64 * 1024 * 1024 });
  if (run.status !== 0) throw new Error(`ffmpeg failed: ${run.stderr}`);
  return run.stdout;
}

const TRIM_FILTER =
  "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.06," +
  "areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12,areverse";

/** Google leaves about 0.4 s of silence before a clip; keep a short lead-in instead. */
function trimWav(wav) {
  const out = ffmpeg(["-f", "wav", "-i", "pipe:0", "-af", TRIM_FILTER, "-f", "wav", "pipe:1"], wav);
  return out.length > 2000 ? out : wav;
}

function encodeMp3(wav) {
  return ffmpeg(["-f", "wav", "-i", "pipe:0", "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", "64k", "-f", "mp3", "pipe:1"], wav);
}

/** Cut the consonant out of a carrier syllable and hold it (scripts/carve-sound.py). */
function carveWav(wav, mode, label) {
  const src = join(workDir, "carrier.wav");
  const dest = join(workDir, "carved.wav");
  writeFileSync(src, wav);
  const run = spawnSync("python3", [join(root, "scripts/carve-sound.py"), src, dest, "--mode", mode], { encoding: "utf8" });
  if (run.status !== 0) throw new Error(`Could not carve the ${mode} sound for ${label}: ${run.stderr.trim() || run.stdout.trim()}`);
  return readFileSync(dest);
}

/** Join WAV parts with silence between them. */
function joinWav(parts) {
  const files = parts.map((wav, index) => {
    const file = join(workDir, `part-${index}.wav`);
    writeFileSync(file, wav);
    return file;
  });
  const inputs = files.flatMap((file) => ["-i", file]);
  const chain = parts.map((_, index) => `[${index}:a]aresample=24000,aformat=channel_layouts=mono[a${index}]`).join(";");
  const concat = `${parts.map((_, index) => `[a${index}]`).join("")}concat=n=${parts.length}:v=0:a=1[out]`;
  return ffmpeg([...inputs, "-filter_complex", `${chain};${concat}`, "-map", "[out]", "-f", "wav", "pipe:1"]);
}

function silenceWav(seconds) {
  return ffmpeg(["-f", "lavfi", "-i", `anullsrc=r=24000:cl=mono`, "-t", String(seconds), "-f", "wav", "pipe:1"]);
}

/** One request to Google. Returns WAV (LINEAR16, 24 kHz) when ffmpeg is here, else MP3. */
async function request({ text, ssml, voice, pron, encoding }) {
  await connect();
  const input = ssml ? { ssml } : voice.modelName ? { prompt: voice.prompt, text } : { text };
  // Custom pronunciations: { phrase: ipa } pairs applied to the text (Chirp 3 HD, en-US).
  if (pron && Object.keys(pron).length > 0) {
    input.customPronunciations = {
      pronunciations: Object.entries(pron).map(([phrase, pronunciation]) => ({ phrase, phoneticEncoding: encoding || "PHONETIC_ENCODING_IPA", pronunciation })),
    };
  }
  const audioConfig = { audioEncoding: hasFfmpeg ? "LINEAR16" : "MP3", sampleRateHertz: 24000, ...(voice.rate ? { speakingRate: speed } : {}) };
  const body = {
    input,
    voice: { languageCode: voice.languageCode, name: voice.name, ...(voice.modelName ? { modelName: voice.modelName } : {}) },
    audioConfig,
  };
  let audio;
  try {
    audio = await synthesizeRaw(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/speaking_?rate|sample_?rate|pitch/i.test(message)) throw error;
    audio = await synthesizeRaw({ ...body, audioConfig: { audioEncoding: audioConfig.audioEncoding } });
  }
  if (!audio || audio.length === 0) throw new Error(`Google returned empty audio for ${JSON.stringify(text ?? ssml)}`);
  return Buffer.isBuffer(audio) ? audio : Buffer.from(audio);
}

/** Make one clip from its plan: request each part, carve or trim it, join, encode. */
async function makeClip(plan, label) {
  if (!hasFfmpeg) {
    if (plan.say.length > 1 || plan.say[0].carve) throw new Error(`${label} needs ffmpeg (and python3 with numpy) to make a letter sound.`);
    return request(plan.say[0]);
  }
  const parts = [];
  for (const step of plan.say) {
    if (step.gap) {
      parts.push(silenceWav(step.gap));
      continue;
    }
    if (!step.carve) {
      const wav = await request(step);
      parts.push(trim ? trimWav(wav) : wav);
      continue;
    }
    let carved = null;
    let reason = "";
    for (let attempt = 0; attempt < 3 && !carved; attempt += 1) {
      try {
        carved = carveWav(await request(step), step.carve, label);
      } catch (error) {
        reason = error instanceof Error ? error.message : String(error);
      }
    }
    if (carved) {
      parts.push(carved);
      continue;
    }
    if (!step.fallback) throw new Error(reason);
    // The whole phrase from the fallback syllable, so it stays one natural line.
    const note = `${label}: could not carve the sound (${reason.split("\n")[0]}); said as a syllable instead.`;
    console.log(process.env.GITHUB_ACTIONS ? `::warning::${note}` : note);
    const wav = await request(step.fallback);
    return encodeMp3(trim ? trimWav(wav) : wav);
  }
  return encodeMp3(parts.length === 1 ? parts[0] : joinWav(parts));
}

/** A single experiment or sample line: text, SSML, or JSON with pron / carve. */
async function synthesize(spec, label = "") {
  const step = { voice: mainVoice, ...spec };
  return makeClip({ say: [step] }, label);
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
    ["letter", "letters", "b", "b, as in ball"],
    ["sound", "sounds", "m", "m, as in moon"],
    ["sound", "sounds", "a", "a, as in apple"],
    ["sound", "sounds", "t", "t, as in top"],
    ["sound", "sounds", "s", "s, as in sun"],
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
      const letters = main.modelName ? resolveVoice(voicePart, "chirp3") : main;
      let count = 0;
      for (const [part, kind, id, say] of parts) {
        count += 1;
        const dest = join(sampleDir, label, `${String(count).padStart(2, "0")}-${part}-${id}.mp3`);
        if (existsSync(dest) && !force) continue;
        const plan = planFor(kind, id, say, main, letters, letterStyle);
        if (dryRun) {
          console.log(`${relative(root, dest)}  ${describe(plan)}`);
          continue;
        }
        const audio = await makeClip(plan, `${label} ${part} ${id}`);
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

/**
 * Experiments: one clip per line of a file, "label=what to say", in the
 * main voice (SSML when it starts with <speak>). For trying out how a
 * voice renders a phoneme before changing LETTER_IPA.
 */
async function makeTries() {
  const lines = readFileSync(tryFile, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  const dir = join(sampleDir, `try-${mainVoice.label.replace(/[^A-Za-z0-9.-]+/g, "-")}`);
  for (const line of lines) {
    const at = line.indexOf("=");
    if (at === -1) throw new Error(`Each line is label=text. Got "${line}"`);
    const label = line.slice(0, at).trim().replace(/[^A-Za-z0-9.-]+/g, "-");
    const what = line.slice(at + 1).trim();
    const dest = join(dir, `${label}.mp3`);
    // A JSON value can carry custom pronunciations and a carve mode:
    // {"text":"ahh.","pron":{"ahh":"ɑs"},"carve":"coda-noise"}
    const spec = what.startsWith("{") ? JSON.parse(what) : what.startsWith("<speak>") ? { ssml: what } : { text: what };
    const input = { ...spec, voice: mainVoice };
    if (dryRun) {
      console.log(`${relative(root, dest)}  ${input.voice.label}  ${JSON.stringify(what)}`);
      continue;
    }
    try {
      const audio = await synthesize(input, label);
      writeClip(dest, audio, label);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`${label}: ${message}`);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `${label}.error.txt`), `${message}\n`);
    }
  }
  console.log(`${lines.length} tries in ${relative(root, dir)}`);
}

if (tryFile) {
  await makeTries();
  process.exit(0);
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
  const plan = planFor(job.kind, job.id, job.say, mainVoice, letterVoice, letterStyle);
  if (dryRun) {
    console.log(`${file}  ${describe(plan)}`);
    continue;
  }
  try {
    const audio = await makeClip(plan, `${job.kind} ${job.id}`);
    writeClip(dest, audio, `${job.kind} ${job.id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // On GitHub this line becomes an annotation, readable without the log.
    if (process.env.GITHUB_ACTIONS) console.log(`::error::${job.kind} ${job.id} (${describe(plan)}): ${message.replace(/\n/g, " ")}`);
    throw error;
  }
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
