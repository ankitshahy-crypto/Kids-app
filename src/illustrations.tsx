/**
 * Original flat illustrations for the starter deck.
 * Each drawing is simple geometry made for this app. Nothing here is traced
 * from another product's artwork.
 */

function Shadow() {
  return <ellipse cx="140" cy="192" rx="72" ry="10" fill="#E7D5C6" opacity="0.7" />;
}

function Cat() {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <Shadow />
      <path
        d="M198 148c26 10 36-18 24-36"
        fill="none"
        stroke="#E0904A"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <ellipse cx="140" cy="162" rx="64" ry="34" fill="#F4A261" />
      <ellipse cx="140" cy="168" rx="30" ry="18" fill="#FFF1E0" />
      <circle cx="140" cy="104" r="50" fill="#F6B07A" />
      <path d="M98 76 88 28l40 40Z" fill="#F6B07A" />
      <path d="M182 76 192 28l-40 40Z" fill="#F6B07A" />
      <path d="M102 72 96 40l28 26Z" fill="#F6C3CB" />
      <path d="M178 72 184 40l-28 26Z" fill="#F6C3CB" />
      <ellipse cx="122" cy="104" rx="7" ry="8.5" fill="#2C3A4F" />
      <ellipse cx="158" cy="104" rx="7" ry="8.5" fill="#2C3A4F" />
      <circle cx="124.5" cy="101" r="2.3" fill="#fff" />
      <circle cx="160.5" cy="101" r="2.3" fill="#fff" />
      <path d="M140 114 133 122h14Z" fill="#E07A8A" />
      <path
        d="M140 122v8M126 136c6-6 10-6 14-2M154 136c-6-6-10-6-14-2"
        fill="none"
        stroke="#2C3A4F"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M78 108h28M80 120h26M174 108h28M174 120h26"
        fill="none"
        stroke="#2C3A4F"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />
      <ellipse cx="104" cy="118" rx="8" ry="5" fill="#F4B0AE" opacity="0.8" />
      <ellipse cx="176" cy="118" rx="8" ry="5" fill="#F4B0AE" opacity="0.8" />
    </svg>
  );
}

function Dog() {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <Shadow />
      <ellipse cx="150" cy="164" rx="66" ry="32" fill="#D08A5A" />
      <ellipse cx="118" cy="168" rx="16" ry="10" fill="#F3D2B6" />
      <ellipse cx="176" cy="168" rx="16" ry="10" fill="#F3D2B6" />
      <ellipse cx="86" cy="124" rx="20" ry="34" fill="#C9845A" />
      <ellipse cx="176" cy="108" rx="16" ry="28" fill="#C9845A" transform="rotate(16 176 108)" />
      <circle cx="128" cy="108" r="48" fill="#E0A06A" />
      <ellipse cx="128" cy="126" rx="28" ry="18" fill="#F6D7BE" />
      <ellipse cx="128" cy="118" rx="9" ry="7" fill="#2C3A4F" />
      <ellipse cx="112" cy="96" rx="6.5" ry="8" fill="#2C3A4F" />
      <ellipse cx="148" cy="96" rx="6.5" ry="8" fill="#2C3A4F" />
      <circle cx="114.5" cy="93.5" r="2.2" fill="#fff" />
      <circle cx="150.5" cy="93.5" r="2.2" fill="#fff" />
      <path d="M120 136c6 14 16 14 20 0" fill="#F2A3A8" />
      <ellipse cx="104" cy="114" rx="8" ry="5" fill="#E7A898" opacity="0.7" />
      <ellipse cx="156" cy="114" rx="8" ry="5" fill="#E7A898" opacity="0.7" />
    </svg>
  );
}

function Sun() {
  const rays = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <Shadow />
      {rays.map((deg) => (
        <rect
          key={deg}
          x="128"
          y="18"
          width="24"
          height="42"
          rx="12"
          fill="#FFD56A"
          transform={`rotate(${deg} 140 108)`}
        />
      ))}
      <circle cx="140" cy="108" r="52" fill="#FFC857" />
      <ellipse cx="118" cy="104" rx="6.5" ry="8" fill="#2C3A4F" />
      <ellipse cx="162" cy="104" rx="6.5" ry="8" fill="#2C3A4F" />
      <circle cx="120.5" cy="101" r="2.2" fill="#fff" />
      <circle cx="164.5" cy="101" r="2.2" fill="#fff" />
      <path
        d="M122 124c8 10 28 10 36 0"
        fill="none"
        stroke="#2C3A4F"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <ellipse cx="104" cy="118" rx="8" ry="5" fill="#F3B08A" opacity="0.85" />
      <ellipse cx="176" cy="118" rx="8" ry="5" fill="#F3B08A" opacity="0.85" />
    </svg>
  );
}

