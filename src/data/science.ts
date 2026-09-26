import { MODULE_SCIENCE } from "../brand";
import { logicLevel, type LogicLevel } from "./logic";
import type { AgeRange } from "./profiles";
import { defineSubject } from "./subject";

/** LittleNest Science. Sink or float lives here. Reading stays `reading`. */
export const SCIENCE = "science";

export const scienceSteps = ["life", "homes", "body", "change", "weather", "senses", "float"] as const;
export type ScienceStep = (typeof scienceSteps)[number];

export const scienceActivities = [
  "life",
  "homes",
  "body",
  "change",
  "weather",
  "senses",
  "float",
  "predict",
  "chain",
  "water",
] as const;
export type ScienceActivity = (typeof scienceActivities)[number];

export const scienceStages = [
  { id: "life", title: "Life cycles", detail: "Seed to plant, egg to bird, and caterpillar to butterfly.", size: 1 },
  { id: "homes", title: "Homes and foods", detail: "Match an animal to where it lives and what it eats.", size: 1 },
  { id: "body", title: "Body parts", detail: "Find a wing, a beak, a tail, or a paw.", size: 1 },
  { id: "change", title: "On-screen changes", detail: "Ice melts, water turns to steam, and a pretend fizz. Sort solid, liquid, and gas.", size: 1 },
  { id: "weather", title: "Weather", detail: "Sun, rain, and snow. Dress their animal and name the season.", size: 1 },
  { id: "senses", title: "Senses", detail: "A sound, a texture, and day or night.", size: 1 },
  { id: "float", title: "Sink or float", detail: "Guess, then drop the object in the water.", size: 1 },
  { id: "predict", title: "Predict and test", detail: "Ages 5 to 7 say what they think will happen, then test it.", size: 1 },
  { id: "chain", title: "Food chain", detail: "Ages 5 to 7 line up who eats what.", size: 1 },
  { id: "water", title: "Water cycle", detail: "Ages 5 to 7 follow a puddle up to a cloud and back to rain.", size: 1 },
] as const;

defineSubject({
  id: SCIENCE,
  title: MODULE_SCIENCE,
  stages: scienceStages,
  steps: scienceSteps,
});

/** Ages 3–4 use pictures. Ages 5–7 add a prediction, a food chain, and the water cycle. */
export function scienceLevel(ageRange: AgeRange | string): LogicLevel {
  return logicLevel(ageRange);
}

export function activitiesForScience(level: LogicLevel): ScienceActivity[] {
  const activities: ScienceActivity[] = ["life", "homes", "body", "change", "weather", "senses", "float"];
  if (level === "later") activities.push("predict", "chain", "water");
  return activities;
}

/** Append a piece only when it is the next stage. A miss leaves the order as it was. */
export function acceptNext<T extends string>(
  order: readonly T[],
  piece: T,
  stages: readonly T[],
): { order: T[]; ok: boolean; done: boolean } {
  if (piece !== stages[order.length]) return { order: [...order], ok: false, done: false };
  const next = [...order, piece];
  return { order: next, ok: true, done: next.length === stages.length };
}

export type CycleKind = "plant" | "bird" | "butterfly";

const PLANT = ["seed", "sprout", "plant"] as const;
const BIRD = ["egg", "chick", "bird"] as const;
const BUTTERFLY_EARLY = ["caterpillar", "chrysalis", "butterfly"] as const;
const BUTTERFLY_LATER = ["egg", "caterpillar", "chrysalis", "butterfly"] as const;

export function cycleStages(kind: CycleKind, level: LogicLevel): readonly string[] {
  if (kind === "plant") return PLANT;
  if (kind === "bird") return BIRD;
  return level === "later" ? BUTTERFLY_LATER : BUTTERFLY_EARLY;
}

export const CYCLE_KINDS: CycleKind[] = ["plant", "bird", "butterfly"];

export type HomeAnimal = "fox" | "bird" | "fish";

export const HOMES: Record<HomeAnimal, string> = {
  fox: "den",
  bird: "nest",
  fish: "pond",
};

export const FOODS: Record<HomeAnimal, string> = {
  fox: "berries",
  bird: "worm",
  fish: "plant",
};

export const HOME_ANIMALS: HomeAnimal[] = ["fox", "bird", "fish"];

export function homeMatch(animal: HomeAnimal, place: string): boolean {
  return HOMES[animal] === place;
}

export function foodMatch(animal: HomeAnimal, food: string): boolean {
  return FOODS[animal] === food;
}

export type BodyPart = "wing" | "beak" | "tail" | "paw";

export function bodyParts(level: LogicLevel): BodyPart[] {
  if (level === "later") return ["wing", "beak", "tail", "paw"];
  return ["wing", "beak", "tail"];
}

export function bodyPrompt(part: BodyPart): string {
  return `Find the ${part}.`;
}

export type MatterItem = "rock" | "juice" | "steam";
export type MatterState = "solid" | "liquid" | "gas";

