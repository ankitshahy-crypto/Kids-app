import { useEffect, useRef, useState } from "react";
import { playEffect } from "../audio/manager";
import { cancelSpeech, playLetterSound, playPrompt, playWordId } from "../audio/player";
import type { PhonemeId } from "../data/phonemes";
import { lessonName, type ChildProfile } from "../data/profiles";
import {
  answersIn,
  buildCheck,
  emptyTally,
  needsGrownupConfirm,
  partSettled,
  pictureFor,
  placeFromCheck,
  type CheckPart,
  type CheckResult,
  type CheckRound,
  type CheckTally,
} from "../data/startCheck";
import { PHONEME } from "../data/wordBuild";
import { Illustration } from "../illustrations";
import type { Settings } from "../settings";
import { Hero } from "./Hero";
import { SpeakerIcon } from "./icons";
import { ParentGate } from "./ParentGate";

/** The recorded question for each part, with the line the device voice says until the clip is on the device. */
const PROMPTS: Record<CheckPart, { id: string; say: string }> = {
  sound: { id: "check-sound", say: "Tap the letter that makes this sound." },
  word: { id: "check-word", say: "Read the word. Tap its picture." },
  long: { id: "check-word", say: "Read the word. Tap its picture." },
};

/**
 * "Where to start": three short parts a child taps through with a grown-up
 * nearby. Nothing is timed and nothing is called wrong; a part stops as soon
 * as it is clearly too hard. The result is a suggested start to accept.
 */
