import { COLORS, colorIntroduced } from "../data/colors";
import { TIME, timeIntroduced } from "../data/timeMoney";
import { MATH, mathIntroduced } from "../data/math";
import { practiceTotal } from "../data/reading";
import { lettersIntroduced } from "../data/schedule";
import { resolvePlacement, type LessonPlace, type PlacementDocument } from "../data/placement";
import { READING } from "../data/subject";
import { traceLetters } from "../data/units";
import { lessonName, type ChildProfile } from "../data/profiles";
import type { ScaffoldLevel } from "../data/scaffold";
import type { HatchLevel } from "../data/games";
import type { LadderStep } from "../data/ladder";
import { HatchLevelControl } from "./HatchLevel";
import { WordLadder } from "./WordLadder";
import { WritingLevels } from "./WritingLevels";
import { LearningPath } from "./LearningPath";
import { PlacementControls } from "./PlacementControls";
import { Printables } from "./Printables";
import { ReadingChart } from "./ReadingChart";
import { ClassProgress } from "./ProgressViews";
import type { HomeReport } from "../data/profileExtras";

function DeviceRewards({
  profiles,
  goalMinutes,
  placement,
  onWritingLevel,
  onHatchLevel,
  onLadderStep,
}: {
  profiles: ChildProfile[];
  goalMinutes: number;
  placement: PlacementDocument;
  onWritingLevel: (childId: string, itemId: string, level: ScaffoldLevel) => void;
  onHatchLevel: (childId: string, level: HatchLevel) => void;
  onLadderStep: (childId: string, step: LadderStep) => void;
}) {
  return (
    <section className="teacher-card" data-card="device">
      <h2>On this device</h2>
      <p className="adult-copy">
        Stars, stickers, and milestones for children who practice here. They stay on this device.
      </p>
      {profiles.length === 0 ? <p className="adult-copy">No child profile yet.</p> : null}
      <ul className="device-roster">
        {profiles.map((profile) => {
          const recent = profile.celebrated.slice(-3);
          return (
            <li key={profile.id} data-child={profile.id}>
              <strong>{lessonName(profile)}</strong>
              <span data-stars={profile.stars}>{profile.stars} stars</span>
              <span data-stickers={profile.stickers.length}>{profile.stickers.length} stickers</span>
              <span data-milestones={recent.join(" ") || "none"}>
                {recent.length > 0 ? `Recent milestones: ${recent.join(", ")} stars` : "No milestones yet"}
              </span>
            </li>
          );
        })}
      </ul>
      {profiles.map((profile) => {
        const resolved = resolvePlacement(placement, profile.id, profile.createdAt, new Date(), undefined, READING, profile.ageRange);
        const placedIntroduced =
          resolved.source === "calendar" ? undefined : lettersIntroduced(resolved.weekIndex).length;
        const mathResolved = resolvePlacement(placement, profile.id, profile.createdAt, new Date(), undefined, MATH, profile.ageRange);
        const colorResolved = resolvePlacement(placement, profile.id, profile.createdAt, new Date(), undefined, COLORS, profile.ageRange);
        const timeResolved = resolvePlacement(placement, profile.id, profile.createdAt, new Date(), undefined, TIME, profile.ageRange);
        return (
          <div key={profile.id}>
            <WritingLevels
              writing={profile.writing}
              weekLetters={traceLetters(resolved.letters)}
              childName={profile.name}
              stickers={profile.stickers}
              editable
              onSetLevel={(itemId, level) => onWritingLevel(profile.id, itemId, level)}
            />
            <HatchLevelControl games={profile.games} editable onSetLevel={(level) => onHatchLevel(profile.id, level)} />
            <WordLadder ladder={profile.ladder} editable onSetStep={(step) => onLadderStep(profile.id, step)} />
            <LearningPath profile={profile} name={lessonName(profile)} placedIntroduced={placedIntroduced} />
            <LearningPath
              profile={profile}
              name={lessonName(profile)}
              subject={MATH}
              section="path-math"
              placedIntroduced={mathResolved.source === "calendar" ? undefined : mathIntroduced(mathResolved.weekIndex)}
            />
            <LearningPath
              profile={profile}
              name={lessonName(profile)}
              subject={COLORS}
              section="path-colors"
              placedIntroduced={colorResolved.source === "calendar" ? undefined : colorIntroduced(colorResolved.weekIndex)}
            />
            <LearningPath
              profile={profile}
              name={lessonName(profile)}
              subject={TIME}
              section="path-time"
              placedIntroduced={timeResolved.source === "calendar" ? undefined : timeIntroduced(timeResolved.weekIndex)}
            />
          </div>
        );
      })}
      {profiles.map((profile) => (
        <ReadingChart key={profile.id} name={lessonName(profile)} days={profile.readingMs} goalMinutes={goalMinutes} />
      ))}
      {profiles.map((profile) => (
        <ReadingChart
          key={`${profile.id}-practice`}
          name={lessonName(profile)}
          days={practiceTotal(profile)}
          goalMinutes={goalMinutes}
          title="Time practicing"
          section="practice"
        />
      ))}
    </section>
  );
}

export function TeacherView({
  profiles,
  goalMinutes,
  placement,
  activeId,
  onClassPlace,
  onChildPlace,
  onWritingLevel,
  onHatchLevel,
  onLadderStep,
  onNote,
  onHomeReport,
  onClose,
}: {
  profiles: ChildProfile[];
  goalMinutes: number;
  placement: PlacementDocument;
  activeId: string | null;
  onClassPlace: (place: LessonPlace | null) => void;
  onChildPlace: (childId: string, place: LessonPlace | null) => void;
  onWritingLevel: (childId: string, itemId: string, level: ScaffoldLevel) => void;
  onHatchLevel: (childId: string, level: HatchLevel) => void;
  onLadderStep: (childId: string, step: LadderStep) => void;
  onNote: (childId: string, note: number) => void;
  onHomeReport: (childId: string, report: HomeReport | undefined) => void;
  onClose: () => void;
}) {
  return (
    <div className="teacher-shell" data-screen="teacher">
      <div className="teacher-scroll">
        <button type="button" className="quiet-back" onClick={onClose}>
          Back
        </button>
        <ClassProgress profiles={profiles} placement={placement} onNote={onNote} onHomeReport={onHomeReport} />
        <PlacementControls
          placement={placement}
          profiles={profiles}
          onClassPlace={onClassPlace}
          onChildPlace={onChildPlace}
        />
        <section className="teacher-card" data-card="printables">
          <h2>Printables</h2>
          <Printables profiles={profiles} activeId={activeId} placement={placement} />
        </section>
        <DeviceRewards
          profiles={profiles}
          goalMinutes={goalMinutes}
          placement={placement}
          onWritingLevel={onWritingLevel}
          onHatchLevel={onHatchLevel}
          onLadderStep={onLadderStep}
        />
      </div>
    </div>
  );
}
