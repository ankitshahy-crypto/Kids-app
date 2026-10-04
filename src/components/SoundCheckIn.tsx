import { useEffect, useRef, useState } from "react";
import { playEffect } from "../audio/manager";
import { cancelSpeech, playLetterSound, playPrompt } from "../audio/player";
import { animalById } from "../data/animals";
import type { ChildProfile } from "../data/profiles";
import { unitLabel } from "../data/units";
import { phonemeOf } from "../data/wordBuild";
import type { Settings } from "../settings";
import { Burst } from "./Burst";
import { Hero } from "./Hero";
import { SpeakerIcon } from "./icons";

export type CheckInRound = { answer: string; choices: string[] };

function hash(text: string): number {
  let value = 5;
  for (const char of text) value = (value * 33 + char.charCodeAt(0)) >>> 0;
  return value;
}

/** One round per sound: the sound and two others the child has already met. */
export function checkInRounds(sounds: readonly string[], pool: readonly string[], seed: string): CheckInRound[] {
  const others = [...new Set([...pool, ...sounds].map((item) => item.toLowerCase()))];
  return sounds.map((answer, index) => {
    const rest = others.filter((item) => item !== answer);
    const picks: string[] = [];
    for (let step = 0; picks.length < 2 && step < rest.length * 2; step += 1) {
      const item = rest[hash(`${seed}:${index}:${step}`) % rest.length];
      if (!picks.includes(item)) picks.push(item);
    }
    const choices = [answer, ...picks];
    const turn = hash(`${seed}:${answer}`) % choices.length;
    return { answer, choices: [...choices.slice(turn), ...choices.slice(0, turn)] };
  });
}

function tile(sound: string) {
  try {
    return { char: sound, phoneme: phonemeOf(sound) };
  } catch {
    return null;
  }
}

/**
 * The Friday Challenge: feed your animal. The child hears a sound and taps the
 * letter that says it, and the animal gets a berry. A miss is never called
 * wrong: the sound plays again and the right letter glows softly, and every
 * round ends with a berry eaten, so there is nothing to lose and no score.
 * Only the first tap of each round is noted, quietly, for grown-ups.
 */
