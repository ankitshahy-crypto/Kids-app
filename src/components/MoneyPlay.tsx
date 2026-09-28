import { useRef, useState } from "react";
import { playPrompt, playWordId } from "../audio/player";
import { Avatar } from "../avatars";
import type { AnimalId } from "../data/animals";
import {
  chores,
  jarNames,
  lemonadeServes,
  shopGoods,
  sortItems,
  type JarId,
  type MoneyGame,
  type TimeLesson,
} from "../data/timeMoney";
import { canAfford, saveAfterPay, saveGoalMet } from "../data/timeMoney";
import type { Settings } from "../settings";
import { MoneyArt, SnackArt } from "./TimePlay";
import { LockBadge } from "./LockBadge";

function useSpeaker(settingsRef: { current: Settings }) {
  const playRef = useRef<AbortController | null>(null);
  const play = (run: (settings: Settings, signal: AbortSignal) => Promise<void>) => {
    playRef.current?.abort();
    const controller = new AbortController();
    playRef.current = controller;
    void run(settingsRef.current, controller.signal).catch(() => undefined);
  };
  return {
    prompt(id: string, fallback = "") {
      play((settings, signal) => playPrompt(id, settings, signal, fallback));
    },
    word(id: string, fallback: string) {
      play((settings, signal) => playWordId(id, fallback, settings, signal));
    },
  };
}

const tiles: { id: MoneyGame; label: string; name: string }[] = [
  { id: "jars", label: "Jars", name: "Three jars" },
  { id: "lemonade", label: "Lemonade", name: "Lemonade stand" },
  { id: "choose", label: "Choose", name: "Choose a snack" },
  { id: "needs", label: "Needs", name: "Needs and wants" },
  { id: "cards", label: "Cards", name: "Pretend cards" },
];

export function MoneyBoard({
  done,
  locked,
  onOpen,
}: {
  done: Record<string, boolean>;
  /** Tiles that open with the full app. */
  locked?: (id: string) => boolean;
  onOpen: (game: MoneyGame) => void;
}) {
  return (
    <div className="money-games" data-money-play="true">
      {tiles.map((tile) => (
        <button
          key={tile.id}
          type="button"
          className={`math-activity${done[tile.id] ? " is-done" : ""}${locked?.(tile.id) ? " is-locked" : ""}`}
          data-activity={tile.id}
          data-locked={locked?.(tile.id) ? "true" : undefined}
          aria-label={tile.name}
          onClick={() => onOpen(tile.id)}
        >
          {locked?.(tile.id) ? <LockBadge /> : null}
          <span>{tile.label}</span>
        </button>
      ))}
    </div>
  );
}

