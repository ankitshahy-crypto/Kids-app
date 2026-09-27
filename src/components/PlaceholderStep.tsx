import { lessonName, type ChildProfile, type LessonStep } from "../data/profiles";
import { Hero } from "./Hero";

const copy: Record<Exclude<LessonStep, "letter">, { title: string; label: string }> = {
  draw: { title: "Draw", label: "Tracing is coming next" },
  story: { title: "Story", label: "A story is coming next" },
  moment: { title: "Colors", label: "A color moment is coming next" },
};

export function PlaceholderStep({
  step,
  profile,
  onDone,
}: {
  step: Exclude<LessonStep, "letter">;
  profile: ChildProfile;
  onDone: () => void;
}) {
  const info = copy[step];
  return (
    <div className="placeholder" data-screen={step} data-step={step}>
      <span className="soon soon-large">Soon</span>
      <div className="placeholder-art" aria-hidden="true">
        {step === "story" ? <Hero animal={profile.animal} outfit={profile.outfit} /> : null}
        {step === "draw" ? <DrawMark /> : null}
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

function DrawMark() {
  return (
    <svg viewBox="0 0 160 120" className="mark-art">
      <path
        d="M28 78c18-28 36-28 52 0s34 28 52 0"
        fill="none"
        stroke="#7EA184"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path d="M108 28 96 70" stroke="#E0A15A" strokeWidth="8" strokeLinecap="round" />
      <path d="M92 70h20" stroke="#E07A5F" strokeWidth="8" strokeLinecap="round" />
    </svg>
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
