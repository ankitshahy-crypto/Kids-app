import nestLogo from "../assets/nest-logo.svg";
import type { AnimalId } from "../data/animals";
import { lessonName, type ChildProfile } from "../data/profiles";
import { Avatar } from "../avatars";
import { HoldButton } from "./HoldButton";
import { LockIcon } from "./sceneArt";

const backdrops: Record<AnimalId, string> = {
  cat: "#F8D7C4",
  dog: "#F6E3B8",
  fox: "#F8D0C0",
  bear: "#E7D3C0",
  bunny: "#D9E8F6",
  owl: "#E7DCF4",
  frog: "#D7EEDC",
  duck: "#FBE7B0",
};

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
  return (
    <div className="mode-switch" data-screen="start">
      <div className="mode-art">
        <img className="nest-logo" src={nestLogo} alt="" />
      </div>
      <h1 className="wordmark">
        <span className="wordmark-word">Word</span>
        <span className="wordmark-nest">Nest</span>
      </h1>
      <div className="who-card">
        {profiles.length === 0 ? (
          <p className="who-empty">Ask a grown-up to hold Parent.</p>
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
      <div className="gate-row">
        <HoldButton
          className="gate-button"
          indicator="bar"
          label="Parent. Press and hold to open."
          onOpen={onParent}
        >
          <LockIcon />
          Parent
        </HoldButton>
        <HoldButton
          className="gate-button gate-teacher"
          indicator="bar"
          label="Teacher. Press and hold to open."
          onOpen={onTeacher}
        >
          <LockIcon />
          Teacher
        </HoldButton>
      </div>
    </div>
  );
}