function Hat() {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <Shadow />
      <path d="M92 150c0-54 96-54 96 0" fill="#E07A5F" />
      <ellipse cx="140" cy="154" rx="100" ry="22" fill="#E38B6D" />
      <ellipse cx="140" cy="150" rx="86" ry="14" fill="#E07A5F" />
      <rect x="98" y="118" width="84" height="20" rx="10" fill="#F3D19A" />
      <ellipse cx="112" cy="92" rx="16" ry="8" fill="#F2A08A" opacity="0.7" />
    </svg>
  );
}

function Pig() {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <Shadow />
      <ellipse cx="148" cy="164" rx="62" ry="32" fill="#F4A4B4" />
      <ellipse cx="108" cy="168" rx="14" ry="8" fill="#F8C4CE" />
      <ellipse cx="180" cy="168" rx="14" ry="8" fill="#F8C4CE" />
      <path d="M96 86 84 48l36 30Z" fill="#F4A4B4" />
      <path d="M176 82 196 46l-30 32Z" fill="#F4A4B4" />
      <path d="M100 82 92 56l24 22Z" fill="#F8C4CE" />
      <path d="M172 80 184 56l-20 22Z" fill="#F8C4CE" />
      <circle cx="136" cy="108" r="50" fill="#F7B3C0" />
      <ellipse cx="136" cy="124" rx="26" ry="18" fill="#F8D0D8" />
      <ellipse cx="126" cy="124" rx="5" ry="6" fill="#E07A8C" />
      <ellipse cx="146" cy="124" rx="5" ry="6" fill="#E07A8C" />
      <ellipse cx="116" cy="98" rx="6.5" ry="8" fill="#2C3A4F" />
      <ellipse cx="156" cy="98" rx="6.5" ry="8" fill="#2C3A4F" />
      <circle cx="118.5" cy="95.5" r="2.2" fill="#fff" />
      <circle cx="158.5" cy="95.5" r="2.2" fill="#fff" />
      <path
        d="M124 140c6 8 18 8 24 0"
        fill="none"
        stroke="#2C3A4F"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <ellipse cx="100" cy="114" rx="8" ry="5" fill="#F08AA0" opacity="0.55" />
      <ellipse cx="172" cy="114" rx="8" ry="5" fill="#F08AA0" opacity="0.55" />
    </svg>
  );
}

function Bus() {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <Shadow />
      <rect x="36" y="62" width="208" height="96" rx="22" fill="#F5C542" />
      <rect x="36" y="108" width="208" height="16" fill="#F0B429" />
      <rect x="52" y="76" width="46" height="32" rx="8" fill="#E5F4FB" />
      <rect x="108" y="76" width="46" height="32" rx="8" fill="#E5F4FB" />
      <rect x="164" y="76" width="46" height="32" rx="8" fill="#E5F4FB" />
      <rect x="196" y="118" width="28" height="28" rx="6" fill="#F8E7A8" />
      <circle cx="86" cy="158" r="18" fill="#3D4A63" />
      <circle cx="194" cy="158" r="18" fill="#3D4A63" />
      <circle cx="86" cy="158" r="8" fill="#FFF8EE" />
      <circle cx="194" cy="158" r="8" fill="#FFF8EE" />
      <circle cx="58" cy="128" r="5" fill="#FFF4CC" />
    </svg>
  );
}

function Cup() {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <Shadow />
      <path
        d="M196 86c32 6 32 58 0 66"
        fill="none"
        stroke="#F0997B"
        strokeWidth="16"
        strokeLinecap="round"
      />
      <path d="M78 72h112l-14 96H94Z" fill="#F0997B" />
      <ellipse cx="134" cy="72" rx="56" ry="14" fill="#F7C2B0" />
      <ellipse cx="134" cy="72" rx="40" ry="8" fill="#E98570" />
      <rect x="96" y="108" width="76" height="10" rx="5" fill="#F7C2B0" opacity="0.85" />
    </svg>
  );
}

