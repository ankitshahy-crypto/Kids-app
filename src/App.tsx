import { useEffect, useMemo, useState } from "react";
import { applyAudioSettings, playEffect, setMusicArea, unlockAudio } from "./audio/manager";
import { primeSpeech, resumeSpeech } from "./audio/player";
import { Background } from "./components/Background";
import { Closet } from "./components/Closet";
import { GrownupTip } from "./components/GrownupTip";
import { GoalCheer } from "./components/GoalCheer";
import { GoalRing } from "./components/GoalRing";
import { GrownupsButton } from "./components/GrownupsButton";
import { GrownupsMenu } from "./components/GrownupsMenu";
import { Chevron, StarIcon } from "./components/icons";
import { KidCorner } from "./components/KidCorner";
import { MilestoneCheer } from "./components/MilestoneCheer";
import { NestView } from "./components/NestView";
import { ParentView } from "./components/ParentPanel";
import { LetterTrace } from "./components/LetterTrace";
import { NameTrace, WordTrace } from "./components/PathTrace";
import { PlaceholderStep } from "./components/PlaceholderStep";
import { SoundItOut } from "./components/SoundItOut";
import { SilentHint } from "./components/SilentHint";
import { StarFlight } from "./components/StarFlight";
import { StartScreen } from "./components/StartScreen";
import { StickerBook } from "./components/StickerBook";
import { TeacherView } from "./components/TeacherView";
import { Games, type GameId } from "./components/Games";
import { TodayPath } from "./components/TodayPath";
import { colorTip, gameTip, mathTip, readTip, timeTip, type ReadTip } from "./content/tips";
import type { DeckWord } from "./data/deck";
import { MixActivity, NameActivity, PaintActivity } from "./components/ColorPlay";
import { AddActivity, CountActivity, KnowActivity, MoreActivity, ShapeActivity, TraceActivity } from "./components/MathPlay";
import { ClockActivity, CoinsActivity, DayActivity, RoutineActivity, ShopActivity } from "./components/TimePlay";
import { COLORS, colorFill, colorLessonForChild, type ColorStep } from "./data/colors";
import { MATH, lessonForChild, type MathStep } from "./data/math";
import { TIME, lessonForChild as timeLessonForChild, type TimeStep } from "./data/timeMoney";
import { todayKey, type LessonStep, type StickerInput } from "./data/profiles";
import { practiceTotal, type ReadingCredit } from "./data/reading";
import { resolvePlacement } from "./data/placement";
import { blendList, phonicsOpen, wordsToTrace } from "./data/ladder";
import { lettersIntroduced } from "./data/schedule";
import { nameToTrace } from "./data/tracePractice";
import { usePlacement } from "./hooks/usePlacement";
import { useProfiles } from "./hooks/useProfiles";
import { useReadingTime } from "./hooks/useReadingTime";
import { useSettings } from "./hooks/useSettings";
import { bindPressFeedback } from "./input/press";

type Mode = "start" | "kid" | "parent" | "teacher" | "grownups";
type Course = "reading" | "math" | "colors" | "time";
type Screen = "today" | "library" | "nest" | "closet" | "stickers" | "games" | LessonStep | MathStep | ColorStep | TimeStep | "word" | "my-name";

const lessonScreens: LessonStep[] = ["letter", "draw", "story", "moment"];
const mathScreens: MathStep[] = ["count", "know", "trace", "shape", "more", "add"];
const colorScreens: ColorStep[] = ["name", "mix", "paint"];
const timeScreens: TimeStep[] = ["day", "routine", "clock", "coins", "shop"];

