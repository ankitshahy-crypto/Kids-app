import { describe, expect, it } from "vitest";
import manifest from "./audioManifest.json";
import {
  affordable,
  centsSay,
  chooseRounds,
  clockRounds,
  COIN_CENTS,
  coinsRounds,
  DAY_SCENES,
  dayRounds,
  lemonadeRounds,
  needsRounds,
  routineRounds,
  shopRounds,
  SPOKEN_CENTS,
  sumCoins,
  TIME_LINES,
  timeGameManifestEntries,
  timeGameWords,
} from "./timeGames";
import { clockCue, lessonForWeek, type ShopTask } from "./timeMoney";

const prompts = manifest.prompts as Record<string, { say: string; source: string }>;
const words = manifest.words as Record<string, { say: string }>;
const salts = Array.from({ length: 60 }, (_, index) => index * 7 + 1);
const spoken = new Set<number>(SPOKEN_CENTS);

describe("the shop", () => {
  it("is four different things to buy, and every price can be said", () => {
    for (const task of ["one", "pay", "change"] as ShopTask[]) {
      for (const salt of salts) {
        const rounds = shopRounds(task, salt);
        expect(rounds).toHaveLength(4);
        expect(new Set(rounds.map((round) => round.good)).size).toBe(4);
        for (const round of rounds) expect(spoken.has(round.price), `${task} ${round.price}`).toBe(true);
      }
    }
  });

  it("starts by counting out pennies, then asks which one coin pays", () => {
    for (const salt of salts) {
      const rounds = shopRounds("one", salt);
      expect(rounds.map((round) => round.kind)).toEqual(["pennies", "pennies", "coin", "coin"]);
      for (const round of rounds) {
        if (round.kind === "pennies") {
          expect(round.price).toBeGreaterThanOrEqual(2);
          expect(round.price).toBeLessThanOrEqual(5);
        }
        if (round.kind === "coin") {
          expect(COIN_CENTS[round.coin]).toBe(round.price);
          expect(round.choices).toContain(round.coin);
          expect(new Set(round.choices).size).toBe(3);
        }
      }
      // The smaller count comes first.
      expect(rounds[0].price).toBeLessThan(rounds[1].price);
    }
  });

  it("never lets a child get stuck paying: a coin that fits is always one that is needed", () => {
    for (const task of ["pay", "change"] as ShopTask[]) {
      for (const salt of salts) {
        for (const round of shopRounds(task, salt)) {
          if (round.kind !== "pay") continue;
          expect(sumCoins(round.pays)).toBe(round.price);
          const extras = [...round.purse];
          for (const coin of round.pays) extras.splice(extras.indexOf(coin), 1);
          expect(extras.length).toBeGreaterThan(0);
          for (const coin of extras) expect(COIN_CENTS[coin], `${round.price} ${coin}`).toBeGreaterThan(round.price);
          expect(round.purse.length).toBeLessThanOrEqual(5);
        }
      }
    }
  });

  it("makes change with one coin that is the difference", () => {
    for (const salt of salts) {
      const rounds = shopRounds("change", salt);
      expect(rounds.map((round) => round.kind)).toEqual(["pay", "pay", "change", "change"]);
      for (const round of rounds) {
        if (round.kind !== "change") continue;
        expect(COIN_CENTS[round.paid] - round.price).toBe(COIN_CENTS[round.change]);
        expect(round.choices).toContain(round.change);
        // The line "You pay with a ..." is recorded for this coin.
        expect(TIME_LINES[`shop-paid-${round.paid}`]).toBeTruthy();
      }
    }
  });

  it("is not the same shop twice", () => {
    const seen = new Set(salts.map((salt) => JSON.stringify(shopRounds("one", salt))));
    expect(seen.size).toBeGreaterThan(20);
  });
});

describe("coins", () => {
  const lesson = (week: number) => lessonForWeek(week);

  it("asks for four different coins by name in the early weeks, without the bills", () => {
    for (const salt of salts) {
      const rounds = coinsRounds(lesson(0), salt);
      expect(rounds).toHaveLength(4);
      const targets = rounds.map((round) => (round.kind === "name" ? round.target : ""));
      expect(new Set(targets).size).toBe(4);
      for (const round of rounds) {
        if (round.kind !== "name") throw new Error("expected a naming round");
        expect(round.choices).toContain(round.target);
        expect(round.choices).not.toContain("one");
        expect(round.choices).not.toContain("five");
      }
    }
  });

  it("sorts six coins into the four jars, every coin at least once", () => {
    const shop = lesson(4);
    expect(shop.coinTask).toBe("sort");
    for (const salt of salts) {
      const rounds = coinsRounds(shop, salt);
      expect(rounds).toHaveLength(6);
      expect(new Set(rounds.map((round) => (round.kind === "sort" ? round.coin : ""))).size).toBe(4);
    }
  });

  it("counts coins to totals that can be said, with the answer among three", () => {
    const values = lesson(8);
    expect(values.coinTask).toBe("count");
    for (const salt of salts) {
      const rounds = coinsRounds(values, salt);
      expect(rounds).toHaveLength(3);
      for (const round of rounds) {
        if (round.kind !== "count") throw new Error("expected a counting round");
        expect(sumCoins(round.coins)).toBe(round.total);
        expect(round.choices).toContain(round.total);
        expect(new Set(round.choices).size).toBe(3);
        for (const cents of round.choices) expect(spoken.has(cents), String(cents)).toBe(true);
      }
    }
  });

  it("compares two prices that differ", () => {
    const change = lesson(9);
    expect(change.coinTask).toBe("compare");
    for (const salt of salts) {
      for (const round of coinsRounds(change, salt)) {
        if (round.kind !== "compare") throw new Error("expected a compare round");
        expect(round.left.price).not.toBe(round.right.price);
        expect(round.left.good).not.toBe(round.right.good);
        const cheaper = round.left.price < round.right.price ? round.left.good : round.right.good;
        expect(round.cheaper).toBe(cheaper);
      }
    }
  });
});

