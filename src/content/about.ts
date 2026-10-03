import { version } from "../../package.json";
import { MODULE_BUILD, MODULE_CODE, MODULE_COLORS, MODULE_NUMBERS, MODULE_SCIENCE, MODULE_TIME, MODULE_WORDS, PRODUCT_NAME, STORE_NAME, STORE_SUBTITLE, TAGLINE } from "../brand";

/** Marketing copy for About and for docs/store-listing.md. Edit it here. */
export const aboutContent = {
  screenTitle: `About ${PRODUCT_NAME}`,
  name: STORE_NAME,
  subtitle: STORE_SUBTITLE,
  promo:
    "Five happy minutes a day. No account, no ads, works offline, and nothing leaves your device. Your child's own animal is the hero of every story.",
  description:
    `${PRODUCT_NAME} helps young children take their first steps into letters, numbers, colors, games and coding, time and money, building, and science, one small step at a time. Made for ages 3 to 7, with a gentle start for ages 3 to 5 and harder clock, money, coding, building, and science work for ages 5 to 7 (longer words and sentences for ages 5 to 7). Your child picks an animal friend who becomes the hero of every story. Each day brings a short, gentle lesson of 2, 5, or 10 minutes, whichever you choose. ${MODULE_WORDS}: kids learn letters and their sounds, then drag their finger across a word to hear it come together: “c… a… t… cat!” ${MODULE_NUMBERS}: count objects, hear and trace numbers, match and trace shapes, and add small groups. ${MODULE_COLORS}: hear a color and tap it, mix two paints, and color their animal. Games and ${MODULE_CODE}: hatch an egg, make their animal say hello, guide it home, and stack picture blocks that play. ${MODULE_TIME}: morning, afternoon, and night, a daily routine, a friendly clock, and a pretend shop with coins and bills. ${MODULE_BUILD}: bridges, towers, ramps, and simple machines. ${MODULE_SCIENCE}: life cycles, homes, weather, senses, and sink or float. A pretend fizz stays on the screen and says to do it with a grown-up.`,
  differentHeading: `What makes ${PRODUCT_NAME} different`,
  features: [
    {
      id: "hero",
      title: "Your child is the hero",
      body: "A short reader every week stars the animal they chose, read aloud page by page, with words they can sound out themselves and a line for you to read along.",
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
      body: "Slide across a word and hear each sound join into the whole word. Words grow on a ladder: one letter, then two, then short words, then four-letter words.",
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
      body: "Stars for effort unlock outfits for your child's animal, a sticker book of letters, numbers, colors, clocks, coins, and baby animals, and a growing nest. Every reward is earned by practicing, never bought.",
    },
    {
      id: "math",
      title: MODULE_NUMBERS,
      body: "Count to 10, hear and trace numbers, match and trace shapes, compare groups, and add with pictures up to 5.",
    },
    {
      id: "colors",
      title: MODULE_COLORS,
      body: "Hear a color and tap it, mix paints, and color their animal with colors they made. Every swatch shows the color word.",
    },
    {
      id: "games",
      title: "Games to play",
      body: "Hatch an egg, pop letter balloons, feed their animal, match rhymes, flip memory cards, and spin a pastel wheel. Coding starts with hello world: one block, and their animal says hello. Thinking games guide their animal home, continue a picture pattern, put pictures in order, and try an if-then rule. Building stacks picture blocks that play as a dance or a song, with the program shown in words. Reading the code turns it round: a short program is read aloud, and they build it. Ages 5 to 7 use longer arrow paths, a repeat, a bug fix, a pond splash, and can save a program on this device. A grown-up can turn on a Python view of that same program. A miss just means try again.",
    },
    {
      id: "time",
      title: MODULE_TIME,
      body: "Morning, afternoon, and night, then the daily routine and o'clock. Ages 5 to 7 set half hours, quarter hours, and five-minute steps, match a digital time, and ask how long until. Name a penny, nickel, dime, quarter, and one- and five-dollar bills drawn for this app, sort coins, and let their animal buy a snack. Later they count mixed coins, pay dollars and cents, make change, and compare prices. Pretend chores fill Save, Spend, and Share jars, a lemonade stand earns coins, and a shop says let's save for it when the price is too big. Needs and wants are sorted. Pretend debit and credit cards come later, with no interest and no real payments.",
    },
    {
      id: "build",
      title: MODULE_BUILD,
      body: "Build a bridge, stack a tower, roll a ball down a ramp, and try a lever, a pulley, and a wheel. A wobbly bridge or a narrow tower just means try again. Ages 5 to 7 balance weights, use fewer pieces, and hear what went wrong.",
    },
    {
      id: "science",
      title: MODULE_SCIENCE,
      body: "Put a seed, a sprout, and a plant in order, match animals to homes and foods, and find a wing or a beak. On the screen, ice melts, water turns to steam, and baking soda meets vinegar. Sort a solid, a liquid, and a gas. Dress their animal for sun, rain, or snow, and notice a sound, a texture, and day or night. Guess whether something sinks or floats. Ages 5 to 7 say what they think will happen, then test it, line up a food chain, and follow the water cycle. A real fizz is with a grown-up, and nothing is for tasting.",
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
  ],
  teachesHeading: `How ${PRODUCT_NAME} teaches`,
  teaches:
    `${PRODUCT_NAME} has seven sections. ${MODULE_WORDS} starts with letter sounds, then blending, then short words, then tiny stories. A word ladder sets the length, and a teacher can place the step. Phonics for ages 5 to 7 follows: two letters that make one sound, like sh and ee, the magic e in cake, and longer words and short sentences. ${MODULE_NUMBERS} starts with counting, then numerals, then shapes, then adding small groups. ${MODULE_COLORS} starts with color names, then mixing paints. Games start with hatching, popping, feeding, rhymes, memory, and a spin. ${MODULE_CODE} starts with hello world, then a path home, a picture pattern, pictures in order, and an if-then rule, then picture blocks that play, then a short program to read and build. Ages 5 to 7 add longer paths, a repeat, and a bug fix. ${MODULE_TIME} starts with parts of the day, a routine, o'clock, and naming coins, then half hours, minutes, coin values, and making change. Pretend jars, a lemonade stand, and needs and wants come next. Cards wait for ages 5 to 7. ${MODULE_BUILD} starts with a bridge, a tower, a ramp, and simple machines. Ages 5 to 7 balance weights and test a design again. ${MODULE_SCIENCE} starts with life cycles, homes, body parts, on-screen changes, weather, senses, and sink or float. Ages 5 to 7 predict a result, then test it, and follow a food chain and the water cycle.`,
  safetyHeading: "Safe and private by design",
  safety:
    "No ads, no tracking, and one honest unlock: pay once, no subscription. First name or initial only. Progress stays on your device. No health or personal data collected. Built with children's privacy laws (COPPA) in mind.",
  affordableHeading: "Affordable for every family",
  affordable:
    `Learning to read shouldn't be expensive. The first two weeks of reading and the first activity of each Explore area are free for good. One payment opens everything, for every child in the family, with no subscription and no add-ons.`,
  disclaimer: `${PRODUCT_NAME} is reading, math, colors, games and coding, time and money, building, and science practice for young children. It is play and practice, not a medical product.`,
  maker: TAGLINE,
  /** Matches package.json. The About screen shows this number. */
  version,
} as const;

export type AboutFeatureId = (typeof aboutContent.features)[number]["id"];
