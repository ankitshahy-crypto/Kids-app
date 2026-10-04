import { useRef } from "react";
import { useDialogFocus } from "../input/focus";

export function MilestoneCheer({ stars, onDone }: { stars: number; onDone: () => void }) {
  // The cheer covers the screen, so focus opens on its one button; Escape closes it too.
  const cheer = useRef<HTMLDivElement | null>(null);
  useDialogFocus(cheer, onDone);
  return (
    <div className="cheer" ref={cheer} role="dialog" aria-modal="true" aria-label={`${stars} stars`} data-milestone={stars}>
      <span className="confetti" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => (
          <i key={index} />
        ))}
      </span>
      <p className="cheer-count">{stars} stars</p>
      <p className="cheer-line">for trying</p>
      <button type="button" className="cheer-done" onClick={onDone}>
        Yay
      </button>
    </div>
  );
}
