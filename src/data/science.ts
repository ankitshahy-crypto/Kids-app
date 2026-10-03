import { MODULE_SCIENCE } from "../brand";
import type { IllustrationName } from "../illustrations";
import { logicLevel, type LogicLevel } from "./logic";
import type { AgeRange } from "./profiles";
import { among, shuffle, take } from "./seed";
import { defineSubject } from "./subject";

/**
 * LittleNest Science: six things to find out, each with real pictures and a
 * question said aloud.
 *
 * Rebuilt after the first phone test. Before, every picture in Science was a
 * colored dot: "Body" asked a child to find the wing among three dots,
 * "Senses" asked "What do you notice?" over two more, and the planting game
 * was three green squares to put in order. None of it could be understood by
 * the grown-up testing it.
 *
 * What changed:
 *  - Grow is a garden. The child plants a seed, waters it, gives it sun and
 *    waters it again, and it grows at each step. What the plant needs next
 *    is said aloud and shown in a bubble. Then a life is put in order: egg,
 *    chick, hen.
 *  - Every picture is one of the app's drawings, held to drawings that exist
 *    by its type.
 *  - Every question is its own recorded line ("Where does the bee live?").
 *  - Body is one bird, and the child taps its beak, wing or tail.
 *  - Weather asks what you need for it: an umbrella for rain.
 *  - Senses asks which part of you does the job: you hear a drum with ears.
 *  - Sink or float lets a child guess and then shows what happens. A wrong
 *    guess is not "try again": finding out is the point.
 *  - Rounds change from one play to the next (`salt`).
 *
 * Four activities are not in this build: the on-screen experiments, Predict,
 * Food chain and Water cycle. They need drawings of their own (steam, a
 * puddle, grass) and will come back when they have them. Their ids stay
 * listed so stars already earned under them are kept.
 */
export const SCIENCE = "science";

export const scienceSteps = ["life", "homes", "body", "change", "weather", "senses", "float"] as const;
export type ScienceStep = (typeof scienceSteps)[number];

export const scienceActivities = ["life", "homes", "body", "change", "weather", "senses", "float", "predict", "chain", "water"] as const;
export type ScienceActivity = (typeof scienceActivities)[number];

/** The activities a child can open. */
export const SCIENCE_NOW = ["life", "homes", "body", "weather", "senses", "float"] as const satisfies readonly ScienceActivity[];

export const scienceStages = [
  { id: "life", title: "Growing", detail: "Plant a seed and help it grow. Then egg to hen, and caterpillar to butterfly.", size: 1 },
  { id: "homes", title: "Animal homes", detail: "Match an animal to where it lives.", size: 1 },
  { id: "body", title: "Body parts", detail: "Find the beak, the wing, the tail, the eye, or the feet of a bird.", size: 1 },
  { id: "weather", title: "Weather", detail: "Rain, sun, snow, and wind, and what to take for each.", size: 1 },
  { id: "senses", title: "Senses", detail: "Which part of you sees, hears, smells, tastes, and touches.", size: 1 },
  { id: "float", title: "Sink or float", detail: "Guess, then drop the object in the water.", size: 1 },
] as const;

defineSubject({
  id: SCIENCE,
  title: MODULE_SCIENCE,
  stages: scienceStages,
  steps: scienceSteps,
});

/** Ages 3–4 play shorter games. Ages 5–7 play all the rounds. */
export function scienceLevel(ageRange: AgeRange | string): LogicLevel {
  return logicLevel(ageRange);
}

export function activitiesForScience(_level: LogicLevel): ScienceActivity[] {
  return [...SCIENCE_NOW];
}

/** A drawing, and the word said when it is tapped. */
export type SciencePicture = { art: IllustrationName; name: string };

// ---------------------------------------------------------------------------
// Grow: plant a seed and give it what it needs.

export type GrowNeed = "seed" | "water" | "sun";

/** What the plant needs, in order. Each step it grows: bare soil, a seed, a sprout, a plant, a flower. */
export const GROW_STEPS: { need: GrowNeed; line: string; say: string }[] = [
  { need: "seed", line: "science-grow-seed", say: "Plant the seed." },
  { need: "water", line: "science-grow-water", say: "The seed is thirsty. Give it water." },
  { need: "sun", line: "science-grow-sun", say: "Now it needs light. Tap the sun." },
  { need: "water", line: "science-grow-more", say: "It is thirsty again. Give it more water." },
];

export const GROW_NEEDS: GrowNeed[] = ["seed", "water", "sun"];

/** Is this what the plant needs at this step? */
export function growAccepts(step: number, need: GrowNeed): boolean {
  return GROW_STEPS[step]?.need === need;
}

// ...then a life, put in order.

