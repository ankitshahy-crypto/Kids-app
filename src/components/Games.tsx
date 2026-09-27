import { useCallback, useEffect, useRef, useState } from "react";
import { playEffect } from "../audio/manager";
import { playLetter, playNumber, playOnDevice, playWord } from "../audio/player";
import type { Settings } from "../settings";
import { Illustration } from "../illustrations";
import {
  feedRound,
  glowLetter,
  hatchRound,
  letterTile,
  memoryRound,
  nextBaby,
  popRound,
  rhymeRound,
  type BabyAnimal,
  type Food,
  type HatchRound,
  type MemoryCard,
  type RhymeCard,
} from "../data/games";
import type { ChildProfile, StickerInput } from "../data/profiles";
import { Hero } from "./Hero";
import { SpinSay } from "./SpinSay";

export type GameId = "hatch" | "pop" | "feed" | "rhyme" | "memory" | "spin";

const tiles: { id: GameId; label: string }[] = [
  { id: "hatch", label: "Hatch the Egg" },
  { id: "pop", label: "Letter Pop" },
  { id: "feed", label: "Feed the Animal" },
  { id: "rhyme", label: "Rhyme Match" },
  { id: "memory", label: "Memory Flip" },
  { id: "spin", label: "Spin & Say" },
];

export function Games({
  profile,
  knownLetters,
  settingsRef,
  count,
  color,
  colorOptions,
  onEnter,
  onDone,
}: {
  profile: ChildProfile;
  knownLetters: string[];
  settingsRef: { current: Settings };
  count: number;
  color: string;
  colorOptions: string[];
  onEnter: (game: GameId) => void;
  onDone: (game: GameId, learned: StickerInput[], extra?: { step?: string; gift?: string }) => void;
}) {
  const [game, setGame] = useState<GameId | "home">("home");
  const open = (next: GameId) => {
    onEnter(next);
    setGame(next);
  };

  return (
    <div className="games" data-screen="games" data-game={game}>
      {game === "home" ? (
        <div className="game-lobby">
          <h1>Games</h1>
          <div className="game-tiles">
            {tiles.map((tile) => (
              <button key={tile.id} type="button" className="game-tile" data-game-tile={tile.id} onClick={() => open(tile.id)}>
                <TileArt id={tile.id} />
                <span>{tile.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button type="button" className="game-back" onClick={() => setGame("home")}>
          All games
        </button>
      )}
      {game === "hatch" ? (
        <HatchGame
          knownLetters={knownLetters}
          level={profile.games.hatch}
          baby={nextBaby(profile.stickers.filter((sticker) => sticker.kind === "animal").map((sticker) => sticker.label))}
          settingsRef={settingsRef}
          onDone={(learned) => {
            onDone("hatch", learned);
            setGame("home");
          }}
        />
      ) : null}
      {game === "pop" ? (
        <PopGame
          knownLetters={knownLetters}
          settingsRef={settingsRef}
          onDone={() => {
            onDone("pop", []);
            setGame("home");
          }}
        />
      ) : null}
      {game === "feed" ? (
        <FeedGame
          profile={profile}
          knownLetters={knownLetters}
          settingsRef={settingsRef}
          onDone={() => {
            onDone("feed", []);
            setGame("home");
          }}
        />
      ) : null}
      {game === "rhyme" ? (
        <RhymeGame
          knownLetters={knownLetters}
          settingsRef={settingsRef}
          onDone={() => {
            onDone("rhyme", []);
            setGame("home");
          }}
        />
      ) : null}
      {game === "memory" ? (
        <MemoryGame
          knownLetters={knownLetters}
          settingsRef={settingsRef}
          onDone={() => {
            onDone("memory", []);
            setGame("home");
          }}
        />
      ) : null}
      {game === "spin" ? (
        <SpinSay
          knownLetters={knownLetters}
          hatchLevel={profile.games.hatch}
          spins={profile.games.spins}
          stars={profile.stars}
          writing={profile.writing}
          count={count}
          color={color}
          colorOptions={colorOptions}
          gifts={profile.gifts}
          babies={profile.stickers.filter((sticker) => sticker.kind === "animal").map((sticker) => sticker.label)}
          settingsRef={settingsRef}
          onAttempt={(attempt) => onDone("spin", attempt.stickers, { step: attempt.step, gift: attempt.gift })}
        />
      ) : null}
    </div>
  );
}

function useCue() {
  const audio = useRef<AbortController | null>(null);
  useEffect(() => () => audio.current?.abort(), []);
  return useCallback((run: (signal: AbortSignal) => Promise<void>) => {
    audio.current?.abort();
    const controller = new AbortController();
    audio.current = controller;
    void run(controller.signal).catch(() => undefined);
  }, []);
}

function HatchGame({
  knownLetters,
  level,
  baby,
  settingsRef,
  onDone,
}: {
  knownLetters: string[];
  level: HatchRound["level"];
  baby: BabyAnimal;
  settingsRef: { current: Settings };
  onDone: (learned: StickerInput[]) => void;
}) {
  const round = hatchRound(knownLetters, level);
  const [filled, setFilled] = useState<number[]>([]);
  const [misses, setMisses] = useState(0);
  const [wiggle, setWiggle] = useState<string | null>(null);
  const play = useCue();
  const hatched = round.blanks.every((index) => filled.includes(index));
  const glow = misses >= 2 ? glowLetter(round, filled) : null;

  const speakSlowly = () => {
    play(async (signal) => {
      for (const letter of round.word.letters) {
        if (signal.aborted) return;
        await playLetter(letter, settingsRef.current, signal);
      }
      if (!signal.aborted) await playWord(round.word, settingsRef.current, signal);
    });
  };

  useEffect(() => {
    speakSlowly();
    // The egg speaks once when it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.word.id]);

  const pick = (letter: string) => {
    if (hatched) return;
    const open = round.blanks.filter((index) => !filled.includes(index) && round.word.letters[index].char.toLowerCase() === letter);
    if (open.length === 0) {
      const already = round.blanks.some((index) => round.word.letters[index].char.toLowerCase() === letter);
      if (already) return;
      setMisses((count) => count + 1);
      setWiggle(letter);
      play((signal) => playOnDevice("Try again.", settingsRef.current, signal));
      return;
    }
    const next = [...filled, ...open];
    setFilled(next);
    setWiggle(null);
    play((signal) => playLetter(letterTile(letter), settingsRef.current, signal));
    if (round.blanks.every((index) => next.includes(index))) playEffect("celebrate", settingsRef.current);
  };

  const stillNeeded = new Set(
    round.blanks.filter((index) => !filled.includes(index)).map((index) => round.word.letters[index].char.toLowerCase()),
  );

  return (
    <div
      className="game-board"
      data-level={round.level}
      data-word={round.word.word}
      data-misses={misses}
      data-cracks={filled.length}
      data-phase={hatched ? "hatched" : "play"}
      data-baby={hatched ? baby : ""}
    >
      <h1>Hatch the Egg</h1>
      <div className="hatch-row">
        <div className="hatch-picture">
          <Illustration name={round.word.illustration} />
        </div>
        <EggArt cracks={filled.length} total={round.blanks.length} hatched={hatched} baby={baby} />
      </div>
      <p className="hatch-blanks" aria-label="Word">
        {round.word.letters.map((letter, index) => {
          const open = round.blanks.includes(index);
          const show = !open || filled.includes(index);
          return (
            <span key={`${letter.char}-${index}`} data-blank={open ? (show ? "filled" : "open") : "shown"}>
              {show ? letter.char : ""}
            </span>
          );
        })}
      </p>
      <button type="button" className="hear-button" onClick={speakSlowly}>
        Hear it
      </button>
      <div className="letter-tiles">
        {round.choices.map((letter) => (
          <button
            key={letter}
            type="button"
            className="letter-tile"
            data-letter={letter}
            data-needed={stillNeeded.has(letter) ? "true" : "false"}
            data-glow={glow === letter ? "true" : "false"}
            data-wiggle={wiggle === letter ? "true" : "false"}
            aria-label={letter.toUpperCase()}
            onClick={() => pick(letter)}
          >
            {letter.toUpperCase()}
          </button>
        ))}
      </div>
      {hatched ? (
        <button type="button" className="start-button" onClick={() => onDone([{ kind: "animal", label: baby }])}>
          Done
        </button>
      ) : null}
    </div>
  );
}

function EggArt({ cracks, total, hatched, baby }: { cracks: number; total: number; hatched: boolean; baby: BabyAnimal }) {
  const lines = [
    "M46 78 L62 70 L54 90",
    "M78 64 L64 84 L82 96",
    "M40 108 L58 98 L50 120",
    "M86 112 L70 108 L84 128",
    "M58 58 L70 72",
  ];
  return (
    <svg className="egg-art" viewBox="0 0 120 150" aria-hidden="true">
      {hatched ? (
        <BabyArt name={baby} />
      ) : (
        <>
          <ellipse cx="60" cy="82" rx="40" ry="52" fill="#FFF6E4" stroke="#E4C7A4" strokeWidth="4" />
          {lines.slice(0, Math.min(cracks, total, lines.length)).map((d) => (
            <path key={d} d={d} fill="none" stroke="#C9846A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </>
      )}
    </svg>
  );
}

function BabyArt({ name }: { name: BabyAnimal }) {
  const ear = name === "owlet" ? "#C9B6E4" : name === "duckling" ? "#F6D56B" : name === "fawn" ? "#E4B07A" : "#F6C3CB";
  return (
    <g data-baby-art={name}>
      <ellipse cx="60" cy="108" rx="28" ry="16" fill="#E7D5C6" />
      <circle cx="60" cy="78" r="28" fill={ear} />
      {name === "duckling" ? <ellipse cx="78" cy="82" rx="10" ry="6" fill="#F4A261" /> : null}
      {name === "owlet" ? <circle cx="60" cy="70" r="16" fill="#F7F1E8" /> : null}
      {name !== "duckling" && name !== "owlet" ? (
        <>
          <ellipse cx="40" cy="58" rx="8" ry="12" fill={ear} />
          <ellipse cx="80" cy="58" rx="8" ry="12" fill={ear} />
        </>
      ) : null}
      <circle cx="50" cy="76" r="3" fill="#2C3A4F" />
      <circle cx="70" cy="76" r="3" fill="#2C3A4F" />
    </g>
  );
}

function PopGame({
  knownLetters,
  settingsRef,
  onDone,
}: {
  knownLetters: string[];
  settingsRef: { current: Settings };
  onDone: () => void;
}) {
  const round = popRound(knownLetters);
  const [popped, setPopped] = useState<string[]>([]);
  const [wiggle, setWiggle] = useState<string | null>(null);
  const play = useCue();
  const targets = round.balloons.filter((balloon) => balloon.target);
  const done = targets.every((balloon) => popped.includes(balloon.id));

  useEffect(() => {
    play((signal) => playLetter(letterTile(round.target), settingsRef.current, signal));
  }, [play, round.target, settingsRef]);

  const pop = (id: string, letter: string, target: boolean) => {
    if (popped.includes(id) || done) return;
    if (!target) {
      setWiggle(id);
      play((signal) => playOnDevice("Try again.", settingsRef.current, signal));
      return;
    }
    setPopped((current) => [...current, id]);
    setWiggle(null);
    playEffect("pop", settingsRef.current);
    play((signal) => playLetter(letterTile(letter), settingsRef.current, signal));
  };

  return (
    <div className="game-board" data-target={round.target} data-phase={done ? "done" : "play"}>
      <h1>Letter Pop</h1>
      <p className="game-prompt">
        Pop <strong>{round.target.toUpperCase()}</strong>
      </p>
      <button type="button" className="hear-button" onClick={() => play((signal) => playLetter(letterTile(round.target), settingsRef.current, signal))}>
        Hear it
      </button>
      <div className="balloon-grid">
        {round.balloons.map((balloon) => (
          <button
            key={balloon.id}
            type="button"
            className={`balloon balloon-${balloon.id}`}
            data-balloon={balloon.id}
            data-letter={balloon.letter}
            data-popped={popped.includes(balloon.id) ? "true" : "false"}
            data-wiggle={wiggle === balloon.id ? "true" : "false"}
            aria-label={`Pop ${balloon.letter.toUpperCase()}`}
            onClick={() => pop(balloon.id, balloon.letter, balloon.target)}
          >
            {balloon.letter.toUpperCase()}
          </button>
        ))}
      </div>
      {done ? (
        <button type="button" className="start-button" onClick={onDone}>
          Done
        </button>
      ) : null}
    </div>
  );
}

function FeedGame({
  profile,
  knownLetters,
  settingsRef,
  onDone,
}: {
  profile: ChildProfile;
  knownLetters: string[];
  settingsRef: { current: Settings };
  onDone: () => void;
}) {
  const round = feedRound(knownLetters);
  const [fed, setFed] = useState<string[]>([]);
  const [wiggle, setWiggle] = useState<string | null>(null);
  const play = useCue();
  const drag = useRef<{ id: string; x: number; y: number; moved: boolean } | null>(null);
  const needed = round.foods.filter((food) => food.letter === round.target);
  const done = needed.every((food) => fed.includes(food.id));

  useEffect(() => {
    play((signal) => playLetter(letterTile(round.target), settingsRef.current, signal));
  }, [play, round.target, settingsRef]);

  const attempt = (food: Food) => {
    if (fed.includes(food.id) || done) return;
    if (food.letter !== round.target) {
      setWiggle(food.id);
      play((signal) => playOnDevice("Try again.", settingsRef.current, signal));
      return;
    }
    setFed((current) => [...current, food.id]);
    setWiggle(null);
    playEffect("boop", settingsRef.current);
    play((signal) => playLetter(letterTile(food.letter), settingsRef.current, signal));
  };

  return (
    <div className="game-board" data-target={round.target} data-phase={done ? "done" : "play"}>
      <h1>Feed the Animal</h1>
      <p className="game-prompt">
        Foods that start with <strong>{round.target.toUpperCase()}</strong>
      </p>
      <div className="feed-row">
        <div className="food-tray">
          {round.foods.map((food) => (
            <button
              key={food.id}
              type="button"
              className="food-bit"
              data-food={food.id}
              data-letter={food.letter}
              data-fed={fed.includes(food.id) ? "true" : "false"}
              data-wiggle={wiggle === food.id ? "true" : "false"}
              aria-label={food.label}
              onPointerDown={(event) => {
                if (fed.includes(food.id)) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                drag.current = { id: food.id, x: event.clientX, y: event.clientY, moved: false };
              }}
              onPointerMove={(event) => {
                const info = drag.current;
                if (!info || info.id !== food.id) return;
                if (Math.hypot(event.clientX - info.x, event.clientY - info.y) > 8) info.moved = true;
              }}
              onPointerUp={(event) => {
                const info = drag.current;
                drag.current = null;
                if (!info || info.id !== food.id) return;
                const drop = event.currentTarget.closest(".game-board")?.querySelector("[data-drop=animal]");
                const box = drop?.getBoundingClientRect();
                const overBox = Boolean(
                  box &&
                    event.clientX >= box.left &&
                    event.clientX <= box.right &&
                    event.clientY >= box.top &&
                    event.clientY <= box.bottom,
                );
                const hit = document.elementFromPoint(event.clientX, event.clientY);
                const over = overBox || Boolean(hit?.closest("[data-drop=animal]"));
                if (!info.moved || over) attempt(food);
              }}
            >
              <FoodArt id={food.id} />
              <span>{food.label}</span>
            </button>
          ))}
        </div>
        <div className="feed-animal" data-drop="animal" aria-label="Your animal">
          <Hero animal={profile.animal} outfit={profile.outfit} />
        </div>
      </div>
      {done ? (
        <button type="button" className="start-button" onClick={onDone}>
          Done
        </button>
      ) : null}
    </div>
  );
}

function RhymeGame({
  knownLetters,
  settingsRef,
  onDone,
}: {
  knownLetters: string[];
  settingsRef: { current: Settings };
  onDone: () => void;
}) {
  const cards = rhymeRound(knownLetters, 0);
  const [picked, setPicked] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wiggle, setWiggle] = useState<string | null>(null);
  const play = useCue();
  const done = new Set(cards.map((card) => card.pair)).size === matched.length && cards.length > 0;

  const choose = (card: RhymeCard) => {
    if (done || matched.includes(card.pair)) return;
    play((signal) => playOnDevice(card.word, settingsRef.current, signal));
    if (!picked) {
      setPicked(card.id);
      setWiggle(null);
      return;
    }
    if (picked === card.id) return;
    const first = cards.find((item) => item.id === picked);
    setPicked(null);
    if (first && first.pair === card.pair) {
      setMatched((current) => [...current, card.pair]);
      setWiggle(null);
      playEffect("chime", settingsRef.current);
      return;
    }
    setWiggle(card.id);
    play((signal) => playOnDevice("Try again.", settingsRef.current, signal));
  };

  return (
    <div className="game-board" data-phase={done ? "done" : "play"}>
      <h1>Rhyme Match</h1>
      <div className="rhyme-grid">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            className="rhyme-card"
            data-rhyme={card.id}
            data-word={card.word}
            data-pair={card.pair}
            data-picked={picked === card.id ? "true" : "false"}
            data-matched={matched.includes(card.pair) ? "true" : "false"}
            data-wiggle={wiggle === card.id ? "true" : "false"}
            aria-label={card.word}
            onClick={() => choose(card)}
          >
            <RhymeArt word={card.word} />
            <span>{card.word}</span>
          </button>
        ))}
      </div>
      {done ? (
        <button type="button" className="start-button" onClick={onDone}>
          Done
        </button>
      ) : null}
    </div>
  );
}

function MemoryGame({
  knownLetters,
  settingsRef,
  onDone,
}: {
  knownLetters: string[];
  settingsRef: { current: Settings };
  onDone: () => void;
}) {
  const [mode, setMode] = useState<"letters" | "numbers">("letters");
  return (
    <div className="game-board" data-mode={mode}>
      <h1>Memory Flip</h1>
      <div className="memory-switch" role="group" aria-label="Memory cards">
        <button type="button" aria-pressed={mode === "letters"} onClick={() => setMode("letters")}>
          Letters
        </button>
        <button type="button" aria-pressed={mode === "numbers"} onClick={() => setMode("numbers")}>
          Numbers
        </button>
      </div>
      <MemoryBoard key={mode} knownLetters={knownLetters} mode={mode} settingsRef={settingsRef} onDone={onDone} />
    </div>
  );
}

function MemoryBoard({
  knownLetters,
  mode,
  settingsRef,
  onDone,
}: {
  knownLetters: string[];
  mode: "letters" | "numbers";
  settingsRef: { current: Settings };
  onDone: () => void;
}) {
  const cards = memoryRound(knownLetters, mode, 0);
  const [up, setUp] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [lock, setLock] = useState(false);
  const play = useCue();
  const pairs = new Set(cards.map((card) => card.pair));
  const done = matched.length === pairs.size && pairs.size > 0;

  const flip = (card: MemoryCard) => {
    if (lock || done || matched.includes(card.pair) || up.includes(card.id)) return;
    const next = [...up, card.id];
    setUp(next);
    if (card.face === "numeral" || card.face === "dots") {
      play((signal) => playNumber(Number(card.value), settingsRef.current, signal));
    } else {
      play((signal) => playLetter(letterTile(card.value), settingsRef.current, signal));
    }
    if (next.length < 2) return;
    const first = cards.find((item) => item.id === next[0]);
    const second = cards.find((item) => item.id === next[1]);
    if (first && second && first.pair === second.pair) {
      setMatched((current) => [...current, first.pair]);
      setUp([]);
      playEffect("chime", settingsRef.current);
      return;
    }
    setLock(true);
    window.setTimeout(() => {
      setUp([]);
      setLock(false);
    }, 700);
  };

  return (
    <div data-phase={done ? "done" : "play"}>
      <div className="memory-grid">
        {cards.map((card) => {
          const faceUp = up.includes(card.id) || matched.includes(card.pair);
          return (
            <button
              key={card.id}
              type="button"
              className="memory-card"
              data-card={card.id}
              data-pair={card.pair}
              data-face={card.face}
              data-up={faceUp ? "true" : "false"}
              data-matched={matched.includes(card.pair) ? "true" : "false"}
              aria-label={faceUp ? card.value : "Card"}
              onClick={() => flip(card)}
            >
              {faceUp ? card.face === "dots" ? <Dots count={Number(card.value)} /> : card.value : "?"}
            </button>
          );
        })}
      </div>
      {done ? (
        <button type="button" className="start-button" onClick={onDone}>
          Done
        </button>
      ) : null}
    </div>
  );
}

function Dots({ count }: { count: number }) {
  return (
    <span className="dot-group" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <i key={index} />
      ))}
    </span>
  );
}

function TileArt({ id }: { id: GameId }) {
  if (id === "hatch") {
    return (
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <ellipse cx="40" cy="46" rx="22" ry="26" fill="#FFF6E4" stroke="#E4C7A4" strokeWidth="3" />
        <path d="M30 40 L40 48 L32 56" fill="none" stroke="#C9846A" strokeWidth="2" />
      </svg>
    );
  }
  if (id === "pop") {
    return (
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <ellipse cx="28" cy="36" rx="12" ry="16" fill="#F6C3CB" />
        <ellipse cx="50" cy="32" rx="12" ry="16" fill="#B7D7F2" />
        <ellipse cx="40" cy="52" rx="12" ry="16" fill="#F6D56B" />
      </svg>
    );
  }
  if (id === "feed") {
    return (
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r="18" fill="#F6B07A" />
        <circle cx="33" cy="36" r="2" fill="#2C3A4F" />
        <circle cx="47" cy="36" r="2" fill="#2C3A4F" />
        <ellipse cx="58" cy="58" rx="10" ry="7" fill="#E07A8A" />
      </svg>
    );
  }
  if (id === "rhyme") {
    return (
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <rect x="14" y="22" width="22" height="28" rx="4" fill="#C9E6D4" />
        <rect x="44" y="22" width="22" height="28" rx="4" fill="#F6E3B4" />
      </svg>
    );
  }
  if (id === "spin") {
    return (
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r="26" fill="#F6C3CB" />
        <path d="M40 14 A26 26 0 0 1 66 40 L40 40 Z" fill="#B7D7F2" />
        <path d="M40 66 A26 26 0 0 1 14 40 L40 40 Z" fill="#F6E3B4" />
        <circle cx="40" cy="40" r="8" fill="#fffdfb" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <rect x="16" y="18" width="20" height="26" rx="4" fill="#E7D5C6" />
      <rect x="44" y="18" width="20" height="26" rx="4" fill="#B7D7F2" />
      <rect x="30" y="46" width="20" height="18" rx="4" fill="#F6C3CB" />
    </svg>
  );
}

function FoodArt({ id }: { id: string }) {
  const fill = id === "milk" ? "#F7F1E8" : id === "muffin" ? "#E4B07A" : id === "apple" ? "#E07A8A" : id === "sandwich" ? "#F6D56B" : id === "taco" ? "#F4A261" : id === "pear" ? "#C9E6D4" : id === "ice" ? "#B7D7F2" : id === "nuts" ? "#C9846A" : "#F6C3CB";
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="34" r="18" fill={fill} stroke="#E4C7A4" strokeWidth="3" />
    </svg>
  );
}

function RhymeArt({ word }: { word: string }) {
  const fill = word.endsWith("ap") ? "#B7D7F2" : word.endsWith("in") ? "#F6D56B" : word.endsWith("an") ? "#C9E6D4" : word.endsWith("ad") ? "#F6C3CB" : "#E4B07A";
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect x="12" y="14" width="40" height="36" rx="8" fill={fill} />
    </svg>
  );
}
