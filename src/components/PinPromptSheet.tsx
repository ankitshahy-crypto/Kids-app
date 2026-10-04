import { useId, useRef, useState } from "react";
import { savePin } from "../data/grownupPin";
import { useDialogFocus } from "../input/focus";

/**
 * Offered once, right after the first child is saved: a four-digit PIN turns
 * the grown-up check from a typed sum into something a child cannot work out.
 * Recommended for classrooms; a family can skip it and set one later in
 * Settings.
 */
export function PinPromptSheet({ onDone }: { onDone: (saved: boolean) => void }) {
  const titleId = useId();
  const [pin, setPin] = useState("");
  const [again, setAgain] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  // Focus stays inside the sheet while it is open, and Escape skips it (src/input/focus.ts).
  const card = useRef<HTMLDivElement | null>(null);
  useDialogFocus(card, () => onDone(false));

  const submit = () => {
    if (pin.length !== 4) return;
    if (pin !== again) {
      setProblem("The two PINs do not match.");
      setAgain("");
      return;
    }
    if (!savePin(pin)) {
      setProblem("Four digits, please.");
      return;
    }
    onDone(true);
  };

  return (
    <div className="gate-backdrop" onClick={() => onDone(false)}>
      <div className="gate-card pin-prompt" ref={card} role="dialog" aria-modal="true" aria-labelledby={titleId} data-pin-prompt="true" onClick={(event) => event.stopPropagation()}>
        <p className="gate-kicker">For a grown-up</p>
        <h2 id={titleId}>Set a grown-up PIN?</h2>
        <p className="adult-copy">
          Recommended for classrooms. The grown-up check then asks for four digits instead of a sum. You can set or
          change it any time in Settings.
        </p>
        <form
          className="pin-form pin-prompt-form"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label className="pin-field">
            <span>New PIN</span>
            <input
              className="name-input"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={pin}
              aria-label="New PIN"
              autoFocus
              onChange={(event) => {
                setPin(event.target.value.replace(/\D/g, "").slice(0, 4));
                setProblem(null);
              }}
            />
          </label>
          <label className="pin-field">
            <span>Again</span>
            <input
              className="name-input"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={again}
              aria-label="PIN again"
              onChange={(event) => {
                setAgain(event.target.value.replace(/\D/g, "").slice(0, 4));
                setProblem(null);
              }}
            />
          </label>
          {problem ? (
            <p className="gate-miss" role="alert">
              {problem}
            </p>
          ) : null}
          <button type="submit" className="save-child" disabled={pin.length !== 4 || again.length !== 4}>
            Save PIN
          </button>
        </form>
        <button type="button" className="gate-cancel" data-pin-skip="true" onClick={() => onDone(false)}>
          Not now
        </button>
      </div>
    </div>
  );
}
