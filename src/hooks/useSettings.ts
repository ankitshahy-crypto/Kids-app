import { useEffect, useRef, useState } from "react";
import { loadSettings, saveSettings, type Settings } from "../settings";

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const update = (patch: Partial<Settings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      if (patch.voice !== undefined) next.sound = patch.voice;
      else if (patch.sound !== undefined) next.voice = patch.sound;
      return next;
    });
  };

  return { settings, update, settingsRef };
}
