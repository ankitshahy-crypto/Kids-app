#!/usr/bin/env node
/**
 * Offline voice generator using Google Cloud Text-to-Speech. Makes every
 * "neural" clip in src/data/audioManifest.json (letters, sounds, words,
 * sentences, numbers, prompts, colors, stories) and writes
 * src/data/audioAvailable.json so the app knows which files exist. The app
 * itself never calls Google.
 *
 * A clip is made when its file is missing, or when the words it was recorded
 * from (src/data/audioRecorded.json) are no longer the words in the manifest.
 * So a changed line is recorded again on the next run, and the app cannot go
 * on playing the old words.
 *
 *   GOOGLE_TTS_API_KEY=... node scripts/generate-audio.mjs             # an API key restricted to the Text-to-Speech API
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json node scripts/generate-audio.mjs   # or a service-account key
 *   node scripts/generate-audio.mjs --index-only        # rewrite the index, no network
 *   node scripts/generate-audio.mjs --dry-run --only letters   # print what would be sent, no network
 *   node scripts/generate-audio.mjs --force             # remake clips that exist
 *   node scripts/generate-audio.mjs --force letters,sounds --only letters,sounds,words
 *                                                       # remake those two kinds, add missing words
 *   node scripts/generate-audio.mjs --only words,stories
 *   node scripts/generate-audio.mjs --match '^prompts/pair-'   # only clips whose kind/id matches
 *   node scripts/generate-audio.mjs --verify            # listen to each new clip (scripts/check-clips.py) and
 *                                                       # make it again, up to four times, if it does not say its line
 *   node scripts/generate-audio.mjs --verify --audit    # also listen to the clips already there, and remake the ones that fail
 *   node scripts/generate-audio.mjs --report report.md  # what was made, and what a person should listen to
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

import { spawn, spawnSync } from "node:child_process";
import { createInterface } from "node:readline";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(root, "src/data/audioManifest.json");
const indexPath = join(root, "src/data/audioAvailable.json");
const recordedPath = join(root, "src/data/audioRecorded.json");
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

/**
 * The index lists every clip on disk, and how big they are: the clips every
 * device keeps (`shared`) and the story lines that name one hero, per animal
 * (`byAnimal`). The offline panel adds those up for the children on a device.
 */
function writeIndex(files) {
  const bytes = { shared: 0, byAnimal: {} };
  for (const file of files) {
    let size = 0;
    try {
      size = statSync(join(audioRoot, file)).size;
    } catch {
      // A file listed but not on disk adds nothing.
    }
    const animal = file.match(/^stories\/[a-z0-9-]+\/(?:title|p\d+)-([a-z]+)\.mp3$/)?.[1];
    if (animal) bytes.byAnimal[animal] = (bytes.byAnimal[animal] ?? 0) + size;
    else bytes.shared += size;
  }
  writeFileSync(indexPath, `${JSON.stringify({ files, bytes }, null, 2)}\n`);
}

