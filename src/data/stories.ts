import type { IllustrationName } from "../illustrations";
import type { ThemeId } from "./themes";

/**
 * Decodable readers. Each week's story uses only the letters taught so far
 * for the words a child sounds out; a small set of glue words (the, is, and)
 * and a few picture words are read by the app. `{hero}` is the child's
 * animal by name ("Fox"), `{hero-kind}` the animal in lowercase ("fox").
 * Checked by src/data/stories.test.ts, so a line can never ask a child to
 * blend a letter they have not met.
 */
export type StorySetting = "meadow" | "hill" | "room" | "night" | "beach" | "road" | "pond" | "farm" | "sky" | "castle";

export type StoryPage = {
  text: string;
  setting: StorySetting;
  props: IllustrationName[];
  /** A line for the grown-up reading along. Shown only with read-together tips on. */
  parent?: string;
};

export type Story = {
  id: string;
  title: string;
  /** The first lesson week (1-based) whose letters make every child word decodable. */
  week: number;
  theme?: ThemeId;
  pages: StoryPage[];
  before: string;
  after: string;
};

export const STORIES: Story[] = [
  {
    id: "w01-i-am",
    title: "I Am {hero}",
    week: 1,
    pages: [
      { text: "Hi! I am {hero}.", setting: "meadow", props: ["sun"], parent: "Point to the word 'am'. Say the two sounds slowly: mmm, aaa. Then say it fast: am." },
      { text: "I am a {hero-kind}.", setting: "meadow", props: [] },
      { text: "I am up! Look at me.", setting: "hill", props: ["balloon"] },
      { text: "Am I big? Yes, I am.", setting: "hill", props: [], parent: "Let your child tap 'am' and hear the sounds blend." },
      { text: "I am {hero}. This is my home.", setting: "room", props: ["lamp"] },
    ],
    before: "Look at the cover. Ask: who is this? It is your child's own animal.",
    after: "Ask: what did {hero} say? Can you say 'I am' with your name?",
  },
  {
    id: "w02-the-mat",
    title: "{hero} and the Mat",
    week: 2,
    pages: [
      { text: "{hero} has a mat.", setting: "room", props: ["mat"], parent: "Sound out 'mat' together: mmm, aaa, t. Mat." },
      { text: "{hero} sat on the mat.", setting: "room", props: ["mat"] },
      { text: "Sam sat on the mat too.", setting: "room", props: ["mat", "duck"], parent: "Sam is a new friend. Point to the s in Sam." },
      { text: "Sam and {hero} sat and sat.", setting: "room", props: ["mat", "duck"] },
      { text: "Look at Sam! Sam sat at the mat.", setting: "room", props: ["mat", "duck"], parent: "Ask: what is the same in 'sat' and 'mat'?" },
    ],
    before: "Ask: what do you think {hero} will do with the mat?",
    after: "Ask: who sat on the mat? Can you find 'sat' on the page?",
  },
  {
    id: "w03-tap-tap",
    title: "Tap, Tap, Tip",
    week: 3,
    pages: [
      { text: "{hero} sat. Tap, tap, tap!", setting: "room", props: ["drum"], parent: "Tap the table three times as you read 'tap, tap, tap'." },
      { text: "Pip sat. Tip, tip, tip!", setting: "room", props: ["drum", "pig"] },
      { text: "Tap it, Pip! Tap, tap, tip!", setting: "room", props: ["drum", "pig"], parent: "Sound out 'tip': t, i, p." },
      { text: "Pip and {hero} sit and tap.", setting: "room", props: ["drum"] },
      { text: "Tap, tap, tip, tip. It is a pit-a-pat!", setting: "room", props: ["drum"] },
    ],
    before: "Ask: what sound does a drum make? Get ready to tap along.",
    after: "Ask: can you tap a pattern? Tap, tap, tip.",
  },
  {
    id: "w04-sand",
    title: "Sand and a Pan",
    week: 4,
    pages: [
      { text: "{hero} is at the sand.", setting: "beach", props: ["sand"], parent: "Point to 'sand'. Sound it out: s, a, n, d." },
      { text: "Dan has a pan. Dip it in!", setting: "beach", props: ["pan"] },
      { text: "Pat, pat, pat. Sand in a pan.", setting: "beach", props: ["pan", "sand"], parent: "Pat your hands together on 'pat, pat, pat'." },
      { text: "{hero} and Dan stand it up.", setting: "beach", props: ["sand"] },
      { text: "Tada! A sand man. Nap, sand man.", setting: "beach", props: ["sand"], parent: "Ask: what did they make? Find 'nap' on the page." },
    ],
    before: "Ask: what can you make with sand?",
    after: "Ask: what did {hero} and Dan make?",
  },
  {
    id: "w05-the-cot",
    title: "A Nap on the Cot",
    week: 5,
    pages: [
      { text: "{hero} is on the cot.", setting: "room", props: ["bed"], parent: "Sound out 'cot': c, o, t." },
      { text: "Tom the cat is on top.", setting: "room", props: ["cat", "bed"] },
      { text: "Nod, nod. Tom can nap.", setting: "room", props: ["cat"], parent: "Ask: what does 'nod' mean? Nod your head." },
      { text: "Stop, Tom! {hero} can not nap.", setting: "room", props: ["cat", "bed"] },
      { text: "Tom is on the mat. Now {hero} can nap.", setting: "night", props: ["mat", "cat"] },
    ],
    before: "Ask: where do you nap? What is a cot?",
    after: "Ask: why could {hero} not nap at first?",
  },
  {
    id: "w06-bus",
    title: "The Bus and the Cub",
    week: 6,
    pages: [
      { text: "{hero} is on the bus.", setting: "road", props: ["bus"], parent: "Sound out 'bus': b, u, s." },
      { text: "A cub is on the bus. A pup is on the bus.", setting: "road", props: ["bus", "cub"] },
      { text: "Bump! The bus is on a bump.", setting: "road", props: ["bus"], parent: "Say 'bump' and bounce on the b." },
      { text: "The cub is up. The pup is up. {hero} is up!", setting: "road", props: ["cub", "dog"] },
      { text: "Sit, cub. Sit, pup. Sit, {hero}. Bus, do not bump!", setting: "road", props: ["bus"] },
    ],
    before: "Ask: have you been on a bus? Who might ride it today?",
    after: "Ask: what made everyone go up?",
  },
  {
    id: "w07-the-hat",
    title: "The Big Hat",
    week: 7,
    pages: [
      { text: "{hero} has a big hat.", setting: "meadow", props: ["hat"], parent: "Sound out 'hat': h, a, t. Feel the puff of air on h." },
      { text: "A bug got in the hat.", setting: "meadow", props: ["hat", "bug"] },
      { text: "Hop, bug, hop! Hum, hum, hum.", setting: "meadow", props: ["bug"], parent: "Hum together on 'hum, hum, hum'." },
      { text: "The bug dug in the hat. Dig, dig, dig.", setting: "meadow", props: ["hat", "dig"] },
      { text: "{hero} got the bug out. Hug, hug! Go, bug.", setting: "meadow", props: ["bug"] },
    ],
    before: "Ask: what is in the hat? Look at the picture for a hint.",
    after: "Ask: what did the bug do in the hat? Dig!",
  },
  {
    id: "w08-the-nest",
    title: "The Nest in the Tent",
    week: 8,
    pages: [
      { text: "{hero} set up a red tent.", setting: "meadow", props: ["tent"], parent: "Sound out 'tent': t, e, n, t." },
      { text: "A hen got in the tent.", setting: "meadow", props: ["tent", "hen"] },
      { text: "The hen has a nest. It has an egg in it.", setting: "meadow", props: ["nest", "egg"], parent: "Ask: what is in the nest?" },
      { text: "Rest, hen. Rest, egg. {hero} sat and sat.", setting: "meadow", props: ["hen", "nest"] },
      { text: "Pop! A red hen is in the nest. {hero} is a grand pet!", setting: "meadow", props: ["hen", "egg"] },
    ],
    before: "Ask: what might a hen do in a tent?",
    after: "Ask: what came out of the egg?",
  },
  {
    id: "w09-frog",
    title: "The Frog on the Log",
    week: 9,
    pages: [
      { text: "{hero} is at the pond. A frog is on a log.", setting: "pond", props: ["frog", "log"], parent: "Sound out 'frog': f, r, o, g." },
      { text: "Flip, flop. The frog got off the log.", setting: "pond", props: ["frog"] },
      { text: "A fish, a fin, a flap. Plop!", setting: "pond", props: ["fish"], parent: "Ask: what sound does 'plop' make? Say it big." },
      { text: "{hero} has a flag. Flap, flap, flag.", setting: "pond", props: ["flag"] },
      { text: "The frog is glad. {hero} is glad. Fun at the pond!", setting: "pond", props: ["frog", "log"] },
    ],
    before: "Ask: what lives at a pond?",
    after: "Ask: what did the frog do? Flip, flop!",
  },
  {
    id: "w10-milk",
    title: "Milk for the Kid",
    week: 10,
    pages: [
      { text: "The kid is a small goat. {hero} met the kid.", setting: "farm", props: ["goat"], parent: "'Kid' is a small goat. Sound it out: k, i, d." },
      { text: "The kid can skip. Skip, skip, kick!", setting: "farm", props: [] },
      { text: "{hero} has a cup of milk for the kid.", setting: "farm", props: ["milk", "cup"], parent: "Sound out 'milk': m, i, l, k." },
      { text: "Sip, sip. The kid drank it all up.", setting: "farm", props: ["milk"] },
      { text: "The kid is glad. {hero} pats the kid. Ok, kid!", setting: "farm", props: ["goat"] },
    ],
    before: "Ask: did you know a baby goat is called a kid?",
    after: "Ask: what did {hero} bring the kid?",
  },
  {
    id: "w11-jump",
    title: "Jump in the Web",
    week: 11,
    pages: [
      { text: "{hero} can jump. Jump, jump, jump!", setting: "meadow", props: ["jumper"], parent: "Sound out 'jump': j, u, m, p." },
      { text: "A wasp is in a web. Wig, wig, wag.", setting: "meadow", props: ["web", "wasp"] },
      { text: "{hero} will not jump in the web!", setting: "meadow", props: ["web"], parent: "Ask: why should {hero} not jump in the web?" },
      { text: "Swim, wasp, swim. Get out of the web.", setting: "meadow", props: ["wasp"] },
      { text: "The wasp is out. Jump, {hero}, jump! Win!", setting: "meadow", props: ["jumper", "wasp"] },
    ],
    before: "Ask: what can jump? Can you jump?",
    after: "Ask: how did the wasp get out of the web?",
  },
  {
    id: "w12-the-van",
    title: "Yes, Van!",
    week: 12,
    pages: [
      { text: "{hero} is in a van. Yes, a big van!", setting: "road", props: ["van"], parent: "Sound out 'van': v, a, n. Feel your lip buzz on v." },
      { text: "The van went past a yak. Yak, yak, yak!", setting: "road", props: ["van"] },
      { text: "A vet is in the van. Yum, the vet has a plum.", setting: "road", props: ["van", "grape"], parent: "A vet is an animal doctor. Ask: what does a vet do?" },
      { text: "The van hit a bump. Yikes! The plum is up!", setting: "road", props: ["van"] },
      { text: "{hero} got the plum. Yes! Yum, yum, yum.", setting: "road", props: ["grape"] },
    ],
    before: "Ask: where might a van go?",
    after: "Ask: what happened to the plum?",
  },
  {
    id: "w13-zip",
    title: "Zip, Zap, Buzz",
    week: 13,
    pages: [
      { text: "{hero} has a bag. Zip it up! Zzzip.", setting: "room", props: ["bag"], parent: "Sound out 'zip': z, i, p. Buzz on the z." },
      { text: "A bug is in the bag. Buzz, buzz, buzz.", setting: "room", props: ["bag", "bug"] },
      { text: "Zap! The bug zips out. Zig, zag, zig.", setting: "room", props: ["bug"], parent: "Make a zig-zag with your finger as you read." },
      { text: "{hero} zips the bag. No bug in it now.", setting: "room", props: ["bag"] },
      { text: "Zip. Zap. Zzz. {hero} has a nap.", setting: "night", props: ["bed"] },
    ],
    before: "Ask: what makes a buzz? Say 'zzz'.",
    after: "Ask: where did the bug go?",
  },
  {
    id: "w14-fox-box",
    title: "Six in a Box",
    week: 14,
    pages: [
      { text: "{hero} has a box. It is a big box.", setting: "room", props: ["box"], parent: "Sound out 'box': b, o, x. The x says ks." },
      { text: "Max the fox is in the box. Max is quick!", setting: "room", props: ["box", "fox"] },
      { text: "Six eggs are in the box. Mix, mix, mix.", setting: "room", props: ["box", "egg"], parent: "Count the eggs in the picture." },
      { text: "Quit it, Max! Do not mix the eggs.", setting: "room", props: ["fox", "egg"] },
      { text: "Max quit. The box has six eggs. Fix it, {hero}!", setting: "room", props: ["box"] },
    ],
    before: "Ask: what could be in the box?",
    after: "Ask: how many eggs? Six!",
  },
  {
    id: "t-dinosaurs-egg",
    title: "{hero} and the Egg",
    week: 10,
    theme: "dinosaurs",
    pages: [
      { text: "{hero} dug in the sand. Dig, dig, dig.", setting: "beach", props: ["dig"], parent: "Sound out 'dig': d, i, g." },
      { text: "An egg! A big egg is in the sand.", setting: "beach", props: ["egg"] },
      { text: "Tap, tap. The egg has a crack in it.", setting: "beach", props: ["egg"], parent: "Ask: what could be in the egg?" },
      { text: "Crack! A dino is in the egg. It is a small dino.", setting: "beach", props: ["dinosaurs"] },
      { text: "Stomp, stomp. The dino and {hero} run and stomp!", setting: "meadow", props: ["dinosaurs"] },
    ],
    before: "Ask: what do you know about dinosaur eggs?",
    after: "Ask: what came out of the egg?",
  },
  {
    id: "t-vehicles-jet",
    title: "The Jet and the Cab",
    week: 12,
    theme: "vehicles",
    pages: [
      { text: "{hero} is in a cab. The cab can go fast.", setting: "road", props: ["cab"], parent: "Sound out 'cab': c, a, b." },
      { text: "A jet is up in the sky. Jet, jet, jet!", setting: "sky", props: ["jet"] },
      { text: "Honk! A big bus. Honk! A van.", setting: "road", props: ["bus", "van"], parent: "Ask: what makes a honk?" },
      { text: "The cab must stop. Stop, cab, stop!", setting: "road", props: ["cab", "stopsign"] },
      { text: "{hero} got out. The jet is up. Bye, jet!", setting: "road", props: ["jet"] },
    ],
    before: "Ask: which is faster, a jet or a cab?",
    after: "Ask: what did the cab have to do at the sign?",
  },
  {
    id: "t-space-rocket",
    title: "Up to the Moon",
    week: 10,
    theme: "space",
    pages: [
      { text: "{hero} is in a rocket. Up, up, up!", setting: "night", props: ["space"], parent: "Point to the rocket. Sound out 'up': u, p." },
      { text: "Ten, nine, eight. Set, set, set!", setting: "night", props: ["space"] },
      { text: "The rocket went up past a star. A red star!", setting: "night", props: ["star"], parent: "Ask: what can you see up in the night sky?" },
      { text: "The moon is big. {hero} can hop on the moon!", setting: "night", props: ["star"] },
      { text: "Hop, hop, hop. Then {hero} went home to bed.", setting: "night", props: ["bed"] },
    ],
    before: "Ask: what would you take to the moon?",
    after: "Ask: what did {hero} do on the moon?",
  },
  {
    id: "t-animals-hen",
    title: "The Hen and the Cub",
    week: 9,
    theme: "animals",
    pages: [
      { text: "{hero} met a hen. The hen can hop.", setting: "farm", props: ["hen"], parent: "Sound out 'hen': h, e, n." },
      { text: "{hero} met a cub. The cub can dig.", setting: "farm", props: ["cub"] },
      { text: "The hen and the cub ran. Run, run, run!", setting: "farm", props: ["hen", "cub"], parent: "Ask: which animal can run fast?" },
      { text: "A pig sat in the mud. Sad pig.", setting: "farm", props: ["pig"] },
      { text: "{hero}, the hen, the cub, and the pig had fun.", setting: "farm", props: ["hen", "pig"] },
    ],
    before: "Ask: what animals live on a farm?",
    after: "Ask: what did each animal do?",
  },
  {
    id: "t-bugs-ant",
    title: "The Ant and the Bug",
    week: 7,
    theme: "bugs",
    pages: [
      { text: "An ant is on a big mat.", setting: "meadow", props: ["ant", "mat"], parent: "Sound out 'ant': a, n, t." },
      { text: "A bug is on the mat too. Hum, hum, bug.", setting: "meadow", props: ["bug", "mat"] },
      { text: "{hero} sat. The ant and the bug hop on {hero}!", setting: "meadow", props: ["ant", "bug"], parent: "Ask: how does it feel when a bug lands on you?" },
      { text: "Tap, tap. Hop, ant. Hop, bug.", setting: "meadow", props: ["ant", "bug"] },
      { text: "The ant dug. The bug hid. {hero} got up and had a nap.", setting: "meadow", props: ["ant"] },
    ],
    before: "Ask: what small bugs have you seen?",
    after: "Ask: where did the bug hide?",
  },
  {
    id: "t-ocean-crab",
    title: "The Crab on the Sand",
    week: 9,
    theme: "ocean",
    pages: [
      { text: "{hero} is at the sand. A crab is on the sand.", setting: "beach", props: ["crab", "sand"], parent: "Sound out 'crab': c, r, a, b." },
      { text: "Snap, snap! The crab can snap.", setting: "beach", props: ["crab"] },
      { text: "A fish flips. Flap, flap, flip.", setting: "beach", props: ["fish"], parent: "Ask: what can a fish do that a crab can not?" },
      { text: "A sub! A sub is in the sea. Glub, glub.", setting: "beach", props: ["sub"] },
      { text: "{hero} and the crab sit on the sand. The sun is hot.", setting: "beach", props: ["crab", "sun"] },
    ],
    before: "Ask: what lives in the sea?",
    after: "Ask: what did the crab do? Snap!",
  },
  {
    id: "t-castles-gem",
    title: "The Gem and the King",
    week: 10,
    theme: "castles",
    pages: [
      { text: "{hero} has a gem. It is a red gem.", setting: "castle", props: ["gem"], parent: "Sound out 'gem': g, e, m. This g says j." },
      { text: "The king has a big, big hat. Tap, tap.", setting: "castle", props: ["castles"], parent: "That big hat is a crown." },
      { text: "The gem is for the king. Tap, tap. Step, step.", setting: "castle", props: ["gem", "castles"], parent: "Ask: what would you give a king?" },
      { text: "The king is glad. He hands {hero} a flag.", setting: "castle", props: ["flag"] },
      { text: "Flap, flap. {hero} and the flag. The end!", setting: "castle", props: ["flag", "gem"] },
    ],
    before: "Ask: what does a king wear?",
    after: "Ask: what did the king give {hero}?",
  },
];