export function SoundCheckIn({
  profile,
  rounds: given,
  settingsRef,
  onRecord,
  onDone,
}: {
  profile: ChildProfile;
  rounds: CheckInRound[];
  settingsRef: { current: Settings };
  onRecord: (sound: string, firstTry: boolean) => void;
  onDone: () => void;
}) {
  // The game keeps the rounds it started with, even if the lesson around it re-renders.
  const [rounds] = useState(given);
  const [index, setIndex] = useState(0);
  const [missed, setMissed] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [finished, setFinished] = useState(false);
  const [cheer, setCheer] = useState(false);
  const animalName = animalById(profile.animal).name;
  const toldStart = useRef(false);
  const playRef = useRef<AbortController | null>(null);
  const round = rounds[index];

  const begin = () => {
    playRef.current?.abort();
    cancelSpeech();
    const controller = new AbortController();
    playRef.current = controller;
    return controller.signal;
  };

  // The question, then the bare sound ("mmm") from the sound clips: the letter
  // phrase ("m, as in moon") would give the answer away.
  const say = async (current: CheckInRound) => {
    const signal = begin();
    const letter = tile(current.answer);
    try {
      // The first round opens the adventure; the rest go straight to the sound.
      if (!toldStart.current && current === rounds[0]) {
        toldStart.current = true;
        await playPrompt("challenge-start", settingsRef.current, signal, "Friday Challenge! Let's feed your animal. Tap the letter that says the sound.");
      } else {
        await playPrompt("sound-which", settingsRef.current, signal, "Which one says this sound?");
      }
      if (letter) await playLetterSound(letter, settingsRef.current, signal);
    } catch {
      // A tap or the next round stopped the line.
    }
  };

  useEffect(() => {
    if (round && !finished) void say(round);
    return () => playRef.current?.abort();
    // The line follows the round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, finished]);

  const choose = (choice: string) => {
    if (!round || solved || missed.includes(choice)) return;
    const right = choice === round.answer;
    if (missed.length === 0) onRecord(round.answer, right);
    if (!right) {
      try {
        playEffect("pop", settingsRef.current);
      } catch {
        // No audio here.
      }
      setMissed((list) => [...list, choice]);
      // Gentle help: hear the sound once more (the right letter glows meanwhile).
      const letter = tile(round.answer);
      if (letter) {
        const signal = begin();
        window.setTimeout(() => {
          if (!signal.aborted) void playLetterSound(letter, settingsRef.current, signal).catch(() => undefined);
        }, 450);
      }
      return;
    }
    setSolved(true);
    setCheer(true);
    window.setTimeout(() => setCheer(false), 900);
    // Move on first; sound is a bonus and must never hold the game on this round.
    window.setTimeout(() => {
      setSolved(false);
      setMissed([]);
      if (index + 1 >= rounds.length) {
        setFinished(true);
        try {
          playEffect("celebrate", settingsRef.current);
          void playPrompt("sound-done", settingsRef.current, begin(), "Yum! Your animal is full. You did the Friday Challenge!").catch(() => undefined);
        } catch {
          // No audio here; the screen still says it.
        }
      } else {
        setIndex(index + 1);
      }
    }, 1000);
    try {
      playEffect("chime", settingsRef.current);
      const letter = tile(choice);
      if (letter) void playLetterSound(letter, settingsRef.current, begin()).catch(() => undefined);
    } catch {
      // No audio here; the lit letter still shows the answer.
    }
  };

  if (finished || !round) {
    return (
      <section className="start-check challenge" data-screen="sound-check" data-check="done" data-rounds={rounds.length}>
        <div className="check-hero is-full" aria-hidden="true">
          <Hero animal={profile.animal} outfit={profile.outfit} />
        </div>
        <Berries count={rounds.length} eaten={rounds.length} />
        <h1>Yum! {animalName} is full.</h1>
        <p className="challenge-sub">You did the Friday Challenge!</p>
        <button type="button" className="done-button check-accept" onClick={onDone}>
          Get my star
        </button>
      </section>
    );
  }

  return (
    <section className="start-check challenge" data-screen="sound-check" data-round={index} data-rounds={rounds.length} data-answer={round.answer}>
      <p className="chunk-strip challenge-name">Friday Challenge</p>
      <div className={`check-hero${cheer ? " is-cheer" : ""}`} aria-hidden="true">
        <Hero animal={profile.animal} outfit={profile.outfit} />
      </div>
      <Berries count={rounds.length} eaten={index + (solved ? 1 : 0)} />
      <h1 className="check-prompt">Feed {animalName}! Which one says this sound?</h1>
      <button type="button" className="play-button check-hear" onClick={() => void say(round)}>
        <span className="play-icon" aria-hidden="true">
          <SpeakerIcon />
        </span>
        <span>Hear it again</span>
      </button>
      <div className="check-choices is-sound" role="group" aria-label="Choices">
        {round.choices.map((choice) => (
          <button
            key={choice}
            type="button"
            className={`check-choice${solved && choice === round.answer ? " is-right" : ""}${missed.includes(choice) ? " is-picked" : ""}${!solved && missed.length > 0 && choice === round.answer ? " is-hint" : ""}`}
            data-choice={choice}
            disabled={solved || missed.includes(choice)}
            aria-label={`Letter ${unitLabel(choice).toUpperCase()}`}
            onClick={() => choose(choice)}
          >
            <span className="check-letter">{unitLabel(choice)}</span>
            {solved && choice === round.answer ? <Burst key={`burst-${index}`} seed={index + 1} /> : null}
          </button>
        ))}
      </div>
    </section>
  );
}

/** The berries to feed the animal: one a round, eaten as each round ends. Progress, never a score. */
function Berries({ count, eaten }: { count: number; eaten: number }) {
  return (
    <div className="challenge-berries" aria-hidden="true" data-eaten={eaten}>
      {Array.from({ length: count }, (_, at) => (
        <span key={at} className={at < eaten ? "is-eaten" : ""} />
      ))}
    </div>
  );
}