export function JarsActivity({
  lesson,
  animal,
  settingsRef,
  onDone,
}: {
  lesson: TimeLesson;
  animal: AnimalId;
  settingsRef: { current: Settings };
  onDone: (label: string, goalMet: boolean) => void;
}) {
  const speak = useSpeaker(settingsRef);
  const finished = useRef(false);
  const [doneChores, setDoneChores] = useState<string[]>([]);
  const [jars, setJars] = useState({ save: 0, spend: 0, share: 0 });
  const [ready, setReady] = useState<"" | "met" | "later">("");
  const earned = doneChores.length;
  const placed = jars.save + jars.spend + jars.share;
  const splitting = earned >= lesson.earnCoins;

  const doChore = (id: string) => {
    if (finished.current || doneChores.includes(id) || splitting) return;
    const chore = chores.find((item) => item.id === id);
    speak.word(id, chore?.title.toLowerCase() ?? id);
    speak.prompt("time-earn");
    setDoneChores((current) => [...current, id]);
  };

  const put = (jar: JarId) => {
    if (finished.current || !splitting || placed >= earned) return;
    speak.word(jar, jar);
    const next = { ...jars, [jar]: jars[jar] + 1 };
    setJars(next);
    if (placed + 1 < earned) return;
    const reached = saveGoalMet(next.save, lesson.saveGoal);
    setReady(reached ? "met" : "later");
    if (reached) speak.prompt("time-goal");
    else speak.prompt("time-save", "Let's save for it!");
  };

  const finish = () => {
    if (finished.current || !ready) return;
    finished.current = true;
    onDone(ready === "met" ? lesson.goalName : "jars", ready === "met");
  };

  return (
    <div
      className="math-play"
      data-screen="jars"
      data-earned={earned}
      data-save={jars.save}
      data-spend={jars.spend}
      data-share={jars.share}
      data-goal={ready || "open"}
      data-goal-item={lesson.goalItem}
    >
      <h1>Three jars</h1>
      <div className="shop-row">
        <Avatar animal={animal} />
        <p className="math-prompt">{splitting ? "Put each coin in a jar." : "Do a pretend chore to earn a coin."}</p>
      </div>
      <p className="math-prompt">
        Save {lesson.saveGoal} coins for the {lesson.goalName}.
      </p>
      {splitting ? null : (
        <div className="math-choices" role="group" aria-label="Chores">
          {chores.map((chore) => (
            <button key={chore.id} type="button" data-chore={chore.id} data-done={doneChores.includes(chore.id) ? "true" : "false"} onClick={() => doChore(chore.id)}>
              {chore.title}
            </button>
          ))}
        </div>
      )}
      {splitting ? (
        <div className="jar-row" role="group" aria-label="Jars">
          {jarNames.map((jar) => (
            <button key={jar.id} type="button" className="jar" data-jar={jar.id} onClick={() => put(jar.id)}>
              <span className="jar-fill" style={{ height: `${Math.min(100, jars[jar.id] * 30)}%` }} />
              <span>{jar.title}</span>
              <span data-count={jars[jar.id]}>{jars[jar.id]}</span>
            </button>
          ))}
        </div>
      ) : null}
      {ready === "later" ? <p className="math-prompt" data-message="save">The hat can wait. Let's save for it!</p> : null}
      {ready ? (
        <button type="button" className="math-activity" data-finish="jars" onClick={finish}>
          {ready === "met" ? "The hat is ready" : "Done"}
        </button>
      ) : null}
    </div>
  );
}

export function LemonadeActivity({
  animal,
  settingsRef,
  onDone,
}: {
  animal: AnimalId;
  settingsRef: { current: Settings };
  onDone: (label: string) => void;
}) {
  const speak = useSpeaker(settingsRef);
  const finished = useRef(false);
  const [served, setServed] = useState(0);

  const serve = () => {
    if (finished.current) return;
    const next = served + 1;
    setServed(next);
    speak.prompt("time-earn");
    if (next >= lemonadeServes) {
      finished.current = true;
      onDone("lemonade");
    }
  };

  return (
    <div className="math-play" data-screen="lemonade" data-served={served} data-earned={served}>
      <h1>Lemonade stand</h1>
      <div className="shop-row">
        <Avatar animal={animal} />
        <p className="math-prompt">Serve a cup. Work earns a coin.</p>
      </div>
      <button type="button" className="math-hear" onClick={() => speak.prompt("time-lemonade")}>
        Hear it
      </button>
      <button type="button" className="math-activity" data-serve="cup" onClick={serve}>
        Serve
      </button>
      <div className="coin-pile" aria-hidden="true">
        {Array.from({ length: served }, (_, index) => (
          <MoneyArt key={index} id="penny" />
        ))}
      </div>
    </div>
  );
}

export function ChooseActivity({
  lesson,
  animal,
  settingsRef,
  onDone,
}: {
  lesson: TimeLesson;
  animal: AnimalId;
  settingsRef: { current: Settings };
  onDone: (label: string) => void;
}) {
  const speak = useSpeaker(settingsRef);
  const finished = useRef(false);
  const [wallet, setWallet] = useState(lesson.walletCents);
  const [hint, setHint] = useState("");

  const buy = (id: string) => {
    if (finished.current) return;
    const good = shopGoods.find((item) => item.id === id);
    if (!good) return;
    speak.word(id, good.name.toLowerCase());
    if (!canAfford(wallet, good.cents)) {
      setHint(id);
      speak.prompt("time-save", "Let's save for it!");
      return;
    }
    setWallet(wallet - good.cents);
    finished.current = true;
    onDone(good.name);
  };

  return (
    <div className="math-play" data-screen="choose" data-wallet={wallet} data-hint={hint}>
      <h1>Choose a snack</h1>
      <div className="shop-row">
        <Avatar animal={animal} />
        <p className="math-prompt">You have {wallet}¢.</p>
      </div>
      {hint ? <p className="math-prompt" data-message="save">Let's save for it!</p> : null}
      <div className="math-choices" role="group" aria-label="Snacks">
        {shopGoods.map((good) => (
          <button
            key={good.id}
            type="button"
            data-snack={good.id}
            data-cents={good.cents}
            data-afford={canAfford(wallet, good.cents) ? "true" : "false"}
            onClick={() => buy(good.id)}
          >
            <SnackArt id={good.id} />
            {good.name} {good.cents}¢
          </button>
        ))}
      </div>
    </div>
  );
}

export function NeedsActivity({
  lesson,
  settingsRef,
  onDone,
}: {
  lesson: TimeLesson;
  settingsRef: { current: Settings };
  onDone: (label: string) => void;
}) {
  const speak = useSpeaker(settingsRef);
  const finished = useRef(false);
  const [picked, setPicked] = useState("");
  const [sorted, setSorted] = useState<string[]>([]);
  const [wiggle, setWiggle] = useState("");

  const tapItem = (id: string) => {
    if (sorted.includes(id)) return;
    setPicked(id);
    const item = sortItems.find((entry) => entry.id === id);
    speak.word(id === "crown" ? "want" : id, item?.title.toLowerCase() ?? id);
  };

  const tapBin = (kind: "need" | "want") => {
    if (!picked || finished.current) return;
    const item = sortItems.find((entry) => entry.id === picked);
    if (!item || item.kind !== kind) {
      setWiggle(kind);
      return;
    }
    const next = [...sorted, picked];
    setSorted(next);
    setPicked("");
    setWiggle("");
    if (next.length >= sortItems.length) {
      finished.current = true;
      onDone("needs");
    }
  };

  return (
    <div className="math-play" data-screen="needs" data-sorted={sorted.length} data-picked={picked}>
      <h1>Needs and wants</h1>
      <p className="math-prompt">Tap a picture, then Need or Want.</p>
      <button type="button" className="math-hear" onClick={() => speak.prompt("time-needs")}>
        Hear it
      </button>
      <div className="math-choices" role="group" aria-label="Pictures">
        {lesson.needsOrder.map((id) => {
          const item = sortItems.find((entry) => entry.id === id);
          if (!item) return null;
          return (
            <button
              key={id}
              type="button"
              data-item={id}
              data-kind={item.kind}
              data-picked={picked === id ? "true" : "false"}
              data-sorted={sorted.includes(id) ? "true" : "false"}
              onClick={() => tapItem(id)}
            >
              {item.title}
            </button>
          );
        })}
      </div>
      <div className="math-choices" role="group" aria-label="Need or want">
        <button type="button" data-bin="need" data-wiggle={wiggle === "need" ? "true" : "false"} onClick={() => tapBin("need")}>
          Need
        </button>
        <button type="button" data-bin="want" data-wiggle={wiggle === "want" ? "true" : "false"} onClick={() => tapBin("want")}>
          Want
        </button>
      </div>
    </div>
  );
}

export function CardsActivity({
  lesson,
  settingsRef,
  onDone,
}: {
  lesson: TimeLesson;
  settingsRef: { current: Settings };
  onDone: (label: string) => void;
}) {
  const speak = useSpeaker(settingsRef);
  const finished = useRef(false);
  const [save, setSave] = useState(lesson.cardSave);
  const [card, setCard] = useState("");

  const payCoin = () => {
    if (finished.current) return;
    finished.current = true;
    onDone("coin");
  };

  const choose = (kind: "debit" | "credit") => {
    if (finished.current || card) return;
    setCard(kind);
    speak.prompt(kind === "debit" ? "time-debit" : "time-credit");
    if (kind === "debit") setSave(saveAfterPay(save, lesson.cardPrice));
  };

  const tapCard = () => {
    if (finished.current || card !== "debit") return;
    finished.current = true;
    onDone("debit");
  };

  const payBack = () => {
    if (finished.current || card !== "credit") return;
    setSave(saveAfterPay(lesson.cardSave, lesson.cardPrice));
    speak.prompt("time-payback");
    finished.current = true;
    onDone("credit");
  };

  if (!lesson.cardsOpen) {
    return (
      <div className="math-play" data-screen="cards" data-cards="closed">
        <h1>Pretend cards</h1>
        <p className="math-prompt">Cards can wait. Pay with a coin you saved.</p>
        <button type="button" className="math-activity" data-pay="coin" onClick={payCoin}>
          Pay with a coin
        </button>
      </div>
    );
  }

  return (
    <div className="math-play" data-screen="cards" data-cards="open" data-card={card || "none"} data-save={save} data-price={lesson.cardPrice}>
      <h1>Pretend cards</h1>
      <p className="math-prompt">The snack is {lesson.cardPrice} coin. Your save jar has {save}.</p>
      <div className="jar-row">
        <div className="jar" data-jar="save">
          <span className="jar-fill" style={{ height: `${Math.min(100, save * 20)}%` }} />
          <span>Save</span>
          <span>{save}</span>
        </div>
      </div>
      <div className="math-choices" role="group" aria-label="Pretend cards">
        <button type="button" className="pretend-card" data-card="debit" onClick={() => choose("debit")}>
          Debit card
          <span>Uses money you saved</span>
        </button>
        <button type="button" className="pretend-card" data-card="credit" onClick={() => choose("credit")}>
          Credit card
          <span>Borrow, then pay back</span>
        </button>
      </div>
      {card === "debit" ? (
        <button type="button" className="math-activity" data-tap="card" onClick={tapCard}>
          Tap the card
        </button>
      ) : null}
      {card === "credit" ? (
        <button type="button" className="math-activity" data-payback="true" onClick={payBack}>
          Pay it back
        </button>
      ) : null}
    </div>
  );
}
