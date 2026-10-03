import { useState } from "react";
import type { Settings } from "../settings";
import { Illustration } from "../illustrations";
import { nextBaby } from "../data/games";
import { pictureWords } from "../data/ladder";
import { LockBadge } from "./LockBadge";
import type { ChildProfile, StickerInput } from "../data/profiles";
import { FeedGame, HatchGame, MemoryGame, PopGame, RhymeGame } from "./ReadingGames";
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
        // The way back to the list of games: a picture of the list (four tiles), beside the game's name.
        // It was a button with "All games" written on it, on a line of its own above every game, which
        // pushed the bottom of the tallest games off a phone.
        <button type="button" className="games-back" aria-label={lobby === "code" ? "All coding" : "All games"} onClick={() => setGame("home")}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <rect x="3" y="3" width="8" height="8" rx="2.5" />
            <rect x="13" y="3" width="8" height="8" rx="2.5" />
            <rect x="3" y="13" width="8" height="8" rx="2.5" />
            <rect x="13" y="13" width="8" height="8" rx="2.5" />
          </svg>
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
          animal={profile.animal}
          outfit={profile.outfit}
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
          animal={profile.animal}
          outfit={profile.outfit}
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
          knownLetters={knownLetters}
          animal={profile.animal}
          outfit={profile.outfit}
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
          animal={profile.animal}
          outfit={profile.outfit}
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
          animal={profile.animal}
          outfit={profile.outfit}
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
          animal={profile.animal}
          outfit={profile.outfit}
          settingsRef={settingsRef}
          onAttempt={(attempt) =>
            onDone("spin", attempt.stickers, { step: attempt.step, gift: attempt.gift, ladder: attempt.ladder })
          }
        />
      ) : null}
    </div>
  );
}

function TileArt({ id }: { id: GameId }) {
  // The reading games' tiles show a drawing of what is in the game: an egg, a balloon, an apple, a cat
  // and a hat (they rhyme). They were colored blobs: two rectangles for Rhyme Match, a circle for Feed.
  if (id === "hatch") return <span className="code-tile-art" aria-hidden="true"><span className="code-pic is-wide"><Illustration name="egg" /></span></span>;
  if (id === "pop") return <span className="code-tile-art" aria-hidden="true"><span className="code-pic is-wide"><Illustration name="balloon" /></span></span>;
  if (id === "feed") return <span className="code-tile-art" aria-hidden="true"><span className="code-pic is-wide"><Illustration name="apple" /></span></span>;
  if (id === "rhyme") {
    return (
      <span className="code-tile-art" aria-hidden="true">
        <span className="code-pic"><Illustration name="cat" /></span>
        <span className="code-pic"><Illustration name="hat" /></span>
      </span>
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

