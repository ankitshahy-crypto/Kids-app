/** Small drawings the Numbers page shows on its tiles, and the Numbers games use in play. */

/** A ladybug seen from above, in the app's colors. */
export function Ladybug() {
  return (
    <svg className="ladybug-art" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <circle cx="24" cy="12" r="7" fill="#3a4660" />
      <circle cx="21" cy="10" r="1.6" fill="#fffdfb" />
      <circle cx="27" cy="10" r="1.6" fill="#fffdfb" />
      <ellipse cx="24" cy="28" rx="16" ry="15" fill="#e8705f" />
      <path d="M24 13v30" stroke="#3a4660" strokeWidth="2.5" />
      <circle cx="16" cy="24" r="3.4" fill="#3a4660" />
      <circle cx="32" cy="24" r="3.4" fill="#3a4660" />
      <circle cx="17.5" cy="34" r="2.8" fill="#3a4660" />
      <circle cx="30.5" cy="34" r="2.8" fill="#3a4660" />
      <ellipse cx="18" cy="19" rx="3.5" ry="2" fill="#f4b3a6" opacity="0.8" />
    </svg>
  );
}

/** A strawberry: red, with seeds and a green top. */
export function Strawberry() {
  return (
    <svg className="berry-art" viewBox="0 0 48 52" aria-hidden="true" focusable="false">
      <path d="M24 14c12 0 18 6 18 14 0 12-10 20-18 22C16 48 6 40 6 28c0-8 6-14 18-14Z" fill="#e8705f" />
      <path d="M24 16 15 9l5 8-9 1 9 3M24 16l9-7-5 8 9 1-9 3M24 16V6" fill="#7fbf86" stroke="#6aab73" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <g fill="#fbe3a0">
        <ellipse cx="17" cy="27" rx="1.4" ry="2" />
        <ellipse cx="24" cy="25" rx="1.4" ry="2" />
        <ellipse cx="31" cy="27" rx="1.4" ry="2" />
        <ellipse cx="20" cy="34" rx="1.4" ry="2" />
        <ellipse cx="28" cy="34" rx="1.4" ry="2" />
        <ellipse cx="24" cy="41" rx="1.4" ry="2" />
      </g>
    </svg>
  );
}
