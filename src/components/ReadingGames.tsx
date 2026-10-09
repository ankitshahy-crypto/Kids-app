import { useEffect, useMemo, useRef, useState } from "react";
import { playEffect } from "../audio/manager";
import { deckWordCue, letterCue, letterSoundCue, numberCue, promptCue, wordCue, type Cue } from "../audio/player";
import type { AnimalId } from "../data/animals";
import type { DeckWord } from "../data/deck";
import {
  feedRounds,
  GLOW_AFTER_MISSES,
  glowLetter,
  hatchRounds,
  letterTile,
  memoryRounds,
  playLine,
  popRounds,
  rhymeRounds,
  type BabyAnimal,
  type HatchRound,
  type MemoryCard,
  type PictureItem,
  type RhymeCard,
} from "../data/games";
import type { LadderStep } from "../data/ladder";
import type { StickerInput } from "../data/profiles";
import type { Outfit } from "../data/wardrobe";
import { GameFrame, Hand, Pick, useCoach, useFinish, useRounds, useRoundState, useWiggle } from "../game/kit";
import { Illustration } from "../illustrations";
import type { Settings } from "../settings";

/**
 * The reading games (Hatch, Pop, Feed, Rhyme, Memory), rebuilt on the game kit (src/game/kit.tsx).
 *
 * After the first phone test: "Apply this logic to all the games." Each of these was one round on a
 * bare page with its instruction in writing ("Pop A", "Pictures that start with M") and a button that
 * said Done. Memory's cards were slivers a finger could not hit, under two tabs named in writing.
 *
 * Now each plays a few rounds in a scene with the child's animal: an egg that cracks a little more with
 * each word and hatches at the end, balloons in the sky, a plate that fills, pictures that are said to
 * rhyme or not to, and cards a hand can flip. What is tapped says its sound or its name, a miss ends
 * nothing, and the game ends with "You did it!" and the star.
 *
 * The rounds themselves, and what each letter or picture is, are unchanged: src/data/games.ts.
 */

type Shared = {
  animal: AnimalId;
  outfit: Outfit;
  salt: number;
  settingsRef: { current: Settings };
};

const say = (id: string): Cue => promptCue(id, playLine(id));

/** A letter on a card: what the animal is asking for. */
function LetterSign({ letter }: { letter: string }) {
  return (
    <span className="letter-sign" data-sign={letter} aria-hidden="true">
      {letter.toUpperCase()}
    </span>
  );
}

// ------------------------------------------------------------------ hatch

const CRACKS = ["M46 78 L62 70 L54 90", "M78 64 L64 84 L82 96", "M40 108 L58 98 L50 120", "M86 112 L70 108 L84 128", "M58 58 L70 72"];

