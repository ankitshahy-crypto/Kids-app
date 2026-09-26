import { useEffect, useRef, useState } from "react";
import { animals } from "../data/animals";
import { isReviewDay, planForWeek, practiceLetters, weekIndex } from "../data/schedule";
import {
  ageRanges,
  lessonName,
  normalizeChildName,
  starsThisWeek,
  type AgeRange,
  type ChildProfile,
} from "../data/profiles";
import type { AnimalId } from "../data/animals";
import type { Settings, SpeechSpeed } from "../settings";
import { Avatar } from "../avatars";

export function ParentPanel({
  settings,
  onChange,
  profiles,
  onAdd,
  onRemove,
  onClose,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  profiles: ChildProfile[];
  onAdd: (input: { name: string; ageRange: AgeRange; animal: AnimalId }) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  const [adding, setAdding] = useState(profiles.length === 0);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="settings-backdrop parent-backdrop">
      <div
        ref={panelRef}
        className="parent-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        tabIndex={-1}
      >
        <h2 id="settings-title">Grown-ups</h2>
        <p className="settings-note">Saved on this device only.</p>

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

        <section className="setting-group">
          <h3>Children</h3>
          <ul className="child-list">
            {profiles.map((profile) => (
              <ChildRow key={profile.id} profile={profile} onRemove={() => onRemove(profile.id)} />
            ))}
          </ul>
          {adding ? (
            <AddChildForm
              onSave={(input) => {
                onAdd(input);
                setAdding(false);
              }}
              onCancel={profiles.length === 0 ? undefined : () => setAdding(false)}
            />
          ) : (
            <button type="button" className="add-child" onClick={() => setAdding(true)}>
              Add a child
            </button>
          )}
        </section>

        <button type="button" className="done-button" onClick={onClose}>
          Done
        </button>
      </div>
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

function ChildRow({ profile, onRemove }: { profile: ChildProfile; onRemove: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const now = new Date();
  const plan = planForWeek(weekIndex(profile.createdAt, now));
  const letters = practiceLetters(plan, isReviewDay(now));
  const review = isReviewDay(now);

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
          <p className="child-note" data-note={profile.id}>
            {review ? "Friday review. " : ""}
            Letters {letters.map((letter) => letter.toUpperCase()).join(" ")}. Stars {profile.stars}. This
            week {starsThisWeek(profile, now)}.
          </p>
        </div>
      </div>
      {confirming ? (
        <button type="button" className="remove-child" onClick={onRemove}>
          Remove
        </button>
      ) : (
        <button type="button" className="remove-child remove-quiet" onClick={() => setConfirming(true)}>
          Remove
        </button>
      )}
    </li>
  );
}

function AddChildForm({
  onSave,
  onCancel,
}: {
  onSave: (input: { name: string; ageRange: AgeRange; animal: AnimalId }) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState("");
  const [ageRange, setAgeRange] = useState<AgeRange | null>(null);
  const [animal, setAnimal] = useState<AnimalId | null>(null);
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
      <button type="submit" className="done-button">
        Save child
      </button>
      {onCancel ? (
        <button type="button" className="text-button" onClick={onCancel}>
          Cancel
        </button>
      ) : null}
    </form>
  );
}
