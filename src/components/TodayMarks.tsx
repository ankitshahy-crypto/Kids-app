/**
 * The Today screen's marks, as the approved mockup draws them: thin taupe lines with a little
 * sage, sand and blush, on cream. The six Explore doors (dots and a plus, three circles, a clock
 * with a coin, blocks, a flask, angle brackets), the dock's woven nest, solid star and speckled egg,
 * and the pencil and smile on the trace pills. All decorative: the label beside each one names it.
 */

const LINE = "#8a8065";
const SAGE = "#9ea583";
const SAND = "#dcc5a2";
const BLUSH = "#e8c9b4";
const GOLD = "#dcc07e";
const TAN = "#c9ad86";
const BROWN = "#a88a62";

const svgProps = { viewBox: "0 0 48 48", "aria-hidden": true, focusable: false } as const;

export type ExploreMarkName = "numbers" | "colors" | "time" | "build" | "science" | "code";

export function ExploreMark({ name }: { name: ExploreMarkName }) {
  if (name === "numbers") {
    return (
      <svg {...svgProps} className="today-mark">
        <circle cx="18" cy="13" r="3.2" fill={SAGE} />
        <circle cx="27" cy="9" r="2.6" fill={SAGE} />
        <circle cx="33" cy="16" r="3" fill={SAGE} />
        <circle cx="13" cy="21" r="2.4" fill={SAGE} />
        <path d="M24 26v12M18 32h12" fill="none" stroke={LINE} strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "colors") {
    return (
      <svg {...svgProps} className="today-mark">
        <circle cx="24" cy="17" r="10" fill={SAND} fillOpacity="0.95" />
        <circle cx="17" cy="29" r="10" fill={SAGE} fillOpacity="0.9" />
        <circle cx="31" cy="29" r="10" fill={BLUSH} fillOpacity="0.9" />
      </svg>
    );
  }
  if (name === "time") {
    return (
      <svg {...svgProps} className="today-mark">
        <circle cx="21" cy="21" r="14" fill="none" stroke={LINE} strokeWidth="2.4" />
        <path d="M21 11v10l6 4" fill="none" stroke={LINE} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="33" cy="33" r="9" fill={GOLD} stroke={BROWN} strokeWidth="1.8" />
        <path d="M33 28v10M30.5 30.5h3.6a1.8 1.8 0 0 1 0 3.6h-2.2a1.8 1.8 0 0 0 0 3.6h3.6" fill="none" stroke={BROWN} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "build") {
    return (
      <svg {...svgProps} className="today-mark">
        <rect x="17.5" y="8" width="13" height="13" rx="2.5" fill={SAND} />
        <rect x="10" y="24" width="13" height="13" rx="2.5" fill={SAND} />
        <rect x="25" y="24" width="13" height="13" rx="2.5" fill={SAND} />
      </svg>
    );
  }
  if (name === "science") {
    return (
      <svg {...svgProps} className="today-mark">
        <path d="M19 13h10M21 13v9l-8.5 14.5A2.5 2.5 0 0 0 14.6 40h18.8a2.5 2.5 0 0 0 2.1-3.5L27 22v-9" fill="none" stroke={SAGE} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16.2 32h15.6l2.6 4.5a1.2 1.2 0 0 1-1 1.8H14.6a1.2 1.2 0 0 1-1-1.8Z" fill={SAGE} fillOpacity="0.55" />
        <path d="M24 12V7" fill="none" stroke={SAGE} strokeWidth="2" strokeLinecap="round" />
        <path d="M24 9c-1-3.5-4-4.5-6.5-4 .5 3 3.5 4.5 6.5 4Zm0 0c1-3.5 4-4.5 6.5-4-.5 3-3.5 4.5-6.5 4Z" fill={SAGE} />
      </svg>
    );
  }
  return (
    <svg {...svgProps} className="today-mark">
      <path d="M17 15l-9 9 9 9M31 15l9 9-9 9M27 12l-6 24" fill="none" stroke={LINE} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A woven nest, seen from a little above: the rim's weave, and the hollow. */
export function NestMark() {
  return (
    <svg {...svgProps} className="today-mark">
      <ellipse cx="24" cy="19" rx="18" ry="7" fill="#efe1c8" stroke={BROWN} strokeWidth="1.8" />
      <ellipse cx="24" cy="19" rx="11" ry="3.8" fill="#f8f0df" stroke={TAN} strokeWidth="1.4" />
      <path d="M6 19c0 9 6 19 18 19s18-10 18-19" fill="#dcc29b" stroke={BROWN} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8.5 25c7 4 24 4 31 0M11.5 31c6 3 19 3 25 0" fill="none" stroke={BROWN} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M13 21l4 6M20 23l1 7M28 23l-1 7M35 21l-4 6M16 29l2 5M30 29l-2 5" fill="none" stroke={BROWN} strokeWidth="1.1" strokeLinecap="round" strokeOpacity="0.7" />
    </svg>
  );
}

/** A hat with a bow, for the Dress up door on My Nest: the closet's things, drawn like the other marks. */
export function DressMark() {
  return (
    <svg {...svgProps} className="today-mark">
      <ellipse cx="24" cy="33" rx="19" ry="6" fill={SAND} stroke={LINE} strokeWidth="1.8" />
      <path d="M13 32c0-9 3-18 11-18s11 9 11 18" fill="#f6ecd9" stroke={LINE} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M13.5 29c4 2.2 17 2.2 21 0" fill="none" stroke={SAGE} strokeWidth="3.2" strokeLinecap="round" />
      <ellipse cx="29.5" cy="26.5" rx="3.4" ry="2.1" transform="rotate(-28 29.5 26.5)" fill={BLUSH} stroke={LINE} strokeWidth="1.3" />
      <ellipse cx="35.5" cy="26.5" rx="3.4" ry="2.1" transform="rotate(28 35.5 26.5)" fill={BLUSH} stroke={LINE} strokeWidth="1.3" />
      <circle cx="32.5" cy="27" r="1.7" fill={LINE} />
    </svg>
  );
}

/** A wrapped present with a bow, for the Surprise door on My Nest, drawn like the hat beside it. */
export function GiftMark() {
  return (
    <svg {...svgProps} className="today-mark">
      <rect x="9" y="20" width="30" height="20" rx="4" fill={BLUSH} stroke={LINE} strokeWidth="1.8" />
      <rect x="6" y="14" width="36" height="9" rx="3.5" fill="#f6ecd9" stroke={LINE} strokeWidth="1.8" />
      <path d="M24 14v26" fill="none" stroke={SAGE} strokeWidth="3.2" strokeLinecap="round" />
      <ellipse cx="19" cy="10.5" rx="3.6" ry="2.3" transform="rotate(-30 19 10.5)" fill={SAND} stroke={LINE} strokeWidth="1.3" />
      <ellipse cx="29" cy="10.5" rx="3.6" ry="2.3" transform="rotate(30 29 10.5)" fill={SAND} stroke={LINE} strokeWidth="1.3" />
      <circle cx="24" cy="12" r="1.8" fill={LINE} />
    </svg>
  );
}

/** A solid star, sand with a soft edge. */
export function StarMark() {
  return (
    <svg {...svgProps} className="today-mark">
      <path
        d="M24 6l5 11.4 12.4 1.3-9.3 8.4 2.6 12.2L24 33l-10.7 6.3 2.6-12.2-9.3-8.4L19 17.4Z"
        fill="#ead6b4"
        stroke={TAN}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A speckled egg. */
export function EggMark() {
  return (
    <svg {...svgProps} className="today-mark">
      <path d="M24 5c8 0 14 11 14 22 0 8.5-6.3 15-14 15S10 35.5 10 27C10 16 16 5 24 5Z" fill="#efe1c8" stroke={TAN} strokeWidth="1.8" />
      <circle cx="19" cy="18" r="2.2" fill={TAN} fillOpacity="0.75" />
      <circle cx="28" cy="14" r="1.7" fill={TAN} fillOpacity="0.75" />
      <circle cx="30" cy="25" r="2.4" fill={TAN} fillOpacity="0.75" />
      <circle cx="17" cy="29" r="1.8" fill={TAN} fillOpacity="0.75" />
      <circle cx="24" cy="34" r="2" fill={TAN} fillOpacity="0.75" />
      <circle cx="26" cy="23" r="1.2" fill={TAN} fillOpacity="0.75" />
    </svg>
  );
}

/** A pencil, outlined, tip to the lower left: the mark on Trace a word. */
export function PencilLine() {
  return (
    <svg {...svgProps} className="today-mark">
      <path d="M10 38l2.5-9L32 9.5a3 3 0 0 1 4.2 0l2.3 2.3a3 3 0 0 1 0 4.2L19 35.5Z" fill="none" stroke={LINE} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M12.5 29l6.5 6.5M29 12.5l6.5 6.5M10 38l5-1.2-3.8-3.8Z" fill="none" stroke={LINE} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A smiling face, outlined: the mark on Trace my name. */
export function SmileLine() {
  return (
    <svg {...svgProps} className="today-mark">
      <circle cx="24" cy="24" r="15" fill="none" stroke={LINE} strokeWidth="2.4" />
      <circle cx="18.5" cy="20.5" r="2" fill={LINE} />
      <circle cx="29.5" cy="20.5" r="2" fill={LINE} />
      <path d="M17 28c1.8 3 4.2 4.5 7 4.5s5.2-1.5 7-4.5" fill="none" stroke={LINE} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/** An open book, outlined: the Story stop in Today's top row. */
export function BookLine() {
  return (
    <svg {...svgProps} className="today-mark">
      <path d="M24 14c-4-3-10-3.6-15-2.6v23c5-1 11-.4 15 2.6 4-3 10-3.6 15-2.6v-23c-5-1-11-.4-15 2.6Z" fill="none" stroke={LINE} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M24 14v23M13 18c2.6-.4 5.4 0 7.4.9M13 23.5c2.6-.4 5.4 0 7.4.9M35 18c-2.6-.4-5.4 0-7.4.9M35 23.5c-2.6-.4-5.4 0-7.4.9" fill="none" stroke={LINE} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Three drops, outlined and faintly filled: the Colors stop in Today's top row. */
export function DropsLine() {
  const drop = (x: number, y: number, s: number) =>
    `M${x} ${y - 7 * s}c${2.6 * s} ${3.6 * s} ${4.6 * s} ${6 * s} ${4.6 * s} ${8.4 * s}a${4.6 * s} ${4.6 * s} 0 0 1-${9.2 * s} 0c0-${2.4 * s} ${2 * s}-${4.8 * s} ${4.6 * s}-${8.4 * s}Z`;
  return (
    <svg {...svgProps} className="today-mark">
      <path d={drop(24, 17, 1)} fill={SAND} fillOpacity="0.5" stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
      <path d={drop(16, 32, 0.95)} fill={SAND} fillOpacity="0.5" stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
      <path d={drop(32, 32, 0.95)} fill={SAND} fillOpacity="0.5" stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
