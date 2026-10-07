import type { IllustrationName } from "../illustrations";
import { among, mix, shuffle, take } from "./seed";
import type { CoinTask, DayPartId, MoneyId, RoutineId, ShopTask, TimeLesson } from "./timeMoney";

/**
 * The rounds of the Time & Money games.
 *
 * Each of these was one question and one tap: "Nickel", "Dime" or "Penny"
 * as three words to read, and the game was over. A child who could not read
 * could not play, and a child who could was done in two seconds.
 *
 * Now every game is several rounds, new each play, and everything in a round
 * is a picture or is spoken. The week of the course still decides how hard
 * the rounds are (`TimeLesson`); these functions decide what they are.
 */

/** Things for sale. Each is one of the app's drawings and has a recorded word. */
export type GoodId = "apple" | "bun" | "milk" | "cake" | "plum" | "corn" | "grape" | "kite" | "drum" | "boat" | "car" | "hat";
/** The things of the money games: the goods, and the two of Need or want that are not for sale. Each is painted (public/games/goods). */
export type ThingId = GoodId | "bed" | "sock";

const FOODS: GoodId[] = ["apple", "bun", "milk", "cake", "plum", "corn", "grape"];
const TOYS: GoodId[] = ["kite", "drum", "boat", "car", "hat"];
const ALL_GOODS: GoodId[] = [...FOODS, ...TOYS];

export const COIN_CENTS: Record<MoneyId, number> = { penny: 1, nickel: 5, dime: 10, quarter: 25, one: 100, five: 500 };
const COINS: MoneyId[] = ["penny", "nickel", "dime", "quarter"];

/** Amounts that have a recorded clip ("seven cents"). A round never says an amount outside this list. */
export const SPOKEN_CENTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16, 20, 25, 30, 110] as const;

const CENT_WORDS: Record<number, string> = {
  1: "one cent",
  2: "two cents",
  3: "three cents",
  4: "four cents",
  5: "five cents",
  6: "six cents",
  7: "seven cents",
  8: "eight cents",
  9: "nine cents",
  10: "ten cents",
  11: "eleven cents",
  12: "twelve cents",
  15: "fifteen cents",
  16: "sixteen cents",
  20: "twenty cents",
  25: "twenty-five cents",
  30: "thirty cents",
  110: "one dollar and ten cents",
};

export function centsSay(cents: number): string {
  return CENT_WORDS[cents] ?? `${cents} cents`;
}

export function sumCoins(coins: readonly MoneyId[]): number {
  return coins.reduce((total, coin) => total + COIN_CENTS[coin], 0);
}

// ---------------------------------------------------------------- shop

export type ShopRound =
  /** Count out pennies: one for each place on the price tag. */
  | { kind: "pennies"; good: GoodId; price: number }
  /** One coin pays: which one? */
  | { kind: "coin"; good: GoodId; price: number; coin: MoneyId; choices: MoneyId[] }
  /** Several coins add up to the price. `pays` is the set that does; the rest of the purse is too big. */
  | { kind: "pay"; good: GoodId; price: number; pays: MoneyId[]; purse: MoneyId[] }
  /** Paid with one coin worth more than the price: which coin comes back? */
  | { kind: "change"; good: GoodId; price: number; paid: MoneyId; change: MoneyId; choices: MoneyId[] };

const ONE_COIN: { price: number; coin: MoneyId }[] = [
  { price: 1, coin: "penny" },
  { price: 5, coin: "nickel" },
  { price: 10, coin: "dime" },
  { price: 25, coin: "quarter" },
];

/**
 * Prices paid with several coins. The purse holds the coins that pay and others that are each worth
 * more than the price, so a coin that fits is always one that is needed: there is no way to get stuck.
 */
const PAYS: { price: number; pays: MoneyId[]; extra: MoneyId[] }[] = [
  { price: 2, pays: ["penny", "penny"], extra: ["nickel", "dime"] },
  { price: 6, pays: ["nickel", "penny"], extra: ["dime", "quarter"] },
  { price: 7, pays: ["nickel", "penny", "penny"], extra: ["dime"] },
  { price: 11, pays: ["dime", "penny"], extra: ["quarter"] },
  { price: 15, pays: ["dime", "nickel"], extra: ["quarter"] },
  { price: 16, pays: ["dime", "nickel", "penny"], extra: ["quarter"] },
  { price: 20, pays: ["dime", "dime"], extra: ["quarter"] },
  { price: 30, pays: ["quarter", "nickel"], extra: ["one"] },
];

