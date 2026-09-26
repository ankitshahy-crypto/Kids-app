import { HATCH_LEVELS, type GameProgress, type HatchLevel } from "../data/games";

/** How Hatch the Egg grows. Parents can see it. A teacher can change it. */
export function HatchLevelControl({
  games,
  editable = false,
  onSetLevel,
}: {
  games?: GameProgress;
  editable?: boolean;
  onSetLevel?: (level: HatchLevel) => void;
}) {
  const level = games?.hatch ?? 1;
  return (
    <section className="dash-card" data-section="games" data-hatch-level={level} data-editable={editable ? "true" : "false"}>
      <h2>Hatch the Egg</h2>
      <p className="adult-copy">
        Level 1 is the first sound. Level 2 is a short word. Level 3 is a longer word. Two hatches move up. A miss never moves back.
      </p>
      <div className="writing-level">
        <span className="writing-name">Egg</span>
        {editable
          ? HATCH_LEVELS.map((choice) => (
              <button
                key={choice}
                type="button"
                aria-label={`Hatch level ${choice}`}
                aria-pressed={level === choice}
                onClick={() => onSetLevel?.(choice)}
              >
                {choice}
              </button>
            ))
          : <span>Level {level}</span>}
      </div>
    </section>
  );
}
