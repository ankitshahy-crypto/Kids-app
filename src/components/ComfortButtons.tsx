import { SpeakerIcon } from "./icons";

/** Says the last instruction or word again. A child can tap it as often as they like. */
export function HearAgainButton({ onHear }: { onHear: () => void }) {
  return (
    <button type="button" className="hear-again" data-hear-again aria-label="Hear it again" onClick={onHear}>
      <span className="hear-again-icon" aria-hidden="true">
        <SpeakerIcon />
      </span>
      <span className="hear-again-text">Again</span>
    </button>
  );
}

/** Stops for now without losing anything. Progress is saved as each chunk ends. */
export function BreakButton({ onBreak }: { onBreak: () => void }) {
  return (
    <button type="button" className="break-button" data-break aria-label="Take a break" onClick={onBreak}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor" />
        <rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor" />
      </svg>
      <span className="break-text">Break</span>
    </button>
  );
}