const DOLLAR_PAY = { price: 110, pays: ["one", "dime"] as MoneyId[], extra: ["five"] as MoneyId[] };

const CHANGES: { price: number; paid: MoneyId; change: MoneyId }[] = [
  { price: 15, paid: "quarter", change: "dime" },
  { price: 5, paid: "dime", change: "nickel" },
  { price: 20, paid: "quarter", change: "nickel" },
  { price: 9, paid: "dime", change: "penny" },
  { price: 4, paid: "nickel", change: "penny" },
];

/** Four things to buy. The first week of the shop counts out pennies; later weeks add up coins, then make change. */
export function shopRounds(task: ShopTask, salt = 0): ShopRound[] {
  const goods = take(ALL_GOODS, 4, salt);
  const coin = (index: number, turn: number): ShopRound => {
    const one = ONE_COIN[mix(salt, turn) % ONE_COIN.length];
    return { kind: "coin", good: goods[index], price: one.price, coin: one.coin, choices: among(one.coin, COINS, 3, salt + turn) };
  };
  const pay = (index: number, pool: typeof PAYS): ShopRound => {
    const set = pool[index % pool.length];
    return { kind: "pay", good: goods[index], price: set.price, pays: set.pays, purse: shuffle([...set.pays, ...set.extra], salt + index) };
  };
  if (task === "one") {
    const counts = take([2, 3, 4, 5], 2, salt).sort((a, b) => a - b);
    const coins = take(ONE_COIN.slice(1), 2, salt + 5);
    return [
      { kind: "pennies", good: goods[0], price: counts[0] },
      { kind: "pennies", good: goods[1], price: counts[1] },
      { kind: "coin", good: goods[2], price: coins[0].price, coin: coins[0].coin, choices: among(coins[0].coin, COINS, 3, salt + 1) },
      { kind: "coin", good: goods[3], price: coins[1].price, coin: coins[1].coin, choices: among(coins[1].coin, COINS, 3, salt + 2) },
    ];
  }
  const pool = shuffle(PAYS, salt + 3);
  if (task === "pay") {
    return [coin(0, 1), pay(1, pool), pay(2, pool), { kind: "pay", good: goods[3], price: DOLLAR_PAY.price, pays: DOLLAR_PAY.pays, purse: shuffle([...DOLLAR_PAY.pays, ...DOLLAR_PAY.extra], salt + 9) }];
  }
  const changes = take(CHANGES, 2, salt + 4);
  const change = (index: number, set: (typeof CHANGES)[number]): ShopRound => ({
    kind: "change",
    good: goods[index],
    price: set.price,
    paid: set.paid,
    change: set.change,
    choices: among(set.change, ["penny", "nickel", "dime"], 3, salt + index),
  });
  return [pay(0, pool), pay(1, pool), change(2, changes[0]), change(3, changes[1])];
}

// ---------------------------------------------------------------- coins

export type PricedGood = { good: GoodId; price: number; coin: MoneyId };

export type CoinsRound =
  /** "Find the dime." */
  | { kind: "name"; target: MoneyId; choices: MoneyId[] }
  /** One coin at a time: which jar has the same coin on it? */
  | { kind: "sort"; coin: MoneyId; jars: MoneyId[] }
  /** "How many cents?" */
  | { kind: "count"; coins: MoneyId[]; total: number; choices: number[] }
  /** "Which costs less?" */
  | { kind: "compare"; left: PricedGood; right: PricedGood; cheaper: GoodId };

const COUNT_SETS: MoneyId[][] = [
  ["penny", "penny"],
  ["penny", "penny", "penny"],
  ["nickel", "penny"],
  ["nickel", "penny", "penny"],
  ["nickel", "nickel"],
  ["dime", "penny"],
  ["dime", "nickel"],
  ["dime", "nickel", "penny"],
  ["dime", "dime"],
];

