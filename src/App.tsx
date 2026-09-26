import { useEffect, useMemo, useState } from "react";
import { applyAudioSettings, playEffect, setMusicArea, unlockAudio } from "./audio/manager";
import { primeSpeech, resumeSpeech } from "./audio/player";
import { Background } from "./components/Background";
import { Chevron } from "./components/icons";
import { KidCorner } from "./components/KidCorner";
import { ParentView } from "./components/ParentPanel";
import { PlaceholderStep } from "./components/PlaceholderStep";
import { SoundItOut } from "./components/SoundItOut";
import { SilentHint } from "./components/SilentHint";
import { StartScreen } from "./components/StartScreen";
import { TeacherView } from "./components/TeacherView";
import { TodayPath } from "./components/TodayPath";
import { isReviewDay, planForWeek, practiceLetters, weekIndex, wordsForLetters } from "./data/schedule";
import type { LessonStep } from "./data/profiles";
import { useProfiles } from "./hooks/useProfiles";
import { useSettings } from "./hooks/useSettings";
import { bindPressFeedback } from "./input/press";

type Mode = "start" | "kid" | "parent" | "teacher";
type Screen = "today" | "library" | "nest" | LessonStep;

const lessonScreens: LessonStep[] = ["letter", "draw", "story", "moment"];

export default function App() {
  const { settings, update, settingsRef } = useSettings();
  const { profiles, active, select, addChild, updateChild, removeChild, giveStar } = useProfiles();
  const [mode, setMode] = useState<Mode>("start");
  const [screen, setScreen] = useState<Screen>("today");

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

  const lessonWords = useMemo(() => {
    if (!active) return [];
    const now = new Date();
    const letters = practiceLetters(planForWeek(weekIndex(active.createdAt, now)), isReviewDay(now));
    return wordsForLetters(letters);
  }, [active]);

  const openStep = (step: LessonStep) => {
    primeSpeech();
    setScreen(step);
  };

  const reward = (step: LessonStep) => {
    if (!active) return;
    const result = giveStar(active.id, step);
    if (result.lessonComplete && result.awarded) playEffect("celebrate", settings);
    else if (result.awarded) playEffect("chime", settings);
  };

  const finishStep = (step: LessonStep) => {
    reward(step);
    setScreen("today");
  };

  const inLesson = lessonScreens.includes(screen as LessonStep);
  const pastel = mode === "start" || mode === "kid";

  return (
    <div className={`app mode-${mode}`} data-mode={mode}>
      {pastel ? <Background /> : null}
      <SilentHint />
      <main className="stage">
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
                <span className="top-spacer" />
              </div>
            ) : null}
            <div className={`screen-body${screen === "today" ? " is-fit" : ""}`}>
              {screen === "today" ? (
                <TodayPath
                  profile={active}
                  onLeave={() => setMode("start")}
                  onOpen={openStep}
                  onLibrary={() => setScreen("library")}
                  onNest={() => setScreen("nest")}
                />
              ) : null}
              {screen === "library" || screen === "nest" ? (
                <KidCorner kind={screen} onBack={() => setScreen("today")} />
              ) : null}
              {screen === "letter" ? (
                <SoundItOut
                  settingsRef={settingsRef}
                  paused={false}
                  words={lessonWords}
                  animal={active.animal}
                  onFinished={() => reward("letter")}
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

        {mode === "teacher" ? <TeacherView onClose={() => setMode("start")} /> : null}
      </main>
    </div>
  );
}
