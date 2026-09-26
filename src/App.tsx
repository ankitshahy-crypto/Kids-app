import { useEffect, useMemo, useState } from "react";
import { primeSpeech } from "./audio/player";
import { Background } from "./components/Background";
import { Chevron } from "./components/icons";
import { GearButton } from "./components/GearButton";
import { ParentPanel } from "./components/ParentPanel";
import { PlaceholderStep } from "./components/PlaceholderStep";
import { ProfilePicker } from "./components/ProfilePicker";
import { SoundItOut } from "./components/SoundItOut";
import { TodayPath } from "./components/TodayPath";
import { isReviewDay, planForWeek, practiceLetters, weekIndex, wordsForLetters } from "./data/schedule";
import type { LessonStep } from "./data/profiles";
import { useProfiles } from "./hooks/useProfiles";
import { useSettings } from "./hooks/useSettings";

type Screen = "picker" | "today" | LessonStep;

export default function App() {
  const { settings, update, settingsRef } = useSettings();
  const { profiles, active, select, addChild, removeChild, giveStar } = useProfiles();
  const [screen, setScreen] = useState<Screen>("picker");
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  const openStep = (step: LessonStep) => {
    primeSpeech();
    setScreen(step);
  };

  const finishStep = (step: LessonStep) => {
    if (active) giveStar(active.id, step);
    setScreen("today");
  };

  const showBack = screen !== "picker" && screen !== "today";

  return (
    <div className="app">
      <Background />
      <main className="stage">
        <div className="top-bar">
          {showBack ? (
            <button type="button" className="back-button" aria-label="Back" onClick={() => setScreen("today")}>
              <span className="gear-face">
                <Chevron direction="left" />
              </span>
            </button>
          ) : (
            <span className="top-spacer" />
          )}
          <GearButton onOpen={() => setSettingsOpen(true)} />
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
              paused={settingsOpen}
              words={lessonWords}
              onFinished={() => giveStar(active.id, "letter")}
            />
          ) : null}
          {screen !== "picker" && screen !== "today" && screen !== "letter" && active ? (
            <PlaceholderStep step={screen} profile={active} onDone={() => finishStep(screen)} />
          ) : null}
        </div>
      </main>
      {settingsOpen ? (
        <ParentPanel
          settings={settings}
          onChange={update}
          profiles={profiles}
          onAdd={addChild}
          onRemove={removeChild}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
    </div>
  );
}
