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

/**
 * The small drawings in the tinted circles of the grown-up lists (Grown-ups, Parent): one line
 * drawing each, in the list's own ink, so a row is found by its picture as well as its name. The
 * circles were empty before.
 */
export type RowGlyphName =
  | "star"
  | "sprout"
  | "sliders"
  | "download"
  | "face"
  | "person"
  | "help"
  | "shield"
  | "info"
  | "share"
  | "page"
  | "children"
  | "apple"
  | "gift";

const ROW_GLYPHS: Record<RowGlyphName, JSX.Element> = {
  star: <path d="M12 4.2l2.35 4.76 5.25.77-3.8 3.7.9 5.23L12 16.2l-4.7 2.46.9-5.23-3.8-3.7 5.25-.77z" />,
  sprout: <path d="M12 20.2v-7.4M12 12.8c-.2-3.6-2.6-6-6.6-6.2.1 3.9 2.6 6.2 6.6 6.2zM12 15.1c.3-3.1 2.4-5.2 5.8-5.4-.1 3.4-2.3 5.4-5.8 5.4zM8.6 20.2h6.8" />,
  sliders: (
    <>
      <path d="M5 7.5h8.5M17.5 7.5H19M5 12h3M12 12h7M5 16.5h7M16 16.5h3" />
      <circle cx="15.5" cy="7.5" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="14" cy="16.5" r="2" />
    </>
  ),
  download: <path d="M12 4.6v10M7.8 10.6l4.2 4.2 4.2-4.2M5.6 19.2h12.8" />,
  face: (
    <>
      <circle cx="12" cy="12" r="7.8" />
      <path d="M9.4 10.2v.7M14.6 10.2v.7M9 14.2c1.7 1.9 4.3 1.9 6 0" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8.6" r="3.3" />
      <path d="M5.8 19.4c.9-3.5 3.3-5.4 6.2-5.4s5.3 1.9 6.2 5.4" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="7.8" />
      <path d="M9.7 9.8a2.4 2.4 0 1 1 3.4 2.2c-.7.3-1.1.8-1.1 1.6v.3M12 16.6v.1" />
    </>
  ),
  shield: <path d="M12 4.2l6.2 2.4v4.9c0 3.9-2.6 6.9-6.2 8.3-3.6-1.4-6.2-4.4-6.2-8.3V6.6zM9.4 12.1l1.8 1.8 3.5-3.6" />,
  info: (
    <>
      <circle cx="12" cy="12" r="7.8" />
      <path d="M12 11.2v4.6M12 8.3v.1" />
    </>
  ),
  share: <path d="M12 4.6v9.6M8.7 7.9L12 4.6l3.3 3.3M8.6 10.8H7.4c-.8 0-1.4.6-1.4 1.4v5.8c0 .8.6 1.4 1.4 1.4h9.2c.8 0 1.4-.6 1.4-1.4v-5.8c0-.8-.6-1.4-1.4-1.4h-1.2" />,
  page: <path d="M7.6 4.2h6.2l3.6 3.6v10.8c0 .8-.6 1.4-1.4 1.4H7.6c-.8 0-1.4-.6-1.4-1.4V5.6c0-.8.6-1.4 1.4-1.4zM13.6 4.4v3.6h3.6M9.2 12.4h5.6M9.2 15.6h3.6" />,
  children: (
    <>
      <circle cx="9.2" cy="9" r="2.8" />
      <circle cx="16.2" cy="10.2" r="2.2" />
      <path d="M4 18.8c.6-3 2.6-4.6 5.2-4.6s4.6 1.6 5.2 4.6M14.9 14.4c.4-.1.9-.2 1.3-.2 2.1 0 3.6 1.4 4 3.8" />
    </>
  ),
  apple: <path d="M12 8.3c-1.3-1.1-3.4-1.4-5-.3-2.3 1.6-2.4 5.4-.7 8.4 1.2 2.1 3 3.6 4.4 2.9.8-.4 1.8-.4 2.6 0 1.4.7 3.2-.8 4.4-2.9 1.7-3 1.6-6.8-.7-8.4-1.6-1.1-3.7-.8-5 .3zM12 8.3c0-1.9.9-3.3 2.6-3.9" />,
  gift: <path d="M5.2 10.6h13.6v8c0 .7-.5 1.2-1.2 1.2H6.4c-.7 0-1.2-.5-1.2-1.2zM4.2 7.8h15.6v2.8H4.2zM12 7.8v12M12 7.8c-1.2-2.6-4.6-3.6-4.6-1.5 0 1.2 2.1 1.5 4.6 1.5zM12 7.8c1.2-2.6 4.6-3.6 4.6-1.5 0 1.2-2.1 1.5-4.6 1.5z" />,
};

export function RowGlyph({ name }: { name: RowGlyphName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="row-glyph"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ROW_GLYPHS[name]}
    </svg>
  );
}
