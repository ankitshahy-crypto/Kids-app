import { useEffect, useState } from "react";
import { Avatar } from "../avatars";
import { RemoveChildSheet } from "./RemoveChildSheet";
import { lessonName, type ChildInput, type ChildProfile } from "../data/profiles";
import { completion, WEEKLY_TARGET } from "../data/progress";
import { resolvePlacement, stageTitle, weekLabel, type PlacementDocument } from "../data/placement";
import { READING } from "../data/subject";
import { isUnit, traceLetters, unitLabel } from "../data/units";
import {
  isReviewDay,
  letterPlanSize,
  lettersIntroduced,
  weekIndex,
} from "../data/schedule";
import type { Settings } from "../settings";
import { ChildForm } from "./ChildForm";
import { Chevron, StarIcon } from "./icons";
import { MODULE_COLORS, MODULE_NUMBERS, MODULE_TIME } from "../brand";
import { tint } from "../palette";
import { COLORS, colorIntroduced } from "../data/colors";
import { MATH, mathIntroduced } from "../data/math";
import { TIME, timeIntroduced } from "../data/timeMoney";
import { practiceTotal } from "../data/reading";
import { LearningPath } from "./LearningPath";
import { HatchLevelControl } from "./HatchLevel";
import { WordLadder } from "./WordLadder";
import { WritingLevels } from "./WritingLevels";
import { SaysSoundsControl } from "./SaysSounds";
import { ReadingChart } from "./ReadingChart";
import { SettingsFields } from "./SettingsFields";
import { FamilyProgress, TeacherNote } from "./ProgressViews";
import type { LessonPlace } from "../data/placement";
import type { LadderStep } from "../data/ladder";
import type { TeacherLink } from "../data/profileExtras";


type ParentPage = "home" | "children" | "progress" | "teacher" | "rewards" | "settings" | "privacy";

const rows: { id: ParentPage; label: string; tint: string }[] = [
  { id: "children", label: "Children", tint: tint.mintCard },
  { id: "progress", label: "Progress", tint: tint.peach },
  { id: "teacher", label: "From Teacher", tint: tint.sky },
  { id: "rewards", label: "Home Rewards", tint: tint.blush },
  { id: "settings", label: "Settings", tint: tint.mint },
  { id: "privacy", label: "Privacy", tint: tint.sky },
];