export const LIFE_CYCLES: { id: string; stages: SciencePicture[] }[] = [
  { id: "hen", stages: [{ art: "egg", name: "egg" }, { art: "chick", name: "chick" }, { art: "hen", name: "hen" }] },
  {
    id: "butterfly",
    stages: [
      { art: "caterpillar", name: "caterpillar" },
      { art: "chrysalis", name: "chrysalis" },
      { art: "butterfly", name: "butterfly" },
    ],
  },
  { id: "plant", stages: [{ art: "seed", name: "seed" }, { art: "sprout", name: "sprout" }, { art: "flower", name: "flower" }] },
];

export type LifeRound = { kind: "grow" } | { kind: "order"; id: string; stages: SciencePicture[]; deal: SciencePicture[] };

/** The garden first, then one life to put in order at ages 3–4 and two at 5–7, dealt out of order. */
export function lifeRounds(level: LogicLevel, salt = 0): LifeRound[] {
  const count = level === "later" ? 2 : 1;
  const orders = take(LIFE_CYCLES, count, salt).map((cycle, index): LifeRound => {
    let deal = shuffle(cycle.stages, salt + index);
    for (let turn = 1; turn < 6 && deal.every((stage, at) => stage === cycle.stages[at]); turn += 1) deal = shuffle(cycle.stages, salt + index + turn);
    if (deal.every((stage, at) => stage === cycle.stages[at])) deal = [...cycle.stages].reverse();
    return { kind: "order", id: cycle.id, stages: cycle.stages, deal };
  });
  return [{ kind: "grow" }, ...orders];
}

// ---------------------------------------------------------------------------
// Homes: where does it live?

export const HOMES: { id: string; animal: SciencePicture; home: SciencePicture; ask: string; answer: string }[] = [
  { id: "fish", animal: { art: "fish", name: "fish" }, home: { art: "pond", name: "pond" }, ask: "Where does the fish live?", answer: "A fish lives in a pond." },
  { id: "bird", animal: { art: "bird", name: "bird" }, home: { art: "nest", name: "nest" }, ask: "Where does the bird live?", answer: "A bird lives in a nest." },
  { id: "bee", animal: { art: "bee", name: "bee" }, home: { art: "hive", name: "hive" }, ask: "Where does the bee live?", answer: "A bee lives in a hive." },
  { id: "dog", animal: { art: "dog", name: "dog" }, home: { art: "kennel", name: "dog house" }, ask: "Where does the dog live?", answer: "A dog lives in a dog house." },
];

export type HomeRound = { id: string; animal: SciencePicture; home: SciencePicture; choices: SciencePicture[]; ask: string; answer: string };

export function homeRounds(level: LogicLevel, salt = 0): HomeRound[] {
  const count = level === "later" ? 4 : 3;
  return take(HOMES, count, salt).map((entry, index) => ({
    id: entry.id,
    animal: entry.animal,
    home: entry.home,
    choices: among(
      entry.home,
      HOMES.map((other) => other.home),
      3,
      salt + 11 * (index + 1),
    ),
    ask: `science-home-${entry.id}`,
    answer: `science-lives-${entry.id}`,
  }));
}

// ---------------------------------------------------------------------------
// Body: find the part on the bird.

export const BODY_PARTS = ["beak", "wing", "tail", "eye", "feet"] as const;
export type BodyPart = (typeof BODY_PARTS)[number];

/** Three parts at ages 3–4 (the ones a bird has and a child does not), all five at 5–7, in a new order each play. */
export function bodyRounds(level: LogicLevel, salt = 0): BodyPart[] {
  const parts: readonly BodyPart[] = level === "later" ? BODY_PARTS : ["beak", "wing", "tail"];
  return shuffle(parts, salt);
}

// ---------------------------------------------------------------------------
// Weather: what do you need for it?

export type WeatherId = "rain" | "sun" | "snow" | "wind";

export const WEATHERS: { id: WeatherId; thing: SciencePicture; ask: string }[] = [
  { id: "rain", thing: { art: "umbrella", name: "umbrella" }, ask: "It is raining. What keeps you dry?" },
  { id: "sun", thing: { art: "hat", name: "hat" }, ask: "It is sunny and hot. What keeps the sun off your head?" },
  { id: "snow", thing: { art: "boot", name: "boot" }, ask: "It is snowing. What keeps your feet warm?" },
  { id: "wind", thing: { art: "kite", name: "kite" }, ask: "It is windy. What can you fly in the wind?" },
];

export type WeatherRound = { id: WeatherId; thing: SciencePicture; choices: SciencePicture[]; ask: string };

export function weatherRounds(level: LogicLevel, salt = 0): WeatherRound[] {
  const count = level === "later" ? 4 : 3;
  return take(WEATHERS, count, salt).map((entry, index) => ({
    id: entry.id,
    thing: entry.thing,
    choices: among(
      entry.thing,
      WEATHERS.map((other) => other.thing),
      3,
      salt + 17 * (index + 1),
    ),
    ask: `science-weather-${entry.id}`,
  }));
}

// ---------------------------------------------------------------------------
// Senses: which part of you does it?

