import { useEffect, useId, useState } from "react";
import { createGrownupCheck, createPinRecovery, type GrownupCheck } from "../data/grownupCheck";
import { hasGrownupPin, pinMatches, savePin } from "../data/grownupPin";

type GateMode = "math" | "pin" | "recover" | "newpin";

export function ParentGate({ onPass, onCancel }: { onPass: () => void; onCancel: () => void }) {
  const titleId = useId();
  const [mode, setMode] = useState<GateMode>(() => (hasGrownupPin() ? "pin" : "math"));
  const [check, setCheck] = useState<GrownupCheck>(() => createGrownupCheck());
  const [digits, setDigits] = useState("");
  const [missed, setMissed] = useState(false);
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const choose = (value: number) => {
    if (passed) return;
    if (value !== check.answer) {
      setMissed(true);
      setCheck(mode === "recover" ? createPinRecovery() : createGrownupCheck());
      return;
    }
    if (mode === "recover") {
      setMissed(false);
      setDigits("");
      setMode("newpin");
      return;
    }
    setPassed(true);
    onPass();
  };

  const submitPin = () => {
    if (passed || digits.length !== 4) return;
    if (mode === "newpin") {
      savePin(digits);
      setPassed(true);
      onPass();
      return;
    }
    if (pinMatches(digits)) {
      setPassed(true);
      onPass();
      return;
    }
    setMissed(true);
    setDigits("");
  };

  const title =
    mode === "pin" ? "Enter the grown-up PIN" : mode === "newpin" ? "Choose a new 4-digit PIN" : check.prompt;

  return (
    <div className="gate-backdrop" onClick={onCancel}>
      <div
        className="gate-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-gate={mode}
        onClick={(event) => event.stopPropagation()}
      >
        <p className="gate-kicker">For a grown-up</p>
        <h2 id={titleId}>{title}</h2>
        {missed ? <p className="gate-miss">Try another one.</p> : null}
        {mode === "math" || mode === "recover" ? (
          <div className="gate-choices">
            {check.choices.map((choice) => (
              <button key={`${check.prompt}-${choice}`} type="button" className="gate-choice" onClick={() => choose(choice)}>
                {choice}
              </button>
            ))}
          </div>
        ) : (
          <form
            className="pin-form"
            onSubmit={(event) => {
              event.preventDefault();
              submitPin();
            }}
          >
            <input
              className="name-input"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={digits}
              aria-label="4-digit PIN"
              onChange={(event) => {
                setDigits(event.target.value.replace(/\D/g, "").slice(0, 4));
                setMissed(false);
              }}
            />
            <button type="submit" className="save-child">
              {mode === "newpin" ? "Save PIN" : "Unlock"}
            </button>
          </form>
        )}
        {mode === "pin" ? (
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setCheck(createPinRecovery());
              setMissed(false);
              setMode("recover");
            }}
          >
            Forgot PIN?
          </button>
        ) : null}
        <button type="button" className="gate-cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
