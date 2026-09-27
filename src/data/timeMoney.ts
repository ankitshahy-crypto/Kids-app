import { MODULE_TIME } from "../brand";
import { weekIndex } from "./schedule";
import { defineSubject } from "./subject";
import { deviceTimeZone } from "./time";

/** Time & Money. Reading stays `reading`. */
export const TIME = "time";

export const timeSteps = ["day", "routine", "clock", "coins", "shop"] as const;
export type TimeStep = (typeof timeSteps)[number];

export const timeStages = [
  { id: "day", title: "Parts of the day", detail: "Morning, afternoon, and night.", size: 3 },
  { id: "routine", title: "Daily routine", detail: "Wake, eat, school, bath, and bed.", size: 5 },
  { id: "clock", title: "O'clock", detail: "Set the big clock to the hour.", size: 4 },
  { id: "coins", title: "Coins and bills", detail: "Name a penny, nickel, dime, quarter, and one- and five-dollar bills.", size: 6 },
  { id: "shop", title: "Pretend shop", detail: "Buy a snack with one coin, and sort coins.", size: 3 },
  { id: "hours", title: "Hours and half hours", detail: "Set the clock to the hour and the half hour.", size: 4 },
  { id: "minutes", title: "Minutes", detail: "Quarter hours, then five-minute steps, and how long until.", size: 4 },
  { id: "values", title: "Coin values", detail: "Count mixed coins, and pay dollars and cents.", size: 4 },
  { id: "change", title: "Making change", detail: "Make change and compare prices.", size: 3 },
  { id: "jars", title: "Three jars", detail: "Earn pretend coins and split them into save, spend, and share.", size: 4 },
  { id: "earn", title: "Lemonade stand", detail: "Earn coins by serving customers.", size: 3 },
  { id: "choose", title: "Choose and save", detail: "Buy what the coins can cover, and save for the rest.", size: 3 },
  { id: "needs", title: "Needs and wants", detail: "Sort needs and wants.", size: 3 },
  { id: "cards", title: "Cards", detail: "A debit card uses saved money. A credit card is paid back later.", size: 4 },
] as const;

export type TimeStageId = (typeof timeStages)[number]["id"];

/**
 * Units reached by the end of this week. Values sit inside a stage, except the
 * last week, which fills the path. `learningPlace` treats an exact boundary as
 * the start of the next stage, so these counts stay off those edges.
 */
const timeWeeks = [1, 5, 10, 15, 20, 23, 26, 28, 31, 35, 36, 38, 41, 44, 47, 50, 53] as const;

const stageStart: Record<TimeStageId, number> = {
  day: 0,
  routine: 3,
  clock: 8,
  coins: 12,
  shop: 18,
  hours: 21,
  minutes: 25,
  values: 29,
  change: 33,
  jars: 36,
  earn: 40,
  choose: 43,
  needs: 46,
  cards: 49,
};

export const dayParts = [
  { id: "morning", title: "Morning" },
  { id: "afternoon", title: "Afternoon" },
  { id: "night", title: "Night" },
] as const;

export type DayPartId = (typeof dayParts)[number]["id"];

export const routineSteps = [
  { id: "wake", title: "Wake" },
  { id: "eat", title: "Eat" },
  { id: "school", title: "School" },
  { id: "bath", title: "Bath" },
  { id: "bed", title: "Bed" },
] as const;

export type RoutineId = (typeof routineSteps)[number]["id"];

export const moneyPieces = [
  { id: "penny", name: "Penny", cents: 1, kind: "coin" as const, audio: "word" as const },
  { id: "nickel", name: "Nickel", cents: 5, kind: "coin" as const, audio: "word" as const },
  { id: "dime", name: "Dime", cents: 10, kind: "coin" as const, audio: "word" as const },
  { id: "quarter", name: "Quarter", cents: 25, kind: "coin" as const, audio: "word" as const },
  { id: "one", name: "1 dollar", cents: 100, kind: "bill" as const, audio: "prompt" as const },
  { id: "five", name: "5 dollars", cents: 500, kind: "bill" as const, audio: "prompt" as const },
] as const;

