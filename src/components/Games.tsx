import { useCallback, useEffect, useRef, useState } from "react";
import { playEffect } from "../audio/manager";
import { deckWordCue, letterCue, letterSoundCue, playLetter, playLine, playNumber, promptCue, wordCue } from "../audio/player";
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
  type HatchRound,
  type MemoryCard,
  type PictureItem,
  type RhymeCard,
} from "../data/games";
import type { DeckWord } from "../data/deck";
import { pictureWords, type LadderStep } from "../data/ladder";
import { LockBadge } from "./LockBadge";
import type { ChildProfile, StickerInput } from "../data/profiles";
import { HearButton } from "./HearButton";
import { Hero } from "./Hero";
import { SpinSay } from "./SpinSay";
import { BUILD_TITLES, BuildIt, BuildTileArt, ReadCode, ReadCodeTileArt } from "./BuildIt";
import type { BuildActivity } from "../data/build";
import { CodeTileArt, ThinkGame } from "./ThinkCode";

export type GameId = "hatch" | "pop" | "feed" | "rhyme" | "memory" | "spin" | "bird" | "pattern" | "morning" | "garden" | "build" | "code";

const tiles: { id: GameId; label: string }[] = [
  { id: "hatch", label: "Hatch the Egg" },
  { id: "pop", label: "Letter Pop" },
  { id: "feed", label: "Feed the Animal" },
  { id: "rhyme", label: "Rhyme Match" },
  { id: "memory", label: "Memory Flip" },
  { id: "spin", label: "Spin & Say" },
];

type CodeTile = { id: GameId; label: string; build?: BuildActivity };

/**
 * The Coding page, in the order the plan gave it: a first program (hello world), then think, build, code.
 *
 *  - Start: one block, and the animal says hello. The smallest program there is.
 *  - Think: the four logic games. A path home, a pattern, an order, a rule.
 *  - Build: blocks in a row that the animal acts out, a dance or a song.
 *  - Code: a program written in words, read aloud, for the child to build.
 *
 * The names say what the child does. They were "Bird home", "What next", "Morning" and "If then", in one
 * flat list under a heading at the bottom of Games that nobody found, and Build It's boards sat behind a
 * second menu.
 */
const codeSections: { id: string; title: string; tiles: CodeTile[] }[] = [
  { id: "start", title: "Start here", tiles: [{ id: "build", label: BUILD_TITLES.hello, build: "hello" }] },
  {
    id: "think",
    title: "Think",
    tiles: [
      { id: "bird", label: "Take me home" },
      { id: "pattern", label: "What comes next?" },
      { id: "morning", label: "First, then" },
      { id: "garden", label: "If, then" },
    ],
  },
  {
    id: "build",
    title: "Build",
    tiles: [
      { id: "build", label: BUILD_TITLES.move, build: "move" },
      { id: "build", label: BUILD_TITLES.music, build: "music" },
    ],
  },
  // Read the code is a game of its own, so it opens with the full app. The free part of Coding is the
  // first thing in each of the other parts: hello world, Take me home, and the Build boards.
  { id: "code", title: "Code", tiles: [{ id: "code", label: "Read the code" }] },
];

/** The two lists this screen can open on: the reading games, or the coding games. */
export type GamesLobby = "games" | "code";

