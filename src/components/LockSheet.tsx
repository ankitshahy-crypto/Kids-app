import { useRef, useState } from "react";
import { useDialogFocus } from "../input/focus";
import { ParentGate } from "./ParentGate";

/**
 * What a child sees on a part of the app that opens with the full unlock: a
 * quiet lock and "ask a grown-up", never a price, never a pitch. The grown-up
 * check comes first, as the Kids Category asks; what is locked, why, and the
 * price all live behind it.
 */
export function LockSheet({ onGrownup, onClose }: { onGrownup: () => void; onClose: () => void }) {
  const [asking, setAsking] = useState(false);
  // The sheet covers the screen, so focus opens inside it and stays there; Escape is Back.
  const sheet = useRef<HTMLDivElement | null>(null);
  useDialogFocus(sheet, onClose);
  return (
    <div className="lock-sheet" ref={sheet} role="dialog" aria-modal="true" aria-labelledby="lock-sheet-title" data-screen="locked">
      <div className="lock-card">
        <span className="lock-card-mark" aria-hidden="true">
          <svg viewBox="0 0 48 48">
            <path d="M15 21v-5a9 9 0 0 1 18 0v5" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            <rect x="10" y="21" width="28" height="20" rx="6" fill="currentColor" />
            <circle cx="24" cy="31" r="3" fill="#fbf6ee" />
          </svg>
        </span>
        <h2 id="lock-sheet-title">Ask a grown-up</h2>
        <div className="lock-actions">
          <button type="button" className="done-button" onClick={() => setAsking(true)}>
            Grown-ups
          </button>
          <button type="button" className="text-button" onClick={onClose}>
            Back
          </button>
        </div>
      </div>
      {asking ? (
        <ParentGate
          onPass={() => {
            setAsking(false);
            onGrownup();
          }}
          onCancel={() => setAsking(false)}
        />
      ) : null}
    </div>
  );
}