if (flags.has("--index-only")) {
  const files = scan();
  writeIndex(files);
  // Keep the record of what each clip was recorded from in step: a clip with no entry yet is
  // taken to say its line, and an entry for a clip that is gone is dropped.
  let recorded = {};
  try {
    recorded = JSON.parse(readFileSync(recordedPath, "utf8"));
  } catch {
    // No record yet.
  }
  const onDisk = new Set(files);
  const kept = {};
  for (const entries of Object.values(manifest)) {
    for (const entry of Object.values(entries)) {
      if (!onDisk.has(entry.file) || kept[entry.file] !== undefined) continue;
      kept[entry.file] = recorded[entry.file] ?? entry.say;
    }
  }
  writeFileSync(recordedPath, `${JSON.stringify(Object.fromEntries(Object.entries(kept).sort(([a], [b]) => (a < b ? -1 : 1))), null, 1)}\n`);
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
  v: { pron: ["vuh", "vʌ"] },
  // Sound units of weeks 15 to 26 (src/data/units.ts). The manifest id is the
  // plan key: "sh, as in ship" and the bare sh; "a-e, as in cake" is a_e.
  sh: { carve: ["ahsh", "ɑʃ", "coda-hush"], fallback: ["shuh", "ʃʌ"] },
  ch: { pron: ["chuh", "tʃʌ"] },
  th: { carve: ["ahth", "ɑθ", "coda-noise"], fallback: ["thuh", "θʌ"] },
  ng: { carve: ["ahng", "ɑŋ", "coda-voiced"], fallback: ["ung", "ʌŋ"] },
  ck: { pron: ["kuh", "kʌ"] },
  ee: { pron: ["ee", "iː"] },
  ea: { pron: ["ee", "iː"] },
  oo: { pron: ["oo", "uː"] },
  ai: { pron: ["ay", "eɪ"] },
  ay: { pron: ["ay", "eɪ"] },
  a_e: { pron: ["ay", "eɪ"] },
  oa: { pron: ["oh", "oʊ"] },
  o_e: { pron: ["oh", "oʊ"] },
  igh: { pron: ["eye", "aɪ"] },
  i_e: { pron: ["eye", "aɪ"] },
  u_e: { pron: ["you", "juː"] },
  ar: { pron: ["ar", "ɑɹ"] },
  or: { pron: ["or", "ɔɹ"] },
  er: { pron: ["er", "ɝ"] },
  ir: { pron: ["er", "ɝ"] },
  ou: { pron: ["ow", "aʊ"] },
  oi: { pron: ["oy", "ɔɪ"] },
  wh: { pron: ["wuh", "wʌ"] },
};
// v was carved from "ahva" at first, but the voice devoices it as often as
// not, and a whispered v is an f; "vuh" is at least the right sound.
// A carve that fails three times (the voice renders a carrier a little
// differently each time) falls back to the syllable, with a warning.
const SOUND_ALIAS = { ae: "a", eh: "e", ih: "i", aw: "o", uh: "u", ks: "x" };
/** A vowel sound is held a little shorter than a consonant syllable; a team or diphthong a little longer than one vowel. */
function soundCap(char) {
  if (!/^[aeiou]/.test(char)) return 0.65;
  return char.length === 1 ? 0.5 : 0.6;
}

const LETTER_NAMES = {
  a: "ay", b: "bee", c: "see", d: "dee", e: "ee", f: "eff", g: "jee", h: "aitch", i: "eye", j: "jay", k: "kay",
  l: "ell", m: "em", n: "en", o: "oh", p: "pee", q: "cue", r: "ar", s: "ess", t: "tee", u: "you",
  v: "vee", w: "double you", x: "ex", y: "why", z: "zee",
};

/**
 * How each letter's name is said for the `spell` clips (Trace your name spells the child's name
 * with them). The line is the capital letter, and the voice is given the name's sounds outright:
 * read as text, "A." came out as the word "I", "em" as "am" and "aitch" as "each".
 */
const SPELL_PLAN = {
  a: "eɪ", b: "biː", c: "siː", d: "diː", e: "iː", f: "ɛf", g: "dʒiː", h: "eɪtʃ", i: "aɪ", j: "dʒeɪ", k: "keɪ",
  l: "ɛl", m: "ɛm", n: "ɛn", o: "oʊ", p: "piː", q: "kjuː", r: "ɑɹ", s: "ɛs", t: "tiː", u: "juː",
  v: "viː", w: "dʌbəljuː", x: "ɛks", y: "waɪ", z: "ziː",
};

