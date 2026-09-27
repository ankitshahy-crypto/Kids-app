import { useEffect, useRef } from "react";
import { playOnDevice } from "../audio/player";
import { lessonName, todayKey, type ChildProfile } from "../data/profiles";
import { themedStoryLine } from "../data/themes";
import type { Settings } from "../settings";
import { Hero } from "./Hero";

const copy: Record<"story" | "moment", { title: string; label: string }> = {
  story: { title: "Story", label: "A story is coming next" },
  moment: { title: "Colors", label: "A color moment is coming next" },
};

export function PlaceholderStep({
  step,
  profile,
  settingsRef,
  onDone,
}: {
  step: "story" | "moment";
  profile: ChildProfile;
  settingsRef: { current: Settings };
  onDone: () => void;
}) {
  const info = copy[step];
  const hero = `${lessonName(profile)}'s ${profile.animal}`;
  const line = step === "story" ? themedStoryLine(hero, profile.themes, todayKey(), info.label) : info.label;
  const playRef = useRef<AbortController | null>(null);
  useEffect(() => {
    // Read the line aloud. "Hear it again" in the top bar repeats it.
    playRef.current?.abort();
    const controller = new AbortController();
    playRef.current = controller;
    void playOnDevice(line, settingsRef.current, controller.signal).catch(() => undefined);
    return () => controller.abort();
  }, [line, settingsRef]);
  return (
    <div className="placeholder" data-screen={step} data-step={step} data-themed={step === "story" && line !== info.label ? "true" : "false"}>
      <span className="soon soon-large">Soon</span>
      <div className="placeholder-art" aria-hidden="true">
        {step === "story" ? <Hero animal={profile.animal} outfit={profile.outfit} /> : null}
        {step === "moment" ? <ShapeMark /> : null}
      </div>
      <h1>{step === "story" ? lessonName(profile) : info.title}</h1>
      <p>{line}</p>
      <button type="button" className="start-button" onClick={onDone}>
        All done
      </button>
    </div>
  );
}

function ShapeMark() {
  return (
    <svg viewBox="0 0 160 120" className="mark-art">
      <circle cx="36" cy="62" r="22" fill="#F4A4B4" />
      <rect x="68" y="40" width="36" height="44" rx="10" fill="#F6C445" />
      <path d="M128 84 146 40 110 40Z" fill="#8FCB7A" />
    </svg>
  );
}
