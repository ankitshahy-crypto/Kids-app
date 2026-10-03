import { MODULE_COLORS, MODULE_NUMBERS, MODULE_TIME, MODULE_WORDS } from "../brand";
import { ModuleMark } from "./ModuleMark";
import { COLORS, colorStages } from "../data/colors";
import { MATH, mathStages } from "../data/math";
import { TIME, timeStages } from "../data/timeMoney";
import { pathStages } from "../data/path";
import {
  placeForStage,
  placeForWeek,
  placesFor,
  resolvePlacement,
  stageTitle,
  weekChoices,
  weekLabel,
  type LessonPlace,
  type PlacementDocument,
  type ResolvedPlacement,
} from "../data/placement";
import { READING, type SubjectId } from "../data/subject";
import { unitLabel } from "../data/units";
import { lessonName, type ChildProfile } from "../data/profiles";
import { heldBack } from "../explore/flags";

function PlaceEditor({
  label,
  place,
  clearLabel,
  clearKind,
  subject,
  stages,
  onChange,
}: {
  label: string;
  place: LessonPlace | null;
  clearLabel: string;
  clearKind: "class" | "child";
  subject: SubjectId;
  stages: readonly { id: string; title: string }[];
  onChange: (place: LessonPlace | null) => void;
}) {
  return (
    <fieldset className="place-editor">
      <legend>{label}</legend>
      <div className="segment place-stages" role="group" aria-label={`${label} stage`}>
        {stages.map((stage) => {
          const selected = place?.stageId === stage.id;
          return (
            <button
              key={stage.id}
              type="button"
              data-stage={stage.id}
              aria-pressed={selected}
              className={selected ? "is-selected" : ""}
              onClick={() => onChange(placeForStage(stage.id, subject))}
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
            onChange(value === "" ? null : placeForWeek(Number(value), subject));
          }}
        >
          <option value="">{clearLabel}</option>
          {weekChoices(subject).map((index) => (
            <option key={index} value={index}>
              {weekLabel(index, subject)}
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

/** Where a course lesson comes from, for a grown-up. */
function placeNote(resolved: ResolvedPlacement): string {
  if (resolved.source === "child") return "Set for this child.";
  if (resolved.source === "class") return "Using the class lesson.";
  if (resolved.ageCap) {
    return `Following this child's weeks. The calendar stops at ${stageTitle(resolved.ageCap, resolved.subject)} for this age. Pick a stage to move them up.`;
  }
  return "Following this child's weeks.";
}

export function PlacementControls({
  placement,
  profiles,
  onClassPlace,
  onChildPlace,
  showClass = true,
  heading = "Lesson place",
}: {
  placement: PlacementDocument;
  /** The children to show editors for. Empty with `showClass` shows the whole-class editors alone. */
  profiles: ChildProfile[];
  onClassPlace: (place: LessonPlace | null) => void;
  onChildPlace: (childId: string, place: LessonPlace | null) => void;
  /** The whole-class editors. Off inside one child's sheet. */
  showClass?: boolean;
  heading?: string;
}) {
  const reading = placesFor(placement, READING);
  return (
    <section
      className="teacher-card"
      data-card="placement"
      data-demo="false"
      data-class-id={placement.classId}
      data-subject={READING}
    >
      <h2>{heading}</h2>
      <h3 className="module-heading">
        <ModuleMark name="words" />
        <span>{MODULE_WORDS}</span>
      </h3>
      {showClass ? (
        <>
          <p className="adult-copy">
            Set the starting lesson for children on this device. A child can use a different lesson. Saved here only.
          </p>
          <div
            data-place="class"
            data-stage={reading.classDefault?.stageId ?? "calendar"}
            data-week={reading.classDefault ? String(reading.classDefault.weekIndex) : ""}
          >
            <PlaceEditor
              label="Whole class"
              place={reading.classDefault}
              clearLabel="Follow the calendar"
              clearKind="class"
              subject={READING}
              stages={pathStages}
              onChange={onClassPlace}
            />
          </div>
        </>
      ) : null}
      {showClass && profiles.length === 0 ? <p className="adult-copy">Tap a child in Class progress to set a different lesson for them.</p> : null}
      {profiles.map((profile) => {
        const override = reading.byChildId[profile.id] ?? null;
        const resolved = resolvePlacement(placement, profile.id, profile.createdAt, new Date(), undefined, READING, profile.ageRange);
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
              subject={READING}
              stages={pathStages}
              onChange={(place) => onChildPlace(profile.id, place)}
            />
            <p className="adult-copy" data-today={resolved.letters.join("")}>
              Today: {resolved.letters.map((letter) => unitLabel(letter).toUpperCase()).join(" ")} · {stageTitle(resolved.stageId)}. Traces
              big and little together.{" "}
              {resolved.source === "child"
                ? "Set for this child."
                : resolved.source === "class"
                  ? "Using the class lesson."
                  : "Following this child's weeks."}
            </p>
          </div>
        );
      })}
      <MathPlacement placement={placement} profiles={profiles} onClassPlace={onClassPlace} onChildPlace={onChildPlace} showClass={showClass} />
      <ColorPlacement placement={placement} profiles={profiles} onClassPlace={onClassPlace} onChildPlace={onChildPlace} showClass={showClass} />
      {/* Time & Money is being rebuilt and is left out of the installed app for now (src/explore/flags.ts), so the grown-up pages do not describe it either. */}
      {heldBack("time") ? null : (
        <TimePlacement placement={placement} profiles={profiles} onClassPlace={onClassPlace} onChildPlace={onChildPlace} showClass={showClass} />
      )}
    </section>
  );
}

function MathPlacement({
  placement,
  profiles,
  onClassPlace,
  onChildPlace,
  showClass,
}: {
  placement: PlacementDocument;
  profiles: ChildProfile[];
  onClassPlace: (place: LessonPlace | null) => void;
  onChildPlace: (childId: string, place: LessonPlace | null) => void;
  showClass: boolean;
}) {
  const math = placesFor(placement, MATH);
  return (
    <div data-subject={MATH}>
      <h3 className="module-heading">
        <ModuleMark name="numbers" />
        <span>{MODULE_NUMBERS}</span>
      </h3>
      <p className="adult-copy">Counting, numbers, shapes, then adding. Saved on this device, the same way as reading.</p>
      {showClass ? (
      <div
        data-place="class-math"
        data-stage={math.classDefault?.stageId ?? "calendar"}
        data-week={math.classDefault ? String(math.classDefault.weekIndex) : ""}
      >
        <PlaceEditor
          label="Whole class numbers"
          place={math.classDefault}
          clearLabel="Follow the calendar"
          clearKind="class"
          subject={MATH}
          stages={mathStages}
          onChange={onClassPlace}
        />
      </div>
      ) : null}
      {profiles.map((profile) => {
        const override = math.byChildId[profile.id] ?? null;
        const resolved = resolvePlacement(placement, profile.id, profile.createdAt, new Date(), undefined, MATH, profile.ageRange);
        return (
          <div
            key={profile.id}
            data-place="child-math"
            data-child={profile.id}
            data-stage={override?.stageId ?? "inherit"}
            data-source={resolved.source}
          >
            <PlaceEditor
              label={`${lessonName(profile)} numbers`}
              place={override}
              clearLabel="Same as class"
              clearKind="child"
              subject={MATH}
              stages={mathStages}
              onChange={(place) => onChildPlace(profile.id, place)}
            />
            <p className="adult-copy">
              {stageTitle(resolved.stageId, MATH)}. {placeNote(resolved)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function ColorPlacement({
  placement,
  profiles,
  onClassPlace,
  onChildPlace,
  showClass,
}: {
  placement: PlacementDocument;
  profiles: ChildProfile[];
  onClassPlace: (place: LessonPlace | null) => void;
  onChildPlace: (childId: string, place: LessonPlace | null) => void;
  showClass: boolean;
}) {
  const colors = placesFor(placement, COLORS);
  return (
    <div data-subject={COLORS}>
      <h3 className="module-heading">
        <ModuleMark name="colors" />
        <span>{MODULE_COLORS}</span>
      </h3>
      <p className="adult-copy">Color names, then mixing. Saved on this device, the same way as reading.</p>
      {showClass ? (
      <div
        data-place="class-colors"
        data-stage={colors.classDefault?.stageId ?? "calendar"}
        data-week={colors.classDefault ? String(colors.classDefault.weekIndex) : ""}
      >
        <PlaceEditor
          label="Whole class colors"
          place={colors.classDefault}
          clearLabel="Follow the calendar"
          clearKind="class"
          subject={COLORS}
          stages={colorStages}
          onChange={onClassPlace}
        />
      </div>
      ) : null}
      {profiles.map((profile) => {
        const override = colors.byChildId[profile.id] ?? null;
        const resolved = resolvePlacement(placement, profile.id, profile.createdAt, new Date(), undefined, COLORS, profile.ageRange);
        return (
          <div
            key={profile.id}
            data-place="child-colors"
            data-child={profile.id}
            data-stage={override?.stageId ?? "inherit"}
            data-source={resolved.source}
          >
            <PlaceEditor
              label={`${lessonName(profile)} colors`}
              place={override}
              clearLabel="Same as class"
              clearKind="child"
              subject={COLORS}
              stages={colorStages}
              onChange={(place) => onChildPlace(profile.id, place)}
            />
            <p className="adult-copy">
              {stageTitle(resolved.stageId, COLORS)}. {placeNote(resolved)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function TimePlacement({
  placement,
  profiles,
  onClassPlace,
  onChildPlace,
  showClass,
}: {
  placement: PlacementDocument;
  profiles: ChildProfile[];
  onClassPlace: (place: LessonPlace | null) => void;
  onChildPlace: (childId: string, place: LessonPlace | null) => void;
  showClass: boolean;
}) {
  const time = placesFor(placement, TIME);
  return (
    <div data-subject={TIME}>
      <h3 className="module-heading">
        <ModuleMark name="time" />
        <span>{MODULE_TIME}</span>
      </h3>
      <p className="adult-copy">Parts of the day, the clock, coins, and a pretend shop. Saved on this device, the same way as reading.</p>
      {showClass ? (
      <div
        data-place="class-time"
        data-stage={time.classDefault?.stageId ?? "calendar"}
        data-week={time.classDefault ? String(time.classDefault.weekIndex) : ""}
      >
        <PlaceEditor
          label="Whole class time"
          place={time.classDefault}
          clearLabel="Follow the calendar"
          clearKind="class"
          subject={TIME}
          stages={timeStages}
          onChange={onClassPlace}
        />
      </div>
      ) : null}
      {profiles.map((profile) => {
        const override = time.byChildId[profile.id] ?? null;
        const resolved = resolvePlacement(placement, profile.id, profile.createdAt, new Date(), undefined, TIME, profile.ageRange);
        return (
          <div
            key={profile.id}
            data-place="child-time"
            data-child={profile.id}
            data-stage={override?.stageId ?? "inherit"}
            data-source={resolved.source}
          >
            <PlaceEditor
              label={`${lessonName(profile)} time`}
              place={override}
              clearLabel="Same as class"
              clearKind="child"
              subject={TIME}
              stages={timeStages}
              onChange={(place) => onChildPlace(profile.id, place)}
            />
            <p className="adult-copy">
              {stageTitle(resolved.stageId, TIME)}. {placeNote(resolved)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
