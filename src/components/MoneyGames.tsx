import { useMemo, useState } from "react";
import { numberCue, promptCue, type Cue } from "../audio/player";
import type { AnimalId } from "../data/animals";
import {
  affordable,
  chooseRounds,
  COIN_CENTS,
  coinsRounds,
  lemonadeRounds,
  needsRounds,
  shopRounds,
  sumCoins,
  type GoodId,
} from "../data/timeGames";
import type { JarId, MoneyId, TimeLesson } from "../data/timeMoney";
import { saveGoalMet } from "../data/timeMoney";
import type { Outfit } from "../data/wardrobe";
import { GameFrame, newSalt, Pick, useCoach, useFinish, useRounds, useRoundState, useWiggle } from "../game/kit";
import { Coin, Good, Jar, PriceTag, sayCents, sayCoin, sayCoinWorth, sayLine, sayWord } from "../game/money";
import { Illustration, type IllustrationName } from "../illustrations";
import type { Settings } from "../settings";

/**
 * The money games, rebuilt on the game kit.
 *
 * Each was a page of words with one question on it. The shop said "Buy the
 * apple with one coin." in small type and offered "Nickel", "Dime" and
 * "Penny" to read; Three jars offered "Tidy toys", "Feed the pet" and "Help
 * at home"; Needs and wants was eight words. A child who cannot read needed
 * a grown-up beside them for all of it.
 *
 * Now the voice says what the thing is and what it costs, and asks which
 * money pays for it. Every choice is a picture that says its name, a wrong
 * coin is named and wiggles, and each game is several rounds.
 */

type GameProps = {
  lesson: TimeLesson;
  animal: AnimalId;
  outfit?: Outfit;
  settingsRef: { current: Settings };
  onDone: (label: string) => void;
};

const title = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/** A coin as a thing to tap. `slot` tells two of the same coin apart. */
function CoinPick({
  id,
  slot,
  size = "big",
  wiggle,
  reveal,
  demo,
  used,
  onPick,
}: {
  id: MoneyId;
  slot?: number;
  size?: "big" | "small";
  wiggle?: number;
  reveal?: boolean;
  demo?: boolean;
  used?: boolean;
  onPick: () => void;
}) {
  return (
    <Pick
      id={slot === undefined ? id : `${id}-${slot}`}
      name={id === "one" ? "one dollar" : id === "five" ? "five dollars" : id}
      art={<Coin id={id} />}
      size={size}
      wiggle={wiggle}
      reveal={reveal}
      demo={demo}
      used={used}
      onPick={onPick}
      attrs={{ "data-coin": id }}
    />
  );
}

// ------------------------------------------------------------------ shop

/**
 * The shop. The voice names the thing, says what it costs, and asks for the money: pennies to count
 * out, then the one coin that pays, then coins that add up, then the coin that comes back as change.
 */
