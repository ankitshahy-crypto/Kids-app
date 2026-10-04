import type { ReadTip } from "../content/tips";
import { GrownupIcon } from "./icons";

/**
 * A short card for the adult nearby. The lesson keeps working whether it is open or not.
 *
 * Open, it is the tip with a Hide button. Closed, it is a small "For grown-ups" chip at the left,
 * which a grown-up taps to read the tip again. Hide closes it to the chip rather than removing it,
 * so the page below never jumps up under a child's finger.
 *
 * `underCorner`: on the child's own pages (the path and the section pages) there is no top bar,
 * and the Grown-ups button sits in the top right corner. The chip stays left of it, and the open
 * card starts below it.
 */
export function GrownupTip({
  tip,
  open,
  underCorner,
  onOpen,
  onClose,
}: {
  tip: ReadTip;
  open: boolean;
  underCorner: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const place = underCorner ? " is-under-corner" : "";
  if (!open) {
    return (
      <aside className={`grownup-tip is-chip${place}`} data-tip={tip.id} data-tip-open="false" role="note">
        <button type="button" className="grownup-tip-chip" aria-expanded="false" aria-label="For grown-ups: show tip" onClick={onOpen}>
          <GrownupIcon />
          <span>For grown-ups</span>
        </button>
      </aside>
    );
  }
  return (
    <aside className={`grownup-tip${place}`} data-tip={tip.id} data-tip-open="true" role="note">
      <p className="grownup-tip-label">For grown-ups</p>
      <p className="grownup-tip-text">{tip.text}</p>
      <button type="button" className="grownup-tip-hide" aria-expanded="true" aria-label="Hide tip" onClick={onClose}>
        Hide
      </button>
    </aside>
  );
}