function centChoices(total: number, salt: number): number[] {
  const near = [...SPOKEN_CENTS].filter((cents) => cents !== total).sort((a, b) => Math.abs(a - total) - Math.abs(b - total) || a - b);
  return shuffle([total, near[0], near[1]], salt);
}

export function coinsRounds(lesson: Pick<TimeLesson, "coinTask" | "coinTarget" | "stageId">, salt = 0): CoinsRound[] {
  const task: CoinTask = lesson.coinTask;
  if (task === "sort") {
    // Each coin once, then two of them again, so six coins go into four jars.
    const order = [...shuffle(COINS, salt), ...take(COINS, 2, salt + 1)];
    return order.map((coin) => ({ kind: "sort", coin, jars: COINS }));
  }
  if (task === "count") {
    return take(COUNT_SETS, 3, salt)
      .sort((a, b) => sumCoins(a) - sumCoins(b))
      .map((coins, index) => ({ kind: "count", coins, total: sumCoins(coins), choices: centChoices(sumCoins(coins), salt + index) }));
  }
  if (task === "compare") {
    const goods = take(ALL_GOODS, 6, salt);
    return [0, 1, 2].map((index) => {
      const prices = take(ONE_COIN, 2, salt + index);
      const left: PricedGood = { good: goods[index * 2], price: prices[0].price, coin: prices[0].coin };
      const right: PricedGood = { good: goods[index * 2 + 1], price: prices[1].price, coin: prices[1].coin };
      return { kind: "compare", left, right, cheaper: left.price < right.price ? left.good : right.good };
    });
  }
  // The bills join once the course reaches coin values; before that the four coins are enough to tell apart.
  const late = lesson.stageId === "values" || lesson.stageId === "change" || lesson.stageId === "jars" || lesson.stageId === "earn" || lesson.stageId === "choose" || lesson.stageId === "needs" || lesson.stageId === "cards";
  const pool: MoneyId[] = late ? [...COINS, "one", "five"] : COINS;
  const first = pool.includes(lesson.coinTarget) ? lesson.coinTarget : pool[mix(salt) % pool.length];
  const targets = [first, ...shuffle(pool.filter((id) => id !== first), salt)].slice(0, 4);
  return targets.map((target, index) => ({ kind: "name", target, choices: among(target, pool, 3, salt + index) }));
}

// ---------------------------------------------------------------- parts of the day

/** Something that happens at one part of the day, as a picture and a spoken line. */
export type DayScene = { id: string; part: DayPartId; art: IllustrationName };

export const DAY_SCENES: DayScene[] = [
  { id: "wake", part: "morning", art: "wake" },
  { id: "breakfast", part: "morning", art: "bowl" },
  { id: "lunch", part: "afternoon", art: "bun" },
  { id: "play", part: "afternoon", art: "kite" },
  { id: "moon", part: "night", art: "moon" },
  { id: "sleep", part: "night", art: "bed" },
];

export type DayRound =
  | { kind: "part"; scene: DayScene; choices: DayPartId[] }
  /** Ages 5 to 7: two clocks, and how many hours between them. */
  | { kind: "until"; from: number; to: number; hours: number; choices: number[] };

const PARTS: DayPartId[] = ["morning", "afternoon", "night"];

export function dayRounds(lesson: Pick<TimeLesson, "dayTask" | "targetHour">, salt = 0): DayRound[] {
  if (lesson.dayTask === "until") {
    return [0, 1, 2].map((index) => {
      const from = 1 + ((lesson.targetHour - 1 + index * 3 + (mix(salt, index) % 3)) % 9);
      const hours = 1 + (mix(salt, index + 5) % 3);
      const others = [1, 2, 3, 4].filter((value) => value !== hours);
      return { kind: "until", from, to: from + hours, hours, choices: shuffle([hours, others[0], others[1]], salt + index).sort((a, b) => a - b) };
    });
  }
  // One scene from each part of the day, then one more: four rounds, never the same part twice running.
  const picked = PARTS.map((part, index) => {
    const scenes = DAY_SCENES.filter((scene) => scene.part === part);
    return scenes[mix(salt, index) % scenes.length];
  });
  const order = shuffle(picked, salt);
  const spare = shuffle(
    DAY_SCENES.filter((scene) => !picked.includes(scene) && scene.part !== order[order.length - 1].part),
    salt + 1,
  )[0];
  // The three skies stay in the order of the day, so the choice is made by thinking, not by hunting.
  return [...order, spare].map((scene) => ({ kind: "part", scene, choices: PARTS }));
}

