import type { ReactNode } from "react";

/**
 * Original flat pictures for the sound-unit words of weeks 15 to 26
 * (ship, chick, bee, cake, and so on). Simple geometry made for this app.
 */

const INK = "#2C3A4F";

function Frame({ children, sky = false }: { children: ReactNode; sky?: boolean }) {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      {sky ? <rect x="0" y="0" width="280" height="210" rx="24" fill="#EAF3FA" /> : null}
      <ellipse cx="140" cy="192" rx="72" ry="10" fill="#E7D5C6" opacity="0.7" />
      {children}
    </svg>
  );
}

function Eye({ x, y, r = 4 }: { x: number; y: number; r?: number }) {
  return <circle cx={x} cy={y} r={r} fill={INK} />;
}

export function Ship() {
  return (
    <Frame>
      <path d="M60 130h160l-22 40H82Z" fill="#E07A8A" />
      <rect x="112" y="98" width="56" height="32" rx="6" fill="#F7F1E8" />
      <rect x="130" y="70" width="14" height="28" rx="4" fill="#C9846A" />
      <circle cx="122" cy="114" r="5" fill="#B7D7F2" />
      <circle cx="148" cy="114" r="5" fill="#B7D7F2" />
      <path d="M40 176c20-10 40 10 60 0s40 10 60 0 40 10 60 0" fill="none" stroke="#7FB8DE" strokeWidth="6" strokeLinecap="round" />
    </Frame>
  );
}

export function Shop() {
  return (
    <Frame>
      <rect x="70" y="96" width="140" height="80" rx="8" fill="#F6E3B4" />
      <path d="M60 96h160l-12-28H72Z" fill="#E07A8A" />
      <path d="M72 68h136v14H72Z" fill="#F6C3CB" />
      <rect x="118" y="126" width="44" height="50" rx="4" fill="#C9846A" />
      <rect x="82" y="120" width="26" height="26" rx="4" fill="#B7D7F2" />
      <rect x="172" y="120" width="26" height="26" rx="4" fill="#B7D7F2" />
    </Frame>
  );
}

export function Chick() {
  return (
    <Frame>
      <ellipse cx="140" cy="134" rx="46" ry="38" fill="#F6D56B" />
      <circle cx="148" cy="86" r="30" fill="#F6D56B" />
      <path d="M176 88l20 6-20 8Z" fill="#F09A3A" />
      <Eye x={156} y={80} />
      <path d="M124 170v14M156 170v14" stroke="#F09A3A" strokeWidth="6" strokeLinecap="round" />
      <path d="M100 128c-16 4-22 16-14 26" fill="none" stroke="#E8C24E" strokeWidth="8" strokeLinecap="round" />
    </Frame>
  );
}

export function Chest() {
  return (
    <Frame>
      <rect x="72" y="104" width="136" height="70" rx="8" fill="#C9846A" />
      <path d="M72 104c0-30 136-30 136 0Z" fill="#8D5A3B" />
      <rect x="72" y="118" width="136" height="10" fill="#F2C14E" />
      <rect x="128" y="112" width="24" height="26" rx="4" fill="#F2C14E" />
      <circle cx="140" cy="128" r="4" fill="#8D5A3B" />
    </Frame>
  );
}

export function Moth() {
  return (
    <Frame>
      <ellipse cx="104" cy="112" rx="36" ry="30" fill="#E4D4F2" />
      <ellipse cx="176" cy="112" rx="36" ry="30" fill="#E4D4F2" />
      <ellipse cx="110" cy="146" rx="24" ry="18" fill="#D9C4EA" />
      <ellipse cx="170" cy="146" rx="24" ry="18" fill="#D9C4EA" />
      <ellipse cx="140" cy="128" rx="10" ry="34" fill="#8D7A5A" />
      <path d="M134 96c-8-14-16-18-24-18M146 96c8-14 16-18 24-18" fill="none" stroke="#8D7A5A" strokeWidth="3" strokeLinecap="round" />
      <circle cx="104" cy="110" r="8" fill="#F7F1E8" />
      <circle cx="176" cy="110" r="8" fill="#F7F1E8" />
    </Frame>
  );
}