export type MoneyId = (typeof moneyPieces)[number]["id"];

export const snacks = [
  { id: "apple", name: "Apple", cents: 10, coin: "dime" as const },
  { id: "cookie", name: "Cookie", cents: 5, coin: "nickel" as const },
  { id: "milk", name: "Milk", cents: 25, coin: "quarter" as const },
  { id: "banana", name: "Banana", cents: 1, coin: "penny" as const },
] as const;

export type SnackId = (typeof snacks)[number]["id"];

export type ClockMode = "hour" | "half" | "quarter" | "five";
export type DayTask = "parts" | "until";
export type CoinTask = "name" | "sort" | "count" | "compare";
export type ShopTask = "one" | "pay" | "change";

export const moneyGames = ["jars", "lemonade", "choose", "needs", "cards"] as const;
export type MoneyGame = (typeof moneyGames)[number];

export const chores = [
  { id: "tidy", title: "Tidy toys" },
  { id: "feed", title: "Feed the pet" },
  { id: "help", title: "Help at home" },
] as const;

export const jarNames = [
  { id: "save", title: "Save" },
  { id: "spend", title: "Spend" },
  { id: "share", title: "Share" },
] as const;

export type JarId = (typeof jarNames)[number]["id"];

/** Pretend coins earned before they are split. The save jar needs this many to reach the hat. */
export const EARN_COINS = 3;
export const SAVE_GOAL = 2;
export const GOAL_ITEM = "hat-crown";
export const GOAL_NAME = "Paper crown";

export const lemonadeServes = 3;

export const shopWalletCents = 10;

export const shopGoods = [
  { id: "cookie", name: "Cookie", cents: 5 },
  { id: "apple", name: "Apple", cents: 10 },
  { id: "milk", name: "Milk", cents: 25 },
] as const;

export const sortItems = [
  { id: "apple", title: "Apple", kind: "need" as const },
  { id: "milk", title: "Milk", kind: "need" as const },
  { id: "cookie", title: "Cookie", kind: "want" as const },
  { id: "crown", title: "Paper crown", kind: "want" as const },
] as const;

export type SortKind = "need" | "want";

/** Pretend save-jar coins before a card tap. No interest. */
export const cardSaveStart = 4;
export const cardPrice = 1;

const hourWords = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

const minuteWords: Record<number, string> = {
  5: "five",
  10: "ten",
  20: "twenty",
  25: "twenty-five",
  35: "thirty-five",
  40: "forty",
  50: "fifty",
  55: "fifty-five",
};

const centSays: Record<number, string> = {
  1: "one cent",
  5: "five cents",
  6: "six cents",
  7: "seven cents",
  8: "eight cents",
  10: "ten cents",
  15: "fifteen cents",
  25: "twenty-five cents",
  110: "one dollar and ten cents",
};

export type TimeLesson = {
  weekIndex: number;
  stageId: TimeStageId;
  introduced: number;
  clockMode: ClockMode;
  targetHour: number;
  targetMinute: number;
  clockCueId: string;
  clockSay: string;
  match: boolean;
  dayTask: DayTask;
  dayPart: DayPartId;
  untilFrom: number;
  untilTo: number;
  untilHours: number;
  untilChoices: number[];
  routineOrder: RoutineId[];
  coinTask: CoinTask;
  coinTarget: MoneyId;
  coinChoices: MoneyId[];
  sortOrder: MoneyId[];
  countCoins: { id: MoneyId; count: number }[];
  countTotal: number;
  countChoices: number[];
  compareLeft: SnackId;
  compareRight: SnackId;
  cheaper: SnackId;
  shopTask: ShopTask;
  snackId: SnackId;
  priceCents: number;
  payPieces: MoneyId[];
  payChoices: MoneyId[];
  changeCents: number;
  changeChoices: number[];
  cardsOpen: boolean;
  earnCoins: number;
  saveGoal: number;
  goalItem: string;
  goalName: string;
  walletCents: number;
  cardSave: number;
  cardPrice: number;
  needsOrder: (typeof sortItems)[number]["id"][];
};

