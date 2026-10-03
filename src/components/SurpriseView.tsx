import { useEffect, useRef } from "react";
import { playLine, promptCue } from "../audio/player";
import { Avatar } from "../avatars";
import { Illustration } from "../illustrations";
import { dailySurprise } from "../data/surprise";
import { todayKey, type ChildProfile } from "../data/profiles";
import type { Settings } from "../settings";
import { themeArt } from "../themeArt";
import { Chevron, SpeakerIcon } from "./icons";
import { Hero } from "./Hero";

/** Today's visitor. The same one all day, nothing to win, nothing to keep up. */
export function SurpriseView({
  profile,
  settingsRef,
  onBack,
}: {
  profile: ChildProfile;
  settingsRef: { current: Settings };
  onBack: () => void;
}) {
  const surprise = dailySurprise(profile.id, profile.animal, profile.themes, todayKey());
  const playRef = useRef<AbortController | null>(null);
  const say = () => {
    playRef.current?.abort();
    const controller = new AbortController();
    playRef.current = controller;
    // Two recorded clips, one after the other: "Fox came to say hi!" "And brought a rocket!"
    void playLine(
      surprise.clips.map((clip) => promptCue(clip.id, clip.say)),
      settingsRef.current,
      controller.signal,
    ).catch(() => undefined);
  };
  useEffect(() => {
    say();
    return () => playRef.current?.abort();
    // The line is fixed for the day.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surprise.line]);
  const GiftArt = surprise.theme ? (surprise.theme === "ocean" ? null : themeArt[surprise.theme]) : null;

  return (
    <div className="reward-screen surprise" data-screen="surprise" data-visitor={surprise.visitor} data-gift={surprise.gift ?? ""}>
      <button type="button" className="back-button" aria-label="Back" onClick={onBack}>
        <span className="gear-face">
          <Chevron direction="left" />
        </span>
      </button>
      <h1>Today&apos;s surprise</h1>
      <div className="surprise-scene" aria-hidden="true">
        <span className="surprise-host">
          <Hero animal={profile.animal} outfit={profile.outfit} />
        </span>
        <span className="surprise-visitor">
          <Avatar animal={surprise.visitor} />
        </span>
        {surprise.gift ? (
          <span className="surprise-gift">{surprise.theme === "ocean" ? <Illustration name="fish" /> : GiftArt ? <GiftArt /> : null}</span>
        ) : null}
      </div>
      <p className="surprise-line">{surprise.line}</p>
      <button type="button" className="play-button surprise-hear" onClick={say}>
        <span className="play-icon" aria-hidden="true">
          <SpeakerIcon />
        </span>
        <span>Say it again</span>
      </button>
    </div>
  );
}