function EggArt({ cracks, total, hatched, baby, rock }: { cracks: number; total: number; hatched: boolean; baby: BabyAnimal; rock: number }) {
  // Every crack is drawn by the last word, however many words there are.
  const shown = hatched ? CRACKS.length : Math.round((Math.min(cracks, total) / Math.max(1, total)) * CRACKS.length);
  return (
    <svg className="egg-art" viewBox="0 0 120 150" data-cracks={shown} data-hatched={hatched ? "true" : "false"} aria-hidden="true">
      <ellipse cx="60" cy="140" rx="46" ry="9" fill="#c9a77c" />
      <path d="M16 136c10-12 22-16 44-16s34 4 44 16Z" fill="#b98a5e" />
      {hatched ? (
        <g className="egg-baby">
          <BabyArt name={baby} />
          <path d="M22 122c0-10 6-22 12-14l8 8 8-10 10 10 10-10 8 10 8-8c6-8 12 4 12 14Z" fill="#FFF6E4" stroke="#E4C7A4" strokeWidth="3" strokeLinejoin="round" />
        </g>
      ) : (
        // `rock` changes with each right letter, so the egg rocks again each time.
        <g key={rock} className={rock > 0 ? "egg-rock" : undefined}>
          <ellipse cx="60" cy="80" rx="38" ry="50" fill="#FFF6E4" stroke="#E4C7A4" strokeWidth="4" />
          {CRACKS.slice(0, shown).map((d) => (
            <path key={d} d={d} fill="none" stroke="#C9846A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </g>
      )}
    </svg>
  );
}

/** A baby animal, as drawn in the egg. Spin & Say shows the same one as a present. */
export function BabyArt({ name }: { name: BabyAnimal }) {
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

/**
 * Hatch the Egg: a picture, its word with letters missing, and letters to tap. Each word finished cracks
 * the egg a little more; the last one hatches it.
 */
export function HatchGame({
  knownLetters,
  level,
  ladderStep,
  words,
  baby,
  animal,
  outfit,
  salt,
  settingsRef,
  onDone,
}: Shared & {
  knownLetters: string[];
  level: HatchRound["level"];
  ladderStep: LadderStep;
  words: DeckWord[];
  baby: BabyAnimal;
  onDone: (learned: StickerInput[]) => void;
}) {
  const known = knownLetters.join("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const list = useMemo(() => hatchRounds(knownLetters, level, words, salt), [known, level, words, salt]);
  const rounds = useRounds(list);
  const round = rounds.round;
  const [filled, setFilled] = useRoundState<number[]>(rounds.index, []);
  const [rock, setRock] = useState(0);
  const wiggle = useWiggle();
  const solved = round.blanks.every((index) => filled.includes(index));
  // What to do, then the word sounded out and said whole. The speaker repeats all of it.
  const sounds = round.word.letters.filter((letter) => !letter.silent).map(letterSoundCue);
  const coach = useCoach(settingsRef, [promptCue("game-hatch", "Tap the missing letters."), ...sounds, deckWordCue(round.word)], rounds.index);
  useFinish(rounds.finished, settingsRef, coach, () =>
    onDone([{ kind: "animal", label: baby }, ...list.map((item) => ({ kind: "word" as const, label: item.word.word }))]),
  );
  const charAt = (index: number) => round.word.letters[index].char.toLowerCase();
  // The teacher's and parent's pages say the right letter glows after two tries, so here it is two, not the kit's three.
  const glow = !solved && coach.misses >= GLOW_AFTER_MISSES ? glowLetter(round, filled) : null;

  const pick = (letter: string) => {
    if (solved) return;
    const open = round.blanks.filter((index) => !filled.includes(index) && charAt(index) === letter);
    if (open.length === 0) {
      // A letter already put in is not a miss.
      if (round.blanks.some((index) => charAt(index) === letter)) return;
      wiggle.shake(letter);
      // The wrong letter says its own sound, so the child hears it is not the one in the word.
      coach.miss([letterSoundCue(letterTile(letter))]);
      return;
    }
    const next = [...filled, ...open];
    setFilled(next);
    setRock((count) => count + 1);
    wiggle.still();
    if (round.blanks.every((index) => next.includes(index))) coach.right([deckWordCue(round.word)], rounds.next, 1200);
    else coach.touch([letterSoundCue(letterTile(letter))]);
  };

  const stillNeeded = new Set(round.blanks.filter((index) => !filled.includes(index)).map(charAt));
  const done = rounds.finished ? list.length : rounds.index + (solved ? 1 : 0);
  // The round's line sounds the word out ("Tap the missing letters", then a... n... t..., then "ant"),
  // and each letter lights as its sound is said, the blank too; the whole word lights as it is said.
  // In the playtest of build 3 the sounding-out was taken for answers: /n/ is a flat hum, and it was
  // heard as a buzzer for the A just tapped. Lit, the sounds are seen to be the word's own.
  const voiced = round.word.letters.flatMap((letter, index) => (letter.silent ? [] : [index]));
  const part = coach.saying;
  const soundingLetter = part !== null && part >= 1 && part <= voiced.length ? voiced[part - 1] : null;
  const sayingWord = part === voiced.length + 1;
  // A letter already in the word (the N of te_t) says its own sound when tapped, and lights while it
  // does. It is never a miss: nothing wiggles and no boop is played. The letters to tap are the
  // tiles below; a letter on the card is there to be heard. (The playtest of build 4: the N on the
  // tent card was taken for a wrong answer.)
  const [heard, setHeard] = useState<number | null>(null);
  const heardTurn = useRef(0);
  const hearShown = (index: number) => {
    const letter = round.word.letters[index];
    if (!letter || letter.silent) return;
    const mine = ++heardTurn.current;
    const quiet = () => {
      if (heardTurn.current === mine) setHeard(null);
    };
    setHeard(index);
    coach.touch();
    coach.speak.line([letterSoundCue(letter)], quiet, { remember: false, onStop: quiet });
  };
  return (
    <GameFrame
      screen="hatch"
      title="Hatch the Egg"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="field"
      attrs={{
        "data-level": round.level,
        "data-ladder-step": ladderStep,
        "data-word": round.word.word,
        "data-cracks": filled.length,
        "data-eggs": done,
        "data-phase": rounds.finished ? "hatched" : "play",
        "data-baby": rounds.finished ? baby : "",
        "data-solved": solved ? "true" : "false",
      }}
      stage={
        <span className="hatch-stage">
          <span className="hatch-picture">{round.word.illustration ? <Illustration name={round.word.illustration} /> : null}</span>
          <EggArt cracks={done} total={list.length} hatched={rounds.finished} baby={baby} rock={rock} />
        </span>
      }
    >
      <p className="hatch-blanks" aria-label="Word" data-saying={sayingWord ? "word" : soundingLetter !== null ? "sound" : heard !== null ? "tapped" : "none"}>
        {round.word.letters.map((letter, index) => {
          const open = round.blanks.includes(index);
          const show = !open || filled.includes(index);
          const lit = soundingLetter === index || sayingWord || heard === index;
          if (!show) {
            return <span key={`${letter.char}-${index}`} data-blank="open" data-sounding={lit ? "true" : "false"} />;
          }
          return (
            <button
              key={`${letter.char}-${index}`}
              type="button"
              className="hatch-letter"
              aria-label={`Hear ${letter.char}`}
              data-blank={open ? "filled" : "shown"}
              data-sounding={lit ? "true" : "false"}
              onClick={() => hearShown(index)}
            >
              {letter.char}
            </button>
          );
        })}
      </p>
      {round.choices.map((letter) => (
        <Pick
          key={letter}
          id={letter}
          name={letter.toUpperCase()}
          size={round.choices.length > 3 ? "mid" : "big"}
          art={<span className="pick-letter">{letter.toUpperCase()}</span>}
          wiggle={wiggle.id === letter ? wiggle.count : 0}
          reveal={glow === letter}
          onPick={() => pick(letter)}
          attrs={{ "data-letter": letter, "data-needed": stillNeeded.has(letter) ? "true" : "false", "data-glow": glow === letter ? "true" : "false" }}
        />
      ))}
    </GameFrame>
  );
}

// ------------------------------------------------------------------ pop

const BALLOON_COLORS = ["#f6c3cb", "#b7d7f2", "#f6d56b", "#c9b6e8", "#b8dfb4", "#f2b99a"];

/** Letter Pop: balloons in the sky, each with a letter. The ones with the letter asked for are popped. */
export function PopGame({ knownLetters, animal, outfit, salt, settingsRef, onDone }: Shared & { knownLetters: string[]; onDone: () => void }) {
  const known = knownLetters.join("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const list = useMemo(() => popRounds(knownLetters, salt), [known, salt]);
  const rounds = useRounds(list);
  const round = rounds.round;
  const [popped, setPopped] = useRoundState<string[]>(rounds.index, []);
  const wiggle = useWiggle();
  const coach = useCoach(settingsRef, [promptCue("game-pop", "Pop the balloons with this letter."), letterCue(letterTile(round.target))], rounds.index);
  useFinish(rounds.finished, settingsRef, coach, onDone);
  const targets = round.balloons.filter((balloon) => balloon.target);
  const solved = targets.every((balloon) => popped.includes(balloon.id));
  // After three misses the hand points at a balloon still to pop.
  const hint = coach.reveal && !solved ? targets.find((balloon) => !popped.includes(balloon.id))?.id : undefined;

  const pop = (id: string, letter: string, target: boolean) => {
    if (solved || popped.includes(id)) return;
    if (!target) {
      wiggle.shake(id);
      coach.miss([letterSoundCue(letterTile(letter))]);
      return;
    }
    const next = [...popped, id];
    setPopped(next);
    wiggle.still();
    playEffect("pop", settingsRef.current);
    if (targets.every((balloon) => next.includes(balloon.id))) coach.right([letterCue(letterTile(letter))], rounds.next, 1000);
    else coach.touch([letterSoundCue(letterTile(letter))]);
  };

  return (
    <GameFrame
      screen="pop"
      title="Letter Pop"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="field"
      attrs={{ "data-target": round.target, "data-popped": popped.length, "data-phase": rounds.finished ? "done" : "play", "data-solved": solved ? "true" : "false" }}
      stage={
        <span className="pop-stage">
          <LetterSign letter={round.target} />
          <span className="pop-sky">
            {round.balloons.map((balloon, index) => {
              const gone = popped.includes(balloon.id);
              return (
                <button
                  key={balloon.id}
                  type="button"
                  className="pop-balloon"
                  data-balloon={balloon.id}
                  data-letter={balloon.letter}
                  data-popped={gone ? "true" : "false"}
                  data-wiggle={wiggle.id === balloon.id ? (wiggle.count % 2 === 1 ? "a" : "b") : "false"}
                  data-reveal={hint === balloon.id ? "true" : "false"}
                  aria-label={`Pop ${balloon.letter.toUpperCase()}`}
                  disabled={gone}
                  onClick={() => pop(balloon.id, balloon.letter, balloon.target)}
                >
                  <svg viewBox="0 0 60 84" aria-hidden="true" focusable="false">
                    <path d="M30 64c2 7-5 10 0 18" fill="none" stroke="#8a6a4a" strokeWidth="2" strokeLinecap="round" />
                    <path d="M26 62h8l-4-6Z" fill={BALLOON_COLORS[index % BALLOON_COLORS.length]} />
                    <ellipse cx="30" cy="31" rx="25" ry="29" fill={BALLOON_COLORS[index % BALLOON_COLORS.length]} />
                    <ellipse cx="20" cy="19" rx="6" ry="9" fill="#ffffff" opacity="0.5" />
                  </svg>
                  <span className="pop-letter">{balloon.letter.toUpperCase()}</span>
                  {hint === balloon.id ? <Hand /> : null}
                </button>
              );
            })}
          </span>
        </span>
      }
    />
  );
}

// ------------------------------------------------------------------ feed

/** Feed the Animal: four pictures. The ones that start with the letter asked for go on the animal's plate. */
export function FeedGame({ knownLetters, animal, outfit, salt, settingsRef, onDone }: Shared & { knownLetters: string[]; onDone: () => void }) {
  const known = knownLetters.join("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const list = useMemo(() => feedRounds(knownLetters, salt), [known, salt]);
  const rounds = useRounds(list);
  const round = rounds.round;
  const [fed, setFed] = useRoundState<string[]>(rounds.index, []);
  const wiggle = useWiggle();
  const coach = useCoach(
    settingsRef,
    [promptCue("game-feed", "Feed me the pictures that start with this letter."), letterCue(letterTile(round.target))],
    rounds.index,
  );
  useFinish(rounds.finished, settingsRef, coach, onDone);
  const needed = round.items.filter((item) => item.letter === round.target);
  const solved = needed.every((item) => fed.includes(item.id));
  const hint = coach.reveal && !solved ? needed.find((item) => !fed.includes(item.id))?.id : undefined;

  const attempt = (item: PictureItem) => {
    if (solved || fed.includes(item.id)) return;
    // Every picture says its name when it is touched, so the child hears its first sound.
    if (item.letter !== round.target) {
      wiggle.shake(item.id);
      coach.miss([wordCue(item.id, item.label)]);
      return;
    }
    const next = [...fed, item.id];
    setFed(next);
    wiggle.still();
    playEffect("thud", settingsRef.current);
    if (needed.every((food) => next.includes(food.id))) coach.right([wordCue(item.id, item.label)], rounds.next, 1100);
    else coach.touch([wordCue(item.id, item.label)]);
  };

  return (
    <GameFrame
      screen="feed"
      title="Feed the Animal"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="table"
      attrs={{ "data-target": round.target, "data-fed": fed.length, "data-phase": rounds.finished ? "done" : "play", "data-solved": solved ? "true" : "false" }}
      stage={
        <span className="feed-stage">
          <LetterSign letter={round.target} />
          {/* The animal's plate: what it has been fed is on it. */}
          <span className="feed-plate" data-drop="animal" data-count={fed.length}>
            {round.items
              .filter((item) => fed.includes(item.id))
              .map((item) => (
                <span key={item.id} className="feed-bite" data-bite={item.id}>
                  <Illustration name={item.illustration} />
                </span>
              ))}
          </span>
        </span>
      }
    >
      {round.items.map((item) => (
        <Pick
          key={item.id}
          id={item.id}
          name={item.label}
          size="mid"
          art={<Illustration name={item.illustration} />}
          label={item.label}
          used={fed.includes(item.id)}
          wiggle={wiggle.id === item.id ? wiggle.count : 0}
          reveal={hint === item.id}
          onPick={() => attempt(item)}
          attrs={{ "data-food": item.id, "data-letter": item.letter, "data-fed": fed.includes(item.id) ? "true" : "false" }}
        />
      ))}
    </GameFrame>
  );
}

// ------------------------------------------------------------------ rhyme

/**
 * Rhyme Match: four pictures, two pairs that rhyme. One is tapped, then the one it rhymes with. Both
 * words are said, and then whether they rhyme, so a miss is heard as well as a match.
 */
export function RhymeGame({ animal, outfit, salt, settingsRef, onDone }: Shared & { onDone: (learned: StickerInput[]) => void }) {
  // Rhyming is done by ear and by picture, so it does not wait for letters to be taught.
  const list = useMemo(() => rhymeRounds(salt), [salt]);
  const rounds = useRounds(list);
  const cards = rounds.round;
  const [picked, setPicked] = useRoundState<string | null>(rounds.index, null);
  const [matched, setMatched] = useRoundState<string[]>(rounds.index, []);
  const wiggle = useWiggle();
  const coach = useCoach(settingsRef, [promptCue("game-rhyme", "Find two pictures that rhyme.")], rounds.index);
  useFinish(rounds.finished, settingsRef, coach, () =>
    onDone([...new Set(list.flatMap((board) => board.map((card) => card.word)))].map((label) => ({ kind: "word", label }))),
  );
  const pairs = [...new Set(cards.map((card) => card.pair))];
  const solved = pairs.every((pair) => matched.includes(pair));
  // After three misses the hand points at two that rhyme: the one picked and its partner, or a pair still to find.
  const hintPair = coach.reveal && !solved ? (cards.find((card) => card.id === picked)?.pair ?? pairs.find((pair) => !matched.includes(pair))) : undefined;

  const choose = (card: RhymeCard) => {
    if (solved || matched.includes(card.pair)) return;
    const name = wordCue(card.word, card.word);
    if (!picked) {
      setPicked(card.id);
      wiggle.still();
      coach.touch([name]);
      return;
    }
    if (picked === card.id) {
      // The same picture again puts it back.
      setPicked(null);
      coach.touch();
      return;
    }
    const first = cards.find((item) => item.id === picked);
    setPicked(null);
    const both = first ? [wordCue(first.word, first.word), name] : [name];
    if (first && first.pair === card.pair) {
      const next = [...matched, card.pair];
      setMatched(next);
      wiggle.still();
      if (pairs.every((pair) => next.includes(pair))) {
        coach.right([...both, say("play-rhyme-yes")], rounds.next, 1200);
      } else {
        playEffect("chime", settingsRef.current);
        coach.touch([...both, say("play-rhyme-yes")]);
      }
      return;
    }
    wiggle.shake(card.id);
    coach.miss([...both, say("play-rhyme-no")]);
  };

  return (
    <GameFrame
      screen="rhyme"
      title="Rhyme Match"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="field"
      attrs={{ "data-picked": picked ?? "", "data-matched": matched.length, "data-phase": rounds.finished ? "done" : "play", "data-solved": solved ? "true" : "false" }}
      stage={
        // The pairs found so far, each two pictures side by side.
        <span className="rhyme-found" data-found={matched.length}>
          {matched.map((pair) => (
            <span key={pair} className="rhyme-pair" data-pair={pair}>
              {cards
                .filter((card) => card.pair === pair)
                .map((card) => (
                  <span key={card.id} className="rhyme-half">
                    <Illustration name={card.illustration} />
                  </span>
                ))}
            </span>
          ))}
          {matched.length === 0 ? <span className="rhyme-pair is-empty" /> : null}
        </span>
      }
    >
      {cards.map((card) => (
        <Pick
          key={card.id}
          id={card.id}
          name={card.word}
          size="mid"
          art={<Illustration name={card.illustration} />}
          label={card.word}
          used={matched.includes(card.pair)}
          chosen={picked === card.id}
          wiggle={wiggle.id === card.id ? wiggle.count : 0}
          reveal={hintPair === card.pair && picked !== card.id}
          onPick={() => choose(card)}
          attrs={{ "data-rhyme": card.id, "data-word": card.word, "data-pair": card.pair, "data-matched": matched.includes(card.pair) ? "true" : "false" }}
        />
      ))}
    </GameFrame>
  );
}

// ------------------------------------------------------------------ memory

function Dots({ count }: { count: number }) {
  return (
    <span className="dot-group" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <i key={index} />
      ))}
    </span>
  );
}

function CardFace({ card }: { card: MemoryCard }) {
  return card.face === "dots" ? <Dots count={Number(card.value)} /> : <span className="pick-letter">{card.value}</span>;
}

/** How long two cards that do not match stay up before they turn back. */
const FLIP_BACK_MS = 900;

/**
 * Memory Flip: six cards face down, three pairs. First a big letter and its little letter, then a
 * number and its dots. A pair found is set in the scene; two that do not match turn back.
 */
export function MemoryGame({ knownLetters, animal, outfit, salt, settingsRef, onDone }: Shared & { knownLetters: string[]; onDone: () => void }) {
  const known = knownLetters.join("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const list = useMemo(() => memoryRounds(knownLetters, salt), [known, salt]);
  const rounds = useRounds(list);
  const { mode, cards } = rounds.round;
  const [up, setUp] = useRoundState<string[]>(rounds.index, []);
  const [matched, setMatched] = useRoundState<string[]>(rounds.index, []);
  const turnBack = useRef<number | null>(null);
  const coach = useCoach(settingsRef, [promptCue("game-memory", "Flip two cards. Find a match.")], rounds.index);
  useFinish(rounds.finished, settingsRef, coach, onDone);
  useEffect(
    () => () => {
      if (turnBack.current !== null) window.clearTimeout(turnBack.current);
    },
    [],
  );
  const pairs = [...new Set(cards.map((card) => card.pair))];
  const solved = pairs.every((pair) => matched.includes(pair));
  const nameOf = (card: MemoryCard): Cue => (card.face === "numeral" || card.face === "dots" ? numberCue(Number(card.value)) : letterCue(letterTile(card.value)));

  const flip = (card: MemoryCard) => {
    // Two cards are up and about to turn back, or this one is already showing.
    if (solved || up.length >= 2 || up.includes(card.id) || matched.includes(card.pair)) return;
    const next = [...up, card.id];
    setUp(next);
    if (next.length < 2) {
      coach.touch([nameOf(card)]);
      return;
    }
    const first = cards.find((item) => item.id === next[0]);
    if (first && first.pair === card.pair) {
      const found = [...matched, card.pair];
      setMatched(found);
      setUp([]);
      if (pairs.every((pair) => found.includes(pair))) {
        coach.right([nameOf(card)], rounds.next, 1000);
      } else {
        playEffect("chime", settingsRef.current);
        coach.touch([nameOf(card)]);
      }
      return;
    }
    // Two that do not match are not a miss to be counted: turning cards over to see is the game.
    coach.touch([nameOf(card)]);
    if (turnBack.current !== null) window.clearTimeout(turnBack.current);
    turnBack.current = window.setTimeout(() => setUp([]), FLIP_BACK_MS);
  };

  return (
    <GameFrame
      screen="memory"
      title="Memory Flip"
      animal={animal}
      outfit={outfit}
      coach={coach}
      rounds={rounds}
      scene="room"
      attrs={{ "data-mode": mode, "data-up": up.length, "data-matched": matched.length, "data-phase": rounds.finished ? "done" : "play", "data-solved": solved ? "true" : "false" }}
      stage={
        // The pairs found so far: a big letter beside its little letter, or a number beside its dots.
        <span className="memory-found" data-found={matched.length}>
          {matched.map((pair) => (
            <span key={pair} className="memory-pair" data-pair={pair}>
              {cards
                .filter((card) => card.pair === pair)
                .map((card) => (
                  <span key={card.id} className="memory-half">
                    <CardFace card={card} />
                  </span>
                ))}
            </span>
          ))}
          {matched.length === 0 ? <span className="memory-pair is-empty" /> : null}
        </span>
      }
    >
      {cards.map((card) => {
        const faceUp = up.includes(card.id) || matched.includes(card.pair);
        return (
          <Pick
            key={card.id}
            id={card.id}
            name={faceUp ? card.value : "Card"}
            size="mid"
            art={
              faceUp ? (
                <CardFace card={card} />
              ) : (
                // The back of a card: a star, not a question mark to be read.
                <svg className="card-back" viewBox="0 0 60 60" aria-hidden="true" focusable="false">
                  <rect x="3" y="3" width="54" height="54" rx="12" fill="#b7d7f2" />
                  <path d="M30 14l4.6 9.6 10.4 1.4-7.6 7.2 1.9 10.3L30 37.6 20.7 42.5l1.9-10.3L15 25l10.4-1.4Z" fill="#fffdfb" />
                </svg>
              )
            }
            used={matched.includes(card.pair)}
            chosen={up.includes(card.id)}
            onPick={() => flip(card)}
            attrs={{
              "data-card": card.id,
              "data-pair": card.pair,
              "data-face": card.face,
              "data-up": faceUp ? "true" : "false",
              "data-matched": matched.includes(card.pair) ? "true" : "false",
            }}
          />
        );
      })}
    </GameFrame>
  );
}
