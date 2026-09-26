/** A quiet ring for the daily reading goal. No clock numbers. */
export function GoalRing({ ms, goalMinutes }: { ms: number; goalMinutes: number }) {
  const goalMs = Math.max(1, goalMinutes) * 60_000;
  const ratio = Math.min(1, Math.max(0, ms / goalMs));
  const radius = 16;
  const turn = 2 * Math.PI * radius;
  const met = ratio >= 1;
  return (
    <div className="goal-ring" role="img" aria-label="Today's practice" data-progress={ratio.toFixed(2)} data-met={met ? "true" : "false"}>
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r={radius} fill="none" stroke="var(--mint-wash)" strokeWidth="4" />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke={met ? "var(--sage-soft)" : "var(--gold)"}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${turn} ${turn}`}
          strokeDashoffset={turn * (1 - ratio)}
          transform="rotate(-90 20 20)"
        />
      </svg>
    </div>
  );
}