export function Bath() {
  return (
    <Frame>
      <path d="M62 116h156v30c0 18-12 30-30 30H92c-18 0-30-12-30-30Z" fill="#F7F1E8" />
      <path d="M70 116h140c0 10-4 14-10 14H80c-6 0-10-4-10-14Z" fill="#B7D7F2" />
      <circle cx="112" cy="106" r="8" fill="#F7F1E8" stroke="#B7D7F2" strokeWidth="3" />
      <circle cx="146" cy="100" r="6" fill="#F7F1E8" stroke="#B7D7F2" strokeWidth="3" />
      <path d="M200 116V80c0-8-10-8-14 0" fill="none" stroke="#9AA7B8" strokeWidth="6" strokeLinecap="round" />
      <path d="M92 176v12M188 176v12" stroke="#9AA7B8" strokeWidth="6" strokeLinecap="round" />
    </Frame>
  );
}

export function Ring() {
  return (
    <Frame>
      <circle cx="140" cy="130" r="40" fill="none" stroke="#F2C14E" strokeWidth="14" />
      <path d="M140 60l22 22-22 22-22-22Z" fill="#B7D7F2" />
      <path d="M140 60l22 22h-44Z" fill="#DCEBF8" />
    </Frame>
  );
}

export function Swing() {
  return (
    <Frame>
      <path d="M70 176 100 56h80l30 120" fill="none" stroke="#C9846A" strokeWidth="8" strokeLinecap="round" />
      <path d="M118 62v70M162 62v70" stroke="#9AA7B8" strokeWidth="3" />
      <rect x="104" y="130" width="72" height="12" rx="4" fill="#E07A8A" />
    </Frame>
  );
}

export function Sock() {
  return (
    <Frame>
      <path d="M116 56h48v72c0 22 18 26 30 34 8 6 6 20-8 20h-52c-12 0-18-8-18-20Z" fill="#E07A8A" />
      <rect x="116" y="56" width="48" height="20" rx="4" fill="#F6C3CB" />
      <path d="M120 96h40M120 112h40" stroke="#F6C3CB" strokeWidth="6" strokeLinecap="round" />
    </Frame>
  );
}

export function Bee() {
  return (
    <Frame>
      <ellipse cx="120" cy="88" rx="26" ry="16" fill="#DCEBF8" opacity="0.9" />
      <ellipse cx="160" cy="88" rx="26" ry="16" fill="#DCEBF8" opacity="0.9" />
      <ellipse cx="140" cy="126" rx="46" ry="30" fill="#F6D56B" />
      <path d="M118 100v52M138 96v60M158 100v52" stroke={INK} strokeWidth="9" strokeLinecap="round" />
      <circle cx="96" cy="120" r="20" fill="#F6D56B" />
      <Eye x={90} y={116} />
      <path d="M84 104c-6-10-14-14-20-12" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
    </Frame>
  );
}

export function Feet() {
  return (
    <Frame>
      <path d="M78 100c0-22 14-40 34-40s30 18 28 42c-2 24 6 44-6 66-6 12-22 14-34 6-14-10-22-46-22-74Z" fill="#F6C3A8" />
      <path d="M202 100c0-22-14-40-34-40s-30 18-28 42c2 24-6 44 6 66 6 12 22 14 34 6 14-10 22-46 22-74Z" fill="#F6C3A8" />
      <circle cx="92" cy="54" r="10" fill="#F6C3A8" />
      <circle cx="112" cy="46" r="8" fill="#F6C3A8" />
      <circle cx="130" cy="50" r="7" fill="#F6C3A8" />
      <circle cx="144" cy="58" r="6" fill="#F6C3A8" />
      <circle cx="188" cy="54" r="10" fill="#F6C3A8" />
      <circle cx="168" cy="46" r="8" fill="#F6C3A8" />
      <circle cx="150" cy="50" r="7" fill="#F6C3A8" />
      <circle cx="136" cy="58" r="6" fill="#F6C3A8" />
      <ellipse cx="108" cy="150" rx="18" ry="12" fill="#F3B39A" opacity="0.6" />
      <ellipse cx="172" cy="150" rx="18" ry="12" fill="#F3B39A" opacity="0.6" />
    </Frame>
  );
}

