import { Fragment } from "react";
import { MODULE_BUILD, MODULE_COLORS, MODULE_NUMBERS, MODULE_SCIENCE, MODULE_TIME, MODULE_WORDS } from "../brand";
import { aboutFor, aboutSubjects, type AboutFeatureId, type AboutSubject } from "../content/about";
import { tint } from "../palette";
import { ModuleMark, type ModuleMarkName } from "./ModuleMark";
import { colorStages } from "../data/colors";
import { mathStages } from "../data/math";
import { timeStages } from "../data/timeMoney";
import { buildStages } from "../data/engineer";
import { scienceStages } from "../data/science";
import { laterPath, pathStages } from "../data/path";
import { GrownupIcon, SpeakerIcon, StarIcon } from "./icons";

const tints: Record<AboutFeatureId, string> = {
  hero: tint.peach,
  voice: tint.sky,
  calm: tint.mintCard,
  themes: tint.butter,
  blend: tint.mint,
  lesson: tint.blush,
  stars: tint.peach,
  rewards: tint.blush,
  math: tint.mint,
  colors: tint.blush,
  time: tint.sky,
  build: tint.peach,
  science: tint.mint,
  games: tint.peach,
  classroom: tint.sky,
  grownups: tint.mintCard,
};

/** Each Explore subject's mark, name and path of weeks, as About shows them. */
const SUBJECTS: Record<AboutSubject, { mark: ModuleMarkName; title: string; stages: readonly { id: string; title: string; detail: string }[] }> = {
  math: { mark: "numbers", title: MODULE_NUMBERS, stages: mathStages },
  colors: { mark: "colors", title: MODULE_COLORS, stages: colorStages },
  time: { mark: "time", title: MODULE_TIME, stages: timeStages },
  build: { mark: "build", title: MODULE_BUILD, stages: buildStages },
  science: { mark: "science", title: MODULE_SCIENCE, stages: scienceStages },
};

export function AboutWordNest() {
  // The copy and the subjects for this build: a section that is held back (HELD_BACK in
  // src/explore/flags.ts) is not described here, as it is not on the home screen. This page
  // used to name every section whatever the build held. See src/content/about.ts.
  const about = aboutFor();
  const subjects = aboutSubjects();
  return (
    <section className="about-page" data-section="about">
      <h2>{about.screenTitle}</h2>
      <p className="about-name">{about.name}</p>
      <div className="about-modules">
        <ModuleMark name="words" />
        {subjects.map((subject) => (
          <ModuleMark key={subject} name={SUBJECTS[subject].mark} />
        ))}
      </div>
      <p className="about-subtitle">{about.subtitle}</p>
      <p className="about-promo">{about.promo}</p>
      <p className="about-lead">{about.description}</p>

      <h3>{about.differentHeading}</h3>
      <ul className="about-features">
        {about.features.map((feature) => (
          <li key={feature.id} className="about-feature" data-feature={feature.id}>
            <span
              className={`about-feature-icon${feature.id === "math" || feature.id === "colors" || feature.id === "time" || feature.id === "science" ? " is-mark" : ""}`}
              style={{ background: tints[feature.id] }}
              aria-hidden="true"
            >
              <FeatureIcon id={feature.id} />
            </span>
            <h3>{feature.title}</h3>
            <p>{feature.body}</p>
          </li>
        ))}
      </ul>

      <h3>{about.teachesHeading}</h3>
      <p className="about-lead">{about.teaches}</p>
      <h3 className="module-heading">
        <ModuleMark name="words" />
        <span>{MODULE_WORDS}</span>
      </h3>
      <ol className="about-path">
        {pathStages.map((stage) => (
          <li key={stage.id} data-teach={stage.id}>
            <strong>{stage.title}</strong>
            <span>{stage.detail}</span>
          </li>
        ))}
        <li data-teach={laterPath.id} data-later="true">
          <strong>{laterPath.title}</strong>
          <span>{laterPath.detail}</span>
        </li>
      </ol>
      {subjects.map((subject) => (
        <Fragment key={subject}>
          <h3 className="module-heading">
            <ModuleMark name={SUBJECTS[subject].mark} />
            <span>{SUBJECTS[subject].title}</span>
          </h3>
          <ol className="about-path" data-teach-subject={subject}>
            {SUBJECTS[subject].stages.map((stage) => (
              <li key={stage.id} data-teach={stage.id}>
                <strong>{stage.title}</strong>
                <span>{stage.detail}</span>
              </li>
            ))}
          </ol>
        </Fragment>
      ))}

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
  if (id === "calm") return <CalmIcon />;
  if (id === "themes") return <ThemesIcon />;
  if (id === "math") return <ModuleMark name="numbers" className="about-module-mark" />;
  if (id === "colors") return <ModuleMark name="colors" className="about-module-mark" />;
  if (id === "time") return <ModuleMark name="time" className="about-module-mark" />;
  if (id === "build") return <ModuleMark name="build" className="about-module-mark" />;
  if (id === "science") return <ModuleMark name="science" className="about-module-mark" />;
  return <ClassIcon />;
}

function CalmIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path d="M3 15c3-4 6-4 9 0s6 4 9 0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="7" r="2.6" fill="currentColor" />
    </svg>
  );
}

function ThemesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path d="M12 3l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.4l-5.3 2.8 1.1-5.9L3.5 9.2l5.9-.8Z" fill="currentColor" />
    </svg>
  );
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
