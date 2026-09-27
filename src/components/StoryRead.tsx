import { useState } from "react";
import { playOnDevice } from "../audio/player";
import type { ChildProfile } from "../data/profiles";
import { storyLines } from "../data/story";
import type { Settings } from "../settings";
import { Hero } from "./Hero";

export function StoryRead({
  profile,
  settingsRef,
  onDone,
}: {
  profile: ChildProfile;
  settingsRef: { current: Settings };
  onDone: () => void;
}) {
  const lines = storyLines(profile.animal);
  const [page, setPage] = useState(0);
  const line = lines[page] ?? lines[0];
  const last = page >= lines.length - 1;

  const speak = () => {
    void playOnDevice(line, settingsRef.current, new AbortController().signal).catch(() => undefined);
  };

  return (
    <div className="story-read" data-screen="story" data-page={page}>
      <div className="story-hero">
        <Hero animal={profile.animal} outfit={profile.outfit} />
      </div>
      <p className="story-line">{line}</p>
      <button type="button" className="hear-label" onClick={speak}>
        Hear it
      </button>
      {last ? (
        <button type="button" className="start-button" onClick={onDone}>
          All done
        </button>
      ) : (
        <button type="button" className="start-button" onClick={() => setPage((current) => current + 1)}>
          Next page
        </button>
      )}
    </div>
  );
}