export function Moon() {
  return (
    <Frame sky>
      <path d="M154 56c-40 6-64 44-50 82 12 32 46 46 76 34-30-8-46-40-40-70 4-22 18-38 14-46Z" fill="#F6D56B" />
      <circle cx="80" cy="72" r="4" fill="#F2C14E" />
      <circle cx="216" cy="98" r="3" fill="#F2C14E" />
      <circle cx="200" cy="56" r="4" fill="#F2C14E" />
    </Frame>
  );
}

export function Boot() {
  return (
    <Frame>
      <path d="M104 56h52v70c20 6 40 12 50 24 6 8 2 20-10 20H104Z" fill="#8D5A3B" />
      <rect x="104" y="56" width="52" height="16" rx="4" fill="#C9846A" />
      <path d="M96 176h110c6 0 8-6 4-10H96Z" fill="#5A3E2B" />
      <path d="M118 90h24M118 106h24" stroke="#C9846A" strokeWidth="4" strokeLinecap="round" />
    </Frame>
  );
}

export function Rain() {
  return (
    <Frame sky>
      <ellipse cx="140" cy="86" rx="62" ry="28" fill="#F7F1E8" />
      <circle cx="112" cy="74" r="26" fill="#F7F1E8" />
      <circle cx="160" cy="68" r="30" fill="#F7F1E8" />
      <path d="M100 128l-8 20M130 128l-8 20M160 128l-8 20M190 128l-8 20M116 156l-8 20M146 156l-8 20M176 156l-8 20" stroke="#7FB8DE" strokeWidth="5" strokeLinecap="round" />
    </Frame>
  );
}

export function Snail() {
  return (
    <Frame>
      <path d="M70 168c0-20 30-30 100-30 20 0 34 8 34 20v10H70Z" fill="#8FBF78" />
      <circle cx="120" cy="120" r="46" fill="#E9B170" />
      <circle cx="120" cy="120" r="30" fill="#F6C98C" />
      <circle cx="120" cy="120" r="14" fill="#E9B170" />
      <path d="M186 138c10-14 6-40 12-58M198 138c10-14 6-40 14-56" fill="none" stroke="#8FBF78" strokeWidth="5" strokeLinecap="round" />
      <Eye x={198} y={80} />
      <Eye x={212} y={82} />
    </Frame>
  );
}

export function Day() {
  return (
    <Frame sky>
      <path d="M40 150h200v26H40Z" fill="#8FBF78" />
      <circle cx="140" cy="150" r="46" fill="#F6D56B" />
      <path d="M140 80V60M96 96l-14-14M184 96l14-14M72 132H52M228 132h-20" stroke="#F2C14E" strokeWidth="6" strokeLinecap="round" />
    </Frame>
  );
}

export function Hay() {
  return (
    <Frame>
      <rect x="66" y="90" width="148" height="84" rx="10" fill="#E9C46A" />
      <path d="M80 110h120M80 134h120M80 158h120" stroke="#D9AA45" strokeWidth="4" strokeLinecap="round" />
      <path d="M96 90v84M184 90v84" stroke="#C9846A" strokeWidth="5" />
      <path d="M100 90c10-16 26-20 40-14 14-6 30-2 40 14" fill="none" stroke="#D9AA45" strokeWidth="5" strokeLinecap="round" />
    </Frame>
  );
}

export function Boat() {
  return (
    <Frame>
      <path d="M70 140h140l-16 30H86Z" fill="#C9846A" />
      <path d="M140 56v84" stroke="#8D5A3B" strokeWidth="5" />
      <path d="M146 62l52 72h-52Z" fill="#F7F1E8" />
      <path d="M134 74L96 134h38Z" fill="#E07A8A" />
      <path d="M50 178c20-10 40 10 60 0s40 10 60 0 40 10 60 0" fill="none" stroke="#7FB8DE" strokeWidth="6" strokeLinecap="round" />
    </Frame>
  );
}

