import type { ReactNode } from "react";
import { SpeakerIcon } from "./icons";

/**
 * "Hear it": says the activity's line again. The speaker mark tells a child
 * who cannot read yet that this button makes a sound, not a choice.
 */
export function HearButton({ className, onHear, children }: { className: string; onHear: () => void; children?: ReactNode }) {
  return (
    <button type="button" className={`${className} hear-button`} data-hear="true" onClick={onHear}>
      <span className="hear-icon" aria-hidden="true">
        <SpeakerIcon />
      </span>
      {children ?? <span>Hear it</span>}
    </button>
  );
}