/** Words the app reads for the child: high-frequency glue, plus a few picture words with sounds not taught yet. */
export const STORY_GLUE = new Set(
  `i a the and is to see my we go you like look here said was has of for are with no yes in on it at up he she they do can not one two all off out so oh too this that what where come comes home into down over had get got went will then now be me by his her its put let from there some good day play says love want little big new more hi bye ok mom dad your our who why how moon dino goat sea yikes tada crown`.split(
    " ",
  ),
);

/** Words a child is not asked to blend even when the letters are known (a sound they have not met). */
const STORY_READ = new Set(["moon", "dino", "goat", "sea", "yikes", "tada", "crown"]);

export type StoryToken =
  | { kind: "word"; text: string; word: string; role: "target" | "glue" | "hero" }
  | { kind: "gap"; text: string };

export type StoryHero = { name: string; kind: string };

const TOKEN = /\{hero-kind\}|\{hero\}|[A-Za-z']+|[^A-Za-z'{}]+/g;

/** Is this word one the child can sound out with the letters they have met? */
export function decodable(word: string, letters: readonly string[]): boolean {
  const plain = word.toLowerCase().replace(/'/g, "");
  if (!plain || STORY_READ.has(plain)) return false;
  const known = new Set(letters.map((letter) => letter.toLowerCase()));
  return [...plain].every((char) => known.has(char));
}

/** Fill in the hero's name and kind. */
export function storyText(text: string, hero: StoryHero): string {
  return text.replace(/\{hero-kind\}/g, hero.kind).replace(/\{hero\}/g, hero.name);
}

/**
 * Split a line into tappable words and the spaces and marks between them.
 * A target word is one the child can blend with the letters they know; the
 * rest are read whole by the app.
 */
export function storyTokens(text: string, hero: StoryHero, letters: readonly string[]): StoryToken[] {
  const tokens: StoryToken[] = [];
  for (const match of text.match(TOKEN) ?? []) {
    if (match === "{hero}" || match === "{hero-kind}") {
      const shown = match === "{hero}" ? hero.name : hero.kind;
      tokens.push({ kind: "word", text: shown, word: shown.toLowerCase(), role: "hero" });
    } else if (/^[A-Za-z']+$/.test(match)) {
      const word = match.toLowerCase().replace(/'/g, "");
      tokens.push({ kind: "word", text: match, word, role: decodable(match, letters) ? "target" : "glue" });
    } else {
      tokens.push({ kind: "gap", text: match });
    }
  }
  return tokens;
}

/** Every word a story can show, lowercased, without the hero tokens. */
export function storyWordList(): string[] {
  const words = new Set<string>();
  for (const story of STORIES) {
    for (const page of story.pages) {
      for (const match of page.text.match(/[A-Za-z']+/g) ?? []) words.add(match.toLowerCase().replace(/'/g, ""));
    }
  }
  return [...words].sort();
}

function hash(text: string, seed: number): number {
  let value = seed;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0;
  return value;
}

/** The week's own story. Weeks past the last one start the readers over. */
export function storyForWeek(weekIndex: number): Story {
  const general = STORIES.filter((story) => !story.theme);
  const safe = ((weekIndex % general.length) + general.length) % general.length;
  return general.find((story) => story.week === safe + 1) ?? general[0];
}

/**
 * Today's story: the week's own reader, or one of the child's themed readers
 * once its letters are taught. They take turns by day, so a week's stories
 * all come around, and the same story comes back the same day.
 */
export function storyForDay(weekIndex: number, themes: readonly ThemeId[], dayKey: string): Story {
  const weekly = storyForWeek(weekIndex);
  const themed = STORIES.filter((story) => story.theme && themes.includes(story.theme) && story.week <= weekIndex + 1);
  const choices = [weekly, ...themed];
  return choices[hash(dayKey, 11) % choices.length] ?? weekly;
}

/** Manifest id for a page's narration, with the hero's animal when the line names the hero. */
export function storyLineId(story: Story, pageIndex: number, animal: string): string {
  const page = story.pages[pageIndex];
  const named = page ? /\{hero\}|\{hero-kind\}/.test(page.text) : false;
  return `${story.id}-p${pageIndex + 1}${named ? `-${animal}` : ""}`;
}

/** Manifest id for the title, with the hero's animal when the title names the hero. */
export function storyTitleId(story: Story, animal: string): string {
  const named = /\{hero\}|\{hero-kind\}/.test(story.title);
  return `${story.id}-title${named ? `-${animal}` : ""}`;
}