export const MATTER: Record<MatterItem, MatterState> = {
  rock: "solid",
  juice: "liquid",
  steam: "gas",
};

export const MATTER_ITEMS: MatterItem[] = ["rock", "juice", "steam"];

export function sortMatter(item: MatterItem, bin: MatterState): boolean {
  return MATTER[item] === bin;
}

/** On-screen only. The cup of ice becomes water. */
export function warmIce(): "water" {
  return "water";
}

/** On-screen only. The water becomes steam. */
export function heatWater(): "steam" {
  return "steam";
}

/** On-screen only. Baking soda and vinegar bubble. */
export function mixSoda(): "bubbles" {
  return "bubbles";
}

/** The only real-world line. It names a grown-up and says not to taste. */
export const GROWNUP_FIZZ = "Do this with a grown-up. Do not taste it.";

export type WeatherId = "sun" | "rain" | "snow";

export const WEATHERS: WeatherId[] = ["sun", "rain", "snow"];

export const CLOTHES: Record<WeatherId, string> = {
  sun: "hat",
  rain: "coat",
  snow: "scarf",
};

export const SEASONS: Record<WeatherId, string> = {
  sun: "summer",
  rain: "spring",
  snow: "winter",
};

export function clothesFor(weather: WeatherId): string {
  return CLOTHES[weather];
}

export function seasonFor(weather: WeatherId): string {
  return SEASONS[weather];
}

export type SenseRound = {
  sense: "sound" | "feel" | "sky";
  cue: string;
  answer: string;
  choices: string[];
};

export function senseRounds(): SenseRound[] {
  return [
    { sense: "sound", cue: "tweet", answer: "bird", choices: ["bird", "drum", "rain"] },
    { sense: "sound", cue: "drip", answer: "rain", choices: ["bird", "drum", "rain"] },
    { sense: "sound", cue: "boom", answer: "drum", choices: ["bird", "drum", "rain"] },
    { sense: "feel", cue: "soft", answer: "bunny", choices: ["bunny", "rock", "ice"] },
    { sense: "feel", cue: "rough", answer: "rock", choices: ["bunny", "rock", "ice"] },
    { sense: "feel", cue: "smooth", answer: "ice", choices: ["bunny", "rock", "ice"] },
    { sense: "sky", cue: "day", answer: "sun", choices: ["sun", "moon"] },
    { sense: "sky", cue: "night", answer: "moon", choices: ["sun", "moon"] },
  ];
}

export function soundLine(cue: string): string {
  if (cue === "tweet") return "Tweet.";
  if (cue === "drip") return "Drip.";
  if (cue === "boom") return "Boom.";
  return "";
}

export type FloatId = "leaf" | "rock" | "boat" | "spoon";
export type FloatGuess = "sink" | "float";

export const FLOATS: Record<FloatId, boolean> = {
  leaf: true,
  rock: false,
  boat: true,
  spoon: false,
};

export function floatSet(level: LogicLevel): FloatId[] {
  if (level === "later") return ["leaf", "rock", "boat", "spoon"];
  return ["leaf", "rock", "boat"];
}

export function floatVerdict(id: FloatId, guess: FloatGuess): { ok: boolean; hint: string } {
  const floats = FLOATS[id];
  if ((guess === "float") === floats) return { ok: true, hint: "" };
  if (id === "rock" || id === "spoon") return { ok: false, hint: "That one is heavy, so it sinks." };
  return { ok: false, hint: "That one is light, so it floats." };
}

export const PREDICT_QUESTION = "What do you think will happen?";

export const EXPERIMENTS = [
  { id: "ice", right: "melt", wrong: "stay", result: "melt" },
  { id: "seed", right: "grow", wrong: "shrink", result: "grow" },
  { id: "fizz", right: "bubbles", wrong: "still", result: "bubbles" },
] as const;

export type ExperimentId = (typeof EXPERIMENTS)[number]["id"];

export function predictionOk(id: ExperimentId, guess: string): boolean {
  return EXPERIMENTS.find((item) => item.id === id)?.right === guess;
}

export const FOOD_CHAIN = ["grass", "rabbit", "fox"] as const;
export const WATER_CYCLE = ["puddle", "vapor", "cloud", "rain"] as const;

export function scienceManifestEntries(): { id: string; say: string }[] {
  return [
    { id: "science-life", say: "What comes next?" },
    { id: "science-homes", say: "Where does it live?" },
    { id: "science-body", say: "Find the part." },
    { id: "science-mix", say: "Watch what happens." },
    { id: "science-weather", say: "Dress for the weather." },
    { id: "science-senses", say: "What do you notice?" },
    { id: "science-float", say: "Will it sink or float?" },
    { id: "science-predict", say: "What do you think will happen?" },
    { id: "science-chain", say: "Who eats what?" },
    { id: "science-water", say: "Where does the rain come from?" },
    { id: "science-again", say: "Try again." },
    { id: "science-grownup", say: "Do this with a grown-up. Do not taste it." },
  ];
}
