/**
 * Original flat pictograms for the interest themes: one icon per theme (also
 * the counting object) and the themed words a child can blend. Simple geometry
 * in the app's pastel palette, drawn for this app.
 */

function Shadow() {
  return <ellipse cx="140" cy="192" rx="72" ry="10" fill="#E7D5C6" opacity="0.7" />;
}

function Eye({ x, y }: { x: number; y: number }) {
  return (
    <>
      <circle cx={x} cy={y} r="6" fill="#2C3A4F" />
      <circle cx={x + 2} cy={y - 2} r="2" fill="#fff" />
    </>
  );
}

export function Dinosaur() {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <Shadow />
      <path d="M40 150c20-60 70-70 110-56 30 10 40 40 44 72H70c-14 0-30-6-30-16Z" fill="#9BD1A8" />
      <path d="M150 96c14-30 44-30 60-18 18 12 22 36 12 52-16-4-40-8-72-34Z" fill="#9BD1A8" />
      <path d="M30 150c-12-18-24-14-26 6 8-4 16-4 26-6Z" fill="#9BD1A8" />
      <path d="M96 94 108 66l12 30M124 92l12-28 12 28M152 92l10-22 8 22" fill="#79B98C" />
      <circle cx="98" cy="166" r="10" fill="#79B98C" />
      <circle cx="136" cy="168" r="9" fill="#79B98C" />
      <Eye x={196} y={96} />
      <path d="M204 112c10 2 18 0 24-4" fill="none" stroke="#2C3A4F" strokeWidth="3" strokeLinecap="round" />
      <rect x="96" y="150" width="20" height="30" rx="8" fill="#79B98C" />
      <rect x="150" y="150" width="20" height="30" rx="8" fill="#79B98C" />
    </svg>
  );
}

export function Truck() {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <Shadow />
      <rect x="30" y="86" width="140" height="78" rx="12" fill="#F4A261" />
      <path d="M170 106h44l26 28v30h-70Z" fill="#F6B07A" />
      <rect x="182" y="112" width="30" height="22" rx="6" fill="#DDEFF6" />
      <rect x="44" y="100" width="112" height="46" rx="8" fill="#FFF1E0" />
      <circle cx="80" cy="168" r="20" fill="#2C3A4F" />
      <circle cx="80" cy="168" r="8" fill="#DDEFF6" />
      <circle cx="200" cy="168" r="20" fill="#2C3A4F" />
      <circle cx="200" cy="168" r="8" fill="#DDEFF6" />
      <circle cx="238" cy="150" r="6" fill="#F7D774" />
    </svg>
  );
}

export function Rocket() {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <Shadow />
      <path d="M140 24c34 30 44 80 30 130h-60C96 104 106 54 140 24Z" fill="#F6C3CB" />
      <path d="M110 120c-20 10-30 30-32 50 16-6 28-10 40-12ZM170 120c20 10 30 30 32 50-16-6-28-10-40-12Z" fill="#E07A8A" />
      <circle cx="140" cy="86" r="18" fill="#DDEFF6" />
      <circle cx="140" cy="86" r="9" fill="#BFE0F5" />
      <path d="M120 154h40l-8 26h-24Z" fill="#F7D774" />
      <path d="M128 180h24l-12 22Z" fill="#F4A261" />
      <circle cx="46" cy="50" r="4" fill="#F7D774" />
      <circle cx="232" cy="70" r="5" fill="#F7D774" />
      <circle cx="220" cy="28" r="3" fill="#F7D774" />
    </svg>
  );
}

export function Paw() {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <Shadow />
      <ellipse cx="140" cy="140" rx="46" ry="38" fill="#C9A27A" />
      <ellipse cx="90" cy="92" rx="18" ry="22" fill="#C9A27A" />
      <ellipse cx="124" cy="66" rx="18" ry="22" fill="#C9A27A" />
      <ellipse cx="158" cy="66" rx="18" ry="22" fill="#C9A27A" />
      <ellipse cx="192" cy="92" rx="18" ry="22" fill="#C9A27A" />
    </svg>
  );
}

