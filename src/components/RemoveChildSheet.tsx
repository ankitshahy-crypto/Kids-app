import { useId, useRef } from "react";
import { lessonName, type ChildProfile } from "../data/profiles";
import { useDialogFocus } from "../input/focus";

/**
 * Removing a child is a real decision: their stars, stickers, and place in
 * the lessons go with them. So it is a sheet with the child's name, a plain
 * warning, and Cancel and Remove far apart, never a second tap in the same
 * spot as the first.
 */
export function RemoveChildSheet({ profile, onConfirm, onCancel }: { profile: ChildProfile; onConfirm: () => void; onCancel: () => void }) {
  const titleId = useId();
  // Focus opens on Cancel, the first button, and stays in the sheet. Escape cancels, and only
  // that: the page underneath has its own Escape (Back), which used to hear the same key and
  // close the whole page as well (src/input/focus.ts).
  const card = useRef<HTMLDivElement | null>(null);
  useDialogFocus(card, onCancel);
  return (
    <div className="gate-backdrop" onClick={onCancel}>
      <div
        className="gate-card remove-sheet"
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-remove-child={profile.id}
        onClick={(event) => event.stopPropagation()}
      >
        <p className="gate-kicker">For a grown-up</p>
        <h2 id={titleId}>Remove {lessonName(profile)} and all their progress?</h2>
        <p className="adult-copy">Their stars, stickers, nest, and place in the lessons go too. This cannot be undone.</p>
        <div className="remove-actions">
          <button type="button" className="text-button remove-cancel" data-confirm="cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="remove-child" data-confirm="ready" onClick={onConfirm}>
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
