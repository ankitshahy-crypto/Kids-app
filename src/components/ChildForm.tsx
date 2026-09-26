import { useState } from "react";
import { Avatar } from "../avatars";
import { animals, type AnimalId } from "../data/animals";
import { ageRanges, normalizeChildName, type AgeRange, type ChildProfile } from "../data/profiles";

export function ChildForm({
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