export default function App() {
  const { settings, update, settingsRef } = useSettings();
  const { profiles, active, select, addChild, updateChild, removeChild, giveStar, wear, recordReading, recordWriting, setWritingLevel, noteHatch, setHatchLevel, noteLadder, setLadderStep, noteSpin, giveGift } = useProfiles();
  const { placement, setClassPlace, setChildPlace } = usePlacement();
  const [mode, setMode] = useState<Mode>("start");
  const [screen, setScreen] = useState<Screen>("today");
  const [grownupsReturn, setGrownupsReturn] = useState<"start" | "kid">("start");
  const [flying, setFlying] = useState(false);
  const [cheer, setCheer] = useState<number | null>(null);
  const [goalMet, setGoalMet] = useState(false);
  const [tip, setTip] = useState<ReadTip | null>(null);
  const [course, setCourse] = useState<Course>("reading");

  useEffect(() => {
    const id = window.setInterval(() => {
      if (window.speechSynthesis?.paused) window.speechSynthesis.resume();
    }, 4000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    // Bubble phase, after the control's own click handler. Capture-phase
    // playback was swallowing the click in WebKit. touchend and click are the
    // gestures iOS accepts for resume().
    const unlock = () => {
      try {
        unlockAudio();
        resumeSpeech();
      } catch {
        // A locked audio device must not block the tap.
      }
    };
    window.addEventListener("touchend", unlock);
    window.addEventListener("click", unlock);
    return () => {
      window.removeEventListener("touchend", unlock);
      window.removeEventListener("click", unlock);
    };
  }, []);

  useEffect(() => {
    if (!active && mode === "kid") setMode("start");
  }, [active, mode]);

  useEffect(() => {
    applyAudioSettings(settings);
  }, [settings]);

  useEffect(() => bindPressFeedback(() => settingsRef.current), [settingsRef]);

  useEffect(() => {
    if (mode !== "kid") {
      setMusicArea("none");
      return;
    }
    if (screen === "draw" || screen === "word" || screen === "my-name") setMusicArea("focus");
    else if (screen === "story") setMusicArea("story");
    else if (screen === "library" || screen === "games") setMusicArea("play");
    else setMusicArea("today");
  }, [mode, screen]);

  const lessonPlace = useMemo(() => {
    if (!active) return null;
    return resolvePlacement(placement, active.id, active.createdAt);
  }, [active, placement]);

  const lessonLetters = lessonPlace?.letters ?? [];

  const mathPlace = useMemo(() => {
    if (!active) return null;
    return resolvePlacement(placement, active.id, active.createdAt, new Date(), undefined, MATH);
  }, [active, placement]);

  const mathLesson = useMemo(() => {
    return lessonForChild(active?.createdAt ?? new Date().toISOString(), new Date(), undefined, mathPlace?.weekIndex);
  }, [active, mathPlace]);

  const colorPlace = useMemo(() => {
    if (!active) return null;
    return resolvePlacement(placement, active.id, active.createdAt, new Date(), undefined, COLORS);
  }, [active, placement]);

  const colorLesson = useMemo(() => {
    return colorLessonForChild(active?.createdAt ?? new Date().toISOString(), new Date(), undefined, colorPlace?.weekIndex);
  }, [active, colorPlace]);

  const timePlace = useMemo(() => {
    if (!active) return null;
    return resolvePlacement(placement, active.id, active.createdAt, new Date(), undefined, TIME);
  }, [active, placement]);

  const timeLesson = useMemo(() => {
    return timeLessonForChild(active?.createdAt ?? new Date().toISOString(), new Date(), undefined, timePlace?.weekIndex);
  }, [active, timePlace]);

  const introducedLetters = useMemo(() => lettersIntroduced(lessonPlace?.weekIndex ?? 0), [lessonPlace]);
  const ladderStep = active?.ladder.step ?? 1;
  const lessonWords = useMemo(() => blendList(ladderStep, lessonLetters), [ladderStep, lessonLetters]);
  const blendedWords = useMemo(() => wordsToTrace(active?.stickers ?? [], ladderStep), [active, ladderStep]);
  const phonicsReady = phonicsOpen(introducedLetters.length);
  const traceName = nameToTrace(active?.name ?? "");

  const showTip = (step: LessonStep, when: "start" | "end", letter?: string) => {
    if (!settingsRef.current.showTips) {
      setTip(null);
      return;
    }
    setTip(readTip(step, when, letter));
  };

  const openStep = (step: LessonStep) => {
    primeSpeech();
    setScreen(step);
    // The letter track stays clear. The tip waits until the word is blended.
    if (step === "letter") setTip(null);
    else showTip(step, "start");
  };

  useEffect(() => {
    if (!settings.showTips) setTip(null);
  }, [settings.showTips]);

  const reward = (step: LessonStep, learned: StickerInput[] = []) => {
    if (!active) return;
    const result = giveStar(active.id, step, learned);
    if (!result.awarded) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) setFlying(true);
    if (result.milestones.length > 0) {
      setCheer(result.milestones[result.milestones.length - 1] ?? null);
      playEffect("cheer", settings);
    } else if (result.lessonComplete) playEffect("celebrate", settings);
    else playEffect("chime", settings);
  };

  const finishStep = (step: LessonStep) => {
    reward(step);
    setScreen("today");
    showTip(step, "end");
  };

  const celebrateGoal = (result: ReadingCredit) => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) setFlying(true);
    if (result.milestones.length > 0) {
      setCheer(result.milestones[result.milestones.length - 1] ?? null);
      playEffect("cheer", settingsRef.current);
    } else {
      setGoalMet(true);
      playEffect("chime", settingsRef.current);
    }
  };

  useReadingTime(
    mode === "kid" && active
      ? {
          id: active.id,
          subject: course,
          seed:
            course === "math"
              ? (active.practiceMs?.[MATH] ?? {})
              : course === "colors"
                ? (active.practiceMs?.[COLORS] ?? {})
                : course === "time"
                  ? (active.practiceMs?.[TIME] ?? {})
                  : active.readingMs,
        }
      : null,
    (id, totals, subject) => {
      const result = recordReading(id, totals, settingsRef.current.readingGoal, subject);
      if (result.awardedNow) celebrateGoal(result);
    },
  );

  const finishMath = (step: MathStep, label: string) => {
    if (!active) return;
    const kind = step === "shape" ? ("shape" as const) : ("number" as const);
    const learned: StickerInput[] = label ? [{ subject: MATH, kind, label }] : [];
    const result = giveStar(active.id, step, learned, MATH);
    if (result.awarded) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduce) setFlying(true);
      if (result.milestones.length > 0) {
        setCheer(result.milestones[result.milestones.length - 1] ?? null);
        playEffect("cheer", settings);
      } else if (result.lessonComplete) playEffect("celebrate", settings);
      else playEffect("chime", settings);
    }
    setScreen("today");
    if (settingsRef.current.showTips) setTip(mathTip(step, "end"));
    else setTip(null);
  };

  const openMath = (step: MathStep) => {
    primeSpeech();
    setScreen(step);
    if (settingsRef.current.showTips) setTip(mathTip(step, "start"));
    else setTip(null);
  };

  const finishColor = (step: ColorStep, label: string) => {
    if (!active) return;
    const learned: StickerInput[] = label ? [{ subject: COLORS, kind: "color", label }] : [];
    const result = giveStar(active.id, step, learned, COLORS);
    if (result.awarded) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduce) setFlying(true);
      if (result.milestones.length > 0) {
        setCheer(result.milestones[result.milestones.length - 1] ?? null);
        playEffect("cheer", settings);
      } else if (result.lessonComplete) playEffect("celebrate", settings);
      else playEffect("chime", settings);
    }
    setScreen("today");
    if (settingsRef.current.showTips) setTip(colorTip(step, "end"));
    else setTip(null);
  };

  const openColor = (step: ColorStep) => {
    primeSpeech();
    setScreen(step);
    if (settingsRef.current.showTips) setTip(colorTip(step, "start"));
    else setTip(null);
  };

  const finishTime = (step: TimeStep, label: string) => {
    if (!active) return;
    const kind = step === "coins" || step === "shop" ? ("coin" as const) : ("time" as const);
    const learned: StickerInput[] = label ? [{ subject: TIME, kind, label }] : [];
    const result = giveStar(active.id, step, learned, TIME);
    if (result.awarded) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduce) setFlying(true);
      if (result.milestones.length > 0) {
        setCheer(result.milestones[result.milestones.length - 1] ?? null);
        playEffect("cheer", settings);
      } else if (result.lessonComplete) playEffect("celebrate", settings);
      else playEffect("chime", settings);
    }
    setScreen("today");
    if (settingsRef.current.showTips) setTip(timeTip(step, "end"));
    else setTip(null);
  };

  const openTime = (step: TimeStep) => {
    primeSpeech();
    setScreen(step);
    if (settingsRef.current.showTips) setTip(timeTip(step, "start"));
    else setTip(null);
  };

  const finishLetter = (word: DeckWord) => {
    const learned: StickerInput[] = [
      ...lessonLetters.map((label) => ({ kind: "letter" as const, label })),
      { kind: "word" as const, label: word.word },
    ];
    if (active) noteLadder(active.id, phonicsReady);
    reward("letter", learned);
    showTip("letter", "end", word.letters[0]?.char ?? word.word);
  };

  const inLesson =
    lessonScreens.includes(screen as LessonStep) ||
    mathScreens.includes(screen as MathStep) ||
    colorScreens.includes(screen as ColorStep) ||
    timeScreens.includes(screen as TimeStep) ||
    screen === "word" ||
    screen === "my-name" ||
    screen === "games";

  const finishGame = (game: GameId, learned: StickerInput[], extra?: { step?: string; gift?: string; ladder?: boolean }) => {
    if (!active) return;
    if (game === "hatch") noteHatch(active.id);
    if (game === "spin") noteSpin(active.id);
    if (game === "hatch" || game === "rhyme" || extra?.ladder) noteLadder(active.id, phonicsReady);
    if (extra?.gift) giveGift(active.id, extra.gift);
    const result = giveStar(active.id, extra?.step ?? `game-${game}`, learned);
    if (result.awarded) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduce) setFlying(true);
      if (result.milestones.length > 0) {
        setCheer(result.milestones[result.milestones.length - 1] ?? null);
        playEffect("cheer", settings);
      } else playEffect("chime", settings);
    }
    if (settingsRef.current.showTips) setTip(gameTip(game, "end"));
    else setTip(null);
  };

  const practiceReward = (step: "word" | "name", learned: StickerInput[]) => {
    if (!active) return;
    if (step === "word") noteLadder(active.id, phonicsReady);
    const result = giveStar(active.id, step, learned);
    if (result.awarded) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduce) setFlying(true);
      if (result.milestones.length > 0) {
        setCheer(result.milestones[result.milestones.length - 1] ?? null);
        playEffect("cheer", settings);
      } else playEffect("chime", settings);
    }
    setScreen("today");
  };
  const pastel = mode === "start" || mode === "kid";
  const openGrownups = () => {
    setGrownupsReturn(mode === "kid" ? "kid" : "start");
    setMode("grownups");
  };

  return (
    <div className={`app mode-${mode}`} data-mode={mode}>
      {pastel ? <Background /> : null}
      <SilentHint />
      <main className="stage">
        {mode === "start" || mode === "kid" ? <GrownupsButton onOpen={openGrownups} /> : null}
        {mode === "start" ? (
          <StartScreen
            profiles={profiles}
            onPick={(id) => {
              primeSpeech();
              select(id);
              setScreen("today");
              setMode("kid");
            }}
            onParent={() => setMode("parent")}
            onTeacher={() => setMode("teacher")}
          />
        ) : null}

        {mode === "kid" && active ? (
          <>
            {inLesson ? (
              <div className="top-bar">
                <button
                  type="button"
                  className="back-button"
                  aria-label="Back"
                  onClick={() => {
                    if (screen === "games") setTip(null);
                    setScreen("today");
                  }}
                >
                  <span className="gear-face">
                    <Chevron direction="left" />
                  </span>
                </button>
                <div className="today-tools">
                  <GoalRing ms={practiceTotal(active)[todayKey()] ?? 0} goalMinutes={settings.readingGoal} />
                  <p className="star-count" data-stars={active.stars}>
                    <StarIcon />
                    <span>{active.stars}</span>
                  </p>
                </div>
              </div>
            ) : null}
            <div className={`screen-body${screen === "today" ? " is-fit" : ""}`}>
              {tip ? <GrownupTip tip={tip} onDismiss={() => setTip(null)} /> : null}
              {screen === "today" ? (
                <TodayPath
                  profile={active}
                  letters={lessonLetters}
                  placementSource={lessonPlace?.source ?? "calendar"}
                  stageId={lessonPlace?.stageId ?? "letters"}
                  weekIndex={lessonPlace?.weekIndex ?? 0}
                  onLeave={() => setMode("start")}
                  onOpen={openStep}
                  onLibrary={() => setScreen("library")}
                  onNest={() => setScreen("nest")}
                  onCloset={() => setScreen("closet")}
                  onStickers={() => setScreen("stickers")}
                  goalMinutes={settings.readingGoal}
                  course={course}
                  onCourse={(next) => {
                    setCourse(next);
                    setTip(null);
                  }}
                  mathLesson={mathLesson}
                  onMath={openMath}
                  colorLesson={colorLesson}
                  onColor={openColor}
                  timeLesson={timeLesson}
                  onTime={openTime}
                  canTraceWord={blendedWords.length > 0}
                  canTraceName={Boolean(traceName)}
                  onTraceWord={() => {
                    primeSpeech();
                    setScreen("word");
                    setTip(null);
                  }}
                  onTraceName={() => {
                    primeSpeech();
                    setScreen("my-name");
                    setTip(null);
                  }}
                  onGames={() => {
                    primeSpeech();
                    setScreen("games");
                    setTip(null);
                  }}
                />
              ) : null}
              {screen === "library" ? <KidCorner kind="library" onBack={() => setScreen("today")} /> : null}
              {screen === "nest" ? <NestView profile={active} onBack={() => setScreen("today")} /> : null}
              {screen === "closet" ? (
                <Closet profile={active} onWear={(itemId) => wear(active.id, itemId)} onBack={() => setScreen("today")} />
              ) : null}
              {screen === "stickers" ? <StickerBook profile={active} onBack={() => setScreen("today")} /> : null}
              {screen === "games" ? (
                <Games
                  profile={active}
                  knownLetters={introducedLetters}
                  count={mathLesson.count}
                  color={colorLesson.hear}
                  colorOptions={colorLesson.choices}
                  settingsRef={settingsRef}
                  onEnter={(game) => {
                    if (settingsRef.current.showTips) setTip(gameTip(game, "start"));
                    else setTip(null);
                  }}
                  onDone={finishGame}
                />
              ) : null}
              {screen === "letter" ? (
                <SoundItOut
                  settingsRef={settingsRef}
                  paused={false}
                  words={lessonWords}
                  animal={active.animal}
                  outfit={active.outfit}
                  ladderStep={ladderStep}
                  onFinished={finishLetter}
                />
              ) : null}
              {screen === "draw" ? (
                <LetterTrace
                  letters={lessonLetters}
                  settingsRef={settingsRef}
                  writing={active.writing}
                  onAttempt={(itemId, success) => recordWriting(active.id, itemId, success)}
                  onDone={() => {
                    const learned = (lessonLetters.length > 0 ? lessonLetters : ["a"]).map((label) => ({
                      kind: "letter" as const,
                      label,
                    }));
                    reward("draw", learned);
                    setScreen("today");
                    showTip("draw", "end");
                  }}
                />
              ) : null}
              {screen === "word" ? (
                <WordTrace
                  words={blendedWords}
                  settingsRef={settingsRef}
                  writing={active.writing}
                  onAttempt={(itemId, success) => recordWriting(active.id, itemId, success)}
                  onDone={(word) => practiceReward("word", [{ kind: "word", label: word }])}
                />
              ) : null}
              {screen === "my-name" && traceName ? (
                <NameTrace
                  name={active.name}
                  settingsRef={settingsRef}
                  writing={active.writing}
                  onAttempt={(itemId, success) => recordWriting(active.id, itemId, success)}
                  onDone={() => practiceReward("name", [{ kind: "word", label: traceName }])}
                />
              ) : null}
              {screen === "story" || screen === "moment" ? (
                <PlaceholderStep step={screen} profile={active} onDone={() => finishStep(screen)} />
              ) : null}
              {screen === "count" ? (
                <CountActivity lesson={mathLesson} settingsRef={settingsRef} onDone={(label) => finishMath("count", label)} />
              ) : null}
              {screen === "know" ? (
                <KnowActivity lesson={mathLesson} settingsRef={settingsRef} onDone={(label) => finishMath("know", label)} />
              ) : null}
              {screen === "trace" ? (
                <TraceActivity lesson={mathLesson} settingsRef={settingsRef} onDone={(label) => finishMath("trace", label)} />
              ) : null}
              {screen === "shape" ? (
                <ShapeActivity
                  lesson={mathLesson}
                  settingsRef={settingsRef}
                  writing={active.writing}
                  onAttempt={(itemId, success) => recordWriting(active.id, itemId, success)}
                  onDone={(label) => finishMath("shape", label)}
                />
              ) : null}
              {screen === "more" ? (
                <MoreActivity lesson={mathLesson} settingsRef={settingsRef} onDone={(label) => finishMath("more", label)} />
              ) : null}
              {screen === "add" ? (
                <AddActivity lesson={mathLesson} settingsRef={settingsRef} onDone={(label) => finishMath("add", label)} />
              ) : null}
              {screen === "name" ? (
                <NameActivity lesson={colorLesson} settingsRef={settingsRef} onDone={(label) => finishColor("name", label)} />
              ) : null}
              {screen === "mix" ? <MixActivity settingsRef={settingsRef} onDone={(label) => finishColor("mix", label)} /> : null}
              {screen === "day" ? (
                <DayActivity lesson={timeLesson} settingsRef={settingsRef} onDone={(label) => finishTime("day", label)} />
              ) : null}
              {screen === "routine" ? (
                <RoutineActivity lesson={timeLesson} settingsRef={settingsRef} onDone={(label) => finishTime("routine", label)} />
              ) : null}
              {screen === "clock" ? (
                <ClockActivity lesson={timeLesson} settingsRef={settingsRef} onDone={(label) => finishTime("clock", label)} />
              ) : null}
              {screen === "coins" ? (
                <CoinsActivity lesson={timeLesson} settingsRef={settingsRef} onDone={(label) => finishTime("coins", label)} />
              ) : null}
              {screen === "shop" ? (
                <ShopActivity
                  lesson={timeLesson}
                  animal={active.animal}
                  settingsRef={settingsRef}
                  onDone={(label) => finishTime("shop", label)}
                />
              ) : null}
              {screen === "paint" ? (
                <PaintActivity
                  animal={active.animal}
                  outfit={active.outfit}
                  made={active.stickers
                    .filter((sticker) => sticker.subject === COLORS && sticker.kind === "color" && colorFill(sticker.label))
                    .map((sticker) => sticker.label)}
                  onDone={(label) => finishColor("paint", label)}
                />
              ) : null}
            </div>
          </>
        ) : null}

        {mode === "parent" ? (
          <div className="screen-body">
            <ParentView
              settings={settings}
              onChange={update}
              profiles={profiles}
              active={active}
              placement={placement}
              onSelect={select}
              onAdd={addChild}
              onUpdate={updateChild}
              onRemove={removeChild}
              onClose={() => setMode("start")}
            />
          </div>
        ) : null}

        {mode === "teacher" ? (
          <TeacherView
            profiles={profiles}
            goalMinutes={settings.readingGoal}
            placement={placement}
            activeId={active?.id ?? null}
            onClassPlace={setClassPlace}
            onChildPlace={setChildPlace}
            onWritingLevel={setWritingLevel}
            onHatchLevel={setHatchLevel}
            onLadderStep={setLadderStep}
            onClose={() => setMode("start")}
          />
        ) : null}
        {mode === "kid" && flying ? <StarFlight onDone={() => setFlying(false)} /> : null}
        {mode === "kid" && cheer !== null ? <MilestoneCheer stars={cheer} onDone={() => setCheer(null)} /> : null}
        {mode === "kid" && goalMet ? <GoalCheer onDone={() => setGoalMet(false)} /> : null}

        {mode === "grownups" ? (
          <div className="screen-body">
            <GrownupsMenu
              settings={settings}
              onChange={update}
              profiles={profiles}
              active={active}
              placement={placement}
              onSelect={select}
              onAdd={addChild}
              onUpdate={updateChild}
              onRemove={removeChild}
              onClose={() => setMode(grownupsReturn)}
            />
          </div>
        ) : null}
      </main>
    </div>
  );
}
