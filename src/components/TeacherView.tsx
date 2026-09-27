import { useState } from "react";
import type { AnimalId } from "../data/animals";
import { COLORS, colorIntroduced } from "../data/colors";
import { TIME, timeIntroduced } from "../data/timeMoney";
import { MATH, mathIntroduced } from "../data/math";
import { practiceTotal } from "../data/reading";
import { lettersIntroduced } from "../data/schedule";
import { resolvePlacement, type LessonPlace, type PlacementDocument } from "../data/placement";
import { lessonName, type ChildProfile } from "../data/profiles";
import type { ScaffoldLevel } from "../data/scaffold";
import type { HatchLevel } from "../data/games";
import type { LadderStep } from "../data/ladder";
import { HatchLevelControl } from "./HatchLevel";
import { WordLadder } from "./WordLadder";
import { WritingLevels } from "./WritingLevels";
import { Avatar } from "../avatars";
import { LearningPath } from "./LearningPath";
import { ClassMetrics } from "./ClassMetrics";
import { PlacementControls } from "./PlacementControls";
import { Printables } from "./Printables";
import { ReadingChart } from "./ReadingChart";
import { CheckBadge, StarJar, TabGlyph } from "./sceneArt";

type Tab = "classes" | "roster" | "goals" | "jar" | "certificates" | "notes";

type DemoChild = { animal: AnimalId; name: string; met: boolean };

type DemoClass = {
  id: string;
  name: string;
  /** IANA zone for this class. Weekly goals and certificates follow it in step 6. */
  timeZone: string;
  jar: number;
  goal: number;
  roster: DemoChild[];
};

