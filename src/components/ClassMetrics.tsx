import { classTotals, type PracticeSession } from "../data/aggregates";

/** Class totals, or a floor message. Never a per-child list. */
export function ClassMetrics({ linked, sessions = [] }: { linked: number; sessions?: PracticeSession[] }) {
  const view = classTotals(linked, sessions);
  if (view.status === "hidden" || !view.totals) {
    return (
      <section className="adult-section" data-metrics="hidden" data-linked={linked}>
        <h3>Class totals</h3>
        <p>{view.message}</p>
      </section>
    );
  }
  const totals = view.totals;
  return (
    <section className="adult-section" data-metrics="ready" data-linked={linked}>
      <h3>Class totals</h3>
      <dl className="class-totals">
        <div>
          <dt>Practice days</dt>
          <dd>{totals.practiceDays}</dd>
        </div>
        <div>
          <dt>Active minutes</dt>
          <dd>{totals.activeMinutes}</dd>
        </div>
        <div>
          <dt>Median session</dt>
          <dd>{totals.medianSession}</dd>
        </div>
        <div>
          <dt>Last active week</dt>
          <dd>{totals.lastActiveWeek || "—"}</dd>
        </div>
      </dl>
    </section>
  );
}