// ---------------------------------------------------------------- my day

export const ROUTINE_ART: Record<RoutineId, IllustrationName> = { wake: "wake", eat: "bowl", school: "school", bath: "bath", bed: "bed" };

export type RoutineRound = { order: RoutineId[]; cards: RoutineId[] };

/** First three parts of the day in order, then all five. */
export function routineRounds(salt = 0): RoutineRound[] {
  const short: RoutineId[] = ["wake", "eat", "bed"];
  const long: RoutineId[] = ["wake", "eat", "school", "bath", "bed"];
  const mixed = (order: RoutineId[], turn: number) => {
    let cards = shuffle(order, salt + turn);
    // Never hand them over already in order.
    if (cards.every((id, index) => id === order[index])) cards = [...cards.slice(1), cards[0]];
    return cards;
  };
  return [
    { order: short, cards: mixed(short, 1) },
    { order: long, cards: mixed(long, 2) },
  ];
}

// ---------------------------------------------------------------- clock

export type ClockHand = "hour" | "minute";

export type ClockRound =
  /** "Find the short hand. It tells the hour." The clock shows a time with the two hands well apart. */
  | { kind: "hand"; hand: ClockHand; hour: number }
  /** The long hand steps from the 12 to the next number, one dot at a time: five dots, five minutes. */
  | { kind: "dots"; hour: number }
  /** "Make the clock say three o'clock." */
  | { kind: "set"; hour: number; minute: number };

/** How many dots the long hand steps over to reach the next number. */
export const DOTS_TO_NEXT = 5;

/**
 * The clock, from the beginning: what each hand is, what the dots between the numbers are, and then
 * three times to set (the week's own, then two more with the same kind of minutes).
 *
 * The first version went straight to "set the clock", as if a child already knew which hand was which.
 */
export function clockRounds(lesson: Pick<TimeLesson, "targetHour" | "targetMinute" | "clockMode">, salt = 0): ClockRound[] {
  const minutes: number[] =
    lesson.clockMode === "hour" ? [0] : lesson.clockMode === "half" ? [30, 0] : lesson.clockMode === "quarter" ? [15, 45, 30] : [5, 10, 20, 25, 35, 40, 50, 55];
  const hours = shuffle(
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((hour) => hour !== lesson.targetHour),
    salt,
  );
  // A time for meeting the hands: the short one far from the long one, which is on the 12.
  const shown = [3, 4, 8, 9][mix(salt, 3) % 4];
  // Which hand is asked for first changes from play to play, so it is listened for, not remembered.
  const first: ClockHand = mix(salt, 4) % 2 === 0 ? "hour" : "minute";
  return [
    { kind: "hand", hand: first, hour: shown },
    { kind: "hand", hand: first === "hour" ? "minute" : "hour", hour: shown },
    { kind: "dots", hour: shown },
    { kind: "set", hour: lesson.targetHour, minute: lesson.targetMinute },
    { kind: "set", hour: hours[0], minute: minutes[mix(salt, 1) % minutes.length] },
    { kind: "set", hour: hours[1], minute: minutes[mix(salt, 2) % minutes.length] },
  ];
}

// ---------------------------------------------------------------- lemonade

/** A customer who asks for some cups, and pays a coin for each. */
export type LemonadeRound = { cups: number; customer: IllustrationName; choices: number[] };

export function lemonadeRounds(salt = 0): LemonadeRound[] {
  const customers = take<IllustrationName>(["cat", "dog", "pig", "fox", "duck", "goat", "frog", "owl"], 3, salt);
  const cups = shuffle([1, 2, 3], salt + 1);
  return cups.map((count, index) => ({ cups: count, customer: customers[index], choices: [1, 2, 3] }));
}

// ---------------------------------------------------------------- choose

/** A purse, and three things with prices. Anything the purse covers is a right answer. */
export type ChooseRound = { wallet: MoneyId; goods: PricedGood[] };

