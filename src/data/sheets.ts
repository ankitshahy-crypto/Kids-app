import type { DeckWord } from "./deck";
import { blendList, type LadderStep } from "./ladder";
import { letterWord, type LetterWord } from "./letterWords";
import { letterSchedule } from "./schedule";
import { lettersOnly } from "./units";
import { COLORS } from "./colors";
import { MATH } from "./math";
import { READING, type SubjectId } from "./subject";
import { TIME } from "./timeMoney";

export type SheetKind = {
  subject: SubjectId;
  id: string;
  title: string;
};

/** Printable kinds a subject can offer. Reading has letter tracing and blending. */
const sheetCatalog: SheetKind[] = [
  { subject: READING, id: "letter", title: "Letter tracing" },
  { subject: READING, id: "blending", title: "Blending" },
  { subject: READING, id: "word", title: "Word tracing" },
  { subject: READING, id: "name", title: "Name tracing" },
  { subject: MATH, id: "trace", title: "Number tracing" },
  { subject: MATH, id: "count", title: "Counting" },
  { subject: MATH, id: "shape", title: "Shape tracing" },
  { subject: COLORS, id: "coloring", title: "Coloring page" },
  { subject: TIME, id: "clock", title: "Clock faces" },
  { subject: TIME, id: "coins", title: "Coin counting" },
  { subject: TIME, id: "jars", title: "Three jars chart" },
];

export function sheetsFor(subject: SubjectId): SheetKind[] {
  return sheetCatalog.filter((sheet) => sheet.subject === subject);
}

/**
 * The picture on a letter's printable sheet: the same word and drawing as its
 * letter card (letterWords.ts).
 *
 * The sheets used to keep their own list, with different words from the cards
 * (fox for f, leaf for l, wagon for w, yak, zoo, box, quilt) and 18 quick
 * pictograms drawn only for print. A child traced "W, wagon" on paper after
 * hearing "w, as in web" in the app.
 */
export type PictureWord = LetterWord;

/** The single letters of the plan, for the letter sheets. The sound-unit weeks print their letters. */
export function scheduleLetters(): string[] {
  return lettersOnly(letterSchedule.flatMap((week) => week.newLetters));
}

export function pictureForLetter(letter: string): PictureWord {
  return letterWord(letter);
}

/**
 * Words for a blending sheet: the lesson list for these letters without its
 * letter cards and sentences. `introduced` (every letter taught so far) keeps
 * the sheet to words the child can sound out, like the lesson itself.
 */
export function blendingWords(letters: string[], step: LadderStep = 3, introduced?: readonly string[]): DeckWord[] {
  return blendList(step, letters, [], introduced).filter((word) => !word.sentenceId && !word.letterCard);
}