export function Light() {
  return (
    <Frame>
      <rect x="60" y="112" width="90" height="36" rx="10" fill="#9AA7B8" />
      <path d="M150 104h30v52h-30Z" fill="#6F7C8E" />
      <path d="M180 100l60-30v120l-60-30Z" fill="#FBE9A6" opacity="0.9" />
      <circle cx="94" cy="130" r="7" fill="#E07A8A" />
    </Frame>
  );
}

export function Night() {
  return (
    <Frame>
      <rect x="20" y="30" width="240" height="140" rx="20" fill="#2F3B5A" />
      <path d="M170 60c-26 4-40 30-30 52 8 20 30 30 50 22-20-6-30-26-26-46 2-14 10-24 6-28Z" fill="#F6D56B" />
      <circle cx="70" cy="70" r="4" fill="#F7F1E8" />
      <circle cx="104" cy="120" r="3" fill="#F7F1E8" />
      <circle cx="220" cy="140" r="3" fill="#F7F1E8" />
      <circle cx="60" cy="130" r="3" fill="#F7F1E8" />
      <circle cx="230" cy="70" r="4" fill="#F7F1E8" />
    </Frame>
  );
}

export function Cake() {
  return (
    <Frame>
      <rect x="70" y="112" width="140" height="60" rx="10" fill="#F6C3CB" />
      <path d="M70 122c20 14 40-14 60 0s40-14 60 0 20 0 20 0v-10H70Z" fill="#F7F1E8" />
      <rect x="136" y="70" width="8" height="42" rx="3" fill="#B7D7F2" />
      <ellipse cx="140" cy="64" rx="7" ry="10" fill="#F6D56B" />
      <circle cx="96" cy="150" r="5" fill="#E07A8A" />
      <circle cx="140" cy="154" r="5" fill="#E07A8A" />
      <circle cx="184" cy="150" r="5" fill="#E07A8A" />
    </Frame>
  );
}

export function Gate() {
  return (
    <Frame>
      <rect x="70" y="80" width="14" height="96" rx="4" fill="#C9846A" />
      <rect x="196" y="80" width="14" height="96" rx="4" fill="#C9846A" />
      <path d="M84 96h112v14H84ZM84 150h112v14H84Z" fill="#E4C7A4" />
      <path d="M104 92v76M128 88v80M152 88v80M176 92v76" stroke="#E4C7A4" strokeWidth="9" strokeLinecap="round" />
    </Frame>
  );
}

export function Kite() {
  return (
    <Frame sky>
      <path d="M140 46l44 52-44 66-44-66Z" fill="#E07A8A" />
      <path d="M140 46l44 52h-44Z" fill="#F6C3CB" />
      <path d="M96 98h88M140 46v118" stroke="#F7F1E8" strokeWidth="3" />
      <path d="M140 164c-6 12 8 18 2 30" fill="none" stroke="#8D5A3B" strokeWidth="3" strokeLinecap="round" />
      <path d="M126 178h12l-6 8ZM150 186h12l-6 8Z" fill="#F6D56B" />
    </Frame>
  );
}

export function Bike() {
  return (
    <Frame>
      <circle cx="88" cy="146" r="30" fill="none" stroke={INK} strokeWidth="6" />
      <circle cx="192" cy="146" r="30" fill="none" stroke={INK} strokeWidth="6" />
      <path d="M88 146l30-56h48l26 56M118 90l40 56M118 90h-12M166 90l-8-20h14" fill="none" stroke="#E07A8A" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="100" y="80" width="30" height="8" rx="4" fill={INK} />
    </Frame>
  );
}

export function Bone() {
  return (
    <Frame>
      <path d="M92 108h96v28H92Z" fill="#F7F1E8" />
      <circle cx="88" cy="106" r="16" fill="#F7F1E8" />
      <circle cx="88" cy="138" r="16" fill="#F7F1E8" />
      <circle cx="192" cy="106" r="16" fill="#F7F1E8" />
      <circle cx="192" cy="138" r="16" fill="#F7F1E8" />
      <path d="M104 122h72" stroke="#E7D5C6" strokeWidth="4" strokeLinecap="round" />
    </Frame>
  );
}

