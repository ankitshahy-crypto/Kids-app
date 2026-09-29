import { useEffect, useId } from "react";
import { lessonName, type ChildProfile } from "../data/profiles";

/**
 * Removing a child is a real decision: their stars, stickers, and place in
 * the lessons go with them. So it is a sheet with the child's name, a plain
 * warning, and Cancel and Remove far apart, never a second tap in the same
 * spot as the first.
 */
export function RemoveChildSheet({ profile, onConfirm, onCancel }: { profile: ChildProfile; onConfirm: () => void; onCancel: () => void }) {
  const titleId = useId();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);
  return (
    <div className="gate-backdrop" onClick={onCancel}>
      <div
        className="gate-card remove-sheet"
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
