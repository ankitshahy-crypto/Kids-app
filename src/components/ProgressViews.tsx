import { useState } from "react";
import { Avatar } from "../avatars";
import { familyCode, HOME_NOTES, noteText, progressCode, readFamilyCode, readProgressCode, stampLabel, weekStamp } from "../data/linkCodes";
import { isLadderStep, type LadderStep } from "../data/ladder";
import { placeForWeek, resolvePlacement, stageTitle, weekLabel, type LessonPlace, type PlacementDocument } from "../data/placement";
import type { HomeReport, TeacherLink } from "../data/profileExtras";
import { lessonName, todayKey, type ChildProfile } from "../data/profiles";
import { byNudge, completion, EXPLORE_LABELS, lastActiveLabel, soundSummary, WEEKLY_TARGET, type Completion } from "../data/progress";
import { READING } from "../data/subject";
import { unitLabel } from "../data/units";
import { SaysSoundsControl } from "./SaysSounds";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function DayDots({ days }: { days: boolean[] }) {
  return (
    <span className="day-dots" role="img" aria-label={`Practiced ${DAY_NAMES.filter((_, index) => days[index]).join(", ") || "no days yet"} this week`}>
      {DAY_LETTERS.map((letter, index) => (
        <span key={index} className={`day-dot${days[index] ? " is-on" : ""}`} data-on={days[index] ? "true" : "false"} aria-hidden="true">
          {letter}
        </span>
      ))}
    </span>
  );
}

function place(profile: ChildProfile, placement: PlacementDocument) {
  return resolvePlacement(placement, profile.id, profile.createdAt, new Date(), undefined, READING, profile.ageRange);
}

function soundList(sounds: string[]): string {
  return sounds.map((sound) => unitLabel(sound)).join(" ");
}

/** What a child finished, for grown-ups. Never a score. */
export function CompletionSummary({ profile, placement, done }: { profile: ChildProfile; placement: PlacementDocument; done?: Completion }) {
  const now = new Date();
  const facts = done ?? completion(profile, now);
  const resolved = place(profile, placement);
  const sounds = soundSummary(profile);
  const pct = Math.min(100, Math.round((facts.lessonsThisWeek / WEEKLY_TARGET) * 100));
  return (
    <div
      className="completion"
      data-completion={profile.id}
      data-lessons-week={facts.lessonsThisWeek}
      data-lessons-total={facts.lessonsTotal}
      data-knows={sounds.knows.join(" ")}
      data-practicing={sounds.practicing.join(" ")}
    >
      <p className="completion-place">
        {stageTitle(resolved.stageId)} · {weekLabel(resolved.weekIndex)}
      </p>
      <div className="completion-row">
        <span className="completion-label">Lessons this week</span>
        <strong>
          {facts.lessonsThisWeek} of {WEEKLY_TARGET}
        </strong>
      </div>
      <span className="dash-bar" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </span>
      <div className="completion-row">
        <span className="completion-label">Days practiced</span>
        <DayDots days={facts.practicedDays} />
      </div>
      <div className="completion-row">
        <span className="completion-label">This week</span>
        <span>{facts.minutesThisWeek === 1 ? "1 minute" : `${facts.minutesThisWeek} minutes`}</span>
      </div>
      <div className="completion-row">
        <span className="completion-label">All lessons</span>
        <span>{facts.lessonsTotal}</span>
      </div>
      <div className="completion-row">
        <span className="completion-label">Last practiced</span>
        <span data-last={facts.daysSinceActive ?? "never"}>{lastActiveLabel(facts.daysSinceActive)}</span>
      </div>
      <div className="completion-row is-wrap">
        <span className="completion-label">Explore this week</span>
        <span className="explore-done">
          {facts.exploreThisWeek.length === 0
            ? "Nothing yet"
            : facts.exploreThisWeek.map((area) => (
                <span key={area} className="explore-chip" data-area={area}>
                  {EXPLORE_LABELS[area]}
                </span>
              ))}
        </span>
      </div>
      {sounds.knows.length + sounds.practicing.length > 0 ? (
        <div className="sound-summary" data-section="sounds">
          <p>
            <span className="completion-label">Knows</span> {sounds.knows.length > 0 ? soundList(sounds.knows) : "—"}
          </p>
          <p>
            <span className="completion-label">Still practicing</span> {sounds.practicing.length > 0 ? soundList(sounds.practicing) : "—"}
          </p>
        </div>
      ) : (
        <p className="adult-copy completion-hint">The Friday sound game shows which sounds they know.</p>
      )}
    </div>
  );
}