export function Rope() {
  return (
    <Frame>
      <ellipse cx="140" cy="126" rx="60" ry="40" fill="none" stroke="#C9A06A" strokeWidth="14" />
      <ellipse cx="140" cy="126" rx="60" ry="40" fill="none" stroke="#E9C46A" strokeWidth="4" strokeDasharray="10 10" />
      <path d="M196 140c14 12 18 30 12 36" fill="none" stroke="#C9A06A" strokeWidth="14" strokeLinecap="round" />
    </Frame>
  );
}

export function Cube() {
  return (
    <Frame>
      <path d="M96 96l44-22 44 22v56l-44 22-44-22Z" fill="#B7D7F2" />
      <path d="M96 96l44 22 44-22" fill="none" stroke="#7FB8DE" strokeWidth="4" />
      <path d="M140 118v56" stroke="#7FB8DE" strokeWidth="4" />
      <path d="M140 118l44-22v56l-44 22Z" fill="#8FC2E6" />
    </Frame>
  );
}

export function Tune() {
  return (
    <Frame>
      <path d="M110 70v82M170 56v82" stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <path d="M110 70l60-14v18l-60 14Z" fill={INK} />
      <ellipse cx="96" cy="154" rx="18" ry="12" fill="#E07A8A" />
      <ellipse cx="156" cy="140" rx="18" ry="12" fill="#E07A8A" />
    </Frame>
  );
}

export function Car() {
  return (
    <Frame>
      <path d="M60 140h160v22H60Z" fill="#B7D7F2" />
      <path d="M84 140l24-42h64l24 42Z" fill="#7FB8DE" />
      <path d="M110 104h52l14 28H96Z" fill="#EAF3FA" />
      <circle cx="96" cy="164" r="16" fill={INK} />
      <circle cx="184" cy="164" r="16" fill={INK} />
      <circle cx="96" cy="164" r="6" fill="#F7F1E8" />
      <circle cx="184" cy="164" r="6" fill="#F7F1E8" />
    </Frame>
  );
}

export function Jar() {
  return (
    <Frame>
      <rect x="96" y="82" width="88" height="94" rx="18" fill="#DCEBF8" opacity="0.9" />
      <rect x="104" y="60" width="72" height="26" rx="8" fill="#8D5A3B" />
      <path d="M104 120h72v38c0 10-8 18-18 18h-36c-10 0-18-8-18-18Z" fill="#E07A8A" opacity="0.85" />
      <circle cx="122" cy="140" r="6" fill="#F6C3CB" />
      <circle cx="152" cy="152" r="5" fill="#F6C3CB" />
    </Frame>
  );
}

export function Fork() {
  return (
    <Frame>
      <rect x="132" y="96" width="16" height="84" rx="8" fill="#9AA7B8" />
      <path d="M112 50v40c0 14 12 20 28 20s28-6 28-20V50" fill="none" stroke="#9AA7B8" strokeWidth="10" strokeLinecap="round" />
      <path d="M130 50v36M150 50v36" stroke="#9AA7B8" strokeWidth="9" strokeLinecap="round" />
    </Frame>
  );
}

export function Corn() {
  return (
    <Frame>
      <path d="M116 60c0-16 48-16 48 0v96c0 22-48 22-48 0Z" fill="#F6D56B" />
      <path d="M116 100c-24 10-30 40-18 70 12-12 18-30 18-70ZM164 100c24 10 30 40 18 70-12-12-18-30-18-70Z" fill="#8FBF78" />
      <path d="M128 72v84M140 68v92M152 72v84" stroke="#E9C46A" strokeWidth="4" strokeLinecap="round" />
    </Frame>
  );
}

