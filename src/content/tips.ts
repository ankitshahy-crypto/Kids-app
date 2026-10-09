import type { LessonStep } from "../data/profiles";
import { LETTER_WORDS } from "../data/letterWords";

/**
 * The prompt after a letter card, for the grown-up beside the child. It names
 * the letter's picture word from the one list (letterWords.ts), so the tip
 * can never ask about a different word from the card.
 *
 * The old tips were typed by hand with the sound between slashes ("start with
 * /m/"). Most parents do not read that notation, and the list had drifted
 * from the cards (it asked about igloo while the card showed a pig).
 */
function letterTip(letter: string): string | null {
  const entry = LETTER_WORDS[letter];
  if (!entry) return null;
  // x ends its picture word (fox); every other letter starts its word.
  return entry.word.toLowerCase().startsWith(letter)
    ? `Ask: what else starts like ${entry.word}?`
    : `Ask: can you hear the last sound in ${entry.word}?`;
}

const stepTips: Record<LessonStep, { start: string; end: string }> = {
  letter: {
    start: "Sit close. Your child slides under each letter to hear its sound, then the whole word.",
    end: "Ask your child to read the word once more, without sliding.",
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

// Two lines at most on a phone. The game says the rest to the child out loud.
const mathTips: Record<string, { start: string; end: string }> = {
  count: {
    start: "Each one says its number when they tap it. Then they tap how many there are.",
    end: "Ask: can you find that many in the room?",
  },
  know: {
    start: "The voice says a number and they find it. The dots show how many it is.",
    end: "Ask: what number comes next?",
  },
  trace: {
    start: "Trace the dots in order. Big fingers are welcome.",
    end: "Ask them to draw that number in the air.",
  },
  shape: {
    start: "They find the block that fits the hole, three times. Then they trace the shape.",
    end: "Ask: where else do you see this shape?",
  },
  more: {
    start: "Two plates. They tap the one with more. Ages 5 to 7 are asked for fewer too.",
    end: "Ask: which of us has more on our plate?",
  },
  add: {
    start: "Two groups. Tapping each one counts it aloud. Then they tap how many altogether.",
    end: "Ask: what if we added one more?",
  },
};

/** A short grown-up line for a numbers activity. */
export function mathTip(step: string, when: "start" | "end"): ReadTip {
  const tip = mathTips[step] ?? mathTips.count;
  return { id: `math-${step}-${when}`, text: tip[when] };
}

// Two lines at most on a phone. The game says the rest to the child out loud.
const colorTips: Record<string, { start: string; end: string }> = {
  name: {
    start: "The voice says a color and they tap that paint. Each paint has a pattern too.",
    end: "Ask: what else in the room is this color?",
  },
  mix: {
    start: "They tap two paints and see what the two make. Each new color goes on the shelf.",
    end: "Ask: which two made green? Try it with real paint.",
  },
  paint: {
    start: "They tap a paint to color their animal, then the check to keep it.",
    end: "Ask: which color did their animal like?",
  },
};

const gameTips: Record<string, { start: string; end: string }> = {
  hatch: {
    start: "Three words, each spoken slowly. A wrong letter wiggles; after two tries the right one glows.",
    end: "Ask: what sound did we hear at the start?",
  },
  pop: {
    start: "They pop the balloons with the letter they hear. The others stay up and say their sound.",
    end: "Ask: what else starts with that sound?",
  },
  // Feed shows pictures of all kinds now (a moon, a mat, a map), so the tip says "pictures" and
  // the question at the end asks about things at home, not only food.
  feed: {
    start: "They tap the pictures that start with the letter. Each picture says its name when tapped.",
    end: "Ask: what at home starts with that letter?",
  },
  rhyme: {
    start: "They tap one picture, then the one it rhymes with. The voice says whether the two rhyme.",
    end: "Ask: can you think of another word that rhymes?",
  },
  memory: {
    start: "Flip two cards. First a big letter and its little letter, then a number and its dots.",
    end: "Ask: which pair did you find first?",
  },
  spin: {
    start: "They flick the wheel or tap it. Each slice is something they know. A miss never costs the star.",
    end: "Ask: which slice do you want to spin next?",
  },
  // The coding tips are one short line each. The Build It tip was eleven lines on a phone and pushed the
  // game's Play button off the screen.
  bird: {
    // The walk is the lesson: a wrong plan is walked to where it goes wrong, and mended from there.
    start: "They plan a path home with arrows and watch the animal walk it. A wrong or missing arrow gets fixed and tried again.",
    end: "Ask: which way did the animal go to get home?",
  },
  pattern: {
    start: "The pictures repeat in a pattern. They pick what comes next.",
    end: "Ask: what would come next if the row were longer?",
  },
  morning: {
    start: "They put three pictures in the order they happen. Ask why each comes before the next.",
    end: "Ask: what do we do first when we get dressed?",
  },
  garden: {
    start: "If this, then that: they pick what each picture calls for.",
    end: "Ask: if it rains tomorrow, what will we take?",
  },
  build: {
    start: "They line up steps and press Play. The animal does each step in order.",
    end: "Ask: what would happen if we swapped two steps?",
  },
  code: {
    // Two lines on a phone, like the others: a third pushes Play off the screen.
    start: "They hear a short program and build it, one block for each line.",
    end: "Ask: what did the second line tell the animal to do?",
  },
};

// Two lines at most on a phone. The game says the rest to the child out loud.
const engineerTips: Record<string, { start: string; end: string }> = {
  bridge: {
    start: "They pick the plank that fits the river. A short one falls in, then they try another.",
    end: "Ask: which plank was too short? Try it with blocks and a ruler.",
  },
  tower: {
    start: "The widest block goes on the bottom, then the next widest. A wrong one wobbles off.",
    end: "Ask: why does the big block go at the bottom? Build one with cups.",
  },
  ramp: {
    start: "A higher ramp rolls the ball farther. They try ramps until it reaches the flag.",
    end: "Ask: what happened when the ramp got higher?",
  },
  machines: {
    start: "Something is too heavy. They pick the lever, the pulley, or the wheels to move it.",
    end: "Ask: where have you seen wheels today?",
  },
  balance: {
    start: "Blocks sit on one side of the beam. They pick the pile that makes it level.",
    end: "Ask: which side was heavier? Try it on a seesaw.",
  },
};

// Two lines at most on a phone. The game says the rest to the child out loud.
const scienceTips: Record<string, { start: string; end: string }> = {
  life: {
    start: "They plant a seed and give it water and sun when it asks. Then a life goes in order.",
    end: "Ask: what did the seed need to grow? Plant a bean in a cup and watch.",
  },
  homes: {
    start: "The voice asks where an animal lives. They tap its home.",
    end: "Ask: where does a bird live? Look for a nest outside.",
  },
  body: {
    start: "The voice asks for a part of the bird. They tap it on the bird.",
    end: "Ask: where is your nose? Does a bird have one?",
  },
  weather: {
    start: "The weather is on the screen. They tap what to take for it.",
    end: "Ask: what is the weather today? What should we wear?",
  },
  senses: {
    start: "The voice asks which part of them sees, hears, smells, tastes, or touches.",
    end: "Ask: what can you hear right now?",
  },
  float: {
    start: "They guess, then the thing drops in the pond. A wrong guess is still finding out.",
    end: "Try it in the sink: a spoon, a cork, a leaf. Guess first.",
  },
};

/** A short grown-up line for LittleNest Science. */
export function scienceTip(activity: string, when: "start" | "end"): ReadTip {
  const tip = scienceTips[activity] ?? scienceTips.life;
  return { id: `science-${activity}-${when}`, text: tip[when] };
}

/** A short grown-up line for LittleNest Build. */
export function engineerTip(activity: string, when: "start" | "end"): ReadTip {
  const tip = engineerTips[activity] ?? engineerTips.bridge;
  return { id: `engineer-${activity}-${when}`, text: tip[when] };
}

/** A short grown-up line for a game. */
export function gameTip(game: string, when: "start" | "end"): ReadTip {
  const tip = gameTips[game] ?? gameTips.hatch;
  return { id: `game-${game}-${when}`, text: tip[when] };
}

// The start tips are two lines at most on a phone. The game says the rest to the child out loud.
const timeTips: Record<string, { start: string; end: string }> = {
  day: {
    start: "The voice says what is happening. They tap the sky it goes with.",
    end: "Ask: what do we do at that time of day?",
  },
  routine: {
    start: "They tap the parts of a day in order. A wrong tap just wiggles.",
    end: "Ask: what do we do after school?",
  },
  clock: {
    start: "First the two hands and the minute dots. Then a tap on a number sets a time.",
    end: "Ask: which hand tells the hour? Find the dots on a clock at home.",
  },
  coins: {
    start: "Each coin says its name and what it is worth. The coins are pretend ones, painted for the app.",
    end: "Ask: which coin is the biggest?",
  },
  shop: {
    start: "The voice says what the thing costs and asks for the money. A wrong coin wiggles.",
    end: "Ask: what else could we buy with that coin?",
  },
  jars: {
    start: "A job earns a coin. Each coin goes in a jar: save, spend, or share.",
    end: "At home, talk about saving for something they want. A jar on the counter works too.",
  },
  lemonade: {
    start: "A customer asks for some cups. They serve that many and earn a coin a cup.",
    end: "Ask: what job at home could earn a coin in a jar?",
  },
  choose: {
    start: "They buy what the coin covers. A bigger price waits.",
    end: "If something costs too much, say let's save for it. No one is in trouble.",
  },
  needs: {
    start: "Food and a bed are needs. A kite is a want. Both can be good.",
    end: "Ask: is a warm coat a need or a want?",
  },
  cards: {
    start: "A debit card uses saved money. A credit card borrows, then is paid back.",
    end: "Ask: which card made the save jar go down right away?",
  },
};

/** A short grown-up line for a time and money activity. */
export function timeTip(step: string, when: "start" | "end"): ReadTip {
  const tip = timeTips[step] ?? timeTips.day;
  return { id: `time-${step}-${when}`, text: tip[when] };
}

/** A short grown-up line for a colors activity. */
export function colorTip(step: string, when: "start" | "end"): ReadTip {
  const tip = colorTips[step] ?? colorTips.name;
  return { id: `colors-${step}-${when}`, text: tip[when] };
}

/**
 * A letter's own tip after its letter card. After a word, and everywhere
 * else, the lesson step supplies the line. Pass `letter` only for a letter
 * card: the tip used to be keyed to the first letter of whatever card was
 * finished, so reading "sat" brought up the tip for S.
 */
export function readTip(step: LessonStep, when: "start" | "end", letter?: string): ReadTip {
  const key = letter?.trim().toLowerCase() ?? "";
  const tip = when === "end" && step === "letter" ? letterTip(key) : null;
  if (tip) return { id: `letter-${key}-end`, text: tip };
  return { id: `${step}-${when}`, text: stepTips[step][when] };
}
