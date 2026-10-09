/**
 * The heading over the tiles. On a word card it is "Sound it out": the sounds are blended into the
 * word. A letter card is not blended (one tile, the letter's own line: "t, as in tent"), so its
 * heading is that line, the letter and its word, and never "Sound it out".
 */
export function SoundLabel({ text = "Sound it out" }: { text?: string }) {
  return (
    <div className="sound-label" data-sound-label={text === "Sound it out" ? "blend" : "letter"}>
      <span className="sound-line sound-line-left" aria-hidden="true" />
      <h1>{text}</h1>
      <span className="sound-line sound-line-right" aria-hidden="true" />
    </div>
  );
}

/** A letter card's line as text: the letter (or sound unit) and its picture word, "t, as in tent". */
export function letterLine(letter: string, word: string): string {
  return `${letter.toLowerCase()}, as in ${word}`;
}
