import { useEffect, useState } from "react";
import { primeSpeech } from "./audio/player";
import { Background } from "./components/Background";
import { GearButton } from "./components/GearButton";
import { SettingsSheet } from "./components/SettingsSheet";
import { SoundItOut } from "./components/SoundItOut";
import { StartScreen } from "./components/StartScreen";
import { useSettings } from "./hooks/useSettings";

export default function App() {
  const { settings, update, settingsRef } = useSettings();
  const [started, setStarted] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (window.speechSynthesis?.paused) window.speechSynthesis.resume();
    }, 4000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="app">
      <Background />
      <main className="stage">
        <GearButton onOpen={() => setSettingsOpen(true)} />
        {started ? (
          <SoundItOut settingsRef={settingsRef} paused={settingsOpen} />
        ) : (
          <StartScreen
            onStart={() => {
              primeSpeech();
              setStarted(true);
            }}
          />
        )}
      </main>
      {settingsOpen ? (
        <SettingsSheet settings={settings} onChange={update} onClose={() => setSettingsOpen(false)} />
      ) : null}
    </div>
  );
}