export function Ladybug() {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <Shadow />
      <circle cx="140" cy="74" r="26" fill="#2C3A4F" />
      <path d="M118 52c-6-14-16-20-26-22M162 52c6-14 16-20 26-22" fill="none" stroke="#2C3A4F" strokeWidth="4" strokeLinecap="round" />
      <path d="M70 118a70 62 0 0 1 140 0v10a70 62 0 0 1-140 0Z" fill="#E07A8A" />
      <path d="M140 66v122" stroke="#2C3A4F" strokeWidth="4" />
      <circle cx="108" cy="110" r="10" fill="#2C3A4F" />
      <circle cx="172" cy="110" r="10" fill="#2C3A4F" />
      <circle cx="118" cy="150" r="8" fill="#2C3A4F" />
      <circle cx="162" cy="150" r="8" fill="#2C3A4F" />
      <circle cx="132" cy="70" r="3" fill="#fff" />
      <circle cx="148" cy="70" r="3" fill="#fff" />
    </svg>
  );
}

export function Crown() {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <Shadow />
      <path d="M60 156 48 70l44 40 48-56 48 56 44-40-12 86Z" fill="#F7D774" />
      <rect x="56" y="150" width="168" height="26" rx="8" fill="#F4A261" />
      <circle cx="92" cy="110" r="8" fill="#E07A8A" />
      <circle cx="140" cy="98" r="9" fill="#BFE0F5" />
      <circle cx="188" cy="110" r="8" fill="#9BD1A8" />
      <circle cx="48" cy="70" r="6" fill="#F7D774" />
      <circle cx="232" cy="70" r="6" fill="#F7D774" />
      <circle cx="140" cy="54" r="6" fill="#F7D774" />
    </svg>
  );
}

export function Egg() {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <Shadow />
      <path d="M40 176c30-12 60-12 100-4 40 8 70 8 100-2-20 30-70 34-100 30-30 4-80 0-100-24Z" fill="#9BD1A8" />
      <path d="M140 30c36 0 60 46 60 90 0 32-26 52-60 52s-60-20-60-52c0-44 24-90 60-90Z" fill="#FFF1E0" />
      <circle cx="120" cy="90" r="10" fill="#BFE0F5" />
      <circle cx="160" cy="120" r="8" fill="#F6C3CB" />
      <circle cx="146" cy="70" r="6" fill="#9BD1A8" />
    </svg>
  );
}

export function Dig() {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <Shadow />
      <path d="M24 170c40-30 90-30 130-10 40 20 70 20 102 6v24H24Z" fill="#C9A27A" />
      <rect x="130" y="34" width="14" height="96" rx="6" fill="#A67B5B" transform="rotate(24 137 82)" />
      <path d="M156 118c30 6 44 30 40 58-30-2-54-16-64-42Z" fill="#8FA9B8" />
      <path d="M92 150c10-14 30-14 40 0 6 12-4 24-20 24s-26-12-20-24Z" fill="#FFF1E0" />
      <circle cx="100" cy="150" r="5" fill="#2C3A4F" />
      <circle cx="120" cy="150" r="5" fill="#2C3A4F" />
    </svg>
  );
}

export function Van() {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <Shadow />
      <path d="M40 160V96c0-10 8-18 18-18h120l52 34v48Z" fill="#BFE0F5" />
      <rect x="58" y="92" width="52" height="34" rx="6" fill="#FFF1E0" />
      <rect x="124" y="92" width="48" height="34" rx="6" fill="#FFF1E0" />
      <circle cx="84" cy="166" r="18" fill="#2C3A4F" />
      <circle cx="84" cy="166" r="7" fill="#DDEFF6" />
      <circle cx="196" cy="166" r="18" fill="#2C3A4F" />
      <circle cx="196" cy="166" r="7" fill="#DDEFF6" />
    </svg>
  );
}

export function Jet() {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <Shadow />
      <path d="M30 118c60-24 130-30 214-14-10 22-40 34-90 36H56c-14 0-26-8-26-22Z" fill="#DDEFF6" />
      <path d="M120 96 96 50h30l30 46Z" fill="#BFE0F5" />
      <path d="M120 140 96 170h30l30-30Z" fill="#BFE0F5" />
      <circle cx="176" cy="116" r="8" fill="#2C3A4F" />
      <circle cx="146" cy="118" r="8" fill="#2C3A4F" />
      <path d="M244 104c18-6 26 4 20 16-8-2-14-4-20-16Z" fill="#E07A8A" />
    </svg>
  );
}

