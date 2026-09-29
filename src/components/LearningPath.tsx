import { ModuleMark, type ModuleMarkName } from "./ModuleMark";
import { COLORS, colorIntroduced } from "../data/colors";
import { MATH, mathIntroduced } from "../data/math";
import { TIME, timeIntroduced } from "../data/timeMoney";
import { ladderDetail, ladderTitle } from "../data/ladder";
import { laterPath, learningPlace, placeForChild, showsLaterReading, stagesForAge } from "../data/path";
import type { ChildProfile } from "../data/profiles";
import { READING, type SubjectId } from "../data/subject";
import { weekIndex } from "../data/schedule";

/** Each path says which subject it is, since all four sit together on one page. */
const SUBJECT_PATH: Record<string, string> = {
  [READING]: "Reading path",
  [MATH]: "Numbers path",
  [COLORS]: "Colors path",
  [TIME]: "Time and money path",
};


export function LearningPath({
  profile,
  name,
  placedIntroduced,
  subject = READING,
  section = "path",
}: {
  profile: ChildProfile;
  name?: string;
  /** When a teacher placed the lesson, the path uses that unit count. */
  placedIntroduced?: number;
  subject?: SubjectId;
  section?: string;
}) {
  const place =
    placedIntroduced === undefined
      ? subject === MATH
        ? learningPlace(MATH, mathIntroduced(weekIndex(profile.createdAt)))
        : subject === COLORS
          ? learningPlace(COLORS, colorIntroduced(weekIndex(profile.createdAt)))
          : subject === TIME
            ? learningPlace(TIME, timeIntroduced(weekIndex(profile.createdAt)))
            : placeForChild(profile.createdAt)
      : learningPlace(subject, placedIntroduced);
  const current = place.stages.find((stage) => stage.state === "current");
  const { shown, hidden } = stagesForAge(place.stages, subject, profile.ageRange);
  const later = subject === READING && showsLaterReading(profile.ageRange);
  const mark: ModuleMarkName = subject === MATH ? "numbers" : subject === COLORS ? "colors" : subject === TIME ? "time" : "words";
  const ladderStep = profile.ladder?.step ?? 1;

  return (
    <section
      className="learn-path"
      data-section={section}
      data-subject={place.subject}
      data-current-stage={place.currentId}
      data-ladder-step={subject === READING ? ladderStep : undefined}
    >
      <h2 className="module-heading">
        <ModuleMark name={mark} />
        <span>
          {SUBJECT_PATH[subject] ?? "Learning path"}
          {name ? ` · ${name}` : ""}
        </span>
      </h2>
      <ol className="path-stages">
        {shown.map((stage) => (
          <li key={stage.id} data-stage={stage.id} data-state={stage.state}>
            <span className="path-title">{stage.title}</span>
            {stage.state === "current" ? (
              <span className="path-meter" aria-hidden="true">
                <span style={{ width: `${Math.round(stage.progress * 100)}%` }} />
              </span>
            ) : (
              <span className="path-state">{stage.state === "done" ? "Done" : "Next"}</span>
            )}
          </li>
        ))}
        {subject === READING ? (
          <li data-stage="word-ladder" data-ladder-step={ladderStep} data-state="step">
            <span className="path-title">Word ladder</span>
            <span className="path-state">
              Step {ladderStep} · {ladderTitle(ladderStep)}
            </span>
          </li>
        ) : null}
        {later ? (
          <li data-stage={laterPath.id} data-state="later" data-later="true">
            <span className="path-title">{laterPath.title}</span>
            <span className="path-state">Later</span>
          </li>
        ) : null}
      </ol>
      {hidden > 0 || (subject === READING && !later) ? (
        <p className="adult-copy" data-path-more={hidden}>
          The stages for older children show here as {name ?? "your child"} grows.
        </p>
      ) : null}
      {current ? (
        <p className="adult-copy">
          Now: {current.title}. {current.detail}
          {subject === READING ? ` Words: step ${ladderStep}, ${ladderDetail(ladderStep)}.` : ""}
        </p>
      ) : null}
    </section>
  );
}
