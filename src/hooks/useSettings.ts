import { useEffect, useRef, useState } from "react";
import { loadSettings, saveSettings, type Settings } from "../settings";
import { SHARED_CHOSEN_KEY } from "../storage";

/** Shared class iPad has been set once, so the Teacher screen no longer turns it on by itself. */
export function sharedChosen(): boolean {
  try {
    return localStorage.getItem(SHARED_CHOSEN_KEY) === "1";
  } catch {
    return false;
  }
}

function noteSharedChosen(): void {
  try {
    localStorage.setItem(SHARED_CHOSEN_KEY, "1");
  } catch {
    // Storage blocked: the Teacher screen may turn it on once more, which is the safe way.
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const update = (patch: Partial<Settings>) => {
    if (patch.sharedDevice !== undefined) noteSharedChosen();
    setSettings((current) => {
      const next = { ...current, ...patch };
      if (patch.voice !== undefined) next.sound = patch.voice;
      else if (patch.sound !== undefined) next.voice = patch.sound;
      return next;
    });
  };

  return { settings, update, settingsRef };
}