const demoClasses: DemoClass[] = [
  {
    id: "sunflower",
    name: "Sunflower Class",
    timeZone: "America/New_York",
    jar: 142,
    goal: 200,
    roster: [
      { animal: "fox", name: "Fox", met: true },
      { animal: "bunny", name: "Bunny", met: true },
      { animal: "owl", name: "Owl", met: true },
      { animal: "bear", name: "Bear", met: false },
      { animal: "frog", name: "Frog", met: true },
      { animal: "cat", name: "Cat", met: false },
      { animal: "duck", name: "Duck", met: true },
      { animal: "dog", name: "Dog", met: false },
    ],
  },
  {
    id: "maple",
    name: "Maple Class",
    timeZone: "America/New_York",
    jar: 40,
    goal: 200,
    roster: [
      { animal: "owl", name: "Owl", met: false },
      { animal: "bear", name: "Bear", met: true },
      { animal: "duck", name: "Duck", met: false },
      { animal: "frog", name: "Frog", met: false },
    ],
  },
];

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
        const resolved = resolvePlacement(placement, profile.id, profile.createdAt);
        const placedIntroduced =
          resolved.source === "calendar" ? undefined : lettersIntroduced(resolved.weekIndex).length;
        const mathResolved = resolvePlacement(placement, profile.id, profile.createdAt, new Date(), undefined, MATH);
        const colorResolved = resolvePlacement(placement, profile.id, profile.createdAt, new Date(), undefined, COLORS);
        const timeResolved = resolvePlacement(placement, profile.id, profile.createdAt, new Date(), undefined, TIME);
        return (
          <div key={profile.id}>
            <WritingLevels
              writing={profile.writing}
              weekLetters={resolved.letters}
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

const tabs: { id: Tab; label: string }[] = [
  { id: "classes", label: "Classes" },
  { id: "roster", label: "Roster" },
  { id: "goals", label: "Goals" },
  { id: "jar", label: "Star Jar" },
  { id: "certificates", label: "Certificates" },
  { id: "notes", label: "Notes" },
];

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
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("roster");
  const [classId, setClassId] = useState(demoClasses[0].id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scanNote, setScanNote] = useState(false);
  const classroom = demoClasses.find((item) => item.id === classId) ?? demoClasses[0];
  const pct = Math.round((classroom.jar / classroom.goal) * 100);

  return (
    <div className="teacher-shell" data-screen="teacher" data-demo="true" data-timezone={classroom.timeZone}>
      <ClassMetrics linked={0} />
      <div className="teacher-scroll">
        <button type="button" className="quiet-back" onClick={onClose}>
          Back
        </button>
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
        <p className="demo-flag">Demo data. Not a real class. Filled in during step 6.</p>
        <header className="teacher-top">
          <div className="class-switch-wrap">
            <button
              type="button"
              className="class-switch"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {classroom.name}
            </button>
            {menuOpen ? (
              <ul className="class-menu">
                {demoClasses.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      data-class={item.id}
                      onClick={() => {
                        setClassId(item.id);
                        setMenuOpen(false);
                      }}
                    >
                      {item.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <button type="button" className="scan-button" onClick={() => setScanNote(true)}>
            Scan QR
          </button>
        </header>
        {scanNote ? <p className="adult-copy">QR transfer arrives in step 6. This screen is sample data.</p> : null}

        <div className="assign-row">
          <section className="teacher-card assign-card" data-card="add-class">
            <h2>Add class</h2>
            <p>A teacher creates a class here in step 6, and the app shows its QR code. Nothing is created yet.</p>
          </section>
          <section className="teacher-card assign-card" data-card="pending">
            <h2>Pending requests</h2>
            <p>None yet. A request will show the animal avatar and app name only. Approving is step 6.</p>
          </section>
        </div>

        {tab === "classes" ? (
          <section className="teacher-card" data-card="classes">
            <h2>Classes</h2>
            <ul className="class-list">
              {demoClasses.map((item) => (
                <li key={item.id}>
                  <button type="button" data-class={item.id} onClick={() => setClassId(item.id)}>
                    {item.name}
                    {item.id === classroom.id ? " · showing" : ""}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {tab === "roster" || tab === "jar" ? (
          <section className="teacher-card jar-card" data-card="jar">
            <h2>Class Star Jar</h2>
            <StarJar />
            <span className="jar-bar" aria-hidden="true">
              <span style={{ width: `${pct}%` }} />
            </span>
            <p className="jar-count">
              {classroom.jar} / {classroom.goal}
            </p>
          </section>
        ) : null}

        {tab === "roster" ? (
          <section className="teacher-card" data-card="roster">
            <h2>Roster</h2>
            <p className="adult-copy">App names and avatars only. Real names stay on the teacher's own list.</p>
            <ul className="roster-grid">
              {classroom.roster.map((child) => (
                <li key={`${classroom.id}-${child.animal}`}>
                  <span className="roster-face">
                    <Avatar animal={child.animal} />
                    {child.met ? <CheckBadge /> : null}
                  </span>
                  <span>{child.name}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {tab === "goals" ? (
          <section className="teacher-card" data-card="goals">
            <h2>Goals</h2>
            <p>
              A weekly or monthly effort goal is set here in step 6. It uses this class time zone (
              {classroom.timeZone}), not the teacher's phone. The check marks on the roster are sample only.
            </p>
          </section>
        ) : null}

        {tab === "certificates" ? (
          <section className="teacher-card" data-card="certificates">
            <h2>Certificates</h2>
            <p>
              A certificate uses this class time zone ({classroom.timeZone}) for its week or month. It is made on this
              device and can be printed. It is not stored on a server. Step 6.
            </p>
          </section>
        ) : null}

        {tab === "notes" ? (
          <section className="teacher-card" data-card="notes">
            <h2>Notes</h2>
            <p>
              Short encouragement will be tied to the child's app name only. Do not write health or diagnosis
              information. Step 6.
            </p>
          </section>
        ) : null}
      </div>

      <nav className="teacher-tabs" aria-label="Classroom">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? "is-selected" : ""}
            aria-current={tab === item.id ? "page" : undefined}
            onClick={() => setTab(item.id)}
          >
            <TabGlyph name={item.id} />
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
