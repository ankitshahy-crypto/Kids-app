import { version } from "../../package.json";
import { MODULE_BUILD, MODULE_CODE, MODULE_COLORS, MODULE_NUMBERS, MODULE_SCIENCE, MODULE_TIME, MODULE_WORDS, PRODUCT_NAME, STORE_NAME, STORE_SUBTITLE, TAGLINE } from "../brand";
import { heldBack } from "../explore/flags";
import type { ExploreSection } from "../explore/sections";

/**
 * Marketing copy for About, for the grown-ups' Help page, and for docs/store-listing.md.
 * Edit it here.
 *
 * Why it is in pieces: a section can be held back from the app people install while it is
 * being rebuilt (HELD_BACK in src/explore/flags.ts). The home screen, the parent and teacher
 * pages and the printables all followed that list. This copy did not: it was whole paragraphs
 * that named every section whatever the build held, and counted them ("seven sections") by
 * hand. So a build with Time & Money, Build and Science held back still described all three.
 * (Found in review of #134.) Each sentence that is about one section now says which, and
 * goes when that section does; the lists and the count are worked out from what is left.
 */

/** Says whether a section is left out of this build. The app passes `heldBack`; tests pass their own. */
export type Hidden = (section: ExploreSection) => boolean;

/** A piece of copy. `of` is the Explore section it is about. Without `of` it is always shown. */
type Piece = { of?: ExploreSection; text: string };

function kept(pieces: readonly Piece[], hidden: Hidden): string[] {
  return pieces.filter((piece) => !piece.of || !hidden(piece.of)).map((piece) => piece.text);
}

