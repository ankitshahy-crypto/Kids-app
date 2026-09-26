import { useEffect, useState } from "react";
import { previewVoice } from "../audio/player";
import { deviceSpeechFollowsSlider } from "../audio/platform";
import { subscribeVoices, type VoiceOption } from "../audio/voices";
import { animals, type AnimalId } from "../data/animals";
import {
  isReviewDay,
  letterPlanSize,
  lettersIntroduced,
  planForWeek,
  practiceLetters,
  weekIndex,
} from "../data/schedule";
import {
  ageRanges,
  lessonName,
  normalizeChildName,
  starsThisWeek,
  type AgeRange,
  type ChildProfile,
} from "../data/profiles";
import type { Settings, SpeechSpeed } from "../settings";
import { Avatar } from "../avatars";
import { StarIcon } from "./icons";

const WEEKLY_LESSONS = 4;

type ParentPage = "home" | "children" | "join" | "progress" | "teacher" | "rewards" | "settings" | "privacy";

const rows: { id: ParentPage; label: string; tint: string }[] = [
  { id: "children", label: "Children", tint: "#E5F4EA" },
  { id: "join", label: "Join a class", tint: "#E4EEF8" },
  { id: "progress", label: "Progress", tint: "#F8E6D4" },
  { id: "teacher", label: "From Teacher", tint: "#E4EEF8" },
  { id: "rewards", label: "Home Rewards", tint: "#FDE7D4" },
  { id: "settings", label: "Settings", tint: "#E7F2EA" },
  { id: "privacy", label: "Privacy", tint: "#E4EEF8" },
];

export function ParentView({
  settings,
  onChange,
  profiles,
  active,
  onSelect,
  onAdd,
  onUpdate,
  onRemove,
  onClose,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  profiles: ChildProfile[];
  active: ChildProfile | null;
  onSelect: (id: string) => void;
  onAdd: (input: { name: string; ageRange: AgeRange; animal: AnimalId }) => void;
  onUpdate: (id: string, input: { name: string; ageRange: AgeRange; animal: AnimalId }) => void;
  onRemove: (id: string) => void;
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
      <button type="button" className="quiet-back" onClick={back}>
        Back
      </button>

      {page === "home" && child ? <ParentHome child={child} onOpen={setPage} /> : null}
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
        <section className="adult-section" data-section="notes">
          <h2>Progress</h2>
          <p className="adult-copy">A fuller progress view comes later. This is the short note for now.</p>
          {profiles.length === 0 ? <p className="adult-copy">Add a child to see letters and stars.</p> : null}
          <ul className="note-list">
            {profiles.map((profile) => (
              <ProgressNote key={profile.id} profile={profile} />
            ))}
          </ul>
        </section>
      ) : null}

      {page === "teacher" ? (
        <section className="adult-section" data-section="teacher">
          <h2>From your teacher</h2>
          <p className="adult-copy">
            Goals, certificates, the class star jar, and short notes will show here. Nothing is linked yet. Notes use
            the child's app name only, and never include health or diagnosis information.
          </p>
        </section>
      ) : null}

      {page === "rewards" ? (
        <section className="adult-section" data-section="rewards">
          <h2>Home rewards</h2>
          <p className="adult-copy">
            A parent will write home rewards here, on this device. Stars are never removed and cannot be bought. This
            is filled in later.
          </p>
        </section>
      ) : null}

      {page === "settings" ? (
        <section className="adult-section" data-section="settings">
          <h2>Settings</h2>
          <MixRow
            label="Voice"
            on={settings.voice}
            volume={settings.voiceVolume}
            onToggle={(voice) => onChange({ voice })}
            onVolume={(voiceVolume) => onChange({ voiceVolume })}
            note={
              deviceSpeechFollowsSlider()
                ? undefined
                : "Recorded clips follow this slider. The phone's own voice uses the volume buttons."
            }
          />
          <VoiceField settings={settings} onChange={onChange} />
          <MixRow
            label="Effects"
            on={settings.effects}
            volume={settings.effectsVolume}
            onToggle={(effects) => onChange({ effects })}
            onVolume={(effectsVolume) => onChange({ effectsVolume })}
          />
          <MixRow
            label="Music"
            on={settings.music}
            volume={settings.musicVolume}
            onToggle={(music) => onChange({ music })}
            onVolume={(musicVolume) => onChange({ musicVolume })}
          />
          <p className="adult-copy">Music loops are not in the app yet. The switch is ready for them.</p>
          <fieldset className="setting-group" data-mix="taps">
            <legend>Tap sounds & buzz</legend>
            <div className="segment">
              <button
                type="button"
                className={settings.tapFeedback ? "is-selected" : ""}
                aria-pressed={settings.tapFeedback}
                onClick={() => onChange({ tapFeedback: true })}
              >
                On
              </button>
              <button
                type="button"
                className={!settings.tapFeedback ? "is-selected" : ""}
                aria-pressed={!settings.tapFeedback}
                onClick={() => onChange({ tapFeedback: false })}
              >
                Off
              </button>
            </div>
            <p className="adult-copy">A soft tap and a short buzz when a finger presses something. Dragging across a word stays quiet.</p>
          </fieldset>
          <fieldset className="setting-group">
            <legend>Speech speed</legend>
            <SpeedButtons speed={settings.speed} onChange={(speed) => onChange({ speed })} />
          </fieldset>
        </section>
      ) : null}

      {page === "join" ? (
        <section className="adult-section" data-section="join">
          <h2>Join a class</h2>
          <p className="adult-copy">
            Only a parent can link a child. The consent screen and the class QR scan arrive in step 6. Nothing is
            shared yet. A child cannot join a class.
          </p>
        </section>
      ) : null}

      {page === "privacy" ? (
        <section className="adult-section" data-section="consent">
          <h2>Privacy</h2>
          <p className="adult-copy">
            Before a class link, consent is asked here. You can unlink or delete at any time. Class linking is not
            available yet. Delete a profile with Remove under Children. Photos and names stay on this device.
          </p>
        </section>
      ) : null}
    </div>
  );
}