export function Fern() {
  return (
    <Frame>
      <path d="M140 182C128 132 118 96 148 52" fill="none" stroke="#6E9A62" strokeWidth="6" strokeLinecap="round" />
      <path d="M132 166c-26-2-42-14-46-30 20 0 36 10 46 30ZM130 142c-26-2-40-16-40-34 20 2 34 14 40 34ZM130 118c-22-4-32-20-30-38 18 6 28 20 30 38ZM134 94c-16-8-22-22-16-38 14 10 20 24 16 38ZM140 72c-10-10-10-24-2-34 10 10 12 24 2 34ZM144 166c26-2 42-14 46-30-20 0-36 10-46 30ZM144 142c26-2 40-16 40-34-20 2-34 14-40 34ZM144 118c22-4 32-20 30-38-18 6-28 20-30 38ZM146 94c16-8 22-22 16-38-14 10-20 24-16 38Z" fill="#8FBF78" />
      <path d="M132 166c-26-2-42-14-46-30M130 142c-26-2-40-16-40-34M130 118c-22-4-32-20-30-38M134 94c-16-8-22-22-16-38M144 166c26-2 42-14 46-30M144 142c26-2 40-16 40-34M144 118c22-4 32-20 30-38M146 94c16-8 22-22 16-38" fill="none" stroke="#6E9A62" strokeWidth="1.5" strokeLinecap="round" />
    </Frame>
  );
}

export function Bird() {
  return (
    <Frame>
      <ellipse cx="136" cy="126" rx="48" ry="34" fill="#7FB8DE" />
      <circle cx="176" cy="96" r="26" fill="#7FB8DE" />
      <path d="M200 96l22 6-22 8Z" fill="#F09A3A" />
      <Eye x={184} y={90} />
      <path d="M96 116c-26-6-40 10-40 30 22-2 36-14 40-30Z" fill="#5E9BCB" />
      <path d="M120 128c-14 0-22 12-16 24 12-2 20-10 16-24Z" fill="#5E9BCB" />
      <path d="M124 160v18M150 160v18" stroke="#F09A3A" strokeWidth="5" strokeLinecap="round" />
    </Frame>
  );
}

export function Shirt() {
  return (
    <Frame>
      <path d="M100 60h80l40 30-20 24-16-10v72H96v-72l-16 10-20-24Z" fill="#8FBF78" />
      <path d="M118 60c6 14 38 14 44 0" fill="none" stroke="#6E9A62" strokeWidth="5" strokeLinecap="round" />
    </Frame>
  );
}

export function Leaf() {
  return (
    <Frame>
      <path d="M78 150c0-60 60-100 124-96 4 64-36 124-96 124-14 0-28-12-28-28Z" fill="#8FBF78" />
      <path d="M92 164c28-40 60-70 96-96" fill="none" stroke="#6E9A62" strokeWidth="4" strokeLinecap="round" />
      <path d="M92 164c-8 8-14 14-18 18" fill="none" stroke="#6E9A62" strokeWidth="5" strokeLinecap="round" />
    </Frame>
  );
}

export function Seal() {
  return (
    <Frame>
      <path d="M60 128c8-40 44-62 92-58 40 4 66 30 78 60 6 14-2 26-14 22-10-4-16-14-20-24-8 36-40 52-90 44-30-6-50-22-46-44Z" fill="#9AA7B8" />
      <circle cx="82" cy="104" r="34" fill="#9AA7B8" />
      <circle cx="76" cy="110" r="24" fill="#B6C0CE" />
      <Eye x={70} y={96} r={5} />
      <circle cx="58" cy="112" r="6" fill={INK} />
      <path d="M42 116c-8-2-14 0-18 2M42 120c-8 2-14 4-18 8" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <path d="M112 156c-14 6-16 18-8 26M160 158c14 6 16 18 8 26" fill="none" stroke="#8592A4" strokeWidth="10" strokeLinecap="round" />
      <path d="M212 108c12-14 24-12 30-2-8 2-14 8-18 16-6-6-10-10-12-14Z" fill="#8592A4" />
    </Frame>
  );
}

