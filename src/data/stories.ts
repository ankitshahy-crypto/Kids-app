import type { IllustrationName } from "../illustrations";
import { PHONICS_READERS } from "./readersPhonics";
import type { ThemeId } from "./themes";
import { soundMet, soundsNeeded } from "./units";

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
    id: "w01-am-i-big",
    title: "Am I Big?",
    week: 1,
    pages: [
      { text: "Am I big? I am!", setting: "meadow", props: ["balloon"], parent: "Point to 'am'. Say mmm, then aaa. Now say it fast: am." },
      { text: "Am I little? I am.", setting: "meadow", props: ["ant"] },
      { text: "I am up. I am down.", setting: "hill", props: [] },
      { text: "Am I {hero}? Yes, I am!", setting: "hill", props: [], parent: "Let your child tap 'am' on this page and hear it blend." },
      { text: "I am {hero}. I am me!", setting: "meadow", props: ["smile"] },
    ],
    before: "Ask: are you big or little? Both can be true!",
    after: "Ask: what did {hero} say? Say 'I am' and your own name.",
  },
  {
    id: "w01-look-at-me",
    title: "Look at Me",
    week: 1,
    pages: [
      { text: "Look at me. I am {hero}.", setting: "room", props: ["lampglow"], parent: "Your child sounds out 'am'. The app reads 'look' and 'me' for them." },
      { text: "I am in my home.", setting: "room", props: ["lamp"] },
      { text: "I am out! Look at me go.", setting: "meadow", props: ["sun"] },
      { text: "I am so big. I am so little.", setting: "hill", props: ["balloon", "ant"], parent: "Ask: when do you feel big? When do you feel little?" },
      { text: "Look at me! I am {hero}!", setting: "meadow", props: ["smile"] },
    ],
    before: "Ask: where does {hero} live? Look at the pictures for clues.",
    after: "Ask: can you say 'I am' in a big voice, then a little voice?",
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
    id: "w02-sam-and-tam",
    title: "Sam and Tam",
    week: 2,
    pages: [
      { text: "Sam sat. Tam sat.", setting: "room", props: ["duck", "cat"], parent: "Two new friends. Point to the s in Sam and the t in Tam." },
      { text: "Sam sat at the mat.", setting: "room", props: ["mat", "duck"] },
      { text: "Tam sat at the mat too.", setting: "room", props: ["mat", "cat"] },
      { text: "{hero} sat. Sam, Tam, and {hero} sat.", setting: "room", props: ["mat"], parent: "Ask: how many friends are on the mat now?" },
      { text: "A mat, a mat, a mat. Sam, Tam, {hero}. Tada!", setting: "room", props: ["mat"] },
    ],
    before: "Ask: who might sit on the mat today?",
    after: "Ask: what is the same in 'Sam', 'sat' and 'mat'?",
  },
  {
    id: "w02-tam-at-the-mat",
    title: "Tam at the Mat",
    week: 2,
    pages: [
      { text: "Tam is at the mat.", setting: "room", props: ["mat", "cat"], parent: "Sound out 'mat' together: mmm, aaa, t." },
      { text: "Am I at the mat? I am!", setting: "room", props: ["mat"] },
      { text: "Sam is at the mat. Sat, Sam, sat.", setting: "room", props: ["mat", "duck"] },
      { text: "{hero} sat at the mat. Sam sat. Tam sat.", setting: "room", props: ["mat"], parent: "Ask your child to find 'sat' three times on this page." },
      { text: "Mats! Mats! We sat and sat.", setting: "room", props: ["mat"] },
    ],
    before: "Ask: what do you do on a mat?",
    after: "Ask: who was at the mat first? Who came last?",
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
    id: "w03-pam-and-pip",
    title: "Pam and Pip",
    week: 3,
    pages: [
      { text: "Pip sat. Pam sat.", setting: "room", props: ["pig", "cat"], parent: "Pip is a pig. Pam is a cat. Point to the p in each name." },
      { text: "Sip, sip, sip. Pip sips.", setting: "room", props: ["cup", "pig"] },
      { text: "Tap, tap. Pam taps a pit.", setting: "meadow", props: ["dig", "cat"], parent: "A pit is a hole. Sound out 'pit': p, i, t." },
      { text: "{hero} sits. Pam and Pip sit.", setting: "meadow", props: [] },
      { text: "Sit and sip. Sip it, Pip!", setting: "meadow", props: ["cup", "pig"] },
    ],
    before: "Ask: what do you like to sip?",
    after: "Ask: who sipped? Who tapped?",
  },
  {
    id: "w03-the-map",
    title: "The Map",
    week: 3,
    pages: [
      { text: "{hero} has a map.", setting: "room", props: ["spot"], parent: "Sound out 'map': mmm, aaa, p." },
      { text: "Tim has a map. It is a big map.", setting: "room", props: ["spot", "toy"] },
      { text: "Tap the map. Tap it, Tim!", setting: "room", props: ["spot"] },
      { text: "Is it a pit? It is! Sit, {hero}, sit.", setting: "meadow", props: ["dig"], parent: "Ask: what did the map lead to?" },
      { text: "The map is it! Tim and {hero} sit at the pit.", setting: "meadow", props: ["dig", "spot"] },
    ],
    before: "Ask: what is a map for?",
    after: "Ask: what would you put on a map of your home?",
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
    id: "w04-nan-and-the-ant",
    title: "Nan and the Ant",
    week: 4,
    pages: [
      { text: "Nan sat in the sand.", setting: "beach", props: ["sand"], parent: "Sound out 'sand': s, a, n, d. Four sounds!" },
      { text: "An ant! An ant is in the sand.", setting: "beach", props: ["ant", "sand"] },
      { text: "Nan is not mad. Nan pats the sand.", setting: "beach", props: ["sand"], parent: "Pat your lap softly on 'pats'." },
      { text: "The ant naps in a tin pan.", setting: "beach", props: ["pan", "ant"] },
      { text: "{hero} and Nan stand and nap. Tip, tap, nap.", setting: "beach", props: ["sand"] },
    ],
    before: "Ask: have you seen an ant? Where was it going?",
    after: "Ask: where did the ant nap?",
  },
  {
    id: "w04-dip-dip-dan",
    title: "Dip, Dip, Dan",
    week: 4,
    pages: [
      { text: "Dan dips in. Dip, dip, Dan.", setting: "pond", props: ["duck"], parent: "Sound out 'dip': d, i, p." },
      { text: "Dip, dip. Dan dips a pan in.", setting: "pond", props: ["pan"] },
      { text: "Nan dips a tin. Dip, dip, dip.", setting: "pond", props: ["milk"] },
      { text: "{hero} dips in. Snap! It is damp.", setting: "pond", props: [], parent: "Ask: what does 'damp' mean? A little bit wet." },
      { text: "Dan, Nan, and {hero} sit and nap. Dip, dip, nap.", setting: "pond", props: ["duck"] },
    ],
    before: "Ask: what can you dip in water?",
    after: "Ask: what did Dan dip in the water?",
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
    id: "w05-spot-the-dot",
    title: "Spot the Dot",
    week: 5,
    pages: [
      { text: "{hero} has a pot.", setting: "room", props: ["pan"], parent: "Sound out 'pot': p, o, t." },
      { text: "A dot is on the pot. Spot the dot!", setting: "room", props: ["pan", "spot"] },
      { text: "Tom the cat sits on top.", setting: "room", props: ["cat", "pan"] },
      { text: "Stop, Tom! Do not sit on the pot.", setting: "room", props: ["cat"], parent: "Ask: why should Tom not sit on the pot?" },
      { text: "Tom nods and naps on the cot.", setting: "night", props: ["cat", "bed"] },
    ],
    before: "Ask: can you spot a dot in this room?",
    after: "Ask: where did Tom nap in the end?",
  },
  {
    id: "w05-camp",
    title: "Camp",
    week: 5,
    pages: [
      { text: "{hero} is at camp.", setting: "meadow", props: ["tent"], parent: "Sound out 'camp': c, a, m, p." },
      { text: "Dan is at camp. Nan is at camp too.", setting: "meadow", props: ["tent"] },
      { text: "A tin pot. A tin pan. Snap, pop!", setting: "night", props: ["pan"], parent: "Ask: what might snap and pop at camp?" },
      { text: "Sit, {hero}. Sit on the cot and nod.", setting: "night", props: ["bed"] },
      { text: "It is not a nap. It is camp! Tada!", setting: "night", props: ["tent", "star"] },
    ],
    before: "Ask: what do you take to camp?",
    after: "Ask: who was at camp with {hero}?",
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
    id: "w06-the-mud-pup",
    title: "The Mud Pup",
    week: 6,
    pages: [
      { text: "A pup is in the mud.", setting: "pond", props: ["dog"], parent: "Sound out 'mud': mmm, u, d." },
      { text: "Bad pup! Up, pup, up.", setting: "pond", props: ["dog"] },
      { text: "Do not sit in the mud. Sit up!", setting: "pond", props: ["dog"] },
      { text: "The pup is in the tub. Dab, dab, dab.", setting: "room", props: ["dog", "cup"], parent: "Rub your hands on 'dab, dab, dab'." },
      { text: "It is not a mud pup. It is a sun pup!", setting: "meadow", props: ["dog", "sun"] },
    ],
    before: "Ask: what happens when a puppy plays in mud?",
    after: "Ask: how did the pup get clean?",
  },
  {
    id: "w06-a-bun-for-hero",
    title: "A Bun for {hero}",
    week: 6,
    pages: [
      { text: "{hero} has a bun. A big bun.", setting: "room", props: ["cup"], parent: "Sound out 'bun': b, u, n." },
      { text: "A cub sits. The cub sits and sits.", setting: "room", props: ["cub"] },
      { text: "Cut the bun? Cut it in two.", setting: "room", props: ["cub"], parent: "Ask: how do you share a bun?" },
      { text: "A bit for the cub. A bit for {hero}.", setting: "room", props: ["cub"] },
      { text: "Nut bun, sun bun. It is a bun for us.", setting: "meadow", props: ["cub", "sun"] },
    ],
    before: "Ask: what is your favorite thing to eat with a friend?",
    after: "Ask: how did {hero} share the bun?",
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
    id: "w07-the-hog-and-the-hat",
    title: "The Hog and the Hat",
    week: 7,
    pages: [
      { text: "A hog has a hat.", setting: "farm", props: ["hat", "pig"], parent: "Sound out 'hog': h, o, g." },
      { text: "The hog hops? No. The hog digs.", setting: "farm", props: ["dig", "pig"] },
      { text: "{hero} hid the hat in a bag.", setting: "farm", props: ["bag", "hat"] },
      { text: "Hunt, hog, hunt! The hat is not in the mud.", setting: "farm", props: ["pig"], parent: "Ask: where could the hat be?" },
      { text: "Got it! The hog hugs {hero}. Hat and hog!", setting: "farm", props: ["hat", "pig"] },
    ],
    before: "Ask: what does a hog look like? A hog is a big pig.",
    after: "Ask: who hid the hat?",
  },
  {
    id: "w07-dig-dug",
    title: "Dig, Dug",
    week: 7,
    pages: [
      { text: "{hero} digs. Dig, dig, dig.", setting: "beach", props: ["dig"], parent: "Sound out 'dig': d, i, g." },
      { text: "A pup digs. A cub digs. Dig, dig!", setting: "beach", props: ["dog", "cub"] },
      { text: "Bump! A tin cup is dug up.", setting: "beach", props: ["cup"] },
      { text: "A hug for the pup. A hug for the cub.", setting: "beach", props: ["dog", "cub"], parent: "Ask: what did they find?" },
      { text: "Dug it up! Sit and sip in the hut.", setting: "beach", props: ["tent", "cup"] },
    ],
    before: "Ask: what might you dig up at the beach?",
    after: "Ask: what was in the sand?",
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
    id: "w08-ben-and-the-drum",
    title: "Ben and the Drum",
    week: 8,
    pages: [
      { text: "Ben has a drum. Rat-a-tat!", setting: "room", props: ["drum"], parent: "Sound out 'drum': d, r, u, m." },
      { text: "Tap the drum, Ben. Tap, tap, tap.", setting: "room", props: ["drum"] },
      { text: "Meg has a pot. Tap, tap on the pot.", setting: "room", props: ["pan", "cat"] },
      { text: "{hero} has a tin. Rat-a-tat-tat!", setting: "room", props: ["milk"], parent: "Tap the beat together: rat-a-tat-tat." },
      { text: "Drum, pot, tin. A band! The best band.", setting: "room", props: ["drum", "pan"] },
    ],
    before: "Ask: what can you tap to make a beat?",
    after: "Ask: who was in the band?",
  },
  {
    id: "w08-ted-and-meg",
    title: "Ted and Meg",
    week: 8,
    pages: [
      { text: "Ted has a pet cat. The cat is Meg.", setting: "room", props: ["cat"], parent: "Sound out 'pet': p, e, t." },
      { text: "Meg gets on the bed. Get up, Meg!", setting: "room", props: ["bed", "cat"] },
      { text: "Meg naps on the rug. Rest, Meg.", setting: "room", props: ["mat", "cat"] },
      { text: "{hero} pets Meg. Pet, pet, pet.", setting: "room", props: ["cat"], parent: "Ask: how do you pet a cat gently?" },
      { text: "Meg is a grand pet. Ted hugs Meg.", setting: "room", props: ["cat"] },
    ],
    before: "Ask: do you know a cat? What does it like?",
    after: "Ask: where did Meg nap?",
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
    id: "w09-fun-in-the-fog",
    title: "Fun in the Fog",
    week: 9,
    pages: [
      { text: "Fog! {hero} is in the fog.", setting: "hill", props: [], parent: "Sound out 'fog': f, o, g." },
      { text: "Is it a flag? No, it is a lamp!", setting: "hill", props: ["lamp"] },
      { text: "Flap, flap. A bug flits past.", setting: "hill", props: ["bug"], parent: "Ask: what can you see in fog? Not much!" },
      { text: "The fog lifts. {hero} can see the sun.", setting: "hill", props: ["sun"] },
      { text: "Fun in the fog! Flip, flop, off we go.", setting: "meadow", props: ["sun"] },
    ],
    before: "Ask: have you seen fog? It is a cloud on the ground.",
    after: "Ask: what did {hero} see when the fog lifted?",
  },
  {
    id: "w09-the-elf-and-the-sled",
    title: "The Elf and the Sled",
    week: 9,
    pages: [
      { text: "An elf has a sled.", setting: "hill", props: [], parent: "Sound out 'sled': s, l, e, d." },
      { text: "{hero} gets on the sled. Fast, fast, fast!", setting: "hill", props: [] },
      { text: "Flip! {hero} fell off. Plop! Soft mud.", setting: "hill", props: [], parent: "Ask: was {hero} hurt? Soft mud is a soft landing." },
      { text: "The elf helps. Up, {hero}, up!", setting: "hill", props: ["hand"] },
      { text: "Sled, sled, sled. Fun! Off we go, up the hill.", setting: "hill", props: [] },
    ],
    before: "Ask: have you been on a sled? What was it like?",
    after: "Ask: who helped {hero} up?",
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
    id: "w10-the-mask",
    title: "The Mask",
    week: 10,
    pages: [
      { text: "{hero} has a mask. A pink mask.", setting: "room", props: ["box"], parent: "Sound out 'mask': m, a, s, k." },
      { text: "Kim has a mask. A red mask.", setting: "room", props: ["box"] },
      { text: "Ask Kim: is it fun? Yes, it is!", setting: "room", props: [] },
      { text: "Skip, skip. {hero} and Kim skip past the desk.", setting: "room", props: [], parent: "Skip in place on 'skip, skip'." },
      { text: "Masks off! It is {hero} and Kim. Tada!", setting: "room", props: ["smile"] },
    ],
    before: "Ask: what mask would you make?",
    after: "Ask: what colors were the masks?",
  },
  {
    id: "w10-the-sink",
    title: "The Sink",
    week: 10,
    pages: [
      { text: "A cup is in the sink.", setting: "room", props: ["cup"], parent: "Sound out 'sink': s, i, n, k." },
      { text: "Plink, plink. Drip, drip.", setting: "room", props: ["cup"] },
      { text: "{hero} fills the sink up.", setting: "room", props: ["cup"] },
      { text: "A sub! A sub is in the sink.", setting: "room", props: ["sub"], parent: "Ask: what floats in the sink at your home?" },
      { text: "Sink, sub, sink! Dunk, dunk. Fun in the sink.", setting: "room", props: ["sub", "cup"] },
    ],
    before: "Ask: what makes a 'plink' sound?",
    after: "Ask: what did {hero} put in the sink?",
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
    id: "w11-jog-with-jill",
    title: "Jog with Jill",
    week: 11,
    pages: [
      { text: "Jill jogs. Jog, jog, jog.", setting: "road", props: [], parent: "Sound out 'jog': j, o, g." },
      { text: "{hero} jogs with Jill. Left, left.", setting: "road", props: [] },
      { text: "Wet! A wet spot. Jump it!", setting: "road", props: ["spot"] },
      { text: "Twin pups jog too. Wag, wag.", setting: "road", props: ["dog"], parent: "Ask: what do twin pups look like?" },
      { text: "Jill and {hero} win. Jog, jump, win!", setting: "road", props: ["flag"] },
    ],
    before: "Ask: do you like to run? Where do you run?",
    after: "Ask: what did {hero} jump over?",
  },
  {
    id: "w11-the-wind",
    title: "The Wind",
    week: 11,
    pages: [
      { text: "The wind is up. It is a big wind.", setting: "hill", props: [], parent: "Sound out 'wind': w, i, n, d." },
      { text: "{hero} has a hat. Off it went!", setting: "hill", props: ["hat"] },
      { text: "Jump, {hero}, jump! Get the hat.", setting: "hill", props: ["hat"] },
      { text: "A twig, a web, a wig? The hat is in the twigs.", setting: "hill", props: ["web", "hat"], parent: "Ask: where did the hat land?" },
      { text: "Got it! The wind naps. {hero} naps too.", setting: "hill", props: ["hat"] },
    ],
    before: "Ask: what does the wind do to a hat?",
    after: "Ask: what did the wind do at the end?",
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
    id: "w12-seven-yams",
    title: "Seven Yams",
    week: 12,
    pages: [
      { text: "{hero} has seven yams.", setting: "farm", props: ["bag"], parent: "Sound out 'yam': y, a, m." },
      { text: "One yam for the vet. Two for Val.", setting: "farm", props: ["bag"] },
      { text: "Yes! Val yells: yum, yum!", setting: "farm", props: [] },
      { text: "The vest has a yam in it? No!", setting: "farm", props: ["bag"], parent: "Ask: how many yams are left? Count with your fingers." },
      { text: "Seven yams. Yum. Not one is left.", setting: "farm", props: [] },
    ],
    before: "Ask: what is a yam? It is like a sweet potato.",
    after: "Ask: who got the yams?",
  },
  {
    id: "w12-vic-the-yak",
    title: "Vic the Yak",
    week: 12,
    pages: [
      { text: "Vic is a yak. A big yak.", setting: "hill", props: ["animals"], parent: "Sound out 'yak': y, a, k." },
      { text: "Vic has a velvet vest.", setting: "hill", props: ["animals"] },
      { text: "{hero} and Vic jog up the hill.", setting: "hill", props: [] },
      { text: "Vic yelps: yikes, a bug!", setting: "hill", props: ["bug"], parent: "Ask: why did Vic yelp?" },
      { text: "The bug is a pet. Vic pats it. Yes!", setting: "hill", props: ["bug"] },
    ],
    before: "Ask: a yak is like a big hairy cow. What else has hair?",
    after: "Ask: what did Vic think of the bug in the end?",
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
    id: "w13-fizz-pop",
    title: "Fizz, Pop",
    week: 13,
    pages: [
      { text: "{hero} has a pop. Fizz, fizz.", setting: "room", props: ["cup"], parent: "Sound out 'fizz': f, i, zzz." },
      { text: "Zed has a pop. It fizzes up!", setting: "room", props: ["cup"] },
      { text: "Zip! The lid is off. Fizz, fizz, fizz.", setting: "room", props: ["cup"] },
      { text: "Buzz. A bug wants a sip.", setting: "room", props: ["bug", "cup"], parent: "Ask: should the bug get a sip?" },
      { text: "Zap! No sip for the bug. Zed sips it. Yum.", setting: "room", props: ["cup"] },
    ],
    before: "Ask: what makes a fizz sound?",
    after: "Ask: who sipped the pop?",
  },
  {
    id: "w13-zigzag",
    title: "Zigzag",
    week: 13,
    pages: [
      { text: "{hero} zigzags on the mat.", setting: "room", props: ["mat"], parent: "Sound out 'zig': z, i, g. Then 'zag'." },
      { text: "Zig, zag. Zig, zag.", setting: "room", props: ["mat"] },
      { text: "Zed zigzags. Liz zigzags too.", setting: "room", props: ["mat"] },
      { text: "Buzz! A bug zigzags past.", setting: "room", props: ["bug"], parent: "Zigzag your finger in the air." },
      { text: "Zig, zag, zip. The zigzag kids nap.", setting: "night", props: ["mat"] },
    ],
    before: "Ask: can you walk in a zigzag?",
    after: "Ask: who zigzagged in the story?",
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
    id: "w14-the-quiz",
    title: "The Quiz",
    week: 14,
    pages: [
      { text: "{hero} has a quiz. Six bits.", setting: "room", props: ["box"], parent: "Sound out 'quiz': q, u, i, z. The q and u go together." },
      { text: "Is a fox red? Yes! Is an ox big? Yes!", setting: "room", props: ["fox"] },
      { text: "Mix it, fix it. Is it a box? It is!", setting: "room", props: ["box"] },
      { text: "Quit? No! Six, six, six. Do not quit.", setting: "room", props: ["box"], parent: "Ask: what does 'quit' mean?" },
      { text: "Six of six! {hero} wins the quiz. Tada!", setting: "room", props: ["star"] },
    ],
    before: "Ask: what is a quiz?",
    after: "Ask: how many did {hero} get right?",
  },
  {
    id: "w14-the-ox-and-the-fox",
    title: "The Ox and the Fox",
    week: 14,
    pages: [
      { text: "An ox met a fox.", setting: "meadow", props: ["fox"], parent: "Sound out 'ox': o, x. The x says ks." },
      { text: "The fox zips. The ox plods.", setting: "road", props: ["fox"] },
      { text: "{hero} asks: who wins? The fox? The ox?", setting: "road", props: ["flag"] },
      { text: "The fox naps. The ox plods on.", setting: "road", props: ["fox"], parent: "Ask: is fast always best?" },
      { text: "The ox wins! Six hugs for the ox.", setting: "road", props: ["flag"] },
    ],
    before: "Ask: an ox is slow but strong. What is slow? What is fast?",
    after: "Ask: why did the ox win?",
  },
  ...PHONICS_READERS,
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

