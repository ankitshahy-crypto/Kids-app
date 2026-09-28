import { useEffect, useRef, useState } from "react";
import { playEffect } from "../audio/manager";
import { cancelSpeech, playLetter, playOnDevice } from "../audio/player";
import type { ChildProfile } from "../data/profiles";
import { unitLabel } from "../data/units";
import { phonemeOf } from "../data/wordBuild";
import type { Settings } from "../settings";
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
 * The Friday sound game. The child hears a sound and taps the letter that
 * says it; a miss just means try again, and every round ends with the right
 * letter lit. Only the first tap of each round is noted, quietly, for grown-ups.
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
  const playRef = useRef<AbortController | null>(null);
  const round = rounds[index];

  const begin = () => {
    playRef.current?.abort();
    cancelSpeech();
    const controller = new AbortController();
    playRef.current = controller;
    return controller.signal;
  };

  const say = async (current: CheckInRound) => {
    const signal = begin();
    const letter = tile(current.answer);
    try {
      await playOnDevice("Which one says this sound?", settingsRef.current, signal);
      if (letter) await playLetter(letter, settingsRef.current, signal);
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
      return;
    }
    setSolved(true);
    // Move on first; sound is a bonus and must never hold the game on this round.
    window.setTimeout(() => {
      setSolved(false);
      setMissed([]);
      if (index + 1 >= rounds.length) {
        setFinished(true);
        try {
          playEffect("celebrate", settingsRef.current);
          void playOnDevice("You played the sound game!", settingsRef.current, begin()).catch(() => undefined);
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
      if (letter) void playLetter(letter, settingsRef.current, begin()).catch(() => undefined);
    } catch {
      // No audio here; the lit letter still shows the answer.
    }
  };

  if (finished || !round) {
    return (
      <section className="start-check" data-screen="sound-check" data-check="done">
        <div className="check-hero" aria-hidden="true">
          <Hero animal={profile.animal} outfit={profile.outfit} />
        </div>
        <h1>You played the sound game!</h1>
        <button type="button" className="done-button check-accept" onClick={onDone}>
          Get my star
        </button>
      </section>
    );
  }

  return (
    <section className="start-check" data-screen="sound-check" data-round={index} data-answer={round.answer}>
      <p className="chunk-strip">
        Sound game · {index + 1} of {rounds.length}
      </p>
      <h1 className="check-prompt">Which one says this sound?</h1>
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
            className={`check-choice${solved && choice === round.answer ? " is-right" : ""}${missed.includes(choice) ? " is-picked" : ""}`}
            data-choice={choice}
            disabled={solved || missed.includes(choice)}
            aria-label={`Letter ${unitLabel(choice).toUpperCase()}`}
            onClick={() => choose(choice)}
          >
            <span className="check-letter">{unitLabel(choice)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
