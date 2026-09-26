export function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path
        fill="currentColor"
        d="M19.4 13.5a7.7 7.7 0 0 0 .1-1.5 7.7 7.7 0 0 0-.1-1.5l2-1.6a.6.6 0 0 0 .1-.7l-1.9-3.3a.6.6 0 0 0-.7-.3l-2.4 1a7.4 7.4 0 0 0-2.6-1.5l-.4-2.5A.6.6 0 0 0 13 1h-3.8a.6.6 0 0 0-.6.5l-.4 2.5a7.4 7.4 0 0 0-2.6 1.5l-2.4-1a.6.6 0 0 0-.7.3L.6 8.1a.6.6 0 0 0 .1.7l2 1.6a7.7 7.7 0 0 0-.1 1.5 7.7 7.7 0 0 0 .1 1.5l-2 1.6a.6.6 0 0 0-.1.7l1.9 3.3a.6.6 0 0 0 .7.3l2.4-1a7.4 7.4 0 0 0 2.6 1.5l.4 2.5a.6.6 0 0 0 .6.5H13a.6.6 0 0 0 .6-.5l.4-2.5a7.4 7.4 0 0 0 2.6-1.5l2.4 1a.6.6 0 0 0 .7-.3l1.9-3.3a.6.6 0 0 0-.1-.7l-2.1-1.5ZM11.1 15.4a3.4 3.4 0 1 1 0-6.8 3.4 3.4 0 0 1 0 6.8Z"
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

export function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path fill="currentColor" d="M8.2 5.4c0-.8.9-1.3 1.6-.9l9.2 6.1c.6.4.6 1.3 0 1.7l-9.2 6.1c-.7.5-1.6 0-1.6-.8V5.4Z" />
    </svg>
  );
}
