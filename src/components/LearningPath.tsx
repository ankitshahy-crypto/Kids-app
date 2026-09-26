import { laterPath, placeForChild } from "../data/path";
import type { ChildProfile } from "../data/profiles";

export function LearningPath({ profile, name }: { profile: ChildProfile; name?: string }) {
  const place = placeForChild(profile.createdAt);
  const current = place.stages.find((stage) => stage.state === "current");

  return (
    <section className="learn-path" data-section="path" data-current-stage={place.currentId}>
      <h2>Learning path{name ? ` · ${name}` : ""}</h2>
      <ol className="path-stages">
        {place.stages.map((stage) => (
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
        <li data-stage={laterPath.id} data-state="later" data-later="true">
          <span className="path-title">{laterPath.title}</span>
          <span className="path-state">Later</span>
        </li>
      </ol>
      {current ? (
        <p className="adult-copy">
          Now: {current.title}. {current.detail}
        </p>
      ) : null}
    </section>
  );
}