function Bed() {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <Shadow />
      <rect x="46" y="58" width="34" height="112" rx="16" fill="#E2B48C" />
      <rect x="64" y="112" width="176" height="58" rx="18" fill="#F3E2CF" />
      <path d="M108 112h124c10 0 18 8 18 18v22c0 12-10 18-22 18H108V112Z" fill="#B7D4EE" />
      <path d="M108 112c18 10 28 10 40 0v58H108V112Z" fill="#A4C6E6" />
      <rect x="72" y="90" width="52" height="40" rx="16" fill="#FFF8F2" />
      <rect x="64" y="158" width="176" height="12" rx="6" fill="#E6C9A4" />
    </svg>
  );
}

function Fox() {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <Shadow />
      <path d="M196 150c36-8 48-46 22-58-8 20-16 36-22 58Z" fill="#E8874A" />
      <circle cx="214" cy="96" r="12" fill="#FFF6EA" />
      <ellipse cx="132" cy="164" rx="54" ry="32" fill="#E8874A" />
      <ellipse cx="132" cy="170" rx="24" ry="14" fill="#FFF6EA" />
      <circle cx="120" cy="108" r="46" fill="#F09455" />
      <path d="M84 84 78 32l40 42Z" fill="#F09455" />
      <path d="M156 84 170 30l-36 46Z" fill="#F09455" />
      <path d="M90 80 86 46l26 26Z" fill="#F6C9B0" />
      <path d="M150 78 160 44l-24 28Z" fill="#F6C9B0" />
      <ellipse cx="120" cy="122" rx="26" ry="18" fill="#FFF6EA" />
      <ellipse cx="120" cy="116" rx="8" ry="6" fill="#2C3A4F" />
      <ellipse cx="102" cy="98" rx="6.5" ry="8" fill="#2C3A4F" />
      <ellipse cx="140" cy="98" rx="6.5" ry="8" fill="#2C3A4F" />
      <circle cx="104.5" cy="95.5" r="2.2" fill="#fff" />
      <circle cx="142.5" cy="95.5" r="2.2" fill="#fff" />
      <ellipse cx="90" cy="114" rx="7" ry="4.5" fill="#F0B09A" opacity="0.8" />
      <ellipse cx="150" cy="114" rx="7" ry="4.5" fill="#F0B09A" opacity="0.8" />
    </svg>
  );
}

function Apple() {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <Shadow />
      <path
        d="M140 52c32-2 58 22 64 52 8 40-14 82-64 86s-74-44-66-86c6-32 32-50 66-52Z"
        fill="#F15B4C"
      />
      <ellipse cx="112" cy="96" rx="16" ry="26" fill="#FF8A82" opacity="0.9" />
      <path
        d="M140 58c2-18 12-28 26-34"
        fill="none"
        stroke="#8D5A3B"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path d="M146 40c18-4 32 8 30 20-14 2-26-6-30-20Z" fill="#7DB35A" />
      <path
        d="M150 44c12 4 22 12 26 18"
        fill="none"
        stroke="#5E8E3E"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <ellipse cx="118" cy="112" rx="6.5" ry="8" fill="#2C3A4F" />
      <ellipse cx="162" cy="112" rx="6.5" ry="8" fill="#2C3A4F" />
      <circle cx="120.5" cy="109.5" r="2.2" fill="#fff" />
      <circle cx="164.5" cy="109.5" r="2.2" fill="#fff" />
      <path
        d="M126 134c8 10 22 10 30 0"
        fill="none"
        stroke="#2C3A4F"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <ellipse cx="100" cy="128" rx="9" ry="5.5" fill="#F7A8A4" opacity="0.9" />
      <ellipse cx="180" cy="128" rx="9" ry="5.5" fill="#F7A8A4" opacity="0.9" />
    </svg>
  );
}

export const illustrations = {
  cat: Cat,
  dog: Dog,
  sun: Sun,
  hat: Hat,
  pig: Pig,
  bus: Bus,
  cup: Cup,
  bed: Bed,
  fox: Fox,
  apple: Apple,
};

export type IllustrationName = keyof typeof illustrations;

export function Illustration({ name }: { name: IllustrationName }) {
  const Component = illustrations[name];
  return <Component />;
}