export function ShopActivity({ lesson, animal, outfit, settingsRef, onDone }: GameProps) {
  const [salt] = useState(newSalt);
  const list = useMemo(() => shopRounds(lesson.shopTask, salt), [lesson.shopTask, salt]);
  const rounds = useRounds(list);
  const round = rounds.round;
  // The purse places already paid (a penny's or a coin's place in the tray), and whether the round is won.
  const [paid, setPaid] = useRoundState<number[]>(rounds.index, []);
  const [solved, setSolved] = useRoundState(rounds.index, false);
  const wiggle = useWiggle();

  const ask: Cue[] =
    round.kind === "pennies"
      ? [sayLine("shop-pennies")]
      : round.kind === "coin"
        ? [sayLine("shop-which")]
        : round.kind === "pay"
          ? [sayLine("shop-pay")]
          : [sayLine(`shop-paid-${round.paid}`), sayLine("shop-change")];
  const line = [sayWord(round.good), sayLine("shop-costs"), sayCents(round.price), ...ask];
  const coach = useCoach(settingsRef, line, rounds.index);
  useFinish(rounds.finished, settingsRef, coach, () => onDone(title(round.good)));

  const win = (said: Cue[]) => {
    setSolved(true);
    coach.right([...said, sayLine("shop-thanks")], rounds.next);
  };

  const purse: MoneyId[] = round.kind === "pennies" ? ["penny", "penny", "penny", "penny", "penny"] : round.kind === "pay" ? round.purse : [];
  const total = round.kind === "pennies" ? paid.length : sumCoins(paid.map((place) => purse[place]));

  const tapPurse = (place: number) => {
    if (solved || paid.includes(place)) return;
    const coin = purse[place];
    if (round.kind === "pay" && total + COIN_CENTS[coin] > round.price) {
      wiggle.shake(`purse-${place}`);
      coach.miss([sayCoin(coin), sayLine("shop-toomuch")]);
      return;
    }
    const next = [...paid, place];
    setPaid(next);
    wiggle.still();
    const now = total + COIN_CENTS[coin];
    if (now >= round.price) win([sayCents(round.price)]);
    else coach.touch(round.kind === "pennies" ? [numberCue(next.length)] : [sayCoin(coin)]);
  };

  const tapCoin = (id: MoneyId) => {
    if (solved) return;
    const answer = round.kind === "coin" ? round.coin : round.kind === "change" ? round.change : null;
    if (id !== answer) {
      wiggle.shake(id);
      coach.miss(sayCoinWorth(id));
      return;
    }
    wiggle.still();
    win(sayCoinWorth(id));
  };

  // After three misses: the next coin that belongs in the payment.
  const owed = (() => {
    if (round.kind !== "pay") return -1;
    const need = [...round.pays];
    for (const place of paid) {
      const at = need.indexOf(purse[place]);
      if (at >= 0) need.splice(at, 1);
    }
    return purse.findIndex((coin, place) => !paid.includes(place) && need.includes(coin));
  })();

  return (
    <GameFrame
      screen="shop"
      title="Shop"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="shop"
      attrs={{
        "data-task": round.kind,
        "data-good": round.good,
        "data-price": round.price,
        "data-total": total,
        "data-answer": round.kind === "coin" ? round.coin : round.kind === "change" ? round.change : round.kind === "pay" ? round.pays.join(",") : "penny",
        "data-solved": solved ? "true" : "false",
      }}
      stage={
        <div className="shop-counter">
          <Good id={round.good} />
          <PriceTag cents={round.price}>
            {round.kind === "pennies" ? (
              // One place for each cent: the price is something to count, not only a number to read.
              <span className="price-slots">
                {Array.from({ length: round.price }, (_, index) => (
                  <span key={index} className="price-slot" data-filled={index < paid.length ? "true" : "false"}>
                    {index < paid.length ? <Coin id="penny" /> : null}
                  </span>
                ))}
              </span>
            ) : null}
          </PriceTag>
          {round.kind === "pay" ? (
            <span className="shop-till" data-till={total}>
              {paid.map((place) => (
                <Coin key={place} id={purse[place]} />
              ))}
            </span>
          ) : null}
          {round.kind === "change" ? (
            <span className="shop-paid" data-paid={round.paid}>
              <Coin id={round.paid} />
            </span>
          ) : null}
        </div>
      }
    >
      {round.kind === "pennies" || round.kind === "pay"
        ? purse.map((coin, place) => (
            <CoinPick
              key={place}
              id={coin}
              slot={place}
              size="small"
              used={paid.includes(place)}
              wiggle={wiggle.id === `purse-${place}` ? wiggle.count : 0}
              reveal={coach.reveal && place === owed}
              // The very first penny of the game is pointed at: this is how paying works.
              demo={round.kind === "pennies" && rounds.index === 0 && paid.length === 0 && place === 0}
              onPick={() => tapPurse(place)}
            />
          ))
        : round.choices.map((id) => (
            <CoinPick
              key={id}
              id={id}
              wiggle={wiggle.id === id ? wiggle.count : 0}
              reveal={coach.reveal && id === (round.kind === "coin" ? round.coin : round.change)}
              onPick={() => tapCoin(id)}
            />
          ))}
    </GameFrame>
  );
}

// ------------------------------------------------------------------ coins

