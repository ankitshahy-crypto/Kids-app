import { useEffect, useId, useState } from "react";
import { createGrownupCheck, type GrownupCheck } from "../data/grownupCheck";

export function ParentGate({ onPass, onCancel }: { onPass: () => void; onCancel: () => void }) {
  const titleId = useId();
  const [check, setCheck] = useState<GrownupCheck>(() => createGrownupCheck());
  const [missed, setMissed] = useState(false);
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const choose = (value: number) => {
    if (passed) return;
    if (value === check.answer) {
      setPassed(true);
      onPass();
      return;
    }
    setMissed(true);
    setCheck(createGrownupCheck());
  };

  return (
    <div className="gate-backdrop" onClick={onCancel}>
      <div
        className="gate-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <p className="gate-kicker">For a grown-up</p>
        <h2 id={titleId}>{check.prompt}</h2>
        {missed ? <p className="gate-miss">Try another one.</p> : null}
        <div className="gate-choices">
          {check.choices.map((choice) => (
            <button key={`${check.prompt}-${choice}`} type="button" className="gate-choice" onClick={() => choose(choice)}>
              {choice}
            </button>
          ))}
        </div>
        <button type="button" className="gate-cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
