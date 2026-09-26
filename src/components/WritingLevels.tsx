import { writingRoster, type ScaffoldLevel, type WritingMap } from "../data/scaffold";

const levels: ScaffoldLevel[] = [1, 2, 3, 4, 5];

/** Per-item writing help. Parents can see it. A teacher can change it. */
export function WritingLevels({
  writing,
  weekLetters,
  childName,
  stickers,
  editable = false,
  onSetLevel,
}: {
  writing?: WritingMap;
  weekLetters: string[];
  childName?: string;
  stickers?: { kind: string; label: string }[];
  editable?: boolean;
  onSetLevel?: (itemId: string, level: ScaffoldLevel) => void;
}) {
  const rows = writingRoster({ writing, name: childName, stickers }, weekLetters);
  return (
    <section className="dash-card" data-section="writing" data-editable={editable ? "true" : "false"}>
      <h2>Writing practice</h2>
      <p className="adult-copy">
        Level 1 is a full guide. The guide fades, then only the start remains, then a copy, then writing from memory.
        Three strong tries move up. Three hard tries move back one. Stars stay.
      </p>
      <ul className="writing-levels">
        {rows.map((row) => (
          <li key={row.id} className="writing-level" data-writing-item={row.id} data-writing-level={row.level}>
            <span className="writing-name">{row.label}</span>
            {editable
              ? levels.map((level) => (
                  <button
                    key={level}
                    type="button"
                    aria-label={`${row.label} level ${level}`}
                    aria-pressed={row.level === level}
                    onClick={() => onSetLevel?.(row.id, level)}
                  >
                    {level}
                  </button>
                ))
              : <span>Level {row.level}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
