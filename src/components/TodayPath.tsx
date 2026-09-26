import { Avatar } from "../avatars";
import { isReviewDay, planForWeek, practiceLetters, weekIndex } from "../data/schedule";
import { dayProgress, lessonName, type ChildProfile, type LessonStep } from "../data/profiles";
import { ReviewBadge, StarIcon } from "./icons";

const steps: { id: LessonStep; label: string; soon: boolean }[] = [
  { id: "letter", label: "Letters", soon: false },
  { id: "draw", label: "Draw", soon: true },
  { id: "story", label: "Story", soon: true },
  { id: "moment", label: "Colors", soon: true },
];

export function TodayPath({
  profile,
  onOpen,
  onSwitch,
}: {
  profile: ChildProfile;
  onOpen: (step: LessonStep) => void;
  onSwitch: () => void;
}) {
  const now = new Date();
  const review = isReviewDay(now);
  const plan = planForWeek(weekIndex(profile.createdAt, now));
  const letters = practiceLetters(plan, review);
  const done = dayProgress(profile, now);

  return (
    <div className="today" data-screen="today" data-review={review ? "true" : "false"}>
      <div className="today-head">
        <button type="button" className="who" onClick={onSwitch} aria-label="Switch child">
          <Avatar animal={profile.animal} />
          <span>{lessonName(profile)}</span>
        </button>
        <p className="star-count" data-stars={profile.stars}>
          <StarIcon />
          <span>{profile.stars}</span>
        </p>
      </div>

      <h1>Today</h1>

      {review ? (
        <div className="review-badge">
          <ReviewBadge />
          <span>Review</span>
        </div>
      ) : null}

      <div className="week-letters" aria-label="This week">
        {letters.map((letter) => (
          <span key={letter} className="week-letter">
            {letter.toUpperCase()}
          </span>
        ))}
      </div>

      <ol className="path">
        {steps.map((step, index) => {
          const finished = done[step.id];
          return (
            <li key={step.id}>
              <button
                type="button"
                className={`path-step${finished ? " is-done" : ""}`}
                data-step={step.id}
                onClick={() => onOpen(step.id)}
              >
                <span className="path-index" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="path-label">{step.label}</span>
                {finished ? (
                  <span className="path-star" aria-label="Star earned">
                    <StarIcon />
                  </span>
                ) : step.soon ? (
                  <span className="soon">Soon</span>
                ) : (
                  <span className="path-go" aria-hidden="true" />
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
