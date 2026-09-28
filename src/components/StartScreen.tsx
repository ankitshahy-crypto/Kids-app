import { useState } from "react";
import { TAGLINE } from "../brand";
import { ModuleMark } from "./ModuleMark";
import { face } from "../palette";
import type { AnimalId } from "../data/animals";
import { lessonName, type ChildProfile } from "../data/profiles";
import { Avatar } from "../avatars";
import { ParentGate } from "./ParentGate";
import { LockIcon } from "./sceneArt";

const backdrops: Record<AnimalId, string> = face;

export function StartScreen({
  profiles,
  onPick,
  onParent,
  onTeacher,
}: {
  profiles: ChildProfile[];
  onPick: (id: string) => void;
  onParent: () => void;
  onTeacher: () => void;
}) {
  const [ask, setAsk] = useState<"parent" | "teacher" | null>(null);

  const pass = () => {
    const next = ask;
    setAsk(null);
    if (next === "parent") onParent();
    if (next === "teacher") onTeacher();
  };

  return (
    <div className="mode-switch" data-screen="start">
      <div className="mode-art">
        <ModuleMark name="app" className="nest-logo" />
      </div>
      <h1 className="wordmark">
        <span className="wordmark-nest">LittleNest</span>
        <span className="wordmark-word">Learning</span>
      </h1>
      <p className="byline">{TAGLINE}</p>
      <div className="who-card">
        {profiles.length === 0 ? (
          <div className="who-welcome" data-first-run="true">
            <p className="who-empty">Welcome! Add your child to begin. It takes a minute, and nothing leaves this device.</p>
            <button type="button" className="done-button who-start" onClick={() => setAsk("parent")}>
              Add a child
            </button>
          </div>
        ) : (
          <div className="who-grid">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                className="who-pick"
                data-animal={profile.animal}
                onClick={() => onPick(profile.id)}
              >
                <span className="who-face" style={{ background: backdrops[profile.animal] }}>
                  <Avatar animal={profile.animal} />
                </span>
                <span>{lessonName(profile)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="gate-note">For grown-ups: progress, settings, and lesson place</p>
      <div className="gate-row">
        <button type="button" className="gate-button" onClick={() => setAsk("parent")}>
          <LockIcon />
          Parent
        </button>
        <button type="button" className="gate-button gate-teacher" onClick={() => setAsk("teacher")}>
          <LockIcon />
          Teacher
        </button>
      </div>
      {ask ? <ParentGate onPass={pass} onCancel={() => setAsk(null)} /> : null}
    </div>
  );
}