export function Cloud() {
  return (
    <Frame sky>
      <ellipse cx="140" cy="122" rx="70" ry="32" fill="#F7F1E8" />
      <circle cx="108" cy="104" r="30" fill="#F7F1E8" />
      <circle cx="152" cy="92" r="38" fill="#F7F1E8" />
      <circle cx="190" cy="112" r="26" fill="#F7F1E8" />
    </Frame>
  );
}

export function Mouse() {
  return (
    <Frame>
      <ellipse cx="132" cy="140" rx="54" ry="34" fill="#C9C1D9" />
      <circle cx="184" cy="120" r="26" fill="#C9C1D9" />
      <circle cx="172" cy="94" r="14" fill="#E4D4F2" />
      <circle cx="200" cy="96" r="14" fill="#E4D4F2" />
      <Eye x={190} y={116} />
      <circle cx="210" cy="126" r="5" fill="#E07A8A" />
      <path d="M78 148c-24 4-34 20-30 36" fill="none" stroke="#C9C1D9" strokeWidth="5" strokeLinecap="round" />
    </Frame>
  );
}

export function Coin() {
  return (
    <Frame>
      <circle cx="140" cy="118" r="56" fill="#F2C14E" />
      <circle cx="140" cy="118" r="42" fill="none" stroke="#E0A93A" strokeWidth="5" />
      <path d="M140 92l8 16 18 2-13 12 3 18-16-9-16 9 3-18-13-12 18-2Z" fill="#F6D56B" />
    </Frame>
  );
}

export function Whale() {
  return (
    <Frame>
      <path d="M52 130c0-36 40-60 96-60 40 0 70 20 70 50 0 18-14 32-40 32H84c-20 0-32-8-32-22Z" fill="#5E9BCB" />
      <path d="M210 110c16-16 30-16 40-6-12 4-18 12-20 22-8-8-14-12-20-16Z" fill="#5E9BCB" />
      <path d="M80 152h130c-8 12-24 18-50 18H96c-10 0-16-8-16-18Z" fill="#DCEBF8" />
      <Eye x={92} y={112} />
      <path d="M120 66c0-16 6-24 6-24s6 8 6 24M120 66c-8-8-8-20-2-26M132 66c8-8 8-20 2-26" fill="none" stroke="#7FB8DE" strokeWidth="4" strokeLinecap="round" />
    </Frame>
  );
}

export function Wheel() {
  return (
    <Frame>
      <circle cx="140" cy="120" r="60" fill={INK} />
      <circle cx="140" cy="120" r="44" fill="#F7F1E8" />
      <circle cx="140" cy="120" r="10" fill={INK} />
      <path d="M140 76v88M96 120h88M109 89l62 62M171 89l-62 62" stroke={INK} strokeWidth="5" strokeLinecap="round" />
    </Frame>
  );
}

export function Thumb() {
  return (
    <Frame>
      <path d="M100 118h24v58h-24Z" fill="#F6C3A8" />
      <path d="M124 118c0-20 10-40 18-56 6-10 20-6 18 8l-6 30h36c12 0 14 16 4 20 8 4 6 18-4 18 8 4 4 18-6 18 6 6 0 18-10 18h-50Z" fill="#F6C3A8" />
    </Frame>
  );
}

export const unitScenes = {
  ship: Ship,
  shop: Shop,
  chick: Chick,
  chest: Chest,
  moth: Moth,
  bath: Bath,
  thumb: Thumb,
  ring: Ring,
  swing: Swing,
  sock: Sock,
  bee: Bee,
  feet: Feet,
  moon: Moon,
  boot: Boot,
  rain: Rain,
  snail: Snail,
  day: Day,
  hay: Hay,
  boat: Boat,
  light: Light,
  night: Night,
  cake: Cake,
  gate: Gate,
  kite: Kite,
  bike: Bike,
  bone: Bone,
  rope: Rope,
  cube: Cube,
  tune: Tune,
  car: Car,
  jar: Jar,
  fork: Fork,
  corn: Corn,
  fern: Fern,
  bird: Bird,
  shirt: Shirt,
  leaf: Leaf,
  seal: Seal,
  cloud: Cloud,
  mouse: Mouse,
  coin: Coin,
  whale: Whale,
  wheel: Wheel,
};
