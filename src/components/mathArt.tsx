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