/** Coins: find the one that is named, sort them into jars, count what they are worth, and say which price is less. */
export function CoinsActivity({ lesson, animal, outfit, settingsRef, onDone }: GameProps) {
  const [salt] = useState(newSalt);
  const list = useMemo(() => coinsRounds(lesson, salt), [lesson, salt]);
  const rounds = useRounds(list);
  const round = rounds.round;
  const [solved, setSolved] = useRoundState(rounds.index, false);
  const wiggle = useWiggle();

  const line: Cue[] =
    round.kind === "name"
      ? [sayLine("coins-find"), sayCoin(round.target)]
      : round.kind === "sort"
        ? [sayCoin(round.coin), sayLine("coins-jar")]
        : round.kind === "count"
          ? [promptCue("time-count", "How many cents?")]
          : [sayLine("coins-less")];
  const coach = useCoach(settingsRef, line, rounds.index);
  const label = round.kind === "name" ? title(round.target) : round.kind === "sort" ? "sorted" : round.kind === "count" ? String(round.total) : round.cheaper;
  useFinish(rounds.finished, settingsRef, coach, () => onDone(label));

  const answer = round.kind === "name" ? round.target : round.kind === "sort" ? round.coin : round.kind === "count" ? String(round.total) : round.cheaper;
  const tap = (id: string, said: Cue[]) => {
    if (solved) return;
    if (id !== answer) {
      wiggle.shake(id);
      coach.miss(said);
      return;
    }
    wiggle.still();
    setSolved(true);
    coach.right(said, rounds.next);
  };

  return (
    <GameFrame
      screen="coins"
      title="Coins"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="table"
      attrs={{ "data-task": round.kind, "data-answer": answer, "data-solved": solved ? "true" : "false" }}
      stage={
        round.kind === "sort" ? (
          <span className="coin-show" data-show={round.coin}>
            <Coin id={round.coin} />
          </span>
        ) : round.kind === "count" ? (
          <span className="coin-row" data-total={round.total}>
            {round.coins.map((coin, index) => (
              <Coin key={index} id={coin} />
            ))}
          </span>
        ) : round.kind === "compare" ? (
          // "Less": a price tag with an arrow pointing down.
          <svg className="less-art" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
            <path d="M22 18h54l30 30v48c0 6-4 10-10 10H22c-6 0-10-4-10-10V28c0-6 4-10 10-10Z" fill="#fffdfb" stroke="#c9b8a6" strokeWidth="4" />
            <circle cx="32" cy="38" r="6" fill="#c9b8a6" />
            <path d="M60 46v36M44 68l16 16 16-16" fill="none" stroke="#5a7c60" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          // A purse of coins: the one to find is among them.
          <span className="coin-row" data-purse="true">
            {round.choices.map((coin) => (
              <Coin key={coin} id={coin} />
            ))}
          </span>
        )
      }
    >
      {round.kind === "name"
        ? round.choices.map((id) => (
            <CoinPick key={id} id={id} wiggle={wiggle.id === id ? wiggle.count : 0} reveal={coach.reveal && id === answer} onPick={() => tap(id, sayCoinWorth(id))} />
          ))
        : null}
      {round.kind === "sort"
        ? round.jars.map((id) => (
            <Pick
              key={id}
              id={id}
              name={`${id} jar`}
              size="mid"
              art={<Jar label={<Coin id={id} />} />}
              wiggle={wiggle.id === id ? wiggle.count : 0}
              reveal={coach.reveal && id === answer}
              onPick={() => tap(id, [sayCoin(id)])}
              attrs={{ "data-jar": id }}
            />
          ))
        : null}
      {round.kind === "count"
        ? round.choices.map((cents) => (
            <Pick
              key={cents}
              id={String(cents)}
              name={`${cents} cents`}
              art={<span className="pick-number">{cents}¢</span>}
              wiggle={wiggle.id === String(cents) ? wiggle.count : 0}
              reveal={coach.reveal && String(cents) === answer}
              onPick={() => tap(String(cents), [sayCents(cents)])}
              attrs={{ "data-cents": cents }}
            />
          ))
        : null}
      {round.kind === "compare"
        ? [round.left, round.right].map((item) => (
            <Pick
              key={item.good}
              id={item.good}
              name={item.good}
              art={<Good id={item.good} />}
              label={
                <PriceTag cents={item.price}>
                  <Coin id={item.coin} />
                </PriceTag>
              }
              wiggle={wiggle.id === item.good ? wiggle.count : 0}
              reveal={coach.reveal && item.good === answer}
              onPick={() => tap(item.good, [sayWord(item.good), sayCents(item.price)])}
              attrs={{ "data-cents": item.price }}
            />
          ))
        : null}
    </GameFrame>
  );
}

