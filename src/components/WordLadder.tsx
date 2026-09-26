import { LADDER_STEPS, ladderDetail, ladderTitle, type LadderProgress, type LadderStep } from "../data/ladder";

/** How long the child's words are. Parents can see it. A teacher can change it. */
export function WordLadder({
  ladder,
  editable = false,
  onSetStep,
}: {
  ladder?: LadderProgress;
  editable?: boolean;
  onSetStep?: (step: LadderStep) => void;
}) {
  const step = ladder?.step ?? 1;
  const successes = ladder?.successes ?? 0;
  return (
    <section
      className="dash-card"
      data-section="ladder"
      data-ladder-step={step}
      data-ladder-successes={successes}
      data-editable={editable ? "true" : "false"}
    >
      <h2>Word ladder</h2>
      <p className="adult-copy">
        Step {step} is {ladderTitle(step).toLowerCase()}: {ladderDetail(step)}. Three finished tries move up. A miss stays put.
        Step 5 is longer words and short sentences for phonics, ages 5 to 7.
      </p>
      <div className="writing-level">
        <span className="writing-name">Step</span>
        {editable
          ? LADDER_STEPS.map((choice) => (
              <button
                key={choice}
                type="button"
                aria-label={`Word ladder step ${choice}`}
                aria-pressed={step === choice}
                onClick={() => onSetStep?.(choice)}
              >
                {choice}
              </button>
            ))
          : (
              <span>
                {step} · {ladderTitle(step)}
              </span>
            )}
      </div>
    </section>
  );
}
