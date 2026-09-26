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
    start: "Trace the big letter, then the little one. A finger or a pencil is fine.",
    end: "Ask them to match the big letter with the little letter.",
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

const mathTips: Record<string, { start: string; end: string }> = {
  count: {
    start: "Touch each object, or drag it. Count out loud with your child.",
    end: "Ask: can you find that many in the room?",
  },
  know: {
    start: "Play the number, then let them tap it. A wrong tap is just another try.",
    end: "Ask: what number comes next?",
  },
  trace: {
    start: "Trace the dots in order. Big fingers are welcome.",
    end: "Ask them to draw that number in the air.",
  },
  shape: {
    start: "Find the shape, then trace around it. Big fingers are welcome.",
    end: "Ask: where else do you see this shape?",
  },
  more: {
    start: "Look at both groups before you tap. More means the bigger group.",
    end: "Ask: which group has fewer?",
  },
  add: {
    start: "Count one group, then the other, then all of them together.",
    end: "Ask: what if we added one more?",
  },
};

/** A short grown-up line for a numbers activity. */
export function mathTip(step: string, when: "start" | "end"): ReadTip {
  const tip = mathTips[step] ?? mathTips.count;
  return { id: `math-${step}-${when}`, text: tip[when] };
}

const colorTips: Record<string, { start: string; end: string }> = {
  name: {
    start: "Play the color, then let them tap the object. The word is there if the color is hard to see.",
    end: "Ask: what else in the room is this color?",
  },
  mix: {
    start: "Two paints go in the bucket. Stir with a finger until the new color shows, with its word.",
    end: "Ask: what happens if we add white?",
  },
  paint: {
    start: "Only colors they mixed can color their animal. Saving stays on this device.",
    end: "Ask: which color did their animal like?",
  },
};

const gameTips: Record<string, { start: string; end: string }> = {
  hatch: {
    start: "The word is spoken slowly. A wrong letter just wiggles. After two tries the right letter glows.",
    end: "Ask: what sound did we hear at the start?",
  },
  pop: {
    start: "Pop the balloons with the sound you hear. The others stay up.",
    end: "Ask: what else starts with that sound?",
  },
  feed: {
    start: "Drag or tap foods that start with the letter. Their animal is happy either way.",
    end: "Ask: what food at home starts with that letter?",
  },
  rhyme: {
    start: "Listen for words that end the same. Tap one, then its rhyme.",
    end: "Ask: can you think of another word that rhymes?",
  },
  memory: {
    start: "Flip two cards. A big letter matches its little letter, or a number matches its dots.",
    end: "Ask: which pair did you find first?",
  },
  spin: {
    start: "Flick the wheel or tap it. Each slice is something they already know. A miss only shows a hint.",
    end: "Ask: which slice do you want to spin next?",
  },
};

/** A short grown-up line for a game. */
export function gameTip(game: string, when: "start" | "end"): ReadTip {
  const tip = gameTips[game] ?? gameTips.hatch;
  return { id: `game-${game}-${when}`, text: tip[when] };
}

/** A short grown-up line for a colors activity. */
export function colorTip(step: string, when: "start" | "end"): ReadTip {
  const tip = colorTips[step] ?? colorTips.name;
  return { id: `colors-${step}-${when}`, text: tip[when] };
}

/** A letter end-tip wins when we have one. Otherwise the lesson step supplies the line. */
export function readTip(step: LessonStep, when: "start" | "end", letter?: string): ReadTip {
  const key = letter?.trim().toLowerCase() ?? "";
  if (when === "end" && step === "letter" && letterTips[key]) {
    return { id: `letter-${key}-end`, text: letterTips[key] };
  }
  return { id: `${step}-${when}`, text: stepTips[step][when] };
}