export function timeWeekCount(): number {
  return timeWeeks.length;
}

export function clampTimeWeek(index: number): number {
  if (!Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(timeWeeks.length - 1, Math.floor(index)));
}

export function timeIntroduced(weekIndexValue: number): number {
  return timeWeeks[clampTimeWeek(weekIndexValue)];
}

export function isTimeStageId(value: string): value is TimeStageId {
  return timeStages.some((stage) => stage.id === value);
}

/** First week whose introduced count has reached the stage, including the boundary. */
export function firstTimeWeekForStage(stageId: string): number {
  const need = isTimeStageId(stageId) ? stageStart[stageId] : 0;
  if (need <= 0) return 0;
  for (let week = 0; week < timeWeeks.length; week += 1) {
    if (timeWeeks[week] >= need) return week;
  }
  return timeWeeks.length - 1;
}

export function moneyById(id: string) {
  return moneyPieces.find((piece) => piece.id === id) ?? moneyPieces[0];
}

export function snackById(id: string) {
  return snacks.find((snack) => snack.id === id) ?? snacks[0];
}

export function coinSum(pieces: { cents: number; count: number }[]): number {
  return pieces.reduce((sum, piece) => sum + piece.cents * piece.count, 0);
}

export function changeAmount(paidCents: number, priceCents: number): number {
  return Math.max(0, paidCents - priceCents);
}

export function canAfford(walletCents: number, priceCents: number): boolean {
  return walletCents >= priceCents;
}

export function saveGoalMet(saved: number, goal = SAVE_GOAL): boolean {
  return saved >= goal;
}

/** A debit tap spends saved coins. The balance never goes below zero. */
export function saveAfterPay(saved: number, price: number): number {
  return Math.max(0, saved - price);
}

export function snapMinute(minute: number, mode: ClockMode): number {
  const wrapped = ((minute % 60) + 60) % 60;
  if (mode === "hour") return 0;
  const step = mode === "half" ? 30 : mode === "quarter" ? 15 : 5;
  return (Math.round(wrapped / step) * step) % 60;
}

/** Clockwise degrees from 12. Matches the spin wheel: atan2(dx, -dy). */
export function minuteFromAngle(angle: number, mode: ClockMode): number {
  const raw = ((angle % 360) + 360) % 360;
  return snapMinute(raw / 6, mode);
}

export function hourFromAngle(angle: number): number {
  const raw = ((angle % 360) + 360) % 360;
  const hour = Math.round(raw / 30) % 12;
  return hour === 0 ? 12 : hour;
}

export function handsMatch(hour: number, minute: number, targetHour: number, targetMinute: number): boolean {
  const shown = ((hour - 1) % 12 + 12) % 12;
  const target = ((targetHour - 1) % 12 + 12) % 12;
  return shown === target && minute === targetMinute;
}

export function clockCue(hour: number, minute: number): { id: string; say: string } {
  const h = (((hour - 1) % 12) + 12) % 12;
  const hourNumber = h + 1;
  const word = hourWords[hourNumber] ?? "one";
  const m = ((minute % 60) + 60) % 60;
  if (m === 0) return { id: `oclock-${hourNumber}`, say: `${word} o'clock` };
  if (m === 30) return { id: `half-${hourNumber}`, say: `half past ${word}` };
  if (m === 15) return { id: `quarter-past-${hourNumber}`, say: `quarter past ${word}` };
  if (m === 45) {
    const next = hourNumber === 12 ? 1 : hourNumber + 1;
    return { id: `quarter-to-${next}`, say: `quarter to ${hourWords[next]}` };
  }
  const minuteWord = minuteWords[m] ?? String(m);
  return { id: `min-${hourNumber}-${m}`, say: `${word} ${minuteWord}` };
}