export function StartCheck({
  profile,
  settingsRef,
  onAccept,
  onSkip,
  onRecord,
}: {
  profile: ChildProfile;
  settingsRef: { current: Settings };
  /** Each letter-sound round, quietly: picked on the first try or not. */
  onRecord?: (sound: string, firstTry: boolean) => void;
  onAccept: (result: CheckResult) => void;
  onSkip: () => void;
}) {
  const [rounds] = useState(() => buildCheck(`${profile.id}:${new Date().toDateString()}`));
  const [index, setIndex] = useState(0);
  const [tally, setTally] = useState<CheckTally>(emptyTally);
  const [done, setDone] = useState<CheckResult | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const playRef = useRef<AbortController | null>(null);
  const round: CheckRound | undefined = rounds[index];

  const begin = () => {
    playRef.current?.abort();
    cancelSpeech();
    const controller = new AbortController();
    playRef.current = controller;
    return controller.signal;
  };

  // The question, then the bare sound ("mmm") from the sound clips. The letter
  // phrase ("m, as in moon") would name the letter the child is asked to find.
  const say = async (current: CheckRound) => {
    const signal = begin();
    try {
      await playPrompt(PROMPTS[current.part].id, settingsRef.current, signal, PROMPTS[current.part].say);
      if (current.part === "sound") {
        await playLetterSound({ char: current.answer, phoneme: (PHONEME[current.answer] ?? current.answer) as PhonemeId }, settingsRef.current, signal);
      }
    } catch {
      // A tap or a new round stopped the line.
    }
  };

  useEffect(() => {
    if (round && !done) void say(round);
    return () => playRef.current?.abort();
    // The line follows the round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, done]);

  const settle = (next: CheckTally, part: CheckPart, at: number) => {
    const state = partSettled(next, part);
    if (state === "stop" || (state === "pass" && part === "long")) {
      finish(next);
      return;
    }
    // Skip the rest of a passed part, and any later part after a stop.
    let cursor = at + 1;
    if (state === "pass") while (cursor < rounds.length && rounds[cursor].part === part) cursor += 1;
    if (cursor >= rounds.length) finish(next);
    else setIndex(cursor);
  };

  const finish = (next: CheckTally) => {
    const result = placeFromCheck(next);
    setDone(result);
    playEffect("celebrate", settingsRef.current);
    const signal = begin();
    void playPrompt(result.cheerId, settingsRef.current, signal, result.cheer).catch(() => undefined);
  };

  const choose = (choice: string) => {
    if (!round || picked) return;
    setPicked(choice);
    const right = choice === round.answer;
    if (round.part === "sound") onRecord?.(round.answer, right);
    playEffect(right ? "chime" : "pop", settingsRef.current);
    if (round.part !== "sound") {
      const signal = begin();
      void playWordId(choice, choice, settingsRef.current, signal).catch(() => undefined);
    }
    const next: CheckTally = {
      ...tally,
      [round.part]: { right: tally[round.part].right + (right ? 1 : 0), asked: tally[round.part].asked + 1 },
    };
    setTally(next);
    window.setTimeout(() => {
      setPicked(null);
      settle(next, round.part, index);
    }, 900);
  };

  if (done) {
    const answers = answersIn(tally);
    const confirm = needsGrownupConfirm(done);
    return (
      <section
        className="start-check"
        data-screen="check"
        data-check="done"
        data-week={done.place.weekIndex}
        data-ladder={done.ladderStep}
        data-answers={answers}
        data-confirm={confirm ? "grownup" : "none"}
      >
        <div className="check-hero" aria-hidden="true">
          <Hero animal={profile.animal} outfit={profile.outfit} />
        </div>
        <h1>{done.cheer}</h1>
        <p className="check-note">
          A good start for {lessonName(profile)}: <strong>{done.summary}</strong>
        </p>
        <p className="adult-copy" data-check-basis>
          Based on {answers} {answers === 1 ? "answer" : "answers"}.
          {confirm ? " A start this far along needs a grown-up to confirm it." : " A grown-up can change this any time in Grown-ups."}
        </p>
        <button type="button" className="done-button check-accept" onClick={() => (confirm ? setConfirming(true) : onAccept(done))}>
          Use this start
        </button>
        {confirming ? <ParentGate onPass={() => onAccept(done)} onCancel={() => setConfirming(false)} /> : null}
        <button type="button" className="text-button" onClick={onSkip}>
          Keep it as it is
        </button>
      </section>
    );
  }

  if (!round) return null;
  const partIndex = rounds.filter((item, at) => item.part === round.part && at < index).length + 1;
  const partTotal = rounds.filter((item) => item.part === round.part).length;

  return (
    <section className="start-check" data-screen="check" data-part={round.part} data-round={index} data-answer={round.answer}>
      <p className="chunk-strip">
        {round.part === "sound" ? "Sounds" : round.part === "word" ? "Words" : "Longer words"} · {partIndex} of {partTotal}
      </p>
      <h1 className="check-prompt">{round.part === "sound" ? "Which letter says this sound?" : "Read it, then tap its picture."}</h1>
      {round.part !== "sound" ? (
        <p className="check-word" data-word={round.answer}>
          {round.answer}
        </p>
      ) : null}
      <button type="button" className="play-button check-hear" onClick={() => void say(round)}>
        <span className="play-icon" aria-hidden="true">
          <SpeakerIcon />
        </span>
        <span>{round.part === "sound" ? "Hear it again" : "Hear the question"}</span>
      </button>
      <div className={`check-choices is-${round.part}`} role="group" aria-label="Choices">
        {round.choices.map((choice) => (
          <button
            key={choice}
            type="button"
            className={`check-choice${picked === choice ? (choice === round.answer ? " is-right" : " is-picked") : ""}`}
            data-choice={choice}
            disabled={picked !== null}
            aria-label={round.part === "sound" ? `Letter ${choice.toUpperCase()}` : choice}
            onClick={() => choose(choice)}
          >
            {round.part === "sound" ? (
              <span className="check-letter">{choice}</span>
            ) : (
              <span className="check-picture">
                <Illustration name={pictureFor(choice)} />
              </span>
            )}
          </button>
        ))}
      </div>
      <button type="button" className="text-button check-skip" onClick={onSkip}>
        Stop for now
      </button>
    </section>
  );
}