/**
 * Words the app reads for the child: high-frequency glue, plus a few picture
 * words with sounds not taught yet (fish before sh, star before ar). A word
 * here is still sounded out once its sounds have been taught.
 */
export const STORY_GLUE = new Set(
  `i a the and is to see my we go you like look here said was has of for are with no yes in on it at up he she they do can not one two all off out so oh too this that what where come comes home into down over had get got went will then now be me by his her its put let from there some good day play says love want little big new more hi bye ok mom dad your our who why how moon dino goat sea yikes tada crown fish king star nine eight sky`.split(
    " ",
  ),
);

/**
 * Words a child is never asked to blend, because their spelling does not
 * follow the sounds taught here: sight words (the, was, you) and a few
 * picture words. The app reads them whole, even once every letter is known.
 */
const STORY_READ = new Set(
  `the to do of was are you we he she me be my by bye go no so oh one two all come comes some said says here there where what who why how love want little new more over into down now look good hi ok your our they have gone dino yikes tada crown`.split(
    " ",
  ),
);

export type StoryToken =
  | { kind: "word"; text: string; word: string; role: "target" | "glue" | "hero" }
  | { kind: "gap"; text: string };

export type StoryHero = { name: string; kind: string };

const TOKEN = /\{hero-kind\}|\{hero\}|[A-Za-z']+|[^A-Za-z'{}]+/g;