describe("time", () => {
  it("shows something from each part of the day, and never the same part twice running", () => {
    for (const salt of salts) {
      const rounds = dayRounds(lessonForWeek(0), salt);
      expect(rounds).toHaveLength(4);
      const parts = rounds.map((round) => (round.kind === "part" ? round.scene.part : ""));
      expect(new Set(parts).size).toBe(3);
      for (let index = 1; index < parts.length; index += 1) expect(parts[index]).not.toBe(parts[index - 1]);
      expect(new Set(rounds.map((round) => (round.kind === "part" ? round.scene.id : ""))).size).toBe(4);
    }
    for (const scene of DAY_SCENES) expect(TIME_LINES[`day-${scene.id}`], scene.id).toBeTruthy();
  });

  it("asks older children how many hours pass between two times on the same clock", () => {
    const later = lessonForWeek(7);
    expect(later.dayTask).toBe("until");
    for (const salt of salts) {
      for (const round of dayRounds(later, salt)) {
        if (round.kind !== "until") throw new Error("expected an until round");
        expect(round.to - round.from).toBe(round.hours);
        expect(round.to).toBeLessThanOrEqual(12);
        expect(round.choices).toContain(round.hours);
        expect(new Set(round.choices).size).toBe(3);
      }
    }
  });

  it("orders a day in two rounds, and never hands the pictures over already in order", () => {
    for (const salt of salts) {
      const rounds = routineRounds(salt);
      expect(rounds.map((round) => round.order.length)).toEqual([3, 5]);
      for (const round of rounds) {
        expect([...round.cards].sort()).toEqual([...round.order].sort());
        expect(round.cards).not.toEqual(round.order);
      }
    }
  });

  it("sets three different times, each one the voice can say", () => {
    for (const week of [0, 2, 5, 6, 8]) {
      const lesson = lessonForWeek(week);
      for (const salt of salts) {
        const rounds = clockRounds(lesson, salt);
        expect(rounds).toHaveLength(3);
        expect(rounds[0]).toEqual({ hour: lesson.targetHour, minute: lesson.targetMinute });
        expect(new Set(rounds.map((round) => round.hour)).size).toBe(3);
        for (const round of rounds) {
          const cue = clockCue(round.hour, round.minute);
          expect(prompts[cue.id]?.say, cue.id).toBe(cue.say);
          if (lesson.clockMode === "hour") expect(round.minute).toBe(0);
        }
      }
    }
  });
});

describe("the other money games", () => {
  it("serves one, two and three cups to three different customers", () => {
    for (const salt of salts) {
      const rounds = lemonadeRounds(salt);
      expect(rounds.map((round) => round.cups).sort()).toEqual([1, 2, 3]);
      expect(new Set(rounds.map((round) => round.customer)).size).toBe(3);
    }
  });

  it("always has something the purse can buy", () => {
    for (const salt of salts) {
      const rounds = chooseRounds(salt);
      expect(rounds).toHaveLength(3);
      const goods = rounds.flatMap((round) => round.goods.map((item) => item.good));
      expect(new Set(goods).size).toBe(goods.length);
      for (const round of rounds) {
        expect(round.goods.some((item) => affordable(round.wallet, item.price))).toBe(true);
        // And something it cannot, so there is a choice to make.
        expect(round.goods.some((item) => !affordable(round.wallet, item.price))).toBe(true);
      }
    }
  });

  it("sorts three needs and three wants", () => {
    for (const salt of salts) {
      const items = needsRounds(salt);
      expect(items).toHaveLength(6);
      expect(items.filter((item) => item.kind === "need")).toHaveLength(3);
      expect(new Set(items.map((item) => item.id)).size).toBe(6);
    }
  });
});

describe("what the games say", () => {
  it("has a recorded line for every sentence and every amount", () => {
    for (const entry of timeGameManifestEntries()) {
      expect(prompts[entry.id]?.say, entry.id).toBe(entry.say);
      expect(prompts[entry.id]?.source).toBe("neural");
    }
    for (const cents of SPOKEN_CENTS) expect(prompts[`cents-${cents}`]?.say).toBe(centsSay(cents));
  });

  it("has a recorded word for every picture that says its name", () => {
    for (const word of timeGameWords()) expect(words[word], word).toBeTruthy();
  });
});
