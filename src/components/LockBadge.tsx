/** A small padlock on a tile that opens with the full app. */
export function LockBadge() {
  return (
    <span className="lock-badge" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M7 10V8a5 5 0 0 1 10 0v2" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <rect x="5" y="10" width="14" height="10" rx="3" fill="currentColor" />
      </svg>
    </span>
  );
}
