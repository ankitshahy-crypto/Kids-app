/**
 * Sound units beyond single letters: digraphs (sh), vowel teams (ee), the
 * magic-e patterns (a_e) and r-controlled vowels (ar). Weeks 15 to 26 of
 * the letter schedule teach these, one or two a week, after the 26 letters.
 *
 * A unit's id is also its manifest id for `letters` ("sh, as in ship") and
 * `sounds` (the bare sound), and its phoneme id on a tile.
 */
export type SoundUnit = {
  id: string;
  /** How the unit is shown on a tile or card: "sh", "a-e". */
  label: string;
  /** The example word in "sh, as in ship". */
  example: string;
  /** Vowel + consonant + silent e. The e is shown but makes no sound of its own. */
  magicE?: boolean;
};

export const SOUND_UNITS = [
  { id: "sh", label: "sh", example: "ship" },
  { id: "ch", label: "ch", example: "chick" },
  { id: "th", label: "th", example: "thumb" },
  { id: "ng", label: "ng", example: "ring" },
  { id: "ck", label: "ck", example: "duck" },
  { id: "ee", label: "ee", example: "bee" },
  { id: "oo", label: "oo", example: "moon" },
  { id: "ai", label: "ai", example: "rain" },
  { id: "ay", label: "ay", example: "day" },
  { id: "oa", label: "oa", example: "boat" },
  { id: "igh", label: "igh", example: "light" },
  { id: "a_e", label: "a-e", example: "cake", magicE: true },
  { id: "i_e", label: "i-e", example: "kite", magicE: true },
  { id: "o_e", label: "o-e", example: "bone", magicE: true },
  { id: "u_e", label: "u-e", example: "cube", magicE: true },
  { id: "ar", label: "ar", example: "star" },
  { id: "or", label: "or", example: "fork" },
  { id: "er", label: "er", example: "fern" },
  { id: "ir", label: "ir", example: "bird" },
  { id: "ea", label: "ea", example: "leaf" },
  { id: "ou", label: "ou", example: "cloud" },
  { id: "oi", label: "oi", example: "coin" },
  { id: "wh", label: "wh", example: "whale" },
] as const satisfies readonly SoundUnit[];

export type UnitId = (typeof SOUND_UNITS)[number]["id"];

export const UNIT_IDS: readonly UnitId[] = SOUND_UNITS.map((unit) => unit.id);
const byId = new Map<string, SoundUnit>(SOUND_UNITS.map((unit) => [unit.id, unit]));

export function soundUnit(id: string): SoundUnit | undefined {
  return byId.get(id.toLowerCase());
}

/** True for a multi-letter unit id such as "sh" or "a_e"; false for a letter. */
export function isUnit(id: string): boolean {
  return byId.has(id.toLowerCase());
}

/** What a tile shows for a letter or unit id. */
export function unitLabel(id: string): string {
  return byId.get(id.toLowerCase())?.label ?? id;
}

/** The letters inside a unit, for tracing: "sh" → s, h; "a_e" → a, e. */
export function unitLetters(id: string): string[] {
  return [...id.toLowerCase().replace(/_/g, "")].filter((char) => /^[a-z]$/.test(char));
}

/** Only the single letters in a list of letter and unit ids, for games and printables built on letters. */
export function lettersOnly(ids: readonly string[]): string[] {
  return ids.map((id) => id.toLowerCase()).filter((id) => /^[a-z]$/.test(id));
}

/** The letters a week's list asks a child to trace: a unit is traced letter by letter. */
export function traceLetters(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const letters: string[] = [];
  for (const id of ids) {
    for (const char of unitLetters(id)) {
      if (seen.has(char)) continue;
      seen.add(char);
      letters.push(char);
    }
  }
  return letters;
}

/**
 * A piece of a word: the letters shown, and the sound they make. `silent` is
 * the e of a magic-e word. `untaught` marks a spelling this app never
 * teaches (ow, aw, a soft c): the word is read whole, not sounded out.
 */
export type SoundPiece = { text: string; sound: string; silent?: boolean; untaught?: boolean };

/**
 * Spellings the app does not teach a sound for. A word with one is read
 * whole by the app rather than sounded out letter by letter, which would
 * come out wrong (c-o-w, s-a-w, n-e-w, t-u-r-n).
 */
const UNTAUGHT = ["ow", "aw", "ew", "ue", "ie", "ur", "au", "ph", "kn", "wr"];