function ParentHome({ child, onOpen }: { child: ChildProfile; onOpen: (page: ParentPage) => void }) {
  const now = new Date();
  const introduced = lettersIntroduced(weekIndex(child.createdAt, now));
  const total = letterPlanSize();
  const pct = total === 0 ? 0 : Math.round((introduced.length / total) * 100);
  const review = isReviewDay(now);
  const weekLetters = practiceLetters(planForWeek(weekIndex(child.createdAt, now)), review);
  const lessons = starsThisWeek(child, now);
  const lessonPct = Math.min(100, Math.round((lessons / WEEKLY_LESSONS) * 100));
  const age = child.ageRange === "6-7" ? "6–7" : child.ageRange;
  const ring = 2 * Math.PI * 28;

  return (
    <>
      <header className="parent-hero">
        <Avatar animal={child.animal} />
        <div>
          <h1>Parent</h1>
          <p className="adult-note">
            {lessonName(child)} · age {age}
          </p>
        </div>
      </header>

      <section className="dash-card" data-section="letters">
        <div className="dash-letters">
          <div>
            <h2>Letters learned</h2>
            <div className="letter-chips">
              {introduced.map((letter) => (
                <span key={letter} className="letter-chip">
                  {letter.toUpperCase()}
                </span>
              ))}
            </div>
            <p className="adult-copy">{review ? `Friday review. Letters ${weekLetters.join(" ").toUpperCase()}.` : "Great job! Keep going!"}</p>
          </div>
          <div className="progress-ring" role="img" aria-label={`${pct} percent of letters introduced`}>
            <svg viewBox="0 0 72 72">
              <circle cx="36" cy="36" r="28" fill="none" stroke="#E7F2EA" strokeWidth="7" />
              <circle
                cx="36"
                cy="36"
                r="28"
                fill="none"
                stroke="#7EAE86"
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

      <div className="dash-split">
        <section className="dash-card" data-section="lessons">
          <h2>Lessons this week</h2>
          <p className="dash-stat">
            {lessons} of {WEEKLY_LESSONS}
          </p>
          <span className="dash-bar" aria-hidden="true">
            <span style={{ width: `${lessonPct}%` }} />
          </span>
        </section>
        <section className="dash-card" data-section="stars">
          <h2>Stars earned</h2>
          <p className="dash-stat">{child.stars} stars</p>
          <span className="dash-stars" aria-hidden="true">
            {Array.from({ length: 5 }, (_, index) => (
              <StarIcon key={index} />
            ))}
          </span>
        </section>
      </div>

      <button type="button" className="teacher-card-link" data-section="teacher" onClick={() => onOpen("teacher")}>
        <span>
          <strong>From your teacher</strong>
          <small>Goals, certificates, and notes will show here.</small>
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

function MixRow({
  label,
  on,
  volume,
  onToggle,
  onVolume,
  note,
}: {
  label: string;
  on: boolean;
  volume: number;
  onToggle: (on: boolean) => void;
  onVolume: (volume: number) => void;
  note?: string;
}) {
  const id = `volume-${label.toLowerCase()}`;
  return (
    <fieldset className="setting-group" data-mix={label.toLowerCase()}>
      <legend>{label}</legend>
      <div className="segment">
        <button type="button" className={on ? "is-selected" : ""} aria-pressed={on} onClick={() => onToggle(true)}>
          On
        </button>
        <button type="button" className={!on ? "is-selected" : ""} aria-pressed={!on} onClick={() => onToggle(false)}>
          Off
        </button>
      </div>
      <label className="volume-label" htmlFor={id}>
        Volume
        <input
          id={id}
          className="volume-input"
          type="range"
          min={0}
          max={100}
          value={Math.round(volume * 100)}
          onChange={(event) => onVolume(Number(event.target.value) / 100)}
        />
      </label>
      {note ? <p className="adult-copy">{note}</p> : null}
    </fieldset>
  );
}

function VoiceField({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}) {
  const [options, setOptions] = useState<VoiceOption[]>([]);
  useEffect(() => subscribeVoices(setOptions), []);
  return (
    <fieldset className="setting-group" data-mix="speaking-voice">
      <legend>Speaking voice</legend>
      <div className="voice-row">
        <select
          id="speaking-voice"
          className="voice-select"
          aria-label="Speaking voice"
          value={settings.voiceURI ?? ""}
          onChange={(event) => onChange({ voiceURI: event.target.value || null })}
        >
          <option value="">Best available</option>
          {options.map((option) => (
            <option key={option.voiceURI} value={option.voiceURI}>
              {option.label}
            </option>
          ))}
        </select>
        <button type="button" className="voice-preview" onClick={() => previewVoice(settings)}>
          Preview
        </button>
      </div>
      <p className="adult-copy">Preview uses this phone's voice. Lessons play a recording when one is saved.</p>
    </fieldset>
  );
}

function SpeedButtons({ speed, onChange }: { speed: SpeechSpeed; onChange: (speed: SpeechSpeed) => void }) {
  return (
    <div className="segment">
      <button
        type="button"
        className={speed === "slow" ? "is-selected" : ""}
        aria-pressed={speed === "slow"}
        onClick={() => onChange("slow")}
      >
        Slow
      </button>
      <button
        type="button"
        className={speed === "slower" ? "is-selected" : ""}
        aria-pressed={speed === "slower"}
        onClick={() => onChange("slower")}
      >
        Slower
      </button>
    </div>
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
            {selected ? " · showing" : ""}
          </p>
        </div>
      </button>
      <div className="child-actions">
        <button type="button" className="edit-child" onClick={onEdit}>
          Edit
        </button>
        {confirming ? (
          <button type="button" className="remove-child" onClick={onRemove}>
            Remove
          </button>
        ) : (
          <button type="button" className="remove-child remove-quiet" onClick={() => setConfirming(true)}>
            Remove
          </button>
        )}
      </div>
    </li>
  );
}

function ProgressNote({ profile }: { profile: ChildProfile }) {
  const now = new Date();
  const letters = practiceLetters(planForWeek(weekIndex(profile.createdAt, now)), isReviewDay(now));
  const review = isReviewDay(now);
  return (
    <li className="progress-note" data-note={profile.id}>
      <p className="child-name">{lessonName(profile)}</p>
      <p className="child-note">
        {review ? "Friday review. " : ""}
        Letters {letters.map((letter) => letter.toUpperCase()).join(" ")}. Stars {profile.stars}. This week{" "}
        {starsThisWeek(profile, now)}.
      </p>
    </li>
  );
}

function ChildForm({
  initial,
  submitLabel,
  onSave,
  onCancel,
}: {
  initial?: Pick<ChildProfile, "name" | "ageRange" | "animal">;
  submitLabel: string;
  onSave: (input: { name: string; ageRange: AgeRange; animal: AnimalId }) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [ageRange, setAgeRange] = useState<AgeRange | null>(initial?.ageRange ?? null);
  const [animal, setAnimal] = useState<AnimalId | null>(initial?.animal ?? null);
  const [error, setError] = useState("");
  const droppedLastName = name.trim().includes(" ");

  const save = () => {
    if (!normalizeChildName(name)) {
      setError("Add a first name or one letter.");
      return;
    }
    if (!ageRange || !animal) {
      setError("Choose an age and an animal.");
      return;
    }
    onSave({ name, ageRange, animal });
  };

  return (
    <form
      className="add-form"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <label className="field-label" htmlFor="child-name">
        First name or initial
      </label>
      <input
        id="child-name"
        className="name-input"
        value={name}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        maxLength={24}
        placeholder="Mia"
        onChange={(event) => {
          setName(event.target.value);
          setError("");
        }}
      />
      {droppedLastName ? <p className="field-hint">Only the first name is saved.</p> : null}
      <p className="field-label">Age</p>
      <div className="age-grid">
        {ageRanges.map((age) => (
          <button
            key={age}
            type="button"
            className={ageRange === age ? "is-selected" : ""}
            aria-pressed={ageRange === age}
            onClick={() => setAgeRange(age)}
          >
            {age === "6-7" ? "6–7" : age}
          </button>
        ))}
      </div>
      <p className="field-label">Animal</p>
      <div className="animal-grid">
        {animals.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`animal-pick${animal === item.id ? " is-selected" : ""}`}
            aria-pressed={animal === item.id}
            data-animal={item.id}
            onClick={() => setAnimal(item.id)}
          >
            <Avatar animal={item.id} />
            <span>{item.name}</span>
          </button>
        ))}
      </div>
      {error ? <p className="field-error">{error}</p> : null}
      <button type="submit" className="save-child">
        {submitLabel}
      </button>
      {onCancel ? (
        <button type="button" className="text-button" onClick={onCancel}>
          Cancel
        </button>
      ) : null}
    </form>
  );
}