// ------------------------------------------------------------------ three jars

const CHORES: { id: "tidy" | "feed" | "help"; art: IllustrationName }[] = [
  { id: "tidy", art: "toybox" },
  { id: "feed", art: "petbowl" },
  { id: "help", art: "broom" },
];

/** What each jar is for, as a picture: saving for the crown, spending at the shop, sharing with a friend. */
function JarMark({ jar }: { jar: JarId }) {
  if (jar === "save") return <Illustration name="crown" />;
  if (jar === "spend") return <Illustration name="apple" />;
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M24 42C10 32 4 24 4 16a10 10 0 0 1 20-3 10 10 0 0 1 20 3c0 8-6 16-20 26Z" fill="#E58FA6" />
    </svg>
  );
}

/**
 * Three jars. First a job earns a coin, three times. Then each coin goes in a jar: save, spend or
 * share. Two in the save jar reach the paper crown.
 */
export function JarsActivity({
  lesson,
  animal,
  outfit,
  settingsRef,
  onDone,
}: Omit<GameProps, "onDone"> & { onDone: (label: string, goalMet: boolean) => void }) {
  const [done, setDone] = useState<string[]>([]);
  const [jars, setJars] = useState<Record<JarId, number>>({ save: 0, spend: 0, share: 0 });
  const [finished, setFinished] = useState(false);
  const earned = done.length;
  const placed = jars.save + jars.spend + jars.share;
  const splitting = earned >= lesson.earnCoins;
  const phase = splitting ? 1 : 0;
  const rounds = { index: phase, total: 2, finished };
  const line = splitting ? [promptCue("time-jars", "Put each coin in a jar.")] : [sayLine("jars-chore")];
  const coach = useCoach(settingsRef, line, phase);
  const reached = saveGoalMet(jars.save, lesson.saveGoal);
  useFinish(finished, settingsRef, coach, () => onDone(reached ? lesson.goalName : "jars", reached));

  const doChore = (id: string) => {
    if (splitting || done.includes(id)) return;
    setDone([...done, id]);
    coach.touch([sayWord(id), promptCue("time-earn", "You worked and earned a coin.")]);
  };

  const put = (jar: JarId) => {
    if (!splitting || finished || placed >= earned) return;
    const next = { ...jars, [jar]: jars[jar] + 1 };
    setJars(next);
    if (placed + 1 < earned) {
      coach.touch([sayWord(jar)]);
      return;
    }
    const met = saveGoalMet(next.save, lesson.saveGoal);
    coach.right([sayWord(jar), met ? promptCue("time-goal", "The save jar reached the hat.") : promptCue("time-save", "Let's save for it!")], () => setFinished(true));
  };

  return (
    <GameFrame
      screen="jars"
      title="Three jars"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="room"
      attrs={{
        "data-earned": earned,
        "data-save": jars.save,
        "data-spend": jars.spend,
        "data-share": jars.share,
        "data-goal": placed >= earned && splitting ? (reached ? "met" : "later") : "open",
        "data-goal-item": lesson.goalItem,
      }}
      stage={
        <div className="jars-stage">
          {/* What the save jar is for, and how many coins it takes. */}
          <span className="jars-goal" data-need={lesson.saveGoal}>
            <Illustration name="crown" />
            <span className="price-slots">
              {Array.from({ length: lesson.saveGoal }, (_, index) => (
                <span key={index} className="price-slot" data-filled={index < jars.save ? "true" : "false"}>
                  {index < jars.save ? <Coin id="penny" /> : null}
                </span>
              ))}
            </span>
          </span>
          <span className="coin-row" data-coins={earned - placed}>
            {Array.from({ length: earned - placed }, (_, index) => (
              <Coin key={index} id="penny" />
            ))}
          </span>
        </div>
      }
    >
      {splitting
        ? (["save", "spend", "share"] as JarId[]).map((jar) => (
            <Pick
              key={jar}
              id={jar}
              name={jar}
              art={
                <Jar label={<JarMark jar={jar} />} fill={jars[jar]}>
                  {Array.from({ length: jars[jar] }, (_, index) => (
                    <Coin key={index} id="penny" />
                  ))}
                </Jar>
              }
              label={title(jar)}
              reveal={coach.reveal && jar === "save"}
              onPick={() => put(jar)}
              attrs={{ "data-jar": jar, "data-count": jars[jar] }}
            />
          ))
        : CHORES.map((chore, index) => (
            <Pick
              key={chore.id}
              id={chore.id}
              name={chore.id}
              art={<Illustration name={chore.art} />}
              used={done.includes(chore.id)}
              demo={earned === 0 && index === 0}
              onPick={() => doChore(chore.id)}
              attrs={{ "data-chore": chore.id }}
            />
          ))}
    </GameFrame>
  );
}