export function ParentView({
  settings,
  onChange,
  profiles,
  active,
  placement,
  onSelect,
  onAdd,
  onUpdate,
  onRemove,
  onChildPlace,
  onLadderStep,
  onTeacherLink,
  onSaysSounds,
  onClose,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  profiles: ChildProfile[];
  active: ChildProfile | null;
  placement: PlacementDocument;
  onSelect: (id: string) => void;
  onAdd: (input: ChildInput) => void;
  onUpdate: (id: string, input: ChildInput) => void;
  onRemove: (id: string) => void;
  onChildPlace: (childId: string, place: LessonPlace | null) => void;
  onLadderStep: (childId: string, step: LadderStep) => void;
  onTeacherLink: (childId: string, link: TeacherLink | undefined) => void;
  /** Who says the letter sounds in Sound It Out, per child. */
  onSaysSounds: (childId: string, on: boolean) => void;
  onClose: () => void;
}) {
  const [page, setPage] = useState<ParentPage>(profiles.length === 0 ? "children" : "home");
  const [adding, setAdding] = useState(profiles.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = profiles.find((profile) => profile.id === editingId) ?? null;
  const child = active ?? profiles[0] ?? null;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (page === "home") onClose();
        else setPage("home");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, page]);

  useEffect(() => {
    if (editingId && !profiles.some((profile) => profile.id === editingId)) setEditingId(null);
  }, [editingId, profiles]);

  const back = () => {
    if (page === "home" || (page === "children" && profiles.length === 0)) onClose();
    else setPage("home");
  };

  return (
    <div className="parent-view" data-screen="parent" data-page={page}>
      {/* The same Back button as the Grown-ups pages: a white pill with an arrow that stays at the top while
          the page scrolls. It was a line of small grey text here, easy to miss on a phone. */}
      <div className="grownups-bar">
        <button type="button" className="grownups-back" onClick={back}>
          <Chevron direction="left" />
          Back
        </button>
      </div>

      {child && page === "teacher" ? (
        <header className="parent-child-head" data-section="child-head" data-child={child.id}>
          <Avatar animal={child.animal} />
          <h2>{lessonName(child)}</h2>
          {profiles.length > 1 ? (
            <select
              className="child-switch"
              aria-label="Which child"
              value={child.id}
              onChange={(event) => onSelect(event.target.value)}
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {lessonName(profile)}
                </option>
              ))}
            </select>
          ) : null}
        </header>
      ) : null}

      {page === "home" && child ? (
        <ParentHome
          child={child}
          profiles={profiles}
          onSelect={onSelect}
          goalMinutes={settings.readingGoal}
          placement={placement}
          onOpen={setPage}
          onSaysSounds={onSaysSounds}
        />
      ) : null}
      {page === "home" && !child ? (
        <header className="parent-hero">
          <div>
            <h1>Parent</h1>
            <p className="adult-note">Add a child to begin.</p>
          </div>
        </header>
      ) : null}
      {page === "home" && !child ? (
        <ul className="parent-rows">
          {rows.map((row) => (
            <li key={row.id}>
              <button type="button" className="parent-row" onClick={() => setPage(row.id)}>
                <span className="row-icon" style={{ background: row.tint }} aria-hidden="true" />
                <span>{row.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {page === "children" ? (
        <section className="adult-section" data-section="children">
          <h2>Children</h2>
          <ul className="child-list">
            {profiles.map((profile) => (
              <ChildRow
                key={profile.id}
                profile={profile}
                selected={profile.id === child?.id}
                onSelect={() => onSelect(profile.id)}
                onEdit={() => {
                  setAdding(false);
                  setEditingId(profile.id);
                }}
                onRemove={() => onRemove(profile.id)}
              />
            ))}
          </ul>
          {editing ? (
            <ChildForm
              key={editing.id}
              initial={editing}
              others={profiles.filter((profile) => profile.id !== editing.id)}
              submitLabel="Save changes"
              onSave={(input) => {
                onUpdate(editing.id, input);
                setEditingId(null);
              }}
              onCancel={() => setEditingId(null)}
            />
          ) : null}
          {adding ? (
            <ChildForm
              others={profiles}
              submitLabel="Save child"
              onSave={(input) => {
                onAdd(input);
                setAdding(false);
                setPage("home");
              }}
              onCancel={profiles.length === 0 ? undefined : () => setAdding(false)}
            />
          ) : null}
          {!adding && !editing ? (
            <button type="button" className="add-child" onClick={() => setAdding(true)}>
              Add a child
            </button>
          ) : null}
        </section>
      ) : null}

      {page === "progress" ? (
        <section className="adult-section" data-section="progress">
          <h2>Progress</h2>
          <p className="adult-copy">Lessons finished this week, the days they practiced, and the sounds they know. Never a score.</p>
          <FamilyProgress
            profiles={profiles}
            placement={placement}
            onChildPlace={onChildPlace}
            onLadderStep={onLadderStep}
            onTeacherLink={onTeacherLink}
            onSaysSounds={onSaysSounds}
          />
        </section>
      ) : null}

      {page === "teacher" ? (
        <section className="adult-section" data-section="teacher">
          <h2>From your teacher</h2>
          <p className="adult-copy">
            A teacher can give you a short code. Type it in under Progress, and their note and lesson place show here.
            Notes are picked from a friendly list and never include health or diagnosis information.
          </p>
          {profiles.map((profile) => (
            <TeacherNote key={profile.id} link={profile.fromTeacher} />
          ))}
          {child ? <PlacementSummary child={child} placement={placement} /> : null}
          <button type="button" className="done-button" onClick={() => setPage("progress")}>
            Enter a teacher's code
          </button>
        </section>
      ) : null}

      {page === "rewards" ? (
        <section className="adult-section" data-section="rewards">
          <h2>Home rewards</h2>
          <p className="adult-copy">
            Stars, stickers, and nest pieces stay on this device. They are earned by reading, never bought, and never
            taken away.
          </p>
          {profiles.length === 0 ? <p className="adult-copy">Add a child to see rewards.</p> : null}
          <ul className="note-list">
            {profiles.map((profile) => (
              <li key={profile.id} className="progress-note" data-reward={profile.id}>
                <p className="child-name">{lessonName(profile)}</p>
                <RewardFacts profile={profile} />
                <p className="child-note">
                  {profile.nest.length === 1 ? "1 nest piece" : `${profile.nest.length} nest pieces`}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {page === "settings" ? (
        <section className="adult-section" data-section="settings">
          <h2>Settings</h2>
          <SettingsFields settings={settings} onChange={onChange} />
        </section>
      ) : null}

      {page === "privacy" ? (
        <section className="adult-section" data-section="consent">
          <h2>Privacy</h2>
          <p className="adult-copy">
            Nothing is linked to a school automatically. A code only moves when you type it in or give it to the
            teacher, and it carries lesson places, counts, and a note number. Never a name. Delete a profile with Remove
            under Children. Names stay on this device.
          </p>
        </section>
      ) : null}
    </div>
  );
}

function PlacementSummary({ child, placement }: { child: ChildProfile; placement: PlacementDocument }) {
  const resolved = resolvePlacement(placement, child.id, child.createdAt, new Date(), undefined, READING, child.ageRange);
  const mathResolved = resolvePlacement(placement, child.id, child.createdAt, new Date(), undefined, MATH, child.ageRange);
  const colorResolved = resolvePlacement(placement, child.id, child.createdAt, new Date(), undefined, COLORS, child.ageRange);
  const timeResolved = resolvePlacement(placement, child.id, child.createdAt, new Date(), undefined, TIME, child.ageRange);
  const source =
    resolved.source === "child"
      ? "Set for this child."
      : resolved.source === "class"
        ? "Set for the whole class."
        : "Following this child's weeks.";
  return (
    <section
      className="dash-card"
      data-section="placement"
      data-subject={resolved.subject}
      data-source={resolved.source}
      data-stage={resolved.stageId}
      data-week={resolved.weekIndex}
      data-letters={resolved.letters.join("")}
    >
      <h2>Lesson place</h2>
      <p className="adult-copy">
        {stageTitle(resolved.stageId)}. {weekLabel(resolved.weekIndex)}.
      </p>
      <p className="adult-copy">Today: {resolved.letters.map((letter) => unitLabel(letter).toUpperCase()).join(" ")}</p>
      <p className="adult-copy" data-tracing={traceLetters(resolved.letters).join("")}>
        Traces big and little {traceLetters(resolved.letters).map((letter) => `${letter.toUpperCase()} ${letter}`).join(", ")}.
      </p>
      <p className="adult-copy">{source}</p>
      <p className="adult-copy" data-math-stage={mathResolved.stageId} data-math-source={mathResolved.source}>
        {MODULE_NUMBERS}: {stageTitle(mathResolved.stageId, MATH)}.
      </p>
      <p className="adult-copy" data-color-stage={colorResolved.stageId} data-color-source={colorResolved.source}>
        {MODULE_COLORS}: {stageTitle(colorResolved.stageId, COLORS)}.
      </p>
      <p className="adult-copy" data-time-stage={timeResolved.stageId} data-time-source={timeResolved.source}>
        {MODULE_TIME}: {stageTitle(timeResolved.stageId, TIME)}.
      </p>
    </section>
  );
}

function ParentHome({
  child,
  profiles,
  onSelect,
  goalMinutes,
  placement,
  onOpen,
  onSaysSounds,
}: {
  child: ChildProfile;
  profiles: ChildProfile[];
  onSelect: (id: string) => void;
  goalMinutes: number;
  placement: PlacementDocument;
  onOpen: (page: ParentPage) => void;
  onSaysSounds: (childId: string, on: boolean) => void;
}) {
  const now = new Date();
  const resolved = resolvePlacement(placement, child.id, child.createdAt, new Date(), undefined, READING, child.ageRange);
  const mathResolved = resolvePlacement(placement, child.id, child.createdAt, now, undefined, MATH, child.ageRange);
  const colorResolved = resolvePlacement(placement, child.id, child.createdAt, now, undefined, COLORS, child.ageRange);
  const timeResolved = resolvePlacement(placement, child.id, child.createdAt, now, undefined, TIME, child.ageRange);
  const introduced = lettersIntroduced(resolved.source === "calendar" ? weekIndex(child.createdAt, now) : resolved.weekIndex);
  const total = letterPlanSize();
  const pct = total === 0 ? 0 : Math.round((introduced.length / total) * 100);
  const review = isReviewDay(now);
  const weekLetters = traceLetters(resolved.letters);
  const lessons = completion(child, now).lessonsThisWeek;
  const lessonPct = Math.min(100, Math.round((lessons / WEEKLY_TARGET) * 100));
  const age = child.ageRange === "6-7" ? "6–7" : child.ageRange;
  const ring = 2 * Math.PI * 28;

  return (
    <>
      <header className="parent-hero" data-section="child-head" data-child={child.id}>
        <Avatar animal={child.animal} />
        <div>
          <h1>Parent</h1>
          <p className="adult-note">
            {lessonName(child)} · age {age}
          </p>
        </div>
        {profiles.length > 1 ? (
          <select className="child-switch" aria-label="Which child" value={child.id} onChange={(event) => onSelect(event.target.value)}>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {lessonName(profile)}
              </option>
            ))}
          </select>
        ) : null}
      </header>
      <LearningPath
        profile={child}
        placedIntroduced={resolved.source === "calendar" ? undefined : lettersIntroduced(resolved.weekIndex).length}
      />
      <LearningPath
        profile={child}
        subject={MATH}
        section="path-math"
        placedIntroduced={mathResolved.source === "calendar" ? undefined : mathIntroduced(mathResolved.weekIndex)}
      />
      <LearningPath
        profile={child}
        subject={COLORS}
        section="path-colors"
        placedIntroduced={colorResolved.source === "calendar" ? undefined : colorIntroduced(colorResolved.weekIndex)}
      />
      <LearningPath
        profile={child}
        subject={TIME}
        section="path-time"
        placedIntroduced={timeResolved.source === "calendar" ? undefined : timeIntroduced(timeResolved.weekIndex)}
      />
      <PlacementSummary child={child} placement={placement} />

      <section className="dash-card" data-section="letters">
        <div className="dash-letters">
          <div>
            <h2>Letters learned</h2>
            <div className="letter-chips">
              {introduced.map((letter) => (
                <span key={letter} className="letter-chip" data-unit={isUnit(letter) ? "true" : undefined}>
                  {unitLabel(letter).toUpperCase()}
                </span>
              ))}
            </div>
            <p className="adult-copy">
              {review ? `Friday review. ${resolved.letters.map((letter) => unitLabel(letter).toUpperCase()).join(" ")}.` : "Great job! Keep going!"}
            </p>
            <p className="adult-copy" data-trace-more="shapes words name">
              Shapes, blended words, and their name can be traced on this device.
            </p>
          </div>
          <div className="progress-ring" role="img" aria-label={`${pct} percent of letters introduced`}>
            <svg viewBox="0 0 72 72">
              <circle cx="36" cy="36" r="28" fill="none" stroke="var(--mint-wash)" strokeWidth="7" />
              <circle
                cx="36"
                cy="36"
                r="28"
                fill="none"
                stroke="var(--sage-soft)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={`${ring} ${ring}`}
                strokeDashoffset={ring * (1 - pct / 100)}
                transform="rotate(-90 36 36)"
              />
            </svg>
            <span>
              {pct}%
              <small>Progress</small>
            </span>
          </div>
        </div>
      </section>

      <WritingLevels writing={child.writing} weekLetters={weekLetters} childName={child.name} stickers={child.stickers} />
      <HatchLevelControl games={child.games} />
      <WordLadder ladder={child.ladder} />
      <SaysSoundsControl profile={child} onChange={(on) => onSaysSounds(child.id, on)} />

      <div className="dash-split">
        <section className="dash-card" data-section="lessons">
          <h2>Lessons this week</h2>
          <p className="dash-stat">
            {lessons} of {WEEKLY_TARGET}
          </p>
          <span className="dash-bar" aria-hidden="true">
            <span style={{ width: `${lessonPct}%` }} />
          </span>
        </section>
        <section className="dash-card" data-section="stars">
          <h2>Stars earned</h2>
          <p className="dash-stat">{child.stars} stars</p>
          <RewardFacts profile={child} />
          <span className="dash-stars" aria-hidden="true">
            {Array.from({ length: 5 }, (_, index) => (
              <StarIcon key={index} />
            ))}
          </span>
        </section>
      </div>

      <ReadingChart days={child.readingMs} goalMinutes={goalMinutes} />
      <ReadingChart days={practiceTotal(child)} goalMinutes={goalMinutes} title="Time practicing" section="practice" />

      <button type="button" className="teacher-card-link" data-section="teacher" onClick={() => onOpen("teacher")}>
        <span>
          <strong>From your teacher</strong>
          <small>Notes and the lesson place from a teacher's code.</small>
        </span>
      </button>

      <ul className="parent-rows">
        {rows.map((row) => (
          <li key={row.id}>
            <button type="button" className="parent-row" onClick={() => onOpen(row.id)}>
              <span className="row-icon" style={{ background: row.tint }} aria-hidden="true" />
              <span>{row.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function ChildRow({
  profile,
  selected,
  onSelect,
  onEdit,
  onRemove,
}: {
  profile: ChildProfile;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <li className="child-row">
      <button type="button" className="child-row-main child-select" onClick={onSelect} aria-pressed={selected}>
        <Avatar animal={profile.animal} />
        <div>
          <p className="child-name">{lessonName(profile)}</p>
          <p className="child-meta">
            Age {profile.ageRange === "6-7" ? "6–7" : profile.ageRange}
            {profile.name.length === 1 ? ` · initial ${profile.name}` : ""}
            {selected ? " · on this device now" : ""}
          </p>
        </div>
      </button>
      <div className="child-actions">
        <button type="button" className="edit-child" onClick={onEdit}>
          Edit
        </button>
        <button type="button" className="remove-child remove-quiet" data-confirm="ask" onClick={() => setConfirming(true)}>
          Remove
        </button>
      </div>
      {confirming ? (
        <RemoveChildSheet
          profile={profile}
          onConfirm={() => {
            setConfirming(false);
            onRemove();
          }}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </li>
  );
}

function milestoneLine(profile: ChildProfile): string {
  const recent = profile.celebrated.slice(-3);
  if (recent.length === 0) return "No milestones yet";
  return `Recent milestones: ${recent.join(", ")} stars`;
}

function RewardFacts({ profile }: { profile: ChildProfile }) {
  return (
    <div className="reward-facts">
      <p className="child-note" data-stickers={profile.stickers.length}>
        {profile.stickers.length} stickers
      </p>
      <p className="child-note" data-milestones={profile.celebrated.join(" ") || "none"}>
        {milestoneLine(profile)}
      </p>
    </div>
  );
}
