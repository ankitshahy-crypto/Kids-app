import type { ReadTip } from "../content/tips";

/** A short card for the adult nearby. The lesson keeps working if it stays up. */
export function GrownupTip({ tip, onDismiss }: { tip: ReadTip; onDismiss: () => void }) {
  return (
    <aside className="grownup-tip" data-tip={tip.id} role="note">
      <p className="grownup-tip-label">Grown-up tip</p>
      <p className="grownup-tip-text">{tip.text}</p>
      <button type="button" className="grownup-tip-hide" aria-label="Dismiss tip" onClick={onDismiss}>
        Hide
      </button>
    </aside>
  );
}