function escapeXml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** The letter or sound unit in "m, as in moon" or "a-e, as in cake", or in a sound id such as "ae". */
function letterOf(kind, id, say) {
  const match = say.match(/^([a-z]{1,3}|[aiou]-e), as in (.+)$/i);
  const planKey = (label) => label.toLowerCase().replace("-", "_");
  if (kind === "sounds") {
    const raw = id.toLowerCase();
    const char = SOUND_ALIAS[raw] ?? (raw in SOUND_PLAN ? raw : planKey(match?.[1] ?? raw));
    return { char, example: match?.[2]?.replace(/\.$/, "") };
  }
  if (kind === "letters" && match) return { char: planKey(match[1]), example: match[2].replace(/\.$/, "") };
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
 * A short line is said after a lead-in sentence, and the lead-in is then cut
 * away: "Say it with me. Up."
 *
 * Why: asked for one word on its own, the voice stops early about one time in
 * four. The first phone test had "up" that ended at "uh", "am" cut in the
 * middle of the m, and "of" that was 0.4 seconds of silence; 89 of the 640
 * word clips were the same clipped length. With a sentence before it the
 * word comes out whole. Each try uses a different lead-in, so a second try
 * is a different reading.
 */
const LEAD_INS = ["Say it with me.", "Here is the word.", "Now you say it.", "Listen to this one."];
/** Lines this short get a lead-in: single words, numbers, colors, clock times, a two-word title. */
const SHORT_LINE = 22;

function isShortLine(text) {
  return text.replace(/[^A-Za-z0-9]/g, "").length <= SHORT_LINE && text.trim().split(/\s+/).length <= 4;
}

/**
 * The big-and-little line of the Draw step: "Big B and little b both say buh,
 * as in bus." The manifest writes the letter where the sound goes; here the
 * sound is put in the way a letter phrase makes it (SOUND_PLAN).
 *
 * Why: the line used to be sent as written, with the sound between slashes
 * ("both say /b/, like bus"), and the voice read the slashes: "slash b slash",
 * "per meter slash". Both letters are sent as capitals, because a lone small
 * letter is read as a word ("a" as the article, "v" as "versus").
 */
function pairPlan(say, main, letters) {
  const match = say.match(/^Big ([A-Z]) and little ([a-z]) both say \2, as in (.+)$/);
  if (!match) return null;
  const [, upper, char, example] = match;
  const plan = SOUND_PLAN[char];
  if (!plan) return null;
  const lead = `Big ${upper} and little ${upper} both say`;
  const tail = `, as in ${example}.`;
  if (plan.text) return { say: [{ text: `${lead} ${plan.text}${tail}`, voice: letters }] };
  if (plan.pron) {
    const [token, ipa] = plan.pron;
    const step = syllable(letters, token, ipa, tail);
    // The same custom pronunciation, with the lead-in in front of the syllable.
    if (step.text) return { say: [{ ...step, text: `${lead} ${step.text}` }] };
    return { say: [{ ssml: step.ssml.replace("<speak>", `<speak>${escapeXml(lead)} `), voice: letters }] };
  }
  // s, f, n and x are held sounds cut from a carrier syllable: lead-in, the sound, then the word.
  const [token, ipa, mode] = plan.carve;
  const carrier = { ...syllable(letters, token, ipa, "."), carve: mode, fallback: syllable(letters, plan.fallback[0], plan.fallback[1], ".") };
  return { say: [{ text: `${lead}:`, voice: letters }, { gap: 0.18 }, carrier, { gap: 0.25 }, { text: `as in ${example}.`, voice: letters }], level: false };
}

/**
 * Steps for one clip. Most clips are a single request in the main voice;
 * a letter sound or phrase may be a carrier to carve, or two parts to join.
 * `attempt` counts tries of the same clip from 0: a short line takes a
 * different lead-in each time.
 */
function planFor(kind, id, say, main, letters, style, attempt = 0) {
  if (kind === "prompts" && /^pair-[a-z]$/.test(id)) {
    const plan = pairPlan(say.trim(), main, letters);
    if (plan) return plan;
  }
  // A letter's name on its own, after a lead-in that is cut away (as a short word is), with the
  // name's sounds given outright. The lead-in is tried in turn, like a word's.
  if (kind === "spell") {
    const ipa = SPELL_PLAN[id.toLowerCase()];
    if (!ipa) throw new Error(`No pronunciation for the letter name "${id}"`);
    const token = say.trim().replace(/\.$/, "");
    const lead = LEAD_INS[attempt % LEAD_INS.length];
    const step = syllable(main, token, ipa, ".");
    if (step.ssml) return { say: [{ ssml: step.ssml.replace("<speak>", `<speak>${escapeXml(lead)} `), voice: main, after: "lead-in" }] };
    return { say: [{ ...step, text: `${lead} ${token}.`, after: "lead-in" }] };
  }
  const letter = letterOf(kind, id, say);
  if (letter) {
    const { char, example } = letter;
    const plan = SOUND_PLAN[char];
    if (kind === "letters" && style === "name") return { say: [{ text: `${LETTER_NAMES[char] ?? char}, as in ${example}.`, voice: main }] };
    if (!plan) throw new Error(`No sound plan for letter "${char}"`);
    const tail = kind === "letters" ? `, as in ${example}.` : ".";
    // A bare sound is held to a beat or so, and every letter clip sits at one level.
    const finish = { level: true, cap: kind === "sounds" ? soundCap(char) : 0 };
    if (plan.text) return { say: [{ text: `${plan.text}${tail}`, voice: letters }], ...finish };
    if (plan.pron) return { say: [syllable(letters, plan.pron[0], plan.pron[1], tail)], ...finish };
    const [token, ipa, mode] = plan.carve;
    const carrier = { ...syllable(letters, token, ipa, "."), carve: mode, fallback: syllable(letters, plan.fallback[0], plan.fallback[1], tail) };
    if (kind === "sounds") return { say: [carrier], ...finish };
    return { say: [carrier, { gap: 0.25 }, { text: `as in ${example}.`, voice: letters }], ...finish };
  }
  let text = say.trim();
  if (kind === "words" && text === "I") text = "I.";
  else if (text && !/[.!?]$/.test(text)) text = `${text}.`;
  if (isShortLine(text) && hasFfmpeg) {
    const lead = LEAD_INS[attempt % LEAD_INS.length];
    // A capital starts the word's own sentence, so it is said as one: "Say it with me. Up."
    const line = `${text[0].toUpperCase()}${text.slice(1)}`;
    return { say: [{ text: `${lead} ${line}`, voice: main, after: "lead-in" }] };
  }
  return { say: [{ text, voice: main }] };
}

function describe(plan) {
  return plan.say
    .map((step) => {
      if (step.gap) return `(${step.gap}s)`;
      const what = step.ssml ?? step.text;
      const pron = step.pron ? ` {${Object.entries(step.pron).map(([k, v]) => `${k}=${v}`).join(",")}}` : "";
      return `${JSON.stringify(what)}${pron}${step.carve ? ` carve:${step.carve}` : ""}${step.after ? " cut:after-lead-in" : ""} [${step.voice.label}]`;
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
const matchValue = option("--match", "");
const match = matchValue ? new RegExp(matchValue) : null;
const verify = flags.has("--verify");
const audit = flags.has("--audit");
const reportPath = option("--report", "");
/** Tries for one clip before the best of them is kept and listed for a person to hear. */
const ATTEMPTS = 4;
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
      const name = `${body.input.text ?? body.input.ssml ?? ""}${pron ? ` {${pron}}` : ""}`.replace(/[^A-Za-z0-9æɛɪɑʌɡʒɹʃθŋɔɝː=,{} .-]+/g, "_");
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

/** Google leaves about 0.4 s of silence before a clip; keep a short lead-in instead. */
function trimWav(wav, threshold = "-45dB") {
  const filter =
    `silenceremove=start_periods=1:start_threshold=${threshold}:start_silence=0.06,` +
    `areverse,silenceremove=start_periods=1:start_threshold=${threshold}:start_silence=0.12,areverse`;
  const out = ffmpeg(["-f", "wav", "-i", "pipe:0", "-af", filter, "-f", "wav", "pipe:1"], wav);
  return out.length > 2000 ? out : wav;
}

/** The PCM samples of a 16-bit WAV buffer, with the offset of its data chunk. */
function pcmOf(wav) {
  let at = 12;
  while (at + 8 <= wav.length) {
    const id = wav.toString("ascii", at, at + 4);
    const size = wav.readUInt32LE(at + 4);
    if (id === "data") return { start: at + 8, end: Math.min(wav.length, at + 8 + size) };
    at += 8 + size + (size % 2);
  }
  throw new Error("WAV has no data chunk");
}

/**
 * Bring a short clip to one level: RMS of its louder half at -20 dBFS, peak
 * no higher than -1 dBFS. Letter sounds vary a lot in level otherwise
 * (a "t" burst peaks four times higher than a vowel).
 */
function levelWav(wav, targetRms = 0.1) {
  const { start, end } = pcmOf(wav);
  const samples = new Int16Array(wav.buffer.slice(wav.byteOffset + start, wav.byteOffset + end - ((end - start) % 2)));
  const block = 480;
  const blocks = [];
  for (let i = 0; i + block <= samples.length; i += block) {
    let sum = 0;
    for (let j = i; j < i + block; j += 1) sum += (samples[j] / 32768) ** 2;
    blocks.push(Math.sqrt(sum / block));
  }
  if (blocks.length === 0) return wav;
  const sorted = [...blocks].sort((a, b) => a - b);
  const upper = sorted.slice(Math.floor(sorted.length / 2));
  const rms = Math.sqrt(upper.reduce((acc, v) => acc + v * v, 0) / upper.length);
  if (rms < 1e-4) return wav;
  let peak = 0;
  for (const v of samples) peak = Math.max(peak, Math.abs(v) / 32768);
  const gain = Math.min(targetRms / rms, 0.89 / (peak || 1));
  const out = Buffer.from(wav);
  const view = new Int16Array(out.buffer.slice(out.byteOffset + start, out.byteOffset + start + samples.length * 2));
  for (let i = 0; i < samples.length; i += 1) view[i] = Math.max(-32768, Math.min(32767, Math.round(samples[i] * gain)));
  Buffer.from(view.buffer).copy(out, start);
  return out;
}

/** How loud each 10 ms of a WAV is, in dB, with the samples and their rate. */
function loudness(wav) {
  const { start, end } = pcmOf(wav);
  const rate = wav.readUInt32LE(24) || 24000;
  const samples = new Int16Array(wav.buffer.slice(wav.byteOffset + start, wav.byteOffset + end - ((end - start) % 2)));
  const hop = Math.max(1, Math.round(rate / 100));
  const frames = Math.floor(samples.length / hop);
  const db = new Float64Array(frames);
  let peak = -120;
  for (let frame = 0; frame < frames; frame += 1) {
    let sum = 0;
    for (let at = frame * hop; at < (frame + 1) * hop; at += 1) sum += (samples[at] / 32768) ** 2;
    db[frame] = 20 * Math.log10(Math.max(Math.sqrt(sum / hop), 1e-6));
    if (db[frame] > peak) peak = db[frame];
  }
  return { samples, rate, hop, frames, db, peak };
}

/** A 16-bit mono WAV from samples. */
function wavFrom(samples, rate) {
  const data = Buffer.from(samples.buffer, samples.byteOffset, samples.length * 2);
  const head = Buffer.alloc(44);
  head.write("RIFF", 0, "ascii");
  head.writeUInt32LE(36 + data.length, 4);
  head.write("WAVEfmt ", 8, "ascii");
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22);
  head.writeUInt32LE(rate, 24);
  head.writeUInt32LE(rate * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write("data", 36, "ascii");
  head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}

/**
 * Did the voice stop in the middle of a sound? A whole reply dies away into
 * a little silence; a cut one ends at full voice on its last sample. This is
 * how "am" lost half its m and "Pop the balloons with this letter" stopped
 * after "Pop".
 */
function stopsWhileLoud(wav) {
  const { frames, db, peak } = loudness(wav);
  if (frames < 8 || peak < -50) return false;
  const tail = (db[frames - 1] + db[frames - 2] + db[frames - 3]) / 3;
  return tail > peak - 9;
}

/**
 * The line after its lead-in sentence ("Say it with me. Up."): everything
 * from the middle of the first pause on. The pause between two sentences is
 * 0.15 s or more; the gaps inside the lead-in are shorter, and a later gap
 * inside the word itself (the hold before the p of "up") is never reached,
 * because the first one wins. Quiet here means 25 dB under the loudest
 * moment, so a breath in the pause still counts as the pause. The cut keeps
 * the last 0.14 s of the pause, which is where a soft first sound (the f of
 * "fun", the h of "hat") sits; in a long pause the breath before that is left
 * behind.
 */
function cutAfterLeadIn(wav, label) {
  const { samples, rate, hop, frames, db, peak } = loudness(wav);
  const floor = peak - 25;
  let speech = 0;
  while (speech < frames && db[speech] < floor) speech += 1;
  // The lead-in itself takes at least 0.4 s; a pause is looked for after that.
  for (let at = speech + 40; at < frames; at += 1) {
    if (db[at] >= floor) continue;
    let until = at;
    while (until < frames && db[until] < floor) until += 1;
    if (until - at >= 14 && until < frames) {
      const lead = (at - speech) / 100;
      const rest = (frames - until) / 100;
      if (lead < 0.45 || lead > 2.2) throw new Error(`${label}: the lead-in took ${lead.toFixed(2)} s, which is not a lead-in`);
      if (rest < 0.12) throw new Error(`${label}: nothing was said after the lead-in`);
      return wavFrom(samples.subarray(Math.max(Math.floor((at + until) / 2), until - 14) * hop), rate);
    }
    at = until;
  }
  throw new Error(`${label}: no pause was found after the lead-in`);
}

/** Cut a clip that runs on (a vowel the voice held for a second) with a short fade. */
function capWav(wav, seconds) {
  const { start, end } = pcmOf(wav);
  const have = (end - start) / 2 / 24000;
  if (have <= seconds + 0.05) return wav;
  return ffmpeg(["-f", "wav", "-i", "pipe:0", "-af", `atrim=0:${seconds},afade=t=out:st=${seconds - 0.06}:d=0.06`, "-f", "wav", "pipe:1"], wav);
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

/**
 * Make one clip from its plan: request each part, carve or trim it, join, encode.
 * `strict` refuses a reply that stops in the middle of a sound, so the caller
 * can ask again; the last try is not strict, and takes what it is given.
 */
async function makeClip(plan, label, strict = true) {
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
      if (strict && stopsWhileLoud(wav)) throw new Error(`${label}: the voice stopped in the middle of a sound`);
      if (step.after === "lead-in") {
        const line = trimWav(cutAfterLeadIn(wav, label));
        const seconds = (pcmOf(line).end - pcmOf(line).start) / 2 / (line.readUInt32LE(24) || 24000);
        // A short line is a second or two at most: longer means the lead-in is still in it.
        if (seconds < 0.15 || seconds > 3.2) throw new Error(`${label}: the line came out ${seconds.toFixed(2)} s long`);
        parts.push(line);
        continue;
      }
      parts.push(trim ? trimWav(wav, plan.level ? "-40dB" : "-45dB") : wav);
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
    return encodeMp3(finishWav(trim ? trimWav(wav) : wav, plan));
  }
  return encodeMp3(finishWav(parts.length === 1 ? parts[0] : joinWav(parts), plan));
}

function finishWav(wav, plan) {
  let out = wav;
  if (plan.cap) out = capWav(out, plan.cap);
  if (plan.level) out = levelWav(out);
  return out;
}

/** A single experiment or sample line: text, SSML, or JSON with pron / carve. */
async function synthesize(spec, label = "") {
  const { level, cap, ...rest } = spec;
  const step = { voice: mainVoice, ...rest };
  return makeClip({ say: [step], level, cap }, label);
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

/**
 * The words each clip on disk was recorded from. A line whose words have
 * changed since is made again; without this the app went on playing the old
 * recording (a letter card that showed an igloo and said "as in pig").
 */
function readRecorded() {
  try {
    return JSON.parse(readFileSync(recordedPath, "utf8"));
  } catch {
    return {};
  }
}

function writeRecorded(recorded, files) {
  const kept = {};
  for (const file of [...files].sort()) if (recorded[file] !== undefined) kept[file] = recorded[file];
  writeFileSync(recordedPath, `${JSON.stringify(kept, null, 1)}\n`);
}

/**
 * The listener (scripts/check-clips.py --serve): one question per clip, "does
 * this file say this line?". Started once, since loading its model takes a
 * few seconds.
 */
let listener = null;
async function startListener() {
  const child = spawn("python3", [join(root, "scripts/check-clips.py"), "--serve"], { stdio: ["pipe", "pipe", "inherit"] });
  const lines = createInterface({ input: child.stdout });
  const waiting = [];
  let failed = null;
  lines.on("line", (line) => {
    const next = waiting.shift();
    if (!next) return;
    try {
      next.resolve(JSON.parse(line));
    } catch {
      next.resolve({ ok: false, why: `could not read the listener's answer: ${line.slice(0, 120)}`, heard: "" });
    }
  });
  child.on("exit", (code) => {
    failed = new Error(`The clip listener stopped (exit ${code}). Run "python3 scripts/check-clips.py --fetch" and check that numpy and onnxruntime are installed.`);
    for (const next of waiting.splice(0)) next.reject(failed);
  });
  const ask = (message) =>
    new Promise((resolve, reject) => {
      if (failed) return reject(failed);
      waiting.push({ resolve, reject });
      if (message) child.stdin.write(`${JSON.stringify(message)}\n`);
    });
  // Its first line says it is ready.
  await ask(null);
  listener = { ask: (file, text) => ask({ file, text }), stop: () => child.stdin.end() };
}

/** Letter phrases, bare sounds and letter names are not words a recognizer knows; scripts/hear-clips.py reports on those. */
const canHear = (kind) => kind !== "letters" && kind !== "sounds" && kind !== "spell";

async function hear(file, job) {
  if (!listener || !canHear(job.kind)) return { ok: true, heard: "", why: "" };
  return listener.ask(file, job.say);
}

const jobs = new Map();
for (const [kind, entries] of Object.entries(manifest)) {
  if (only.length > 0 && !only.includes(kind)) continue;
  for (const [id, entry] of Object.entries(entries)) {
    if (entry.source !== "neural") continue;
    if (match && !match.test(`${kind}/${id}`)) continue;
    if (typeof entry.file !== "string" || entry.file.includes("..") || entry.file.startsWith("/") || !entry.file.endsWith(".mp3")) {
      throw new Error(`Refusing unsafe audio path "${entry.file}"`);
    }
    // Several ids share one file (a and ae). One clip per file.
    if (!jobs.has(entry.file)) jobs.set(entry.file, { kind, id, say: entry.say });
  }
}

const recorded = readRecorded();
if (verify && !dryRun) await startListener();

/** Why each clip is being made: missing, forced, its words changed, or it failed the listen. */
const todo = [];
let listened = 0;
for (const [file, job] of jobs) {
  const dest = resolve(audioRoot, file);
  if (!existsSync(dest)) {
    todo.push([file, job, "missing"]);
  } else if (shouldForce(job.kind)) {
    todo.push([file, job, "forced"]);
  } else if (recorded[file] !== undefined && recorded[file] !== job.say) {
    todo.push([file, job, `the line changed from ${JSON.stringify(recorded[file])}`]);
  } else if (audit && listener && canHear(job.kind)) {
    const verdict = await hear(dest, job);
    listened += 1;
    if (listened % 200 === 0) console.log(`Listened to ${listened} clips.`);
    if (verdict.ok) recorded[file] = job.say;
    else todo.push([file, job, `${verdict.why || "does not say its line"}${verdict.heard ? `: heard ${JSON.stringify(verdict.heard)}` : ""}`]);
  } else if (recorded[file] === undefined) {
    // A clip from before this record was kept: taken to say its line unless a listen says otherwise.
    recorded[file] = job.say;
  }
}
console.log(
  `${jobs.size} clips in the manifest, ${todo.length} to make. Voice ${mainVoice.label}; letters ${letterStyle === "name" ? "as names" : `as sounds via ${letterVoice.label}`}.${verify ? " Each new clip is listened to." : ""}`,
);

const report = { made: [], retried: [], unsure: [] };
function writeReport() {
  if (!reportPath) return;
  const lines = [`${report.made.length} clips made.`];
  if (report.unsure.length > 0) {
    lines.push("", `**Listen to these ${report.unsure.length}.** The listener did not hear the line in any of ${ATTEMPTS} tries; the closest try was kept.`, "", "| clip | line | heard | why |", "| --- | --- | --- | --- |");
    for (const item of report.unsure) lines.push(`| ${item.file} | ${item.say} | ${item.heard || ""} | ${item.why} |`);
  }
  if (report.retried.length > 0) {
    lines.push("", `${report.retried.length} clips needed more than one try (the first reading was cut off or said something else):`, "", report.retried.map((item) => `${item.file} (${item.tries})`).join(", "));
  }
  writeFileSync(resolve(root, reportPath), `${lines.join("\n")}\n`);
}

if (todo.length === 0) {
  const files = scan();
  writeIndex(files);
  if (!dryRun) writeRecorded(recorded, files);
  writeReport();
  listener?.stop();
  console.log(`Indexed ${files.length} audio files.`);
  process.exit(0);
}

/** Which of two failed tries came closer: the one whose line the listener found more likely. */
const closer = (a, b) => (a.verdict.score ?? a.verdict.share ?? -99) > (b.verdict.score ?? b.verdict.share ?? -99);

let made = 0;
for (const [file, job, why] of todo) {
  const dest = resolve(audioRoot, file);
  if (!dest.startsWith(`${audioRoot}${sep}`)) throw new Error(`Refusing unsafe audio path "${file}"`);
  if (dryRun) {
    console.log(`${file}  (${why})  ${describe(planFor(job.kind, job.id, job.say, mainVoice, letterVoice, letterStyle))}`);
    continue;
  }
  const label = `${job.kind} ${job.id}`;
  let best = null;
  let problem = null;
  let tries = 0;
  for (let attempt = 0; attempt < ATTEMPTS && !(best && best.verdict.ok); attempt += 1) {
    tries = attempt + 1;
    const plan = planFor(job.kind, job.id, job.say, mainVoice, letterVoice, letterStyle, attempt);
    try {
      const audio = await makeClip(plan, label, attempt < ATTEMPTS - 1);
      if (!audio || audio.length === 0) throw new Error(`Google returned empty audio for ${label}`);
      let verdict = { ok: true, heard: "", why: "" };
      if (listener && canHear(job.kind)) {
        const probe = join(workDir, "probe.mp3");
        writeFileSync(probe, audio);
        verdict = await hear(probe, job);
      }
      const candidate = { audio, verdict };
      if (!best || verdict.ok || closer(candidate, best)) best = candidate;
    } catch (error) {
      problem = error;
      const message = error instanceof Error ? error.message : String(error);
      // A reply that was cut off, or a lead-in with no pause after it, is asked for again. Anything else is a real failure.
      if (!/stopped in the middle|lead-in|came out/.test(message)) break;
    }
  }
  if (!best) {
    const message = problem instanceof Error ? problem.message : String(problem);
    const plan = planFor(job.kind, job.id, job.say, mainVoice, letterVoice, letterStyle);
    // On GitHub this line becomes an annotation, readable without the log.
    if (process.env.GITHUB_ACTIONS) console.log(`::error::${label} (${describe(plan)}): ${message.replace(/\n/g, " ")}`);
    throw problem;
  }
  writeClip(dest, best.audio, label);
  recorded[file] = job.say;
  report.made.push({ file, why });
  if (tries > 1 && best.verdict.ok) report.retried.push({ file, tries });
  if (!best.verdict.ok) {
    report.unsure.push({ file, say: job.say, heard: best.verdict.heard, why: best.verdict.why || "not heard" });
    const note = `${label} (${file}): after ${ATTEMPTS} tries the listener still hears ${JSON.stringify(best.verdict.heard ?? "")} for ${JSON.stringify(job.say)}. Listen to it.`;
    console.log(process.env.GITHUB_ACTIONS && report.unsure.length <= 40 ? `::warning::${note}` : note);
  }
  made += 1;
  if (made % 50 === 0 || made === todo.length) console.log(`${made}/${todo.length}  public/audio/${file}`);
}

listener?.stop();
if (dryRun) {
  console.log(`Dry run: ${todo.length} clips would be made.`);
  process.exit(0);
}
const files = scan();
writeIndex(files);
writeRecorded(recorded, files);
writeReport();
console.log(`Made ${made} clips (${report.retried.length} took more than one try, ${report.unsure.length} to listen to). Indexed ${files.length} audio files.`);
