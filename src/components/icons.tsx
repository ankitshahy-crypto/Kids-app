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

export function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path fill="currentColor" d="M8.2 5.4c0-.8.9-1.3 1.6-.9l9.2 6.1c.6.4.6 1.3 0 1.7l-9.2 6.1c-.7.5-1.6 0-1.6-.8V5.4Z" />
    </svg>
  );
}
