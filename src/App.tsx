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
import { PlaceholderStep } from "./components/PlaceholderStep";
import { SoundItOut } from "./components/SoundItOut";
import { SilentHint } from "./components/SilentHint";
import { StarFlight } from "./components/StarFlight";
import { StartScreen } from "./components/StartScreen";
import { StickerBook } from "./components/StickerBook";
import { TeacherView } from "./components/TeacherView";
import { TodayPath } from "./components/TodayPath";
import { readTip, type ReadTip } from "./content/tips";
import type { DeckWord } from "./data/deck";
import { todayKey, type LessonStep, type Sticker } from "./data/profiles";
import type { ReadingCredit } from "./data/reading";
import { isReviewDay, planForWeek, practiceLetters, weekIndex, wordsForLetters } from "./data/schedule";
import { useProfiles } from "./hooks/useProfiles";
import { useReadingTime } from "./hooks/useReadingTime";
import { useSettings } from "./hooks/useSettings";
import { bindPressFeedback } from "./input/press";

type Mode = "start" | "kid" | "parent" | "teacher" | "grownups";
type Screen = "today" | "library" | "nest" | "closet" | "stickers" | LessonStep;

const lessonScreens: LessonStep[] = ["letter", "draw", "story", "moment"];

export default function App() {
  const { settings, update, settingsRef } = useSettings();
  const { profiles, active, select, addChild, updateChild, removeChild, giveStar, wear, recordReading } = useProfiles();
  const [mode, setMode] = useState<Mode>("start");
  const [screen, setScreen] = useState<Screen>("today");
  const [grownupsReturn, setGrownupsReturn] = useState<"start" | "kid">("start");
  const [flying, setFlying] = useState(false);
  const [cheer, setCheer] = useState<number | null>(null);
  const [goalMet, setGoalMet] = useState(false);
  const [tip, setTip] = useState<ReadTip | null>(null);

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
    if (screen === "draw") setMusicArea("focus");
    else if (screen === "story") setMusicArea("story");
    else if (screen === "library") setMusicArea("play");
    else setMusicArea("today");
  }, [mode, screen]);

  const lessonLetters = useMemo(() => {
    if (!active) return [];
    const now = new Date();
    return practiceLetters(planForWeek(weekIndex(active.createdAt, now)), isReviewDay(now));
  }, [active]);

  const lessonWords = useMemo(() => wordsForLetters(lessonLetters), [lessonLetters]);

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

  const reward = (step: LessonStep, learned: Sticker[] = []) => {
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

  useReadingTime(mode === "kid" ? active : null, (id, totals) => {
    const result = recordReading(id, totals, settingsRef.current.readingGoal);
    if (result.awardedNow) celebrateGoal(result);
  });

  const finishLetter = (word: DeckWord) => {
    const learned: Sticker[] = [
      ...lessonLetters.map((label) => ({ kind: "letter" as const, label })),
      { kind: "word" as const, label: word.word },
    ];
    reward("letter", learned);
    showTip("letter", "end", word.letters[0]?.char ?? word.word);
  };

  const inLesson = lessonScreens.includes(screen as LessonStep);
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
                <button type="button" className="back-button" aria-label="Back" onClick={() => setScreen("today")}>
                  <span className="gear-face">
                    <Chevron direction="left" />
                  </span>
                </button>
                <div className="today-tools">
                  <GoalRing ms={active.readingMs[todayKey()] ?? 0} goalMinutes={settings.readingGoal} />
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
                  onLeave={() => setMode("start")}
                  onOpen={openStep}
                  onLibrary={() => setScreen("library")}
                  onNest={() => setScreen("nest")}
                  onCloset={() => setScreen("closet")}
                  onStickers={() => setScreen("stickers")}
                  goalMinutes={settings.readingGoal}
                />
              ) : null}
              {screen === "library" ? <KidCorner kind="library" onBack={() => setScreen("today")} /> : null}
              {screen === "nest" ? <NestView profile={active} onBack={() => setScreen("today")} /> : null}
              {screen === "closet" ? (
                <Closet profile={active} onWear={(itemId) => wear(active.id, itemId)} onBack={() => setScreen("today")} />
              ) : null}
              {screen === "stickers" ? <StickerBook profile={active} onBack={() => setScreen("today")} /> : null}
              {screen === "letter" ? (
                <SoundItOut
                  settingsRef={settingsRef}
                  paused={false}
                  words={lessonWords}
                  animal={active.animal}
                  outfit={active.outfit}
                  onFinished={finishLetter}
                />
              ) : null}
              {screen === "draw" || screen === "story" || screen === "moment" ? (
                <PlaceholderStep step={screen} profile={active} onDone={() => finishStep(screen)} />
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
              onSelect={select}
              onAdd={addChild}
              onUpdate={updateChild}
              onRemove={removeChild}
              onClose={() => setMode("start")}
            />
          </div>
        ) : null}

        {mode === "teacher" ? (
          <TeacherView profiles={profiles} goalMinutes={settings.readingGoal} onClose={() => setMode("start")} />
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