export function Games({
  lobby = "games",
  profile,
  knownLetters,
  settingsRef,
  showCode,
  count,
  color,
  colorOptions,
  onEnter,
  onDone,
  locked,
  onLocked,
}: {
  /** Which list to show: Games (from the dock) or Coding (from its own tile on the home screen). */
  lobby?: GamesLobby;
  profile: ChildProfile;
  knownLetters: string[];
  settingsRef: { current: Settings };
  showCode: boolean;
  count: number;
  color: string;
  colorOptions: string[];
  onEnter: (game: GameId) => void;
  onDone: (game: GameId, learned: StickerInput[], extra?: { step?: string; gift?: string; ladder?: boolean }) => void;
  /** Games that open with the full app, and what a tap on one does instead. */
  locked?: (game: GameId) => boolean;
  onLocked?: (game: GameId) => void;
}) {
  const [game, setGame] = useState<GameId | "home">("home");
  // A number that is new each time a game is opened: it picks the round's word or letter and shuffles the
  // answers, so no two plays are alike. (Every game used to open on the same round, answer first.)
  const [plays, setPlays] = useState(() => Math.floor(Math.random() * 1000));
  const [board, setBoard] = useState<BuildActivity>("move");
  const open = (next: GameId, build?: BuildActivity) => {
    if (locked?.(next)) {
      onLocked?.(next);
      return;
    }
    onEnter(next);
    setPlays((count) => count + 1);
    if (build) setBoard(build);
    setGame(next);
  };
  const tile = (id: GameId, label: string, build?: BuildActivity) => (
    <button
      key={build ? `${id}-${build}` : id}
      type="button"
      className={`game-tile${locked?.(id) ? " is-locked" : ""}`}
      data-game-tile={build ? `${id}-${build}` : id}
      data-locked={locked?.(id) ? "true" : undefined}
      onClick={() => open(id, build)}
    >
      {build ? <BuildTileArt activity={build} animal={profile.animal} outfit={profile.outfit} /> : <TileArt id={id} />}
      <span>{label}</span>
      {locked?.(id) ? <LockBadge /> : null}
    </button>
  );

  return (
    <div className="games" data-screen="games" data-lobby={lobby} data-game={game}>
      {game === "home" ? (
        <div className="game-lobby">
          <h1>{lobby === "code" ? "Coding" : "Games"}</h1>
          {lobby === "code" ? (
            codeSections.map((section) => (
              <section key={section.id} className="code-section" data-code-section={section.id}>
                <h2>{section.title}</h2>
                {/* A part with one thing in it shows that one as a wide tile, so nothing sits beside a gap. */}
                <div className={`game-tiles is-code${section.tiles.length === 1 ? " is-single" : ""}`}>
                  {section.tiles.map((item) => tile(item.id, item.label, item.build))}
                </div>
              </section>
            ))
          ) : (
            <div className="game-tiles">{tiles.map((item) => tile(item.id, item.label))}</div>
          )}
        </div>
      ) : (
        <button type="button" className="game-back" onClick={() => setGame("home")}>
          {lobby === "code" ? "All coding" : "All games"}
        </button>
      )}
      {game === "hatch" ? (
        <HatchGame
          knownLetters={knownLetters}
          level={profile.games.hatch}
          ladderStep={profile.ladder.step}
          words={pictureWords()}
          salt={plays}
          baby={nextBaby(profile.stickers.filter((sticker) => sticker.kind === "animal").map((sticker) => sticker.label))}
          settingsRef={settingsRef}
          onDone={(learned) => {
            onDone("hatch", learned, { ladder: true });
            setGame("home");
          }}
        />
      ) : null}
      {game === "pop" ? (
        <PopGame
          knownLetters={knownLetters}
          salt={plays}
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
          salt={plays}
          settingsRef={settingsRef}
          onDone={() => {
            onDone("feed", []);
            setGame("home");
          }}
        />
      ) : null}
      {game === "rhyme" ? (
        <RhymeGame
          salt={plays}
          settingsRef={settingsRef}
          onDone={(learned) => {
            onDone("rhyme", learned, { ladder: true });
            setGame("home");
          }}
        />
      ) : null}
      {game === "memory" ? (
        <MemoryGame
          knownLetters={knownLetters}
          salt={plays}
          settingsRef={settingsRef}
          onDone={() => {
            onDone("memory", []);
            setGame("home");
          }}
        />
      ) : null}
      {game === "bird" || game === "pattern" || game === "morning" || game === "garden" ? (
        <ThinkGame
          kind={game}
          ageRange={profile.ageRange}
          animal={profile.animal}
          outfit={profile.outfit}
          salt={plays}
          settingsRef={settingsRef}
          onDone={() => {
            onDone(game, []);
            setGame("home");
          }}
        />
      ) : null}
      {game === "code" ? (
        <ReadCode
          ageRange={profile.ageRange}
          animal={profile.animal}
          outfit={profile.outfit}
          salt={plays}
          settingsRef={settingsRef}
          showCode={showCode}
          onDone={() => {
            onDone(game, []);
            setGame("home");
          }}
        />
      ) : null}
      {game === "build" ? (
        <BuildIt
          activity={board}
          childId={profile.id}
          ageRange={profile.ageRange}
          animal={profile.animal}
          outfit={profile.outfit}
          settingsRef={settingsRef}
          showCode={showCode}
          onDone={(step) => onDone("build", [], { step })}
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
          onAttempt={(attempt) =>
            onDone("spin", attempt.stickers, { step: attempt.step, gift: attempt.gift, ladder: attempt.ladder })
          }
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
  ladderStep,
  words,
  salt,
  baby,
  settingsRef,
  onDone,
}: {
  knownLetters: string[];
  level: HatchRound["level"];
  ladderStep: LadderStep;
  words: DeckWord[];
  salt: number;
  baby: BabyAnimal;
  settingsRef: { current: Settings };
  onDone: (learned: StickerInput[]) => void;
}) {
  const round = hatchRound(knownLetters, level, words, salt);
  const [filled, setFilled] = useState<number[]>([]);
  const [misses, setMisses] = useState(0);
  const [wiggle, setWiggle] = useState<string | null>(null);
  const play = useCue();
  const hatched = round.blanks.every((index) => filled.includes(index));
  const glow = misses >= 2 ? glowLetter(round, filled) : null;

  // What to do, then the word sounded out and said whole. Again repeats all of it.
  const speakSlowly = () => {
    const sounds = round.word.letters.filter((letter) => !letter.silent).map(letterSoundCue);
    play((signal) => playLine([promptCue("game-hatch", "Tap the missing letters."), ...sounds, deckWordCue(round.word)], settingsRef.current, signal));
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
      play((signal) => playLine([promptCue("game-again", "Try again.")], settingsRef.current, signal));
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
      data-ladder-step={ladderStep}
      data-word={round.word.word}
      data-misses={misses}
      data-cracks={filled.length}
      data-phase={hatched ? "hatched" : "play"}
      data-baby={hatched ? baby : ""}
    >
      <h1>Hatch the Egg</h1>
      <div className="hatch-row">
        <div className="hatch-picture">{round.word.illustration ? <Illustration name={round.word.illustration} /> : null}</div>
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
      <HearButton className="game-hear" onHear={speakSlowly} />
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
        <button type="button" className="start-button" onClick={() => onDone([{ kind: "animal", label: baby }, { kind: "word", label: round.word.word }])}>
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
  salt,
  settingsRef,
  onDone,
}: {
  knownLetters: string[];
  salt: number;
  settingsRef: { current: Settings };
  onDone: () => void;
}) {
  const round = popRound(knownLetters, salt);
  const [popped, setPopped] = useState<string[]>([]);
  const [wiggle, setWiggle] = useState<string | null>(null);
  const play = useCue();
  const targets = round.balloons.filter((balloon) => balloon.target);
  const done = targets.every((balloon) => popped.includes(balloon.id));

  const hearTarget = () =>
    play((signal) => playLine([promptCue("game-pop", "Pop the balloons with this letter."), letterCue(letterTile(round.target))], settingsRef.current, signal));

  useEffect(() => {
    hearTarget();
    // Once per round: the line follows the letter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.target]);

  const pop = (id: string, letter: string, target: boolean) => {
    if (popped.includes(id) || done) return;
    if (!target) {
      setWiggle(id);
      play((signal) => playLine([promptCue("game-again", "Try again.")], settingsRef.current, signal));
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
      <HearButton className="game-hear" onHear={hearTarget} />
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
  salt,
  settingsRef,
  onDone,
}: {
  profile: ChildProfile;
  knownLetters: string[];
  salt: number;
  settingsRef: { current: Settings };
  onDone: () => void;
}) {
  const round = feedRound(knownLetters, salt);
  const [fed, setFed] = useState<string[]>([]);
  const [wiggle, setWiggle] = useState<string | null>(null);
  const play = useCue();
  const drag = useRef<{ id: string; x: number; y: number; moved: boolean } | null>(null);
  const needed = round.items.filter((item) => item.letter === round.target);
  const done = needed.every((item) => fed.includes(item.id));

  const hearTarget = () =>
    play((signal) => playLine([promptCue("game-feed", "Feed me the pictures that start with this letter."), letterCue(letterTile(round.target))], settingsRef.current, signal));

  useEffect(() => {
    hearTarget();
    // Once per round: the line follows the letter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.target]);

  const attempt = (item: PictureItem) => {
    if (fed.includes(item.id) || done) return;
    // Every picture says its name when it is touched, so the child hears the first sound before deciding.
    if (item.letter !== round.target) {
      setWiggle(item.id);
      play((signal) => playLine([wordCue(item.id, item.label), promptCue("game-again", "Try again.")], settingsRef.current, signal));
      return;
    }
    setFed((current) => [...current, item.id]);
    setWiggle(null);
    playEffect("boop", settingsRef.current);
    play((signal) => playLine([wordCue(item.id, item.label)], settingsRef.current, signal));
  };

  return (
    <div className="game-board" data-target={round.target} data-phase={done ? "done" : "play"}>
      <h1>Feed the Animal</h1>
      <p className="game-prompt">
        Pictures that start with <strong>{round.target.toUpperCase()}</strong>
      </p>
      <HearButton className="game-hear" onHear={hearTarget} />
      <div className="feed-row">
        <div className="food-tray">
          {round.items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="food-bit"
              data-food={item.id}
              data-letter={item.letter}
              data-fed={fed.includes(item.id) ? "true" : "false"}
              data-wiggle={wiggle === item.id ? "true" : "false"}
              aria-label={item.label}
              onPointerDown={(event) => {
                if (fed.includes(item.id)) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                drag.current = { id: item.id, x: event.clientX, y: event.clientY, moved: false };
              }}
              onPointerMove={(event) => {
                const info = drag.current;
                if (!info || info.id !== item.id) return;
                if (Math.hypot(event.clientX - info.x, event.clientY - info.y) > 8) info.moved = true;
              }}
              onPointerUp={(event) => {
                const info = drag.current;
                drag.current = null;
                if (!info || info.id !== item.id) return;
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
                if (!info.moved || over) attempt(item);
              }}
            >
              <Illustration name={item.illustration} />
              <span>{item.label}</span>
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
  salt,
  settingsRef,
  onDone,
}: {
  salt: number;
  settingsRef: { current: Settings };
  onDone: (learned: StickerInput[]) => void;
}) {
  // Rhyming is done by ear and by picture, so it does not wait for letters to be taught.
  const cards = rhymeRound(salt);
  const [picked, setPicked] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wiggle, setWiggle] = useState<string | null>(null);
  const play = useCue();
  const done = new Set(cards.map((card) => card.pair)).size === matched.length && cards.length > 0;
  const hearRule = () => play((signal) => playLine([promptCue("game-rhyme", "Find two pictures that rhyme.")], settingsRef.current, signal));

  useEffect(() => {
    hearRule();
    // Once, when the game opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = (card: RhymeCard) => {
    if (done || matched.includes(card.pair)) return;
    play((signal) => playLine([wordCue(card.word, card.word)], settingsRef.current, signal));
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
    play((signal) => playLine([promptCue("game-again", "Try again.")], settingsRef.current, signal));
  };

  return (
    <div className="game-board" data-phase={done ? "done" : "play"}>
      <h1>Rhyme Match</h1>
      <HearButton className="game-hear" onHear={hearRule} />
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
            <Illustration name={card.illustration} />
            <span>{card.word}</span>
          </button>
        ))}
      </div>
      {done ? (
        <button
          type="button"
          className="start-button"
          onClick={() => onDone([...new Set(cards.map((card) => card.word))].map((label) => ({ kind: "word", label })))}
        >
          Done
        </button>
      ) : null}
    </div>
  );
}

function MemoryGame({
  knownLetters,
  salt,
  settingsRef,
  onDone,
}: {
  knownLetters: string[];
  salt: number;
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
      <MemoryBoard key={mode} knownLetters={knownLetters} mode={mode} salt={salt} settingsRef={settingsRef} onDone={onDone} />
    </div>
  );
}

function MemoryBoard({
  knownLetters,
  mode,
  salt,
  settingsRef,
  onDone,
}: {
  knownLetters: string[];
  mode: "letters" | "numbers";
  salt: number;
  settingsRef: { current: Settings };
  onDone: () => void;
}) {
  const cards = memoryRound(knownLetters, mode, salt);
  const [up, setUp] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [lock, setLock] = useState(false);
  const play = useCue();
  const pairs = new Set(cards.map((card) => card.pair));
  const done = matched.length === pairs.size && pairs.size > 0;
  const hearRule = () => play((signal) => playLine([promptCue("game-memory", "Flip two cards. Find a match.")], settingsRef.current, signal));

  useEffect(() => {
    hearRule();
    // Once per board: switching letters and numbers starts a new one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <HearButton className="game-hear" onHear={hearRule} />
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
  // The coding tiles show what the game is made of: an arrow and the nest, a row of animals, an egg that
  // becomes a hen, rain and an umbrella. They were colored blobs.
  if (id === "bird" || id === "pattern" || id === "morning" || id === "garden") return <CodeTileArt id={id} />;
  if (id === "code") return <ReadCodeTileArt />;
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

