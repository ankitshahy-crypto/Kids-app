import { lessonName, type ChildProfile } from "../data/profiles";
import { Hero } from "./Hero";

const copy: Record<"story" | "moment", { title: string; label: string }> = {
  story: { title: "Story", label: "A story is coming next" },
  moment: { title: "Colors", label: "A color moment is coming next" },
};

export function PlaceholderStep({
  step,
  profile,
  onDone,
}: {
  step: "story" | "moment";
  profile: ChildProfile;
  onDone: () => void;
}) {
  const info = copy[step];
  return (
    <div className="placeholder" data-screen={step} data-step={step}>
      <span className="soon soon-large">Soon</span>
      <div className="placeholder-art" aria-hidden="true">
        {step === "story" ? <Hero animal={profile.animal} outfit={profile.outfit} /> : null}
        {step === "moment" ? <ShapeMark /> : null}
      </div>
      <h1>{step === "story" ? lessonName(profile) : info.title}</h1>
      <p>{info.label}</p>
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
