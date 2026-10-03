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
  // Feed shows pictures of all kinds now (a moon, a mat, a map), so the tip says "pictures" and
  // the question at the end asks about things at home, not only food.
  feed: {
    start: "Drag or tap the pictures that start with the letter. Their animal is happy either way.",
    end: "Ask: what at home starts with that letter?",
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
  // The coding tips are one short line each. The Build It tip was eleven lines on a phone and pushed the
  // game's Play button off the screen.
  bird: {
    start: "They plan a path home with arrows. A wrong path just starts again.",
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

const engineerTips: Record<string, { start: string; end: string }> = {
  bridge: {
    start: "They choose blocks and planks so their animal can cross. A long plank sags, then they try again.",
    end: "Ask: where did the bridge need a block?",
  },
  tower: {
    start: "A wide base stays up. A narrow base topples softly, then they stack again.",
    end: "Ask: which shape should be on the bottom?",
  },
  ramp: {
    start: "A higher ramp rolls the ball farther. They can tap a height or drag the ramp.",
    end: "Ask: what happened when the ramp got higher?",
  },
  machines: {
    start: "A lever, a pulley, and a wheel each lift or move something. The other choice just means try again.",
    end: "Ask: which machine lifted the basket?",
  },
  balance: {
    start: "Ages 5 to 7 put weights on the beam. If it tips, they hear what went wrong and try again.",
    end: "Ask: which side was heavier?",
  },
};

const scienceTips: Record<string, { start: string; end: string }> = {
  life: {
    start: "They put the pictures in order: seed, sprout, plant, and the other life cycles. A skip just means try again.",
    end: "Ask: what came after the seed?",
  },
  homes: {
    start: "They match each animal to a home, then to a food. The pictures are the words.",
    end: "Ask: where does the bird live?",
  },
  body: {
    start: "A voice asks for a wing, a beak, or a tail. They tap the matching picture.",
    end: "Ask: which part was the beak?",
  },
  change: {
    start: "Ice melts and water turns to steam on the screen. The fizz says to do it with a grown-up and not to taste it. Then they sort solid, liquid, and gas.",
    end: "Ask: what did the ice become?",
  },
  weather: {
    start: "They dress their animal for sun, rain, or snow, then pick the season.",
    end: "Ask: what did the animal wear in the snow?",
  },
  senses: {
    start: "They listen, match a texture, and tell day from night.",
    end: "Ask: which picture was the night?",
  },
  float: {
    start: "They guess sink or float, then the object drops. A miss is try again, not a score.",
    end: "Ask: which ones floated?",
  },
  predict: {
    start: "Ages 5 to 7 say what they think will happen, then press Test. A wrong guess does not show the result.",
    end: "Ask: what happened when they tested it?",
  },
  chain: {
    start: "Ages 5 to 7 line up grass, then the rabbit, then the fox.",
    end: "Ask: who eats the grass?",
  },
  water: {
    start: "Ages 5 to 7 put the puddle, the vapor, the cloud, and the rain in order.",
    end: "Ask: where did the rain come from?",
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
    start: "Each coin says its name and what it is worth. The pictures are our own drawings.",
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