/** "a", "a and b", "a, b, and c". */
export function series(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/**
 * The sections a family sees, in the order the home screen shows them: the reading lesson,
 * then a tile for each of these. Coding's tile is part of the games section.
 */
const SECTIONS: readonly Piece[] = [
  { text: MODULE_WORDS },
  { of: "math", text: MODULE_NUMBERS },
  { of: "colors", text: MODULE_COLORS },
  { of: "games", text: MODULE_CODE },
  { of: "time", text: MODULE_TIME },
  { of: "build", text: MODULE_BUILD },
  { of: "science", text: MODULE_SCIENCE },
];

const COUNT_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven"];

/** "seven sections", "four sections", "one section". */
function sectionCount(hidden: Hidden): string {
  const count = kept(SECTIONS, hidden).length;
  return `${COUNT_WORDS[count] ?? String(count)} ${count === 1 ? "section" : "sections"}`;
}

const TOPICS: readonly Piece[] = [
  { text: "letters" },
  { of: "math", text: "numbers" },
  { of: "colors", text: "colors" },
  { of: "games", text: "games and coding" },
  { of: "time", text: "time and money" },
  { of: "build", text: "building" },
  { of: "science", text: "science" },
];

/** What ages 5 to 7 get more of, beyond reading. */
const HARDER: readonly Piece[] = [
  { of: "time", text: "clock" },
  { of: "time", text: "money" },
  { of: "games", text: "coding" },
  { of: "build", text: "building" },
  { of: "science", text: "science" },
];

const PRACTICE: readonly Piece[] = [
  { text: "reading" },
  { of: "math", text: "math" },
  { of: "colors", text: "colors" },
  { of: "games", text: "games and coding" },
  { of: "time", text: "time and money" },
  { of: "build", text: "building" },
  { of: "science", text: "science" },
];

/** The kinds of sticker in the sticker book, each earned in one section. */
const STICKERS: readonly Piece[] = [
  { text: "letters" },
  { of: "math", text: "numbers" },
  { of: "colors", text: "colors" },
  { of: "time", text: "clocks" },
  { of: "time", text: "coins" },
  { of: "games", text: "baby animals" },
];

function rewardsBody(hidden: Hidden): string {
  return `Stars for effort unlock outfits for your child's animal, a sticker book of ${series(kept(STICKERS, hidden))}, and a growing nest. Every reward is earned by practicing, never bought.`;
}

/** One line a section for the top of About. */
const LEADS: readonly Piece[] = [
  { text: `${MODULE_WORDS}: kids learn letters and their sounds, then drag their finger across a word to hear it come together: “c… a… t… cat!”` },
  { of: "math", text: `${MODULE_NUMBERS}: count objects, hear and trace numbers, match and trace shapes, and add small groups.` },
  { of: "colors", text: `${MODULE_COLORS}: hear a color and tap it, mix two paints, and color their animal.` },
  { of: "games", text: `Games and ${MODULE_CODE}: hatch an egg, make their animal say hello, guide it home, and stack picture blocks that play.` },
  { of: "time", text: `${MODULE_TIME}: morning, afternoon, and night, a daily routine, a friendly clock, and a pretend shop with coins and bills.` },
  { of: "build", text: `${MODULE_BUILD}: bridges, towers, ramps, and simple machines.` },
  { of: "science", text: `${MODULE_SCIENCE}: a garden where a seed is planted and grown, animal homes, weather, the five senses, and sink or float.` },
];

/** How each section goes from first step to last, for "How LittleNest teaches". */
const TEACHES: readonly Piece[] = [
  {
    text: `${MODULE_WORDS} starts with letter sounds, then blending, then short words, then tiny stories. A word ladder sets the length, and a teacher can place the step. Phonics for ages 5 to 7 follows: two letters that make one sound, like sh and ee, the magic e in cake, and longer words and short sentences.`,
  },
  { of: "math", text: `${MODULE_NUMBERS} starts with counting, then numerals, then shapes, then adding small groups.` },
  { of: "colors", text: `${MODULE_COLORS} starts with color names, then mixing paints.` },
  { of: "games", text: "Games start with hatching, popping, feeding, rhymes, memory, and a spin." },
  {
    of: "games",
    text: `${MODULE_CODE} starts with hello world, then a path home, a picture pattern, pictures in order, and an if-then rule, then picture blocks that play, then a short program to read and build. Ages 5 to 7 add longer paths, a repeat, and a bug fix.`,
  },
  {
    of: "time",
    text: `${MODULE_TIME} starts with parts of the day, a routine, o'clock, and naming coins, then half hours, minutes, coin values, and making change. Pretend jars, a lemonade stand, and needs and wants come next. Cards wait for ages 5 to 7.`,
  },
  { of: "build", text: `${MODULE_BUILD} starts with a bridge, a tower, a ramp, and simple machines. Ages 5 to 7 play more rounds and balance a beam.` },
  {
    of: "science",
    text: `${MODULE_SCIENCE} starts with growing a plant, then animal homes, the parts of a bird, weather, the five senses, and sink or float. Ages 5 to 7 play more rounds of each.`,
  },
];

/** The Explore tiles, as the Help page names them. */
const EXPLORE_NAMES: readonly Piece[] = [
  { of: "math", text: MODULE_NUMBERS },
  { of: "colors", text: MODULE_COLORS },
  { of: "time", text: MODULE_TIME },
  { of: "build", text: MODULE_BUILD },
  { of: "science", text: MODULE_SCIENCE },
  { of: "games", text: MODULE_CODE },
];

/** What is in each section, for "How the daily lesson works" on the Help page. */
const HELP_LINES: readonly Piece[] = [
  { text: `${MODULE_WORDS} has four stops: Letters, Draw, Story, and Colors.` },
  { of: "math", text: `${MODULE_NUMBERS} has counting, numerals, tracing, shapes, comparing, and adding.` },
  { of: "colors", text: `${MODULE_COLORS} has color names, then mixing paints, and coloring their animal.` },
  {
    of: "time",
    text: `${MODULE_TIME} has the parts of the day, a routine, a clock, coins, a pretend shop, save jars, and a lemonade stand. Cards stay pretend.`,
  },
  { of: "build", text: `${MODULE_BUILD} is bridges, towers, ramps, and simple machines. Ages 5 to 7 also balance a beam.` },
  { of: "science", text: `${MODULE_SCIENCE} is growing a plant, life cycles, animal homes, the parts of a bird, weather, the senses, and sink or float.` },
  { of: "games", text: `${MODULE_CODE} is hello world, a path home, picture patterns, pictures in order, an if-then rule, and picture blocks that play.` },
];

const FEATURES = [
  {
    id: "hero",
    title: "Your child is the hero",
    body: "Short readers every week star the animal they chose. You read the small line, and your child reads the big one, built only from sounds they know.",
  },
  {
    id: "voice",
    title: "A warm voice, on the device",
    body: "One natural narrator reads every letter, word, and story. Nothing is fetched while your child plays.",
  },
  {
    id: "calm",
    title: "Calm by design",
    body: "No timers, no countdowns, nothing called wrong. Calm mode softens motion and sound, lessons run 2, 5, or 10 minutes, and an easier-to-read font, bigger spacing, and high contrast are one switch away.",
  },
  {
    id: "themes",
    title: "Their favorites, everywhere",
    body: "Pick dinosaurs, trucks, space, animals, bugs, the ocean, or castles, and the words, pictures, and stories lean that way.",
  },
  {
    id: "blend",
    title: "Drag to blend",
    body: "Slide under a word and hear each sound join into the whole word. The app says a word's sounds the first two times, then your child says them. Words grow on a ladder: sounds, then short words, then four-letter words.",
  },
  {
    id: "lesson",
    title: "Short daily lessons",
    body: "You pick 2, 5, or 10 minutes. A little every day builds the habit without much screen time.",
  },
  {
    id: "stars",
    title: "Stars for trying",
    body: "Effort, not perfection. No pressure, no scores.",
  },
  {
    id: "rewards",
    title: "Rewards that feel great",
    // aboutFor writes this one again for the build: a held-back section's stickers cannot be earned.
    body: rewardsBody(() => false),
  },
  {
    id: "math",
    title: MODULE_NUMBERS,
    body: "Count things that say their number when tapped, hear a number and find it, and trace numbers. Fit a block into a toy box and trace its shape, pick the plate with more, and put two groups together, up to 5. Each game is a few rounds, starting with the week's number.",
  },
  {
    id: "colors",
    title: MODULE_COLORS,
    body: "Hear a color and tap its paint to fill a balloon. Tap two paints, see them turn into a new color in the bowl, and hear it: red and yellow make orange. Then color their animal with a paint they made. Every paint has a pattern and its word, for a child who cannot tell it by color.",
  },
  {
    id: "games",
    title: "Games to play",
    body: "Fill in the missing letters of three words to hatch an egg, pop the balloons with the letter they hear, feed their animal the pictures that start with a letter, find the pictures that rhyme, flip memory cards, and spin a wheel of six small challenges. Each game plays a few rounds in a scene with their animal. Coding starts with hello world: one block, and their animal says hello. Thinking games guide their animal home, continue a picture pattern, put pictures in order, and try an if-then rule. Building stacks picture blocks that play as a dance or a song, with the program shown in words. Reading the code turns it round: a short program is read aloud, and they build it. Ages 5 to 7 use longer arrow paths, a repeat, a bug fix, a pond splash, and can save a program on this device. A grown-up can turn on a Python view of that same program. A miss just means try again.",
  },
  {
    id: "time",
    title: MODULE_TIME,
    body: "Morning, afternoon, and night, then the daily routine and o'clock. Ages 5 to 7 set half hours, quarter hours, and five-minute steps, match a digital time, and ask how long until. Name a penny, nickel, dime, quarter, and one- and five-dollar bills drawn for this app, sort coins, and buy things at a shop that says out loud what each one costs and asks for the money. Later they count mixed coins, pay dollars and cents, make change, and compare prices. Pretend chores fill Save, Spend, and Share jars, a lemonade stand earns coins, and a shop says let's save for it when the price is too big. Needs and wants are sorted. Pretend debit and credit cards come later, with no interest and no real payments.",
  },
  {
    id: "build",
    title: MODULE_BUILD,
    body: "Pick the plank that fits the river and their animal walks across. Stack a tower with the widest block at the bottom, find the ramp that rolls a ball to the flag, and choose a lever, a pulley, or wheels to move something heavy. Each try is shown: a short plank falls in, a low ramp stops short. Ages 5 to 7 also balance a beam.",
  },
  {
    id: "science",
    title: MODULE_SCIENCE,
    body: "Plant a seed, then give it water and sun when it asks, and watch it grow into a flower. Put an egg, a chick, and a hen in order. Find where a bee or a fish lives, tap the beak or the wing on a bird, pick what to take for rain or snow, and say which part of you hears a drum. Guess whether something sinks or floats, then drop it in the pond and see. Every question is said aloud, and every choice is a picture.",
  },
  {
    id: "classroom",
    title: "Made for classrooms too",
    body: "Teachers can follow a class and share goals with parents.",
  },
  {
    id: "grownups",
    title: "Grown-up tools",
    body: "They sit behind a simple check.",
  },
] as const;

export type AboutFeatureId = (typeof FEATURES)[number]["id"];

/** The features that are each about one Explore section, and go with it. */
const FEATURE_SECTION: Partial<Record<AboutFeatureId, ExploreSection>> = {
  math: "math",
  colors: "colors",
  games: "games",
  time: "time",
  build: "build",
  science: "science",
};

/**
 * The About copy for a build. With nothing held back this is the whole of it, word for word
 * as it was. `hidden` defaults to the app's own answer, so a screen can call `aboutFor()`.
 */
export function aboutFor(hidden: Hidden = heldBack) {
  const harder = kept(HARDER, hidden);
  return {
    screenTitle: `About ${PRODUCT_NAME}`,
    name: STORE_NAME,
    subtitle: STORE_SUBTITLE,
    promo:
      "Five happy minutes a day. No account, no ads, works offline, and nothing leaves your device. Your child's own animal is the hero of every story.",
    description: [
      `${PRODUCT_NAME} helps young children take their first steps into ${series(kept(TOPICS, hidden))}, one small step at a time.`,
      // "harder … work" needs something to be harder. With none of those sections, the reading stays.
      harder.length > 0
        ? `Made for ages 3 to 7, with a gentle start for ages 3 to 5 and harder ${series(harder)} work for ages 5 to 7 (longer words and sentences for ages 5 to 7).`
        : "Made for ages 3 to 7, with a gentle start for ages 3 to 5 and longer words and sentences for ages 5 to 7.",
      "Your child picks an animal friend who becomes the hero of every story.",
      "Each day brings a short, gentle lesson of 2, 5, or 10 minutes, whichever you choose.",
      ...kept(LEADS, hidden),
    ].join(" "),
    differentHeading: `What makes ${PRODUCT_NAME} different`,
    features: FEATURES.filter((feature) => {
      const section = FEATURE_SECTION[feature.id];
      return !section || !hidden(section);
    }).map((feature) => (feature.id === "rewards" ? { ...feature, body: rewardsBody(hidden) } : feature)),
    teachesHeading: `How ${PRODUCT_NAME} teaches`,
    teaches: [`${PRODUCT_NAME} has ${sectionCount(hidden)}.`, ...kept(TEACHES, hidden)].join(" "),
    safetyHeading: "Safe and private by design",
    safety:
      "No ads, no tracking, and one honest unlock: pay once, no subscription. First name or initial only. Progress stays on your device. No health or personal data collected. Built with children's privacy laws (COPPA) in mind.",
    affordableHeading: "Affordable for every family",
    affordable: `Learning to read shouldn't be expensive. The first two weeks of reading and the first activity of each Explore area are free for good. One payment opens everything, for every child in the family, with no subscription and no add-ons.`,
    disclaimer: `${PRODUCT_NAME} is ${series(kept(PRACTICE, hidden))} practice for young children. It is play and practice, not a medical product.`,
    maker: TAGLINE,
    /** Matches package.json. The About screen shows this number. */
    version,
  };
}

/**
 * The Explore subjects whose step-by-step path About lists under "How it teaches", in order.
 * (Reading's path is always there. The games section has no path of weeks to list.)
 */
const PATH_SUBJECTS = ["math", "colors", "time", "build", "science"] as const satisfies readonly ExploreSection[];

export type AboutSubject = (typeof PATH_SUBJECTS)[number];

export function aboutSubjects(hidden: Hidden = heldBack): AboutSubject[] {
  return PATH_SUBJECTS.filter((subject) => !hidden(subject));
}

/** The whole copy, with every section in it: what the store listing says. */
export const aboutContent = aboutFor(() => false);

/**
 * "How the daily lesson works", on the grown-ups' Help page: what Explore adds, and what is in
 * each section. It was a paragraph typed into the page, which named every section whatever
 * the build held, and had drifted from the app (it still described a science experiment that
 * was taken out when Science was rebuilt, and did not mention Coding's own tile).
 */
export function dailyLessonHelp(hidden: Hidden = heldBack): string {
  const explore = kept(EXPLORE_NAMES, hidden);
  return [
    "Each day starts with the reading lesson, Pilot focus.",
    ...(explore.length > 0 ? [`Explore adds ${series(explore)}.`] : []),
    ...kept(HELP_LINES, hidden),
    "A star is for trying.",
    explore.length > 0 ? "The daily goal counts time on all of them." : "The daily goal counts the time spent on it.",
    "On Fridays, the Friday Challenge brings back that week's sounds, with a few earlier ones, as a little game.",
  ].join(" ");
}
