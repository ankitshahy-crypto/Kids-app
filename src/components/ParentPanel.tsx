import { useEffect, useRef, useState } from "react";
import { animals, type AnimalId } from "../data/animals";
import { isReviewDay, planForWeek, practiceLetters, weekIndex } from "../data/schedule";
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

export function ParentView({
  settings,
  onChange,
  profiles,
  onAdd,
  onUpdate,
  onRemove,
  onClose,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  profiles: ChildProfile[];
  onAdd: (input: { name: string; ageRange: AgeRange; animal: AnimalId }) => void;
  onUpdate: (id: string, input: { name: string; ageRange: AgeRange; animal: AnimalId }) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  const [adding, setAdding] = useState(profiles.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const editing = profiles.find((profile) => profile.id === editingId) ?? null;

  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (editingId && !profiles.some((profile) => profile.id === editingId)) {
      setEditingId(null);
    }
  }, [editingId, profiles]);

  return (
    <div ref={panelRef} className="parent-view" data-screen="parent" tabIndex={-1}>
      <header className="adult-head">
        <button type="button" className="quiet-back" onClick={onClose}>
          Back
        </button>
        <div>
          <h1>Parent</h1>
          <p className="adult-note">Saved on this device only.</p>
        </div>
      </header>

      <section className="adult-section" data-section="children">
        <h2>Children</h2>
        <ul className="child-list">
          {profiles.map((profile) => (
            <ChildRow
              key={profile.id}
              profile={profile}
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

      <section className="adult-section" data-section="settings">
        <h2>Settings</h2>
        <fieldset className="setting-group">
          <legend>Sound</legend>
          <div className="segment">
            <button
              type="button"
              className={settings.sound ? "is-selected" : ""}
              aria-pressed={settings.sound}
              onClick={() => onChange({ sound: true })}
            >
              On
            </button>
            <button
              type="button"
              className={!settings.sound ? "is-selected" : ""}
              aria-pressed={!settings.sound}
              onClick={() => onChange({ sound: false })}
            >
              Off
            </button>
          </div>
        </fieldset>
        <fieldset className="setting-group">
          <legend>Speech speed</legend>
          <SpeedButtons speed={settings.speed} onChange={(speed) => onChange({ speed })} />
        </fieldset>
      </section>

      <section className="adult-section" data-section="notes">
        <h2>Progress notes</h2>
        {profiles.length === 0 ? <p className="adult-copy">Add a child to see this week's letters and stars.</p> : null}
        <ul className="note-list">
          {profiles.map((profile) => (
            <ProgressNote key={profile.id} profile={profile} />
          ))}
        </ul>
      </section>

      <section className="adult-section" data-section="rewards">
        <h2>Home rewards</h2>
        <p className="adult-copy">
          A parent will write home rewards here, on this device, such as a park trip for a set number of stars.
          Stars are never removed and cannot be bought. This is filled in later.
        </p>
      </section>

      <section className="adult-section" data-section="consent">
        <h2>Consent and delete</h2>
        <p className="adult-copy">
          Before a class link, consent is asked here. You can unlink or delete at any time. Class linking is not
          available yet. Delete a profile with Remove on that child. Photos and names stay on this device.
        </p>
      </section>
    </div>
  );
}

function SpeedButtons({
  speed,
  onChange,
}: {
  speed: SpeechSpeed;
  onChange: (speed: SpeechSpeed) => void;
}) {
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
  onEdit,
  onRemove,
}: {
  profile: ChildProfile;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <li className="child-row">
      <div className="child-row-main">
        <Avatar animal={profile.animal} />
        <div>
          <p className="child-name">{lessonName(profile)}</p>
          <p className="child-meta">
            Age {profile.ageRange === "6-7" ? "6–7" : profile.ageRange}
            {profile.name.length === 1 ? ` · initial ${profile.name}` : ""}
          </p>
        </div>
      </div>
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
  const plan = planForWeek(weekIndex(profile.createdAt, now));
  const letters = practiceLetters(plan, isReviewDay(now));
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