/**
 * Is this word one the child can sound out with the letters and sound units
 * they have met? A word is split the way a reader sounds it out (sh-i-p,
 * c-a-k-e with a silent e), so "ship" waits for the sh week even when s, h,
 * i and p are known, and "the" is read whole until th is taught.
 */
export function decodable(word: string, letters: readonly string[]): boolean {
  const plain = word.toLowerCase().replace(/'/g, "");
  if (!plain || STORY_READ.has(plain)) return false;
  const known = new Set(letters.map((letter) => letter.toLowerCase()));
  return soundsNeeded(plain).every((sound) => soundMet(sound, known));
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

/** How many lesson weeks have readers of their own. Weeks past that start the readers over. */
export function readerWeeks(): number {
  return Math.max(...STORIES.filter((story) => !story.theme).map((story) => story.week));
}

/** The week's own readers, in the order they are written. */
export function storiesForWeek(weekIndex: number): Story[] {
  const weeks = readerWeeks();
  const safe = ((weekIndex % weeks) + weeks) % weeks;
  const own = STORIES.filter((story) => !story.theme && story.week === safe + 1);
  return own.length > 0 ? own : STORIES.filter((story) => !story.theme).slice(0, 1);
}

/** The week's first reader. */
export function storyForWeek(weekIndex: number): Story {
  return storiesForWeek(weekIndex)[0];
}

/**
 * The readers a child can open this week: the week's own, then the child's
 * themed readers once their letters are taught.
 */
export function storyChoices(weekIndex: number, themes: readonly ThemeId[]): Story[] {
  const weekly = storiesForWeek(weekIndex);
  const themed = STORIES.filter((story) => story.theme && themes.includes(story.theme) && story.week <= weekIndex + 1);
  return [...weekly, ...themed];
}

/** Monday is 0. A day key is YYYY-MM-DD. */
export function weekdayOf(dayKey: string): number {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year || 2026, (month || 1) - 1, day || 1));
  return (date.getUTCDay() + 6) % 7;
}

/**
 * Today's story: the week's readers take turns through the week (Monday the
 * first, Tuesday the second, and so on), with the child's themed readers in
 * the round. The same day of the week brings the same story back, and the
 * cover offers the others.
 */
export function storyForDay(weekIndex: number, themes: readonly ThemeId[], dayKey: string): Story {
  const choices = storyChoices(weekIndex, themes);
  return choices[weekdayOf(dayKey) % choices.length] ?? choices[0];
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
