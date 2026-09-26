import { aboutContent, type AboutFeatureId } from "../content/about";
import { GrownupIcon, SpeakerIcon, StarIcon } from "./icons";

const tints: Record<AboutFeatureId, string> = {
  hero: "#F8E6D4",
  voice: "#E4EEF8",
  blend: "#E7F2EA",
  lesson: "#FDE7D4",
  stars: "#F8E6D4",
  rewards: "#FDE7D4",
  classroom: "#E4EEF8",
  grownups: "#E5F4EA",
};

export function AboutWordNest() {
  const about = aboutContent;
  return (
    <section className="about-page" data-section="about">
      <h2>{about.screenTitle}</h2>
      <p className="about-name">{about.name}</p>
      <p className="about-subtitle">{about.subtitle}</p>
      <p className="about-promo">{about.promo}</p>
      <p className="about-lead">{about.description}</p>

      <h3>{about.differentHeading}</h3>
      <ul className="about-features">
        {about.features.map((feature) => (
          <li key={feature.id} className="about-feature" data-feature={feature.id}>
            <span className="about-feature-icon" style={{ background: tints[feature.id] }} aria-hidden="true">
              <FeatureIcon id={feature.id} />
            </span>
            <h3>{feature.title}</h3>
            <p>{feature.body}</p>
          </li>
        ))}
      </ul>

      <h3>{about.safetyHeading}</h3>
      <p className="about-lead">{about.safety}</p>

      <h3>{about.affordableHeading}</h3>
      <p className="about-lead">{about.affordable}</p>

      <p className="about-note">{about.disclaimer}</p>
      <p className="about-credit">{about.maker}</p>
      <p className="about-version">Version {about.version}</p>
    </section>
  );
}

function FeatureIcon({ id }: { id: AboutFeatureId }) {
  if (id === "voice") return <SpeakerIcon />;
  if (id === "stars") return <StarIcon />;
  if (id === "grownups") return <GrownupIcon />;
  if (id === "hero") return <HeroIcon />;
  if (id === "blend") return <BlendIcon />;
  if (id === "lesson") return <LessonIcon />;
  if (id === "rewards") return <RewardIcon />;
  return <ClassIcon />;
}

function HeroIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <circle cx="12" cy="8" r="3.2" fill="currentColor" />
      <path
        fill="currentColor"
        d="M6.2 18.6c.4-2.6 2.6-4.2 5.8-4.2s5.4 1.6 5.8 4.2c.1.7-.4 1.4-1.1 1.4H7.3c-.7 0-1.2-.7-1.1-1.4Z"
      />
      <path fill="currentColor" d="M17.2 4.2 18 6l1.8.2-1.4 1.2.4 1.8-1.6-.9-1.6.9.4-1.8-1.4-1.2 1.8-.2.8-1.8Z" />
    </svg>
  );
}

function BlendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <circle cx="5" cy="14" r="1.6" fill="currentColor" />
      <circle cx="10" cy="14" r="1.6" fill="currentColor" />
      <circle cx="15" cy="14" r="1.6" fill="currentColor" />
      <path
        d="M4 9.5h13.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M15.2 6.8 18.6 9.5 15.2 12.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LessonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <circle cx="12" cy="12" r="7.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8.2V12l2.8 1.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RewardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path fill="currentColor" d="M12 2.4 13.6 7h4.8l-3.9 2.8 1.5 4.6L12 11.6 7.9 14.4 9.4 9.8 5.6 7h4.8L12 2.4Z" />
      <path
        fill="currentColor"
        d="M7 15.2h10v2.2c0 .8-.7 1.6-1.6 1.6H8.6c-.9 0-1.6-.8-1.6-1.6v-2.2Z"
      />
    </svg>
  );
}

function ClassIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <circle cx="8" cy="9" r="2.2" fill="currentColor" />
      <circle cx="16" cy="9" r="2.2" fill="currentColor" />
      <path
        fill="currentColor"
        d="M3.8 17.8c.3-2 2-3.2 4.2-3.2s3.9 1.2 4.2 3.2c.1.6-.3 1.2-.9 1.2H4.7c-.6 0-1-.6-.9-1.2ZM11.8 17.8c.2-1.4 1.2-2.4 2.6-2.9.8 1.1 1.2 2.2 1.3 2.9.1.6-.3 1.2-.9 1.2h-2.2c-.4 0-.7-.2-.8-.5v-.7ZM14.2 14.6c.8 0 2.4.6 2.8 2.4.1.4 0 .8-.2 1.1h2.4c.5 0 .9-.5.8-1-.3-1.8-1.8-2.9-3.8-2.9-.7 0-1.4.1-2 .4Z"
      />
    </svg>
  );
}
