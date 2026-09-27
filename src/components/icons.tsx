export function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path
        fill="currentColor"
        d="M12 3.2 3 11h2.2v8.2c0 .7.5 1.2 1.2 1.2H10v-5.2h4V20.4h3.6c.7 0 1.2-.5 1.2-1.2V11H21L12 3.2Z"
      />
    </svg>
  );
}

export function GrownupIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <circle cx="12" cy="7.4" r="3.1" fill="currentColor" />
      <path
        fill="currentColor"
        d="M5.4 19.4c.5-3.3 3.1-5.2 6.6-5.2s6.1 1.9 6.6 5.2c.2.9-.5 1.6-1.4 1.6H6.8c-.9 0-1.6-.7-1.4-1.6Z"
      />
    </svg>
  );
}

export function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path
        fill="currentColor"
        d="M4 9.2h3.2L12 5.4v13.2l-4.8-3.8H4a1.2 1.2 0 0 1-1.2-1.2v-3.2A1.2 1.2 0 0 1 4 9.2Z"
      />
      <path
        d="M15.2 8.6a4.6 4.6 0 0 1 0 6.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M17.6 6.2a8 8 0 0 1 0 11.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon chevron">
      <path
        d={direction === "left" ? "M14.5 5.5 8 12l6.5 6.5" : "M9.5 5.5 16 12l-6.5 6.5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path
        fill="currentColor"
        d="M12 2.8 14.7 9l6.6.5-5 4.2 1.6 6.4L12 16.6 6.1 20.1 7.7 13.7 2.7 9.5 9.3 9 12 2.8Z"
      />
    </svg>
  );
}

export function ReviewBadge() {
  return (
    <svg viewBox="0 0 72 72" aria-hidden="true" className="badge-art">
      <circle cx="36" cy="32" r="22" fill="#F8E6D4" stroke="#E7C39A" strokeWidth="4" />
      <path
        fill="#E2A15A"
        d="M36 16.5 39.4 25.4 48.8 26.2 41.6 32.2 43.8 41.2 36 36.2 28.2 41.2 30.4 32.2 23.2 26.2 32.6 25.4 36 16.5Z"
      />
      <path d="M24 48 18 64l12-6" fill="#F2C1C4" />
      <path d="M48 48 54 64 42 58" fill="#F2C1C4" />
    </svg>
  );
}

/** Small mark inside a Grown-ups or parent menu circle. */
export function MenuIcon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      {name === "settings" ? (
        <>
          <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 3.2v2.2M12 18.6v2.2M3.2 12h2.2M18.6 12h2.2M5.8 5.8l1.6 1.6M16.6 16.6l1.6 1.6M18.2 5.8l-1.6 1.6M7.4 16.6 5.8 18.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </>
      ) : null}
      {name === "offline" ? (
        <path fill="currentColor" d="M7.2 16.5h9.2a3.4 3.4 0 0 0 .4-6.8 5 5 0 0 0-9.6-1.2 3.2 3.2 0 0 0 0 8Z" />
      ) : null}
      {name === "profiles" || name === "children" ? (
        <>
          <circle cx="12" cy="8" r="3" fill="currentColor" />
          <path fill="currentColor" d="M6.2 18.6c.4-2.8 2.6-4.4 5.8-4.4s5.4 1.6 5.8 4.4c.1.7-.4 1.4-1.2 1.4H7.4c-.8 0-1.3-.7-1.2-1.4Z" />
        </>
      ) : null}
      {name === "account" ? (
        <>
          <rect x="6" y="10.5" width="12" height="8" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9 10.5V8.2a3 3 0 0 1 6 0v2.3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </>
      ) : null}
      {name === "help" ? (
        <>
          <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9.4 9.4a2.6 2.6 0 1 1 3.4 2.5c-.7.3-1.2.9-1.2 1.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="11.6" cy="16.2" r="0.9" fill="currentColor" />
        </>
      ) : null}
      {name === "privacy" ? (
        <path fill="currentColor" d="M12 3.2 5.2 6v5.2c0 3.6 2.6 6.4 6.8 8.1 4.2-1.7 6.8-4.5 6.8-8.1V6L12 3.2Z" />
      ) : null}
      {name === "about" ? (
        <>
          <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 11v5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="8" r="0.9" fill="currentColor" />
        </>
      ) : null}
      {name === "share" ? (
        <>
          <circle cx="7" cy="12" r="2.1" fill="currentColor" />
          <circle cx="16.5" cy="7" r="2.1" fill="currentColor" />
          <circle cx="16.5" cy="17" r="2.1" fill="currentColor" />
          <path d="m8.8 11.1 6-3.2M8.8 12.9l6 3.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </>
      ) : null}
      {name === "printables" || name === "teacher" ? (
        <>
          <path d="M7 4.5h10v6H7z" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M6 10.5h12v7H6z" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9 14.2h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </>
      ) : null}
      {name === "join" ? (
        <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M8 12h8M12 8v8" />
      ) : null}
      {name === "progress" ? (
        <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M5 16.5 9.2 12l3 2.4L19 7.5" />
      ) : null}
      {name === "rewards" ? (
        <path fill="currentColor" d="M12 3.2 14.2 8l5.2.4-4 3.4 1.3 5-4.7-2.8L7.3 16.8 8.6 11.8 4.6 8.4 9.8 8 12 3.2Z" />
      ) : null}
    </svg>
  );
}

export function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path fill="currentColor" d="M8.2 5.4c0-.8.9-1.3 1.6-.9l9.2 6.1c.6.4.6 1.3 0 1.7l-9.2 6.1c-.7.5-1.6 0-1.6-.8V5.4Z" />
    </svg>
  );
}
