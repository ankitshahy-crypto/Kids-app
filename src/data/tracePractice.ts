import { starterDeck, type DeckWord } from "./deck";
import { letterForm, type LetterCase, type TracePoint } from "./handwriting";

export type TraceGlyph = {
  label: string;
  strokes: TracePoint[][];
};

/** A letter the child traces, using the same manuscript paths as the letter lesson. */
export function letterGlyph(letter: string, casing: LetterCase): TraceGlyph {
  const form = letterForm(letter, casing);
  return { label: form.letter, strokes: form.strokes };
}

/** Lowercase letters of a short word, in order. */
export function wordGlyphs(word: string): TraceGlyph[] {
  return [...word.toLowerCase()]
    .filter((char) => /[a-z]/.test(char))
    .map((char) => letterGlyph(char, "lower"));
}

/**
 * The child's first name, already stored on this device.
 * First letter is a capital. The rest are lowercase. Marks that are not letters are skipped.
 */
export function nameGlyphs(name: string): TraceGlyph[] {
  const letters = [...name].filter((char) => /[a-z]/i.test(char));
  return letters.map((char, index) => letterGlyph(char, index === 0 ? "upper" : "lower"));
}

export function nameToTrace(name: string): string | null {
  const glyphs = nameGlyphs(name);
  if (glyphs.length < 2) return null;
  return glyphs.map((glyph) => glyph.label).join("");
}

/** Three-letter words the child has already blended. Blending leaves a word sticker. */
export function blendedCvcWords(stickers: { kind: string; label: string }[]): DeckWord[] {
  const known = new Set(stickers.filter((sticker) => sticker.kind === "word").map((sticker) => sticker.label.trim().toLowerCase()));
  return starterDeck.words.filter((word) => word.word.length === 3 && word.letters.length === 3 && known.has(word.word));
}
