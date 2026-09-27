/**
 * Shown on Today once the day's lesson is done or the lesson length is
 * reached. "One more?" is offered while the parent's limit allows it. There
 * is no clock and no countdown, only a friendly stop.
 */
export function WrapUpSheet({
  name,
  reason,
  canTakeMore,
  onMore,
  onDone,
}: {
  name: string;
  reason: "lesson" | "time";
  canTakeMore: boolean;
  onMore: () => void;
  onDone: () => void;
}) {
  const title = reason === "lesson" ? `That's today's lesson, ${name}!` : `Nice work, ${name}!`;
  return (
    <div className="wrap-up" role="dialog" aria-labelledby="wrap-up-title" data-wrap-up={reason} data-more={canTakeMore ? "true" : "false"}>
      <div className="wrap-up-card">
        <h2 id="wrap-up-title">{title}</h2>
        <p className="wrap-up-note">{canTakeMore ? "One more?" : "All done for now. See you next time!"}</p>
        <div className="wrap-up-actions">
          {canTakeMore ? (
            <button type="button" className="done-button wrap-up-more" onClick={onMore}>
              One more
            </button>
          ) : null}
          <button type="button" className={canTakeMore ? "text-button wrap-up-done" : "done-button wrap-up-done"} onClick={onDone}>
            All done
          </button>
        </div>
      </div>
    </div>
  );
}
