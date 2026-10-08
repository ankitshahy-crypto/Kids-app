import { useEffect, useId, useState } from "react";
import { createGrownupCheck, createPinRecovery, type GrownupCheck } from "../data/grownupCheck";
import { hasGrownupPin, pinMatches, savePin } from "../data/grownupPin";
import { clearPinAttempts, noteWrongPin, pinLocked, readPinAttempts, type PinAttempts } from "../data/pinAttempts";

type GateMode = "math" | "pin" | "recover" | "newpin";

export function ParentGate({ onPass, onCancel }: { onPass: () => void; onCancel: () => void }) {
  const titleId = useId();
  const [mode, setMode] = useState<GateMode>(() => (hasGrownupPin() ? "pin" : "math"));
  const [check, setCheck] = useState<GrownupCheck>(() => createGrownupCheck());
  const [digits, setDigits] = useState("");
  const [missed, setMissed] = useState(false);
  const [passed, setPassed] = useState(false);
  const [attempts, setAttempts] = useState<PinAttempts>(() => readPinAttempts());
  const [answer, setAnswer] = useState("");
  const locked = pinLocked(attempts);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  useEffect(() => {
    if (!pinLocked(attempts)) return;
    const wait = attempts.lockedUntil - Date.now();
    const timer = window.setTimeout(() => setAttempts(readPinAttempts()), Math.max(0, wait));
    return () => window.clearTimeout(timer);
  }, [attempts]);

  const choose = (value: number) => {
    if (passed || locked) return;
    if (value === check.answer) {
      if (mode === "recover") {
        setMissed(false);
        setAnswer("");
        setDigits("");
        setMode("newpin");
        return;
      }
      clearPinAttempts();
      setAttempts(readPinAttempts());
      setPassed(true);
      onPass();
      return;
    }
    const next = noteWrongPin();
    setAttempts(next);
    setMissed(true);
    if (pinLocked(next)) return;
    setCheck(mode === "recover" ? createPinRecovery() : createGrownupCheck());
    setAnswer("");
  };

  const submitPin = () => {
    if (passed || locked || digits.length !== 4) return;
    if (mode === "newpin") {
      if (!savePin(digits)) return;
      clearPinAttempts();
      setPassed(true);
      onPass();
      return;
    }
    if (pinMatches(digits)) {
      clearPinAttempts();
      setPassed(true);
      onPass();
      return;
    }
    const next = noteWrongPin();
    setAttempts(next);
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
        data-locked={locked ? "true" : "false"}
        onClick={(event) => event.stopPropagation()}
      >
        <p className="gate-kicker">For a grown-up</p>
        <h2 id={titleId}>{title}</h2>
        {/* role="alert": a screen reader says a wrong answer and a lockout, which it could not see. */}
        {locked ? (
          <p className="gate-miss" role="alert">
            Wait a moment, then try again.
          </p>
        ) : null}
        {missed && !locked ? (
          <p className="gate-miss" role="alert">
            Try another one.
          </p>
        ) : null}
        {mode === "math" || mode === "recover" ? (
          <form
            className="pin-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!answer) return;
              choose(Number(answer));
            }}
          >
            <input
              className="name-input"
              inputMode="numeric"
              autoComplete="off"
              value={answer}
              aria-label="Answer"
              disabled={locked}
              autoFocus
              onChange={(event) => {
                setAnswer(event.target.value.replace(/\D/g, "").slice(0, 6));
                setMissed(false);
              }}
            />
            <button type="submit" className="save-child" disabled={locked || answer.length === 0}>
              Check
            </button>
          </form>
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
              // The PIN typed to get in shows as dots: a child beside the grown-up does not read it.
              // A new PIN being chosen stays in view, so it is not saved with a slip in it.
              data-pin={mode === "pin" ? "entry" : "new"}
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={digits}
              aria-label="4-digit PIN"
              disabled={locked}
              // Like the sum's box above: the keyboard goes straight to the PIN.
              autoFocus
              onChange={(event) => {
                setDigits(event.target.value.replace(/\D/g, "").slice(0, 4));
                setMissed(false);
              }}
            />
            <button type="submit" className="save-child" disabled={locked || digits.length !== 4}>
              {mode === "newpin" ? "Save PIN" : "Unlock"}
            </button>
          </form>
        )}
        {mode === "pin" ? (
          <button
            type="button"
            className="text-button"
            disabled={locked}
            onClick={() => {
              if (locked) return;
              setCheck(createPinRecovery());
              setMissed(false);
              setAnswer("");
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
