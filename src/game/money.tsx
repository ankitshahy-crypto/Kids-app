import type { ReactNode } from "react";
import { promptCue, wordCue, type Cue } from "../audio/player";
import { centsSay, COIN_CENTS, GOOD_ART, TIME_LINES, type GoodId } from "../data/timeGames";
import type { MoneyId } from "../data/timeMoney";
import { Illustration } from "../illustrations";

/**
 * Pretend money and the things it buys, drawn for the money games.
 *
 * The coins were circles about twenty pixels across with "5¢" in small
 * type, next to the word "Nickel" as the thing to tap. Here each coin is a
 * picture big enough to tap, in its own colour and its own size (a dime is
 * the smallest, a quarter the biggest), with its number large on its face.
 * They are our own pictures, not pictures of real money: two painted blank
 * faces (public/games, made by scripts/game-art.py), copper for the penny
 * and silver for the rest, with the coin's size and its number put on here,
 * so the number stays text (sharp at any size) and two pictures make four coins.
 */

const COIN_LOOK: Record<"penny" | "nickel" | "dime" | "quarter", { r: number; face: "copper" | "silver"; under: string; text: string }> = {
  penny: { r: 31, face: "copper", under: "#D68A5E", text: "#6B3814" },
  nickel: { r: 36, face: "silver", under: "#D5D7DA", text: "#3F4A57" },
  dime: { r: 26, face: "silver", under: "#D5D7DA", text: "#3F4A57" },
  quarter: { r: 44, face: "silver", under: "#D5D7DA", text: "#3F4A57" },
};

const coinFace = (face: "copper" | "silver") => `${import.meta.env.BASE_URL}games/coin-${face}.webp`;
/** The other painted money props (public/games, made by scripts/game-art.py): a blank bill, an empty jar. */
const moneyArt = (name: "bill" | "jar") => `${import.meta.env.BASE_URL}games/${name}.webp`;

/** One coin or bill. Every piece is drawn in the same 100 by 100 box, so their sizes can be compared. */
export function Coin({ id }: { id: MoneyId }) {
  if (id === "one" || id === "five") {
    const five = id === "five";
    // One painted bill for both: the app writes the amount on it, and the five is tinted toward
    // lavender so the two tell apart at a glance, as the coins' copper and silver do.
    return (
      <svg className="coin-art" viewBox="0 0 100 100" aria-hidden="true" focusable="false" data-coin-art={id}>
        <image href={moneyArt("bill")} x="3" y="25" width="94" height="50" preserveAspectRatio="xMidYMid meet" data-bill-face={five ? "five" : "one"} style={five ? { filter: "hue-rotate(205deg) saturate(1.15)" } : undefined} />
        <circle cx="50" cy="50" r="16" fill="#FFFDFB" opacity="0.8" />
        <text x="50" y="59" textAnchor="middle" fontSize="26" fontWeight="800" fill={five ? "#5C4A86" : "#356B45"}>
          {five ? "5" : "1"}
        </text>
        <text x="17" y="43" textAnchor="middle" fontSize="13" fontWeight="800" fill={five ? "#5C4A86" : "#356B45"}>
          $
        </text>
        <text x="83" y="67" textAnchor="middle" fontSize="13" fontWeight="800" fill={five ? "#5C4A86" : "#356B45"}>
          $
        </text>
      </svg>
    );
  }
  const look = COIN_LOOK[id];
  const cents = COIN_CENTS[id];
  return (
    <svg className="coin-art" viewBox="0 0 100 100" aria-hidden="true" focusable="false" data-coin-art={id}>
      {/* A plain disc under the picture: the coin has its shape and size from the first frame, before the picture arrives. */}
      <circle cx="50" cy="50" r={look.r - 1.5} fill={look.under} />
      <image href={coinFace(look.face)} x={50 - look.r} y={50 - look.r} width={look.r * 2} height={look.r * 2} data-coin-face={look.face} />
      <text x="50" y={50 + (cents >= 10 ? look.r * 0.3 : look.r * 0.36)} textAnchor="middle" fontSize={cents >= 10 ? look.r * 0.82 : look.r} fontWeight="800" fill={look.text}>
        {cents}
      </text>
    </svg>
  );
}

/** Something for sale, as one of the app's drawings. */
export function Good({ id }: { id: GoodId }) {
  return (
    <span className="good-art" data-good={id}>
      <Illustration name={GOOD_ART[id]} />
    </span>
  );
}

/** A price tag. The number is for a child who knows numbers; the voice says the price for everyone. */
export function PriceTag({ cents, children }: { cents: number; children?: ReactNode }) {
  return (
    <span className="price-tag" data-price={cents}>
      <span className="price-number">{cents >= 100 ? `$${(cents / 100).toFixed(2)}` : `${cents}¢`}</span>
      {children}
    </span>
  );
}

/**
 * A jar with something on its label: a coin to sort by, or a picture of what the jar is for. The
 * jar is the painted one (clear glass, a lid); the label sits on the glass and the coins in it.
 */
export function Jar({ label, fill = 0, children }: { label: ReactNode; fill?: number; children?: ReactNode }) {
  return (
    <span className="coin-jar" data-fill={fill}>
      <img className="jar-glass" src={moneyArt("jar")} alt="" draggable={false} decoding="async" />
      <span className="jar-label">{label}</span>
      {children ? <span className="jar-coins">{children}</span> : null}
    </span>
  );
}

// ---- what the games say -------------------------------------------------

/** A recorded line of these games, by id. */
export function sayLine(id: string): Cue {
  return promptCue(id, TIME_LINES[id] ?? "");
}

export function sayCents(cents: number): Cue {
  return promptCue(`cents-${cents}`, centsSay(cents));
}

export function sayWord(id: string): Cue {
  return wordCue(id, id);
}

/** A coin's name. The bills are phrases ("one dollar"), so they are recorded as lines. */
export function sayCoin(id: MoneyId): Cue {
  if (id === "one") return promptCue("one-dollar", "one dollar");
  if (id === "five") return promptCue("five-dollars", "five dollars");
  return wordCue(id, id);
}

/** A coin's name and what it is worth: "Nickel. Five cents." */
export function sayCoinWorth(id: MoneyId): Cue[] {
  if (id === "one" || id === "five") return [sayCoin(id)];
  return [sayCoin(id), sayCents(COIN_CENTS[id])];
}