export function Cab() {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <Shadow />
      <path d="M46 156V116c0-8 6-14 14-14h30l24-30h64l24 30h30c8 0 14 6 14 14v40Z" fill="#F7D774" />
      <path d="M100 102l18-22h48l18 22Z" fill="#DDEFF6" />
      <rect x="118" y="54" width="44" height="18" rx="6" fill="#2C3A4F" />
      <circle cx="90" cy="162" r="18" fill="#2C3A4F" />
      <circle cx="90" cy="162" r="7" fill="#DDEFF6" />
      <circle cx="190" cy="162" r="18" fill="#2C3A4F" />
      <circle cx="190" cy="162" r="7" fill="#DDEFF6" />
    </svg>
  );
}

export function Star() {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <Shadow />
      <path d="M140 30l24 56 60 6-46 40 14 60-52-32-52 32 14-60-46-40 60-6Z" fill="#F7D774" />
      <circle cx="48" cy="56" r="4" fill="#BFE0F5" />
      <circle cx="232" cy="40" r="5" fill="#BFE0F5" />
      <circle cx="220" cy="150" r="3" fill="#BFE0F5" />
    </svg>
  );
}

export function Hen() {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <Shadow />
      <ellipse cx="140" cy="140" rx="64" ry="44" fill="#FFF1E0" />
      <path d="M80 130c-24-4-40 8-44 22 16 0 30-8 44-22Z" fill="#F4A261" />
      <circle cx="184" cy="92" r="30" fill="#FFF1E0" />
      <path d="M170 62c6-16 22-16 26 0-8 2-16 2-26 0Z" fill="#E07A8A" />
      <path d="M212 92l22 8-22 8Z" fill="#F4A261" />
      <Eye x={190} y={88} />
      <path d="M120 184v14M156 184v14" stroke="#F4A261" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

export function Cub() {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <Shadow />
      <ellipse cx="140" cy="150" rx="60" ry="36" fill="#C9A27A" />
      <circle cx="140" cy="94" r="46" fill="#C9A27A" />
      <circle cx="104" cy="60" r="16" fill="#C9A27A" />
      <circle cx="176" cy="60" r="16" fill="#C9A27A" />
      <circle cx="104" cy="60" r="8" fill="#E7C7A6" />
      <circle cx="176" cy="60" r="8" fill="#E7C7A6" />
      <ellipse cx="140" cy="112" rx="22" ry="16" fill="#E7C7A6" />
      <circle cx="140" cy="106" r="7" fill="#2C3A4F" />
      <Eye x={122} y={88} />
      <Eye x={158} y={88} />
    </svg>
  );
}

export function Bug() {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <Shadow />
      <ellipse cx="140" cy="120" rx="52" ry="60" fill="#9BD1A8" />
      <circle cx="140" cy="54" r="24" fill="#79B98C" />
      <path d="M124 36c-8-14-18-18-28-16M156 36c8-14 18-18 28-16" fill="none" stroke="#2C3A4F" strokeWidth="4" strokeLinecap="round" />
      <path d="M88 100c-18 4-30 14-36 26M88 130c-18 2-30 10-38 22M192 100c18 4 30 14 36 26M192 130c18 2 30 10 38 22" fill="none" stroke="#2C3A4F" strokeWidth="4" strokeLinecap="round" />
      <path d="M140 66v110" stroke="#79B98C" strokeWidth="4" />
      <Eye x={132} y={52} />
      <Eye x={148} y={52} />
    </svg>
  );
}

export function Web() {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <Shadow />
      <g fill="none" stroke="#8FA9B8" strokeWidth="3" strokeLinecap="round">
        <path d="M140 30v150M60 60l160 90M220 60 60 150M40 105h200" />
        <path d="M110 60c20 10 40 10 60 0M92 84c30 22 66 22 96 0M76 108c40 32 88 32 128 0M92 132c30 22 66 22 96 0" />
      </g>
      <circle cx="176" cy="126" r="12" fill="#2C3A4F" />
      <circle cx="176" cy="112" r="8" fill="#2C3A4F" />
      <circle cx="173" cy="110" r="2" fill="#fff" />
      <circle cx="179" cy="110" r="2" fill="#fff" />
    </svg>
  );
}