export function chooseRounds(salt = 0): ChooseRound[] {
  const goods = take(ALL_GOODS, 9, salt);
  const wallets: MoneyId[] = ["nickel", "dime", "dime"];
  return wallets.map((wallet, index) => {
    const prices = shuffle(ONE_COIN.slice(1), salt + index);
    return {
      wallet,
      goods: prices.map((price, slot) => ({ good: goods[index * 3 + slot], price: price.price, coin: price.coin })),
    };
  });
}

export function affordable(wallet: MoneyId, price: number): boolean {
  return COIN_CENTS[wallet] >= price;
}

// ---------------------------------------------------------------- needs and wants

export type NeedItem = { id: ThingId; kind: "need" | "want" };

export const NEED_ITEMS: NeedItem[] = [
  { id: "apple", kind: "need" },
  { id: "milk", kind: "need" },
  { id: "bed", kind: "need" },
  { id: "sock", kind: "need" },
  { id: "kite", kind: "want" },
  { id: "cake", kind: "want" },
  { id: "drum", kind: "want" },
  { id: "car", kind: "want" },
];

/** Six things to sort, one at a time: three needs and three wants, mixed. */
export function needsRounds(salt = 0): NeedItem[] {
  const needs = take(NEED_ITEMS.filter((item) => item.kind === "need"), 3, salt);
  const wants = take(NEED_ITEMS.filter((item) => item.kind === "want"), 3, salt + 1);
  return shuffle([...needs, ...wants], salt + 2);
}

// ---------------------------------------------------------------- spoken lines

/** Every line these games say that is not a single word. scripts/sync-manifest.ts writes them into the clip list. */
export const TIME_LINES: Record<string, string> = {
  "kit-done": "You did it!",
  "shop-costs": "It costs",
  "shop-pennies": "Tap a penny for each place.",
  "shop-which": "Which coin pays for it?",
  "shop-pay": "Tap the coins to pay.",
  "shop-toomuch": "That is too much.",
  "shop-thanks": "Thank you!",
  "shop-paid-quarter": "You pay with a quarter.",
  "shop-paid-dime": "You pay with a dime.",
  "shop-paid-nickel": "You pay with a nickel.",
  "shop-change": "Which coin do you get back?",
  "coins-find": "Find the",
  "coins-jar": "Which jar does it go in?",
  "coins-less": "Which costs less?",
  "day-wake": "The sun comes up. We wake up.",
  "day-breakfast": "We eat breakfast.",
  "day-lunch": "The sun is high. We eat lunch.",
  "day-play": "We play outside after lunch.",
  "day-moon": "It is dark. The moon is out.",
  "day-sleep": "We go to sleep.",
  "day-from": "From",
  "day-until": "until",
  "day-hours": "How many hours is that?",
  "routine-first": "What do we do first?",
  "clock-find-short": "Find the short hand. It tells the hour.",
  "clock-find-long": "Find the long hand. It tells the minutes.",
  "clock-is-short": "That is the short hand.",
  "clock-is-long": "That is the long hand.",
  "clock-dots": "The little dots are minutes. Tap to move the long hand one dot.",
  "clock-dots-done": "Five dots. That is five minutes.",
  "clock-make": "Make the clock say",
  "clock-long": "Now the long hand.",
  "lemon-1": "One cup, please.",
  "lemon-2": "Two cups, please.",
  "lemon-3": "Three cups, please.",
  "choose-have": "You have",
  "choose-what": "What can you buy?",
  "jars-chore": "Tap a job to earn a coin.",
  "cards-tap": "Tap the card to pay.",
};

/** The words these games say on their own. Each needs a recorded word clip. */
export function timeGameWords(): string[] {
  return [...new Set<string>([...ALL_GOODS, ...NEED_ITEMS.map((item) => item.id), "penny", "nickel", "dime", "quarter", "morning", "afternoon", "night", "wake", "eat", "school", "bath", "bed", "save", "spend", "share", "need", "want", "tidy", "feed", "help"])];
}

export function timeGameManifestEntries(): { id: string; say: string }[] {
  return [
    ...Object.entries(TIME_LINES).map(([id, say]) => ({ id, say })),
    ...SPOKEN_CENTS.map((cents) => ({ id: `cents-${cents}`, say: centsSay(cents) })),
  ];
}
