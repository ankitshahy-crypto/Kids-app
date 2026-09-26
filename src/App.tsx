import { useEffect, useMemo, useState } from "react";
import { primeSpeech } from "./audio/player";
import { Background } from "./components/Background";
import { Chevron, HomeIcon } from "./components/icons";
import { GearButton } from "./components/GearButton";
import { ParentView } from "./components/ParentPanel";
import { PlaceholderStep } from "./components/PlaceholderStep";
import { ProfilePicker } from "./components/ProfilePicker";
import { SoundItOut } from "./components/SoundItOut";
import { StartScreen } from "./components/StartScreen";
import { TeacherView } from "./components/TeacherView";
import { TodayPath } from "./components/TodayPath";
import { isReviewDay, planForWeek, practiceLetters, weekIndex, wordsForLetters } from "./data/schedule";
import type { LessonStep } from "./data/profiles";
import { useProfiles } from "./hooks/useProfiles";
import { useSettings } from "./hooks/useSettings";

type Mode = "start" | "kid" | "parent" | "teacher";
type Screen = "picker" | "today" | LessonStep;

export default function App() {
  const { settings, update, settingsRef } = useSettings();
  const { profiles, active, select, addChild, updateChild, removeChild, giveStar } = useProfiles();
  const [mode, setMode] = useState<Mode>("start");
  const [parentFrom, setParentFrom] = useState<"start" | "kid">("start");
  const [screen, setScreen] = useState<Screen>("picker");

  useEffect(() => {
    const id = window.setInterval(() => {
      if (window.speechSynthesis?.paused) window.speechSynthesis.resume();
    }, 4000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!active && screen !== "picker") setScreen("picker");
  }, [active, screen]);

  const lessonWords = useMemo(() => {
    if (!active) return [];
    const now = new Date();
    const letters = practiceLetters(planForWeek(weekIndex(active.createdAt, now)), isReviewDay(now));
    return wordsForLetters(letters);
  }, [active]);

  const openParent = (from: "start" | "kid") => {
    setParentFrom(from);
    setMode("parent");
  };

  const openStep = (step: LessonStep) => {
    primeSpeech();
    setScreen(step);
  };

  const finishStep = (step: LessonStep) => {
    if (active) giveStar(active.id, step);
    setScreen("today");
  };

  const showBack = screen !== "picker" && screen !== "today";
  const pastel = mode === "start" || mode === "kid";

  return (
    <div className={`app mode-${mode}`} data-mode={mode}>
      {pastel ? <Background /> : null}
      <main className="stage">
        {mode === "start" ? (
          <StartScreen
            onKid={() => {
              primeSpeech();
              setScreen("picker");
              setMode("kid");
            }}
            onParent={() => openParent("start")}
            onTeacher={() => setMode("teacher")}
          />
        ) : null}

        {mode === "kid" ? (
          <>
            <div className="top-bar">
              {showBack ? (
                <button type="button" className="back-button" aria-label="Back" onClick={() => setScreen("today")}>
                  <span className="gear-face">
                    <Chevron direction="left" />
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  className="back-button"
                  aria-label="Home"
                  onClick={() => setMode("start")}
                >
                  <span className="gear-face">
                    <HomeIcon />
                  </span>
                </button>
              )}
              <GearButton onOpen={() => openParent("kid")} />
            </div>
            <div className="screen-body">
              {screen === "picker" || !active ? (
                <ProfilePicker
                  profiles={profiles}
                  onPick={(id) => {
                    primeSpeech();
                    select(id);
                    setScreen("today");
                  }}
                />
              ) : null}
              {screen === "today" && active ? (
                <TodayPath
                  profile={active}
                  onSwitch={() => setScreen("picker")}
                  onOpen={openStep}
                />
              ) : null}
              {screen === "letter" && active ? (
                <SoundItOut
                  settingsRef={settingsRef}
                  paused={false}
                  words={lessonWords}
                  onFinished={() => giveStar(active.id, "letter")}
                />
              ) : null}
              {screen !== "picker" && screen !== "today" && screen !== "letter" && active ? (
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
              onAdd={addChild}
              onUpdate={updateChild}
              onRemove={removeChild}
              onClose={() => setMode(parentFrom)}
            />
          </div>
        ) : null}

        {mode === "teacher" ? (
          <div className="screen-body">
            <TeacherView onClose={() => setMode("start")} />
          </div>
        ) : null}
      </main>
    </div>
  );
}