function CodeBox({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="code-box">
      <p className="code-value" data-code={code} aria-label={`${label}: ${code.split("").join(" ")}`}>
        {code}
      </p>
      <button
        type="button"
        className="text-button"
        onClick={() => {
          void navigator.clipboard?.writeText(code).then(
            () => setCopied(true),
            () => setCopied(false),
          );
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function CodeEntry({
  label,
  onCode,
  hint,
}: {
  label: string;
  /** Returns an error line when the code is not right, or null when it was used. */
  onCode: (code: string) => string | null;
  hint: string;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="code-entry"
      onSubmit={(event) => {
        event.preventDefault();
        const problem = onCode(value);
        setError(problem);
        if (!problem) setValue("");
      }}
    >
      <label>
        <span>{label}</span>
        <input
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          maxLength={20}
          placeholder={hint}
        />
      </label>
      <button type="submit" className="done-button" disabled={value.trim().length < 4}>
        Use code
      </button>
      {error ? (
        <p className="code-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

/* ------------------------------ Family side ------------------------------ */

export function progressCodeFor(profile: ChildProfile, placement: PlacementDocument): string {
  const facts = completion(profile);
  const sounds = soundSummary(profile);
  return progressCode({
    weekIndex: place(profile, placement).weekIndex,
    lessonsTotal: facts.lessonsTotal,
    lessonsThisWeek: facts.lessonsThisWeek,
    practicedDays: facts.practicedDays,
    knows: sounds.knows.length,
    practicing: sounds.practicing.length,
    week: weekStamp(),
  });
}

export function TeacherNote({ link }: { link: TeacherLink | undefined }) {
  if (!link) return null;
  return (
    <div className="teacher-note" data-section="teacher-note" data-note={link.note}>
      <p className="completion-label">From your teacher · {stampLabel(link.week)}</p>
      <p className="teacher-note-text">{link.note > 0 ? noteText(link.note) : "Your teacher set the lesson place."}</p>
    </div>
  );
}

/** A family's Progress page: completion for each child, the teacher's note, and the codes. */
export function FamilyProgress({
  profiles,
  placement,
  onChildPlace,
  onLadderStep,
  onTeacherLink,
  onSaysSounds,
}: {
  profiles: ChildProfile[];
  placement: PlacementDocument;
  onChildPlace: (childId: string, place: LessonPlace | null) => void;
  onLadderStep: (childId: string, step: LadderStep) => void;
  onTeacherLink: (childId: string, link: TeacherLink | undefined) => void;
  /** Who says the letter sounds in Sound It Out, per child. */
  onSaysSounds?: (childId: string, on: boolean) => void;
}) {
  if (profiles.length === 0) return <p className="adult-copy">Add a child to see their progress.</p>;
  return (
    <ul className="progress-list">
      {profiles.map((profile) => (
        <li key={profile.id} className="progress-child" data-child={profile.id}>
          <header className="progress-head">
            <Avatar animal={profile.animal} />
            <h3>{lessonName(profile)}</h3>
          </header>
          <TeacherNote link={profile.fromTeacher} />
          <CompletionSummary profile={profile} placement={placement} />
          {onSaysSounds ? <SaysSoundsControl profile={profile} onChange={(on) => onSaysSounds(profile.id, on)} /> : null}
          <details className="code-details" data-section="share-code">
            <summary>Share progress with the teacher</summary>
            <p className="adult-copy">
              Give this code to {lessonName(profile)}'s teacher. It carries lessons, practice days, and how many sounds
              they know. No name, and nothing else.
            </p>
            <CodeBox code={progressCodeFor(profile, placement)} label="Progress code" />
          </details>
          <details className="code-details" data-section="family-code">
            <summary>Enter a code from the teacher</summary>
            <p className="adult-copy">
              A teacher's code can set the lesson place and bring a short note. You can change the place again any time.
            </p>
            <CodeEntry
              label="Teacher's code"
              hint="XXXX-XXXX"
              onCode={(code) => {
                const read = readFamilyCode(code);
                if (!read) {
                  return readProgressCode(code)
                    ? "That is a progress code. It goes from home to the teacher."
                    : "That code did not work. Check the letters and try again.";
                }
                if (read.weekIndex !== null) onChildPlace(profile.id, placeForWeek(read.weekIndex, READING));
                if (read.ladderStep !== null && isLadderStep(read.ladderStep)) onLadderStep(profile.id, read.ladderStep);
                onTeacherLink(profile.id, { ...read, entered: todayKey() });
                return null;
              }}
            />
          </details>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------ Class side ------------------------------- */

export function familyCodeFor(profile: ChildProfile, placement: PlacementDocument): string {
  const resolved = place(profile, placement);
  return familyCode({
    weekIndex: resolved.source === "calendar" ? null : resolved.weekIndex,
    ladderStep: profile.ladder.step,
    note: profile.noteForHome ?? 0,
    week: weekStamp(),
  });
}

function HomeFacts({ report }: { report: HomeReport }) {
  return (
    <div className="home-facts" data-section="from-home" data-lessons-week={report.lessonsThisWeek}>
      <p className="completion-label">From home · {stampLabel(report.week)}</p>
      <div className="completion-row">
        <span className="completion-label">Lessons that week</span>
        <strong>
          {report.lessonsThisWeek} of {WEEKLY_TARGET}
        </strong>
      </div>
      <div className="completion-row">
        <span className="completion-label">Days practiced</span>
        <DayDots days={report.practicedDays} />
      </div>
      <div className="completion-row">
        <span className="completion-label">All lessons at home</span>
        <span>{report.lessonsTotal}</span>
      </div>
      <div className="completion-row">
        <span className="completion-label">Place at home</span>
        <span>{weekLabel(report.weekIndex)}</span>
      </div>
      <div className="completion-row">
        <span className="completion-label">Sounds</span>
        <span>
          Knows {report.knows}
          {report.practicing > 0 ? ` · still practicing ${report.practicing}` : ""}
        </span>
      </div>
    </div>
  );
}

/** One child's page on the class iPad: completion, a note for home, and the two codes. */
export function ChildClassDetail({
  profile,
  placement,
  onNote,
  onHomeReport,
}: {
  profile: ChildProfile;
  placement: PlacementDocument;
  onNote: (childId: string, note: number) => void;
  onHomeReport: (childId: string, report: HomeReport | undefined) => void;
}) {
  return (
    <div className="child-class-detail" data-section="class-detail">
      <CompletionSummary profile={profile} placement={placement} />
      {profile.fromHome ? <HomeFacts report={profile.fromHome} /> : null}
      <label className="note-pick">
        <span>Note for home</span>
        <select value={profile.noteForHome ?? 0} onChange={(event) => onNote(profile.id, Number(event.target.value))} data-note-for={profile.id}>
          {HOME_NOTES.map((note, index) => (
            <option key={index} value={index}>
              {index === 0 ? "No note" : note}
            </option>
          ))}
        </select>
      </label>
      <div className="code-details is-open" data-section="family-code-out">
        <p className="completion-label">Code for {lessonName(profile)}'s family</p>
        <p className="adult-copy">It carries the lesson place and the note. The family types it into the Progress page at home.</p>
        <CodeBox code={familyCodeFor(profile, placement)} label="Family code" />
      </div>
      <CodeEntry
        label="Progress code from home"
        hint="XXXX-XXXX-XXXX"
        onCode={(code) => {
          const read = readProgressCode(code);
          if (!read) {
            return readFamilyCode(code)
              ? "That is a family code. It goes from the teacher to home."
              : "That code did not work. Check the letters and try again.";
          }
          onHomeReport(profile.id, { ...read, entered: todayKey() });
          return null;
        }}
      />
    </div>
  );
}

/**
 * The teacher's class list: one short row per child, the children who have
 * been away longest first. Tapping a row opens that child's page. It stays a
 * list of rows at any class size.
 */
export function ClassProgress({ profiles, onOpen }: { profiles: ChildProfile[]; onOpen: (childId: string) => void }) {
  const rows = byNudge(profiles.map((profile) => ({ profile, completion: completion(profile) })));
  return (
    <section className="teacher-card" data-card="class-progress">
      <h2>Class progress</h2>
      <p className="adult-copy">Lessons finished, not scores. The children who have been away longest are first. Tap a child for details.</p>
      {rows.length === 0 ? <p className="adult-copy">Add the children in your class to see their progress.</p> : null}
      <ul className="class-rows">
        {rows.map(({ profile, completion: facts }) => (
          <li key={profile.id} data-child={profile.id}>
            <button type="button" className="class-row" data-open-child={profile.id} onClick={() => onOpen(profile.id)}>
              <Avatar animal={profile.animal} />
              <span className="class-row-name">{lessonName(profile)}</span>
              <span className="class-row-week" data-lessons-week={facts.lessonsThisWeek}>
                {facts.lessonsThisWeek} of {WEEKLY_TARGET}
              </span>
              <DayDots days={facts.practicedDays} />
              <span className="class-row-last">{lastActiveLabel(facts.daysSinceActive)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
