import { version } from "../../package.json";
import { MODULE_BUILD, MODULE_COLORS, MODULE_NUMBERS, MODULE_TIME, MODULE_WORDS, PRODUCT_NAME, STORE_NAME, STORE_SUBTITLE, TAGLINE } from "../brand";

/** Marketing copy for About and for docs/store-listing.md. Edit it here. */
export const aboutContent = {
  screenTitle: `About ${PRODUCT_NAME}`,
  name: STORE_NAME,
  subtitle: STORE_SUBTITLE,
  promo:
    "Five happy minutes a day. Your child's own animal is the hero of every story, with no ads, no tricks, and no surprise charges.",
  description:
    `${PRODUCT_NAME} helps young children take their first steps into letters, numbers, colors, time and money, and building, one small step at a time. Made for ages 3 to 5, with harder clock, money, and building work for ages 5 to 7 (phonics for ages 5 to 7 coming soon). Your child picks an animal friend who becomes the hero of every story. Each day brings a short, gentle lesson of 5 to 10 minutes. ${MODULE_WORDS}: kids learn letters and their sounds, then drag their finger across a word to hear it come together: “c… a… t… cat!” ${MODULE_NUMBERS}: count objects, hear and trace numbers, match and trace shapes, and add small groups. ${MODULE_COLORS}: hear a color and tap it, mix two paints, and color their animal. ${MODULE_TIME}: morning, afternoon, and night, a daily routine, a friendly clock, and a pretend shop with coins and bills. ${MODULE_BUILD}: bridges, towers, ramps, simple machines, and sink or float.`,
  differentHeading: `What makes ${PRODUCT_NAME} different`,
  features: [
    {
      id: "hero",
      title: "Your child is the hero",
      body: "Stories star the animal they chose.",
    },
    {
      id: "voice",
      title: "Real, warm voices",
      body: "Natural voices, not a robot.",
    },
    {
      id: "blend",
      title: "Drag to blend",
      body: "Slide across a word and hear each sound join into the whole word. Words grow on a ladder: one letter, then two, then short words, then four-letter words.",
    },
    {
      id: "lesson",
      title: "Short daily lessons",
      body: "5–10 minutes builds a habit without too much screen time.",
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
      id: "time",
      title: MODULE_TIME,
      body: "Morning, afternoon, and night, then the daily routine and o'clock. Ages 5 to 7 set half hours, quarter hours, and five-minute steps, match a digital time, and ask how long until. Name a penny, nickel, dime, quarter, and one- and five-dollar bills drawn for this app, sort coins, and let their animal buy a snack. Later they count mixed coins, pay dollars and cents, make change, and compare prices. Pretend chores fill Save, Spend, and Share jars, a lemonade stand earns coins, and a shop says let's save for it when the price is too big. Needs and wants are sorted. Pretend debit and credit cards come later, with no interest and no real payments.",
    },
    {
      id: "build",
      title: MODULE_BUILD,
      body: "Build a bridge, stack a tower, roll a ball down a ramp, and try a lever, a pulley, and a wheel. Guess whether something sinks or floats. A wobbly bridge or a narrow tower just means try again. Ages 5 to 7 balance weights, use fewer pieces, and hear what went wrong.",
    },
    {
      id: "games",
      title: "Games to play",
      body: "Hatch an egg, pop letter balloons, feed their animal, match rhymes, flip memory cards, and spin a pastel wheel. Think and code games guide their animal home, continue a picture pattern, put morning pictures in order, and try an if-then garden. Build It stacks picture blocks that play: the animal moves, a song plays, weather grows a flower, and a robot makes a sandwich. Ages 5 to 7 use longer arrow paths, a repeat, a bug fix, a pond splash, a short line on each block, and can save a program on this device. A grown-up can turn on a Python view of that same program. A miss just means try again.",
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
    `${PRODUCT_NAME} has five modules. ${MODULE_WORDS} starts with letter sounds, then blending, then short words, then tiny stories. A word ladder sets the length, and a teacher can place the step. Longer words and short sentences wait for phonics at ages 5 to 7. ${MODULE_NUMBERS} starts with counting, then numerals, then shapes, then adding small groups. ${MODULE_COLORS} starts with color names, then mixing paints. ${MODULE_TIME} starts with parts of the day, a routine, o'clock, and naming coins, then half hours, minutes, coin values, and making change. Pretend jars, a lemonade stand, and needs and wants come next. Cards wait for ages 5 to 7. ${MODULE_BUILD} starts with a bridge, a tower, a ramp, simple machines, and sink or float. Ages 5 to 7 balance weights and test a design again.`,
  safetyHeading: "Safe and private by design",
  safety:
    "No ads, no tracking, no in-app purchase tricks. First name or initial only. Progress stays on your device. No health or personal data collected. Built with children's privacy laws (COPPA) in mind.",
  affordableHeading: "Affordable for every family",
  affordable:
    `Learning to read shouldn't be expensive. ${PRODUCT_NAME} is priced so every family can use it, and through partner schools it's included for families at little or no extra cost. No creeping subscriptions or endless add-ons.`,
  disclaimer: `${PRODUCT_NAME} is letters, numbers, colors, and time and money practice for young children. It is not a therapy or diagnostic tool.`,
  maker: TAGLINE,
  /** Matches package.json. The About screen shows this number. */
  version,
} as const;

export type AboutFeatureId = (typeof aboutContent.features)[number]["id"];