// ------------------------------------------------------------------ lemonade stand

function Cups({ count }: { count: number }) {
  return (
    <span className="cup-row" data-cups={count}>
      {Array.from({ length: count }, (_, index) => (
        <Illustration key={index} name="lemonade" />
      ))}
    </span>
  );
}

/** The lemonade stand. A customer asks for some cups; the right tray is served, and they pay a coin a cup. */
export function LemonadeActivity({ animal, outfit, settingsRef, onDone }: Omit<GameProps, "lesson">) {
  const [salt] = useState(newSalt);
  const list = useMemo(() => lemonadeRounds(salt), [salt]);
  const rounds = useRounds(list);
  const round = rounds.round;
  const [solved, setSolved] = useRoundState(rounds.index, false);
  const [earned, setEarned] = useState(0);
  const wiggle = useWiggle();
  const coach = useCoach(settingsRef, [sayLine(`lemon-${round.cups}`)], rounds.index);
  useFinish(rounds.finished, settingsRef, coach, () => onDone("lemonade"));

  const serve = (count: number) => {
    if (solved) return;
    if (count !== round.cups) {
      wiggle.shake(String(count));
      coach.miss([numberCue(count)]);
      return;
    }
    wiggle.still();
    setSolved(true);
    setEarned(earned + count);
    coach.right([numberCue(count), promptCue("time-earn", "You worked and earned a coin.")], rounds.next);
  };

  return (
    <GameFrame
      screen="lemonade"
      title="Lemonade stand"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="stand"
      attrs={{ "data-answer": round.cups, "data-earned": earned, "data-solved": solved ? "true" : "false" }}
      stage={
        <div className="stand-stage">
          <span className="stand-customer" data-customer={round.customer}>
            <Illustration name={round.customer} />
            {/* What they ask for, as a picture of that many cups. */}
            <span className="stand-bubble">
              <Cups count={round.cups} />
            </span>
          </span>
          <span className="coin-row" data-coins={earned}>
            {Array.from({ length: earned }, (_, index) => (
              <Coin key={index} id="penny" />
            ))}
          </span>
        </div>
      }
    >
      {round.choices.map((count) => (
        <Pick
          key={count}
          id={String(count)}
          name={`${count} cups`}
          art={<Cups count={count} />}
          wiggle={wiggle.id === String(count) ? wiggle.count : 0}
          reveal={coach.reveal && count === round.cups}
          onPick={() => serve(count)}
          attrs={{ "data-cups": count }}
        />
      ))}
    </GameFrame>
  );
}

// ------------------------------------------------------------------ what can I buy?

