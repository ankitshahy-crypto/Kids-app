import { pathStages } from "../data/path";
import {
  placeForStage,
  placeForWeek,
  resolvePlacement,
  stageTitle,
  weekLabel,
  type LessonPlace,
  type PlacementDocument,
} from "../data/placement";
import { lessonName, type ChildProfile } from "../data/profiles";
import { letterSchedule } from "../data/schedule";

function PlaceEditor({
  label,
  place,
  clearLabel,
  clearKind,
  onChange,
}: {
  label: string;
  place: LessonPlace | null;
  clearLabel: string;
  clearKind: "class" | "child";
  onChange: (place: LessonPlace | null) => void;
}) {
  return (
    <fieldset className="place-editor">
      <legend>{label}</legend>
      <div className="segment place-stages" role="group" aria-label={`${label} stage`}>
        {pathStages.map((stage) => {
          const selected = place?.stageId === stage.id;
          return (
            <button
              key={stage.id}
              type="button"
              data-stage={stage.id}
              aria-pressed={selected}
              className={selected ? "is-selected" : ""}
              onClick={() => onChange(placeForStage(stage.id))}
            >
              {stage.title}
            </button>
          );
        })}
      </div>
      <label className="place-week-label">
        Lesson week
        <select
          className="place-week"
          value={place ? String(place.weekIndex) : ""}
          onChange={(event) => {
            const value = event.target.value;
            onChange(value === "" ? null : placeForWeek(Number(value)));
          }}
        >
          <option value="">{clearLabel}</option>
          {letterSchedule.map((plan, index) => (
            <option key={plan.week} value={index}>
              {weekLabel(index)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className={`place-clear${place === null ? " is-selected" : ""}`}
        data-place-clear={clearKind}
        aria-pressed={place === null}
        onClick={() => onChange(null)}
      >
        {clearLabel}
      </button>
    </fieldset>
  );
}

export function PlacementControls({
  placement,
  profiles,
  onClassPlace,
  onChildPlace,
}: {
  placement: PlacementDocument;
  profiles: ChildProfile[];
  onClassPlace: (place: LessonPlace | null) => void;
  onChildPlace: (childId: string, place: LessonPlace | null) => void;
}) {
  return (
    <section className="teacher-card" data-card="placement" data-demo="false" data-class-id={placement.classId}>
      <h2>Lesson place</h2>
      <p className="adult-copy">
        Set the starting lesson for children on this device. A child can use a different lesson. Saved here only. A
        class server can use this same list later.
      </p>
      <div
        data-place="class"
        data-stage={placement.classDefault?.stageId ?? "calendar"}
        data-week={placement.classDefault ? String(placement.classDefault.weekIndex) : ""}
      >
        <PlaceEditor
          label="Whole class"
          place={placement.classDefault}
          clearLabel="Follow the calendar"
          clearKind="class"
          onChange={onClassPlace}
        />
      </div>
      {profiles.length === 0 ? <p className="adult-copy">Add a child to set a different lesson for them.</p> : null}
      {profiles.map((profile) => {
        const override = placement.byChildId[profile.id] ?? null;
        const resolved = resolvePlacement(placement, profile.id, profile.createdAt);
        return (
          <div
            key={profile.id}
            data-place="child"
            data-child={profile.id}
            data-stage={override?.stageId ?? "inherit"}
            data-week={override ? String(override.weekIndex) : ""}
            data-source={resolved.source}
          >
            <PlaceEditor
              label={lessonName(profile)}
              place={override}
              clearLabel="Same as class"
              clearKind="child"
              onChange={(place) => onChildPlace(profile.id, place)}
            />
            <p className="adult-copy" data-today={resolved.letters.join("")}>
              Today: {resolved.letters.map((letter) => letter.toUpperCase()).join(" ")} · {stageTitle(resolved.stageId)}.{" "}
              {resolved.source === "child"
                ? "Set for this child."
                : resolved.source === "class"
                  ? "Using the class lesson."
                  : "Following this child's weeks."}
            </p>
          </div>
        );
      })}
    </section>
  );
}