export function centsPromptId(cents: number): string {
  return `cents-${cents}`;
}

function rotate<T>(items: T[], salt: number): T[] {
  if (items.length === 0) return items;
  const shift = Math.abs(salt) % items.length;
  return items.slice(shift).concat(items.slice(0, shift));
}

function shuffleIds<T>(items: readonly T[], salt: number): T[] {
  const next = [...items];
  let seed = Math.abs(salt) + 1;
  for (let index = next.length - 1; index > 0; index -= 1) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const swap = seed % (index + 1);
    const current = next[index];
    next[index] = next[swap];
    next[swap] = current;
  }
  return next;
}

function stageFromIntroduced(introduced: number): TimeStageId {
  let cursor = introduced;
  for (const stage of timeStages) {
    if (cursor < stage.size) return stage.id;
    cursor -= stage.size;
  }
  return timeStages[timeStages.length - 1].id;
}

function clockModeFor(stageId: TimeStageId, introduced: number): ClockMode {
  if (stageId === "hours") return "half";
  if (stageId === "minutes" && introduced < 28) return "quarter";
  if (stageId === "minutes" || stageId === "values" || stageId === "change") return "five";
  return "hour";
}

function numberChoices(answer: number, salt: number, low = 1, high = 12): number[] {
  const near = [answer, answer + 1, answer - 1, answer + 2, answer - 2].filter(
    (value) => value >= low && value <= high,
  );
  const picked: number[] = [];
  for (const value of near) {
    if (!picked.includes(value)) picked.push(value);
    if (picked.length === 3) break;
  }
  return rotate(picked, salt);
}

export function lessonForWeek(weekIndexValue: number): TimeLesson {
  const week = clampTimeWeek(weekIndexValue);
  const introduced = timeIntroduced(week);
  const stageId = stageFromIntroduced(introduced);
  const clockMode = clockModeFor(stageId, introduced);
  const targetHour = 1 + (week % 12);
  const targetMinute = clockMode === "half" ? 30 : clockMode === "quarter" ? 15 : clockMode === "five" ? 25 : 0;
  const cue = clockCue(targetHour, targetMinute);
  const dayPart = dayParts[week % dayParts.length].id;
  const untilHours = 1 + (week % 3);
  const untilFrom = targetHour;
  const untilTo = ((targetHour - 1 + untilHours) % 12) + 1;
  const correctRoutine = routineSteps.map((step) => step.id);
  let routineOrder = shuffleIds(correctRoutine, week + 3);
  if (routineOrder.every((id, index) => id === correctRoutine[index])) routineOrder = rotate(routineOrder, 1);
  const coinTarget = moneyPieces[week % moneyPieces.length].id;
  const coinChoices = rotate(
    [coinTarget, ...moneyPieces.map((piece) => piece.id).filter((id) => id !== coinTarget)].slice(0, 3),
    week + 1,
  );
  const sortCoins: MoneyId[] = ["penny", "nickel", "dime", "quarter"];
  const countCoins: { id: MoneyId; count: number }[] = [
    { id: "penny", count: 2 },
    { id: "nickel", count: 1 },
  ];
  const countTotal = coinSum(countCoins.map((coin) => ({ cents: moneyById(coin.id).cents, count: coin.count })));
  const flip = week % 2 === 1;
  const snack = snacks[week % snacks.length];
  const shopTask: ShopTask = stageId === "values" ? "pay" : stageId === "change" ? "change" : "one";
  const priceCents = shopTask === "pay" ? 110 : shopTask === "change" ? 15 : snack.cents;
  return {
    weekIndex: week,
    stageId,
    introduced,
    clockMode,
    targetHour,
    targetMinute,
    clockCueId: cue.id,
    clockSay: cue.say,
    match: clockMode === "quarter" || clockMode === "five",
    dayTask: stageId === "minutes" || stageId === "values" || stageId === "change" ? "until" : "parts",
    dayPart,
    untilFrom,
    untilTo,
    untilHours,
    untilChoices: numberChoices(untilHours, week, 1, 6),
    routineOrder,
    coinTask: stageId === "shop" ? "sort" : stageId === "values" ? "count" : stageId === "change" ? "compare" : "name",
    coinTarget,
    coinChoices,
    sortOrder: shuffleIds(sortCoins, week + 2),
    countCoins,
    countTotal,
    countChoices: rotate([countTotal, countTotal - 1, countTotal + 1], week),
    compareLeft: flip ? "milk" : "apple",
    compareRight: flip ? "apple" : "milk",
    cheaper: "apple",
    shopTask,
    snackId: snack.id,
    priceCents,
    payPieces: ["one", "dime"],
    payChoices: ["one", "dime", "nickel", "quarter"],
    changeCents: changeAmount(25, 15),
    changeChoices: rotate([10, 5, 25], week),
    cardsOpen: stageId === "cards",
    earnCoins: EARN_COINS,
    saveGoal: SAVE_GOAL,
    goalItem: GOAL_ITEM,
    goalName: GOAL_NAME,
    walletCents: shopWalletCents,
    cardSave: cardSaveStart,
    cardPrice,
    needsOrder: shuffleIds(
      sortItems.map((item) => item.id),
      week + 4,
    ),
  };
}