/** A coin in the purse and three things with prices. Anything the coin covers is right; the rest waits. */
export function ChooseActivity({ animal, outfit, settingsRef, onDone }: Omit<GameProps, "lesson">) {
  const [salt] = useState(newSalt);
  const list = useMemo(() => chooseRounds(salt), [salt]);
  const rounds = useRounds(list);
  const round = rounds.round;
  const [solved, setSolved] = useRoundState(rounds.index, false);
  const [bought, setBought] = useState<GoodId | "">("");
  const wiggle = useWiggle();
  const have = COIN_CENTS[round.wallet];
  const coach = useCoach(settingsRef, [sayLine("choose-have"), sayCents(have), sayLine("choose-what")], rounds.index);
  useFinish(rounds.finished, settingsRef, coach, () => onDone(title(bought || round.goods[0].good)));

  const buy = (good: GoodId, price: number) => {
    if (solved) return;
    if (!affordable(round.wallet, price)) {
      wiggle.shake(good);
      coach.miss([sayCents(price), promptCue("time-save", "Let's save for it!")]);
      return;
    }
    wiggle.still();
    setSolved(true);
    setBought(good);
    coach.right([sayWord(good), sayCents(price)], rounds.next);
  };

  const cheapest = [...round.goods].sort((a, b) => a.price - b.price)[0];
  return (
    <GameFrame
      screen="choose"
      title="What can I buy?"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="shop"
      attrs={{ "data-wallet": have, "data-solved": solved ? "true" : "false" }}
      stage={
        <span className="coin-show" data-show={round.wallet}>
          <Coin id={round.wallet} />
        </span>
      }
    >
      {round.goods.map((item) => (
        <Pick
          key={item.good}
          id={item.good}
          name={item.good}
          art={<Good id={item.good} />}
          label={
            <PriceTag cents={item.price}>
              <Coin id={item.coin} />
            </PriceTag>
          }
          wiggle={wiggle.id === item.good ? wiggle.count : 0}
          reveal={coach.reveal && item.good === cheapest.good}
          onPick={() => buy(item.good, item.price)}
          attrs={{ "data-cents": item.price, "data-afford": affordable(round.wallet, item.price) ? "true" : "false" }}
        />
      ))}
    </GameFrame>
  );
}

// ------------------------------------------------------------------ need or want

function Basket({ kind }: { kind: "need" | "want" }) {
  return (
    <svg className="basket-art" viewBox="0 0 100 90" aria-hidden="true" focusable="false">
      <path d="M22 40c0-22 56-22 56 0" fill="none" stroke="#C48F5C" strokeWidth="6" strokeLinecap="round" />
      <path d="M8 40h84l-9 40c-1 5-5 8-10 8H27c-5 0-9-3-10-8Z" fill={kind === "need" ? "#BFE5C8" : "#F9D976"} />
      <rect x="4" y="34" width="92" height="12" rx="6" fill={kind === "need" ? "#7DB98C" : "#E0A93B"} />
      {kind === "need" ? (
        // A house: the things a home cannot do without.
        <path d="M50 50l18 14h-5v14H37V64h-5Z" fill="#FFFDFB" />
      ) : (
        // A star: the extras.
        <path d="M50 49l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1Z" fill="#FFFDFB" />
      )}
    </svg>
  );
}

/** Need or want: six things, one at a time, each named, into one of two baskets. */
export function NeedsActivity({ animal, outfit, settingsRef, onDone }: Omit<GameProps, "lesson">) {
  const [salt] = useState(newSalt);
  const list = useMemo(() => needsRounds(salt), [salt]);
  const rounds = useRounds(list);
  const item = rounds.round;
  const [solved, setSolved] = useRoundState(rounds.index, false);
  const wiggle = useWiggle();
  const coach = useCoach(settingsRef, [sayWord(item.id), promptCue("time-needs", "Is it a need or a want?")], rounds.index);
  useFinish(rounds.finished, settingsRef, coach, () => onDone("needs"));

  const drop = (kind: "need" | "want") => {
    if (solved) return;
    if (kind !== item.kind) {
      wiggle.shake(kind);
      coach.miss([sayWord(kind)]);
      return;
    }
    wiggle.still();
    setSolved(true);
    coach.right([sayWord(kind)], rounds.next);
  };

  return (
    <GameFrame
      screen="needs"
      title="Need or want"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="room"
      attrs={{ "data-item": item.id, "data-answer": item.kind, "data-solved": solved ? "true" : "false" }}
      stage={
        <span className="need-item" data-kind={item.kind}>
          <Illustration name={item.art} />
        </span>
      }
    >
      {(["need", "want"] as const).map((kind) => (
        <Pick
          key={kind}
          id={kind}
          name={kind}
          art={<Basket kind={kind} />}
          label={title(kind)}
          wiggle={wiggle.id === kind ? wiggle.count : 0}
          reveal={coach.reveal && kind === item.kind}
          onPick={() => drop(kind)}
          attrs={{ "data-bin": kind }}
        />
      ))}
    </GameFrame>
  );
}