/** Spellings that say a sound already taught: "oy" is "oi", and a final y says "ee" (happy) or "igh" (fly). */
const SAME_SOUND: Record<string, string> = { oy: "oi" };

// Longest units first, so "igh" wins over "i", and "ai" over "a".
const TEAMS = [...UNIT_IDS.filter((id) => !id.includes("_")), ...UNTAUGHT, ...Object.keys(SAME_SOUND)].sort((a, b) => b.length - a.length);
const UNTAUGHT_SET = new Set(UNTAUGHT);
// vowel, consonant, e, and an optional s: cake, cakes.
const MAGIC = /^([aiou])([bcdfgklmnprstvz])e(s?)$/;
const VOWELS = /^[aeiou]/;

/**
 * Split a word into the pieces a reader sounds out. Teams and digraphs
 * stay together (sh-i-p), a magic-e word marks its vowel as the a_e sound
 * and its final e as silent (c-a-k-e), and everything else is one letter.
 * Splitting uses every unit the app knows, not only the ones taught, so a
 * word with an unmet unit is not mistaken for a string of known letters.
 */
export function splitSounds(word: string): SoundPiece[] {
  const plain = word.toLowerCase().replace(/[^a-z]/g, "");
  const pieces: SoundPiece[] = [];
  let at = 0;
  while (at < plain.length) {
    const rest = plain.slice(at);
    const magic = rest.match(MAGIC);
    if (magic) {
      pieces.push({ text: magic[1], sound: `${magic[1]}_e` });
      // The c of nice and the g of cage are soft before the e: sounds this app does not teach.
      const soft = magic[2] === "c" || magic[2] === "g";
      pieces.push(soft ? { text: magic[2], sound: `${magic[2]}-soft`, untaught: true } : { text: magic[2], sound: magic[2] });
      pieces.push({ text: "e", sound: "silent", silent: true });
      if (magic[3]) pieces.push({ text: "s", sound: "s" });
      break;
    }
    // q and u go together (quick, queen): q already says "kw", so the u is a plain letter, not a team.
    if (rest.startsWith("qu")) {
      pieces.push({ text: "q", sound: "q" }, { text: "u", sound: "u" });
      at += 2;
      continue;
    }
    const team = TEAMS.find((id) => rest.startsWith(id));
    if (team) {
      pieces.push(UNTAUGHT_SET.has(team) ? { text: team, sound: team, untaught: true } : { text: team, sound: SAME_SOUND[team] ?? team });
      at += team.length;
      continue;
    }
    // A soft c (ce, ci, cy) says "s", which this app does not teach: read the word whole.
    if (plain[at] === "c" && /^[eiy]/.test(rest.slice(1))) {
      pieces.push({ text: "c", sound: "c-soft", untaught: true });
      at += 1;
      continue;
    }
    // A final y after a consonant is a vowel: "ee" after another vowel (happy), else "igh" (fly).
    if (rest === "y" && pieces.length > 0 && !VOWELS.test(pieces[pieces.length - 1].text)) {
      pieces.push({ text: "y", sound: pieces.some((piece) => VOWELS.test(piece.text) || piece.text.length > 1) ? "ee" : "igh" });
      break;
    }
    // A final e after a vowel team and a consonant is silent too: leave, house, houses.
    const before = pieces[pieces.length - 2];
    const last = pieces[pieces.length - 1];
    if (/^es?$/.test(rest) && last && before && !VOWELS.test(last.text) && VOWELS.test(before.text) && before.text.length > 1) {
      pieces.push({ text: "e", sound: "silent", silent: true });
      if (rest === "es") pieces.push({ text: "s", sound: "s" });
      break;
    }
    pieces.push({ text: plain[at], sound: plain[at] });
    at += 1;
  }
  return pieces;
}

/**
 * Has this sound been met? A letter or unit is met once taught; "ck" counts
 * as met once "k" is, since it is the same sound spelled twice.
 */
export function soundMet(id: string, known: ReadonlySet<string>): boolean {
  const lower = id.toLowerCase();
  return known.has(lower) || (lower === "ck" && known.has("k"));
}

/** Sound ids a word needs, without the silent e. */
export function soundsNeeded(word: string): string[] {
  return splitSounds(word)
    .filter((piece) => !piece.silent)
    .map((piece) => piece.sound);
}
