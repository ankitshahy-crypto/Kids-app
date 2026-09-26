import type { LessonStep } from "../data/profiles";

/** Short prompts for a grown-up sitting beside the child. Keyed by letter and by lesson step. */
const letterTips: Record<string, string> = {
  m: "Ask: what other words start with /m/?",
  a: "Ask: can you hear /a/ in apple?",
  s: "Ask: what other words start with /s/?",
  t: "Ask: what other words start with /t/?",
  p: "Ask: what other words start with /p/?",
  i: "Ask: can you hear /i/ in igloo?",
  n: "Ask: what other words start with /n/?",
  d: "Ask: what other words start with /d/?",
  o: "Ask: can you hear /o/ in octopus?",
  c: "Ask: what other words start with /c/?",
  u: "Ask: can you hear /u/ in umbrella?",
  b: "Ask: what other words start with /b/?",
  g: "Ask: what other words start with /g/?",
  h: "Ask: what other words start with /h/?",
  e: "Ask: can you hear /e/ in egg?",
  r: "Ask: what other words start with /r/?",
  f: "Ask: what other words start with /f/?",
  l: "Ask: what other words start with /l/?",
  k: "Ask: what other words start with /k/?",
  j: "Ask: what other words start with /j/?",
  w: "Ask: what other words start with /w/?",
  v: "Ask: what other words start with /v/?",
  y: "Ask: what other words start with /y/?",
  z: "Ask: what other words start with /z/?",
  x: "Ask: can you hear /ks/ at the end of fox?",
  q: "Ask: what other words start with /kw/?",
};

const stepTips: Record<LessonStep, { start: string; end: string }> = {
  letter: {
    start: "Sit close. Your child drags across the word and hears each sound.",
    end: "Ask: what other words start with this sound?",
  },
  draw: {
    start: "Tracing can be in the air. Big and messy is fine.",
    end: "Ask them to write the letter in the air one more time.",
  },
  story: {
    start: "The story stars their animal. Read a line, then pause on one word.",
    end: "Ask: what did their animal do?",
  },
  moment: {
    start: "Name the color, then find that color in the room.",
    end: "Ask: what else is this color?",
  },
};

export type ReadTip = { id: string; text: string };

/** A letter end-tip wins when we have one. Otherwise the lesson step supplies the line. */
export function readTip(step: LessonStep, when: "start" | "end", letter?: string): ReadTip {
  const key = letter?.trim().toLowerCase() ?? "";
  if (when === "end" && step === "letter" && letterTips[key]) {
    return { id: `letter-${key}-end`, text: letterTips[key] };
  }
  return { id: `${step}-${when}`, text: stepTips[step][when] };
}