// ------------------------------------------------------------------ pretend cards

function CardArt({ kind }: { kind: "debit" | "credit" }) {
  return (
    <svg className="card-art" viewBox="0 0 120 80" aria-hidden="true" focusable="false">
      <rect x="4" y="6" width="112" height="68" rx="12" fill={kind === "debit" ? "#9CCBE8" : "#F3A9A0"} />
      <rect x="4" y="20" width="112" height="12" fill="#243056" opacity="0.5" />
      {kind === "debit" ? (
        // A jar: this card takes from what is saved.
        <path d="M26 42h20c4 3 6 7 6 12v8c0 3-2 5-5 5H25c-3 0-5-2-5-5v-8c0-5 2-9 6-12Z" fill="#FFFDFB" />
      ) : (
        // An arrow that comes back: this card borrows, and is paid back.
        <path d="M24 56a14 14 0 1 1 6 11M24 56l-5-8M24 56l9-3" fill="none" stroke="#FFFDFB" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      )}
      <rect x="66" y="50" width="38" height="8" rx="4" fill="#FFFDFB" opacity="0.8" />
    </svg>
  );
}

/**
 * Pretend cards, for ages 5 to 7 late in the course. A debit card takes a coin out of the save jar
 * at once. A credit card buys now, and the coin is paid back after.
 */
export function CardsActivity({ lesson, animal, outfit, settingsRef, onDone }: GameProps) {
  const kinds: ("coin" | "debit" | "credit")[] = lesson.cardsOpen ? ["debit", "credit"] : ["coin"];
  const rounds = useRounds(kinds);
  const kind = rounds.round;
  const [save, setSave] = useState(lesson.cardSave);
  const [owing, setOwing] = useRoundState(rounds.index, false);
  const [solved, setSolved] = useRoundState(rounds.index, false);
  const line: Cue[] =
    kind === "coin"
      ? [sayLine("shop-pay")]
      : owing
        ? [promptCue("time-payback", "Pay the borrowed coin back.")]
        : [promptCue(kind === "debit" ? "time-debit" : "time-credit", ""), sayLine("cards-tap")];
  const coach = useCoach(settingsRef, line, `${rounds.index}-${owing ? "owing" : "pay"}`);
  useFinish(rounds.finished, settingsRef, coach, () => onDone(lesson.cardsOpen ? "credit" : "coin"));

  const payFromJar = () => {
    setSave((current) => Math.max(0, current - lesson.cardPrice));
    setSolved(true);
    coach.right([sayLine("shop-thanks")], rounds.next);
  };

  const tapCard = () => {
    if (solved || owing) return;
    if (kind === "debit") payFromJar();
    else setOwing(true);
  };

  const tapJar = () => {
    if (solved) return;
    if (kind === "coin" || (kind === "credit" && owing)) payFromJar();
  };

  return (
    <GameFrame
      screen="cards"
      title="Pretend cards"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="shop"
      attrs={{ "data-cards": lesson.cardsOpen ? "open" : "closed", "data-card": kind, "data-save": save, "data-owing": owing ? "true" : "false", "data-price": lesson.cardPrice }}
      stage={
        <div className="shop-counter">
          <Good id="apple" />
          <span className="price-tag" data-price={lesson.cardPrice}>
            <span className="price-slots">
              <span className="price-slot" data-filled={solved || owing ? "true" : "false"}>
                {solved ? <Coin id="penny" /> : null}
              </span>
            </span>
          </span>
        </div>
      }
    >
      {kind !== "coin" ? (
        <Pick id={kind} name={`${kind} card`} art={<CardArt kind={kind} />} label={title(kind)} used={owing} demo={!owing && !solved} onPick={tapCard} attrs={{ "data-card": kind }} />
      ) : null}
      <Pick
        id="save"
        name="save jar"
        art={
          <Jar label={<JarMark jar="save" />} fill={save}>
            {Array.from({ length: save }, (_, index) => (
              <Coin key={index} id="penny" />
            ))}
          </Jar>
        }
        label="Save"
        demo={kind === "coin" || owing}
        onPick={tapJar}
        attrs={{ "data-jar": "save", "data-count": save }}
      />
    </GameFrame>
  );
}