export function Wasp() {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <Shadow />
      <ellipse cx="150" cy="128" rx="58" ry="34" fill="#F7D774" />
      <path d="M118 96v64M144 94v68M170 98v60" stroke="#2C3A4F" strokeWidth="10" />
      <ellipse cx="128" cy="78" rx="40" ry="20" fill="#DDEFF6" opacity="0.9" />
      <ellipse cx="176" cy="78" rx="40" ry="20" fill="#DDEFF6" opacity="0.9" />
      <circle cx="84" cy="120" r="22" fill="#2C3A4F" />
      <circle cx="78" cy="116" r="4" fill="#fff" />
      <path d="M208 130l30 6" stroke="#2C3A4F" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function Crab() {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <Shadow />
      <ellipse cx="140" cy="130" rx="60" ry="40" fill="#E07A8A" />
      <path d="M84 116c-24-6-40 6-44 22 14-2 26-8 44-22ZM196 116c24-6 40 6 44 22-14-2-26-8-44-22Z" fill="#E07A8A" />
      <circle cx="56" cy="92" r="16" fill="#E07A8A" />
      <circle cx="224" cy="92" r="16" fill="#E07A8A" />
      <path d="M100 160l-14 22M126 168l-6 26M154 168l6 26M180 160l14 22" stroke="#E07A8A" strokeWidth="8" strokeLinecap="round" />
      <path d="M120 100v-18M160 100v-18" stroke="#2C3A4F" strokeWidth="5" strokeLinecap="round" />
      <Eye x={120} y={80} />
      <Eye x={160} y={80} />
    </svg>
  );
}

export function Sub() {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <Shadow />
      <rect x="20" y="40" width="240" height="140" rx="20" fill="#BFE0F5" opacity="0.6" />
      <ellipse cx="140" cy="126" rx="80" ry="36" fill="#F7D774" />
      <rect x="120" y="70" width="40" height="30" rx="8" fill="#F4A261" />
      <rect x="138" y="46" width="6" height="26" rx="3" fill="#2C3A4F" />
      <circle cx="104" cy="126" r="10" fill="#DDEFF6" />
      <circle cx="140" cy="126" r="10" fill="#DDEFF6" />
      <circle cx="176" cy="126" r="10" fill="#DDEFF6" />
      <path d="M220 126l26-16v32Z" fill="#F4A261" />
      <circle cx="60" cy="70" r="5" fill="#fff" opacity="0.8" />
      <circle cx="72" cy="56" r="3" fill="#fff" opacity="0.8" />
    </svg>
  );
}

export function Flag() {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <Shadow />
      <rect x="72" y="120" width="136" height="60" rx="6" fill="#DDEFF6" />
      <rect x="72" y="104" width="24" height="18" fill="#DDEFF6" />
      <rect x="128" y="104" width="24" height="18" fill="#DDEFF6" />
      <rect x="184" y="104" width="24" height="18" fill="#DDEFF6" />
      <path d="M124 180v-30a16 16 0 0 1 32 0v30Z" fill="#A67B5B" />
      <rect x="136" y="28" width="6" height="80" rx="3" fill="#2C3A4F" />
      <path d="M142 32h64l-16 20 16 20h-64Z" fill="#E07A8A" />
    </svg>
  );
}

export function Gem() {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <Shadow />
      <path d="M92 60h96l40 50-88 84-88-84Z" fill="#BFE0F5" />
      <path d="M92 60l48 134-88-84Z" fill="#9CCBEB" />
      <path d="M188 60l-48 134 88-84Z" fill="#DDEFF6" />
      <path d="M52 110h176" stroke="#fff" strokeWidth="4" opacity="0.7" />
      <path d="M92 60l48 50 48-50" fill="none" stroke="#fff" strokeWidth="4" opacity="0.7" />
    </svg>
  );
}

export const themeArt = {
  dinosaurs: Dinosaur,
  vehicles: Truck,
  space: Rocket,
  animals: Paw,
  bugs: Ladybug,
  castles: Crown,
  egg: Egg,
  dig: Dig,
  van: Van,
  jet: Jet,
  cab: Cab,
  star: Star,
  hen: Hen,
  cub: Cub,
  bug: Bug,
  web: Web,
  wasp: Wasp,
  crab: Crab,
  sub: Sub,
  flag: Flag,
  gem: Gem,
};