export function lessonForChild(
  createdAt: string,
  now = new Date(),
  timeZone = deviceTimeZone(),
  placedWeek?: number,
): TimeLesson {
  const week = placedWeek ?? weekIndex(createdAt, now, timeZone);
  return lessonForWeek(week);
}

type ManifestEntry = { kind: "words" | "prompts"; id: string; say: string; file: string };

/** Manifest lines for this module. Clips are not bundled until generate-audio runs. */
export function timeManifestEntries(): ManifestEntry[] {
  const entries: ManifestEntry[] = [];
  const seen = new Set<string>();
  const add = (kind: ManifestEntry["kind"], id: string, say: string) => {
    const key = `${kind}:${id}`;
    if (seen.has(key)) return;
    seen.add(key);
    entries.push({ kind, id, say, file: `${kind}/${id}.mp3` });
  };
  for (const id of ["morning", "afternoon", "night", "wake", "eat", "school", "bath", "penny", "nickel", "dime", "quarter", "cookie", "banana", "save", "spend", "share", "need", "want", "lemonade", "tidy", "feed", "help", "debit", "credit"]) {
    add("words", id, id);
  }
  const prompts: [string, string][] = [
    ["time-day", "Is it morning, afternoon, or night?"],
    ["time-routine", "What comes next?"],
    ["time-clock", "Move the hands to the time."],
    ["time-coins", "Which one is this?"],
    ["time-shop", "Buy the snack."],
    ["time-until", "How long until then?"],
    ["time-change", "How much change?"],
    ["time-sort", "Sort the coins."],
    ["time-match", "Match the clock."],
    ["time-jars", "Put each coin in a jar."],
    ["time-chore", "Do a pretend chore."],
    ["time-lemonade", "Serve a cup of lemonade."],
    ["time-earn", "You worked and earned a coin."],
    ["time-save", "Let's save for it!"],
    ["time-needs", "Is it a need or a want?"],
    ["time-debit", "A debit card pays with money you saved."],
    ["time-credit", "A credit card borrows money. We pay it back later."],
    ["time-goal", "The save jar reached the hat."],
    ["time-payback", "Pay the borrowed coin back."],
    ["one-dollar", "one dollar"],
    ["five-dollars", "five dollars"],
  ];
  for (const [id, say] of prompts) add("prompts", id, say);
  for (const [cents, say] of Object.entries(centSays)) add("prompts", `cents-${cents}`, say);
  for (let hour = 1; hour <= 12; hour += 1) {
    for (const minute of [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]) {
      const cue = clockCue(hour, minute);
      add("prompts", cue.id, cue.say);
    }
  }
  return entries;
}

defineSubject({
  id: TIME,
  title: MODULE_TIME,
  stages: timeStages,
  steps: timeSteps,
});