export const SENSES: { id: string; part: SciencePicture; thing: SciencePicture; ask: string; answer: string }[] = [
  { id: "see", part: { art: "eye", name: "eye" }, thing: { art: "star", name: "star" }, ask: "Look, a star. What do you see with?", answer: "You see with your eyes." },
  { id: "hear", part: { art: "ear", name: "ear" }, thing: { art: "drum", name: "drum" }, ask: "Listen, a drum. What do you hear with?", answer: "You hear with your ears." },
  { id: "smell", part: { art: "nose", name: "nose" }, thing: { art: "flower", name: "flower" }, ask: "Mmm, a flower. What do you smell with?", answer: "You smell with your nose." },
  { id: "taste", part: { art: "mouth", name: "mouth" }, thing: { art: "apple", name: "apple" }, ask: "Yum, an apple. What do you taste with?", answer: "You taste with your mouth." },
  { id: "touch", part: { art: "hand", name: "hand" }, thing: { art: "cat", name: "cat" }, ask: "A soft cat. What do you touch with?", answer: "You touch with your hands." },
];

export type SenseRound = { id: string; part: SciencePicture; thing: SciencePicture; choices: SciencePicture[]; ask: string; answer: string };

export function senseRounds(level: LogicLevel, salt = 0): SenseRound[] {
  const count = level === "later" ? 5 : 3;
  return take(SENSES, count, salt).map((entry, index) => ({
    id: entry.id,
    part: entry.part,
    thing: entry.thing,
    choices: among(
      entry.part,
      SENSES.map((other) => other.part),
      3,
      salt + 23 * (index + 1),
    ),
    ask: `science-sense-${entry.id}`,
    answer: `science-with-${entry.id}`,
  }));
}

// ---------------------------------------------------------------------------
// Sink or float: guess, then find out.

export type FloatGuess = "sink" | "float";

export const FLOAT_THINGS: { picture: SciencePicture; floats: boolean }[] = [
  { picture: { art: "leaf", name: "leaf" }, floats: true },
  { picture: { art: "boat", name: "boat" }, floats: true },
  { picture: { art: "apple", name: "apple" }, floats: true },
  { picture: { art: "rock", name: "rock" }, floats: false },
  { picture: { art: "coin", name: "coin" }, floats: false },
  { picture: { art: "gem", name: "gem" }, floats: false },
];

export type FloatRound = { picture: SciencePicture; floats: boolean };

/** As many things that float as things that sink (two and two at ages 3–4, three and three at 5–7), mixed up. */
export function floatRounds(level: LogicLevel, salt = 0): FloatRound[] {
  const each = level === "later" ? 3 : 2;
  const up = take(FLOAT_THINGS.filter((thing) => thing.floats), each, salt);
  const down = take(FLOAT_THINGS.filter((thing) => !thing.floats), each, salt + 3);
  return shuffle([...up, ...down], salt + 7);
}

export function floatResult(round: FloatRound): FloatGuess {
  return round.floats ? "float" : "sink";
}

// ---------------------------------------------------------------------------

/** The clip id for a picture's name: "dog house" is words/dog-house. */
export function wordId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

/** Every word Science says when a picture is tapped: each needs a recorded word clip. */
export function scienceWords(): string[] {
  return [
    ...new Set([
      ...GROW_NEEDS,
      ...LIFE_CYCLES.flatMap((cycle) => cycle.stages.map((stage) => stage.name)),
      ...HOMES.flatMap((entry) => [entry.animal.name, entry.home.name]),
      ...BODY_PARTS,
      ...WEATHERS.map((entry) => entry.thing.name),
      ...SENSES.flatMap((entry) => [entry.part.name, entry.thing.name]),
      ...FLOAT_THINGS.map((thing) => thing.picture.name),
      "float",
      "sink",
    ]),
  ];
}

/** Science's spoken lines. scripts/sync-manifest.ts writes these into the clip list. */
export function scienceManifestEntries(): { id: string; say: string }[] {
  return [
    ...GROW_STEPS.map((step) => ({ id: step.line, say: step.say })),
    { id: "science-grow-done", say: "The seed grew into a flower!" },
    { id: "science-first", say: "What comes first?" },
    { id: "science-next", say: "What comes next?" },
    ...HOMES.flatMap((entry) => [
      { id: `science-home-${entry.id}`, say: entry.ask },
      { id: `science-lives-${entry.id}`, say: entry.answer },
    ]),
    ...BODY_PARTS.map((part) => ({ id: `science-find-${part}`, say: `Find the ${part}.` })),
    ...WEATHERS.map((entry) => ({ id: `science-weather-${entry.id}`, say: entry.ask })),
    ...SENSES.flatMap((entry) => [
      { id: `science-sense-${entry.id}`, say: entry.ask },
      { id: `science-with-${entry.id}`, say: entry.answer },
    ]),
    { id: "science-float", say: "Will it sink or float?" },
    { id: "science-floats", say: "It floats!" },
    { id: "science-sinks", say: "It sinks!" },
  ];
}
