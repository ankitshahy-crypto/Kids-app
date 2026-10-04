import { useEffect, useState } from "react";
import { Avatar } from "../avatars";
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
import type { HomeReport } from "../data/profileExtras";
import { HatchLevelControl } from "./HatchLevel";
import { WordLadder } from "./WordLadder";
import { WritingLevels } from "./WritingLevels";
import { SaysSoundsControl } from "./SaysSounds";
import { LearningPath } from "./LearningPath";
import { PlacementControls } from "./PlacementControls";
import { Printables } from "./Printables";
import { ReadingChart } from "./ReadingChart";
import { ChildClassDetail, ClassProgress } from "./ProgressViews";
import { Chevron } from "./icons";
import { heldBack } from "../explore/flags";
import type { SoundingMode } from "../data/sounding";
import type { ReadingPace } from "../data/schedule";

/**
 * One child's page on the class iPad: what they finished, a note and codes for
 * home, their lesson place, and the levels a teacher can set. Everything about
 * one child in one place, so the class list itself stays short.
 */
function ChildSheet({
  profile,
  goalMinutes,
  placement,
  onBack,
  onChildPlace,
  onWritingLevel,
  onHatchLevel,
  onLadderStep,
  onSaysSounds,
  onReadingPace,
  onNote,
  onHomeReport,
}: {
  profile: ChildProfile;
  goalMinutes: number;
  placement: PlacementDocument;
  onBack: () => void;
  onChildPlace: (childId: string, place: LessonPlace | null) => void;
  onWritingLevel: (childId: string, itemId: string, level: ScaffoldLevel) => void;
  onHatchLevel: (childId: string, level: HatchLevel) => void;
  onLadderStep: (childId: string, step: LadderStep) => void;
  onSaysSounds: (childId: string, mode: SoundingMode) => void;
  onReadingPace?: (childId: string, pace: ReadingPace) => void;
  onNote: (childId: string, note: number) => void;
  onHomeReport: (childId: string, report: HomeReport | undefined) => void;
}) {
  const resolved = resolvePlacement(placement, profile.id, profile.createdAt, new Date(), undefined, READING, profile.ageRange, profile.readingPace);
  const placedIntroduced = resolved.source === "calendar" ? undefined : lettersIntroduced(resolved.weekIndex).length;
  const mathResolved = resolvePlacement(placement, profile.id, profile.createdAt, new Date(), undefined, MATH, profile.ageRange);
  const colorResolved = resolvePlacement(placement, profile.id, profile.createdAt, new Date(), undefined, COLORS, profile.ageRange);
  const timeResolved = resolvePlacement(placement, profile.id, profile.createdAt, new Date(), undefined, TIME, profile.ageRange);
  const recent = profile.celebrated.slice(-3);
  const name = lessonName(profile);
  return (
    <section className="teacher-card child-sheet" data-card="device" data-child-sheet={profile.id}>
      <button type="button" className="text-button all-children" data-action="all-children" onClick={onBack}>
        ‹ All children
      </button>
      <header className="progress-head">
        <Avatar animal={profile.animal} />
        <h2>{name}</h2>
      </header>
      <ul className="device-roster">
        <li data-child={profile.id}>
          <span data-stars={profile.stars}>{profile.stars} stars</span>
          <span data-stickers={profile.stickers.length}>{profile.stickers.length} stickers</span>
          <span data-milestones={recent.join(" ") || "none"}>
            {recent.length > 0 ? `Recent milestones: ${recent.join(", ")} stars` : "No milestones yet"}
          </span>
        </li>
      </ul>
      <ChildClassDetail profile={profile} placement={placement} onNote={onNote} onHomeReport={onHomeReport} />
      <PlacementControls
        placement={placement}
        profiles={[profile]}
        showClass={false}
        heading={`${name}'s lesson place`}
        onClassPlace={() => undefined}
        onChildPlace={onChildPlace}
      />
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
      <SaysSoundsControl
        profile={profile}
        onChange={(mode) => onSaysSounds(profile.id, mode)}
        onPace={onReadingPace ? (pace) => onReadingPace(profile.id, pace) : undefined}
      />
      <LearningPath profile={profile} name={name} placedIntroduced={placedIntroduced} />
      <LearningPath
        profile={profile}
        name={name}
        subject={MATH}
        section="path-math"
        placedIntroduced={mathResolved.source === "calendar" ? undefined : mathIntroduced(mathResolved.weekIndex)}
      />
      <LearningPath
        profile={profile}
        name={name}
        subject={COLORS}
        section="path-colors"
        placedIntroduced={colorResolved.source === "calendar" ? undefined : colorIntroduced(colorResolved.weekIndex)}
      />
      {/* Time & Money is being rebuilt and is left out of the installed app for now (src/explore/flags.ts), so the grown-up pages do not describe it either. */}
      {heldBack("time") ? null : (
        <LearningPath
          profile={profile}
          name={name}
          subject={TIME}
          section="path-time"
          placedIntroduced={timeResolved.source === "calendar" ? undefined : timeIntroduced(timeResolved.weekIndex)}
        />
      )}
      <ReadingChart name={name} days={profile.readingMs} goalMinutes={goalMinutes} />
      <ReadingChart name={name} days={practiceTotal(profile)} goalMinutes={goalMinutes} title="Time practicing" section="practice" />
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
  onSaysSounds,
  onReadingPace,
  onNote,
  onHomeReport,
  sharedDevice = false,
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
  onSaysSounds: (childId: string, mode: SoundingMode) => void;
  onReadingPace?: (childId: string, pace: ReadingPace) => void;
  onNote: (childId: string, note: number) => void;
  onHomeReport: (childId: string, report: HomeReport | undefined) => void;
  /** Shared class iPad is on: say so, since the Teacher screen turns it on by itself. */
  sharedDevice?: boolean;
  onClose: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = profiles.find((profile) => profile.id === openId) ?? null;

  useEffect(() => {
    if (openId && !open) setOpenId(null);
  }, [openId, open]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [openId]);

  return (
    <div className="teacher-shell" data-screen="teacher" data-open-child={open?.id ?? ""}>
      <div className="teacher-scroll">
        {/* The same Back button as the Grown-ups pages: a white pill with an arrow that stays at the top while
            the page scrolls. It was a line of small grey text here, easy to miss on a phone. */}
        <div className="grownups-bar">
          <button type="button" className="grownups-back" onClick={onClose}>
            <Chevron direction="left" />
            Back
          </button>
        </div>
        {open ? (
          <ChildSheet
            profile={open}
            goalMinutes={goalMinutes}
            placement={placement}
            onBack={() => setOpenId(null)}
            onChildPlace={onChildPlace}
            onWritingLevel={onWritingLevel}
            onHatchLevel={onHatchLevel}
            onLadderStep={onLadderStep}
            onSaysSounds={onSaysSounds}
            onReadingPace={onReadingPace}
            onNote={onNote}
            onHomeReport={onHomeReport}
          />
        ) : (
          <>
            {sharedDevice ? (
              <p className="adult-copy teacher-shared" data-shared-note="on">
                Shared class iPad is on: switching children asks for the grown-up check. Change it in Settings.
              </p>
            ) : null}
            <ClassProgress profiles={profiles} onOpen={setOpenId} />
            <details className="teacher-card teacher-fold" data-card="class-place">
              <summary>
                <h2>Whole class lesson place</h2>
                <span className="adult-copy">Where every child on this device starts, unless set for one child</span>
              </summary>
              <PlacementControls placement={placement} profiles={[]} onClassPlace={onClassPlace} onChildPlace={onChildPlace} heading="Whole class" />
            </details>
            <details className="teacher-card teacher-fold" data-card="printables">
              <summary>
                <h2>Printables</h2>
                <span className="adult-copy">Letter tracing and blending sheets</span>
              </summary>
              <Printables profiles={profiles} activeId={activeId} placement={placement} />
            </details>
          </>
        )}
      </div>
    </div>
  );
}
