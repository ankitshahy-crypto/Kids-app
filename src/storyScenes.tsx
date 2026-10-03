import type { ReactNode } from "react";

/**
 * Pictures for things the stories name that had no drawing.
 *
 * Why this file exists: a story page showed a different thing from the one
 * its words name. "The vet has a plum" showed grapes, "Vic is a yak" showed a
 * group of farm animals, "three sheep" showed a hen, "a pink mask" showed a
 * box, the bee's tree was a leaf, and the owl on the roof was a night sky. A
 * child matching the word to the picture learns the wrong word. These are the
 * missing drawings; src/data/stories.ts now points each page at its own.
 *
 * Same style as letterScenes.tsx: flat shapes in a 280 by 210 box, made for this app.
 */

const INK = "#2C3A4F";

function Frame({ children }: { children: ReactNode }) {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <ellipse cx="140" cy="192" rx="72" ry="10" fill="#E7D5C6" opacity="0.7" />
      {children}
    </svg>
  );
}

function Eye({ x, y, r = 4 }: { x: number; y: number; r?: number }) {
  return <circle cx={x} cy={y} r={r} fill={INK} />;
}

/** A party mask on a stick. */
export function MaskScene() {
  return (
    <Frame>
      <path d="M214 122l26 62" fill="none" stroke="#C9A27A" strokeWidth="8" strokeLinecap="round" />
      <path
        d="M48 100c0-34 40-46 92-28 52-18 92-6 92 28 0 36-32 56-60 46-14-5-22-18-32-18s-18 13-32 18c-28 10-60-10-60-46Z"
        fill="#F29BB4"
      />
      <path d="M48 100c0-34 40-46 92-28 52-18 92-6 92 28" fill="none" stroke="#E07A9A" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="100" cy="104" rx="22" ry="15" fill="#FFF6EA" />
      <ellipse cx="180" cy="104" rx="22" ry="15" fill="#FFF6EA" />
      <circle cx="60" cy="84" r="5" fill="#F6D56B" />
      <circle cx="220" cy="84" r="5" fill="#F6D56B" />
      <circle cx="140" cy="86" r="5" fill="#F6D56B" />
    </Frame>
  );
}

/** One purple plum with a leaf. */
export function PlumScene() {
  return (
    <Frame>
      <path d="M140 60c36-4 66 22 66 60 0 40-30 66-66 66s-66-26-66-66c0-38 30-64 66-60Z" fill="#7E5AA8" />
      <path d="M140 62c-6 34-6 88 0 122" fill="none" stroke="#6A4A93" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="108" cy="104" rx="14" ry="22" fill="#A98BCB" opacity="0.8" />
      <path d="M140 62c2-16 8-26 18-34" fill="none" stroke="#8D5A3B" strokeWidth="6" strokeLinecap="round" />
      <path d="M152 40c18-10 38-4 44 12-18 8-36 4-44-12Z" fill="#7DB35A" />
    </Frame>
  );
}

/** A yak: a shaggy brown animal with long hair and curved horns. */
export function YakScene() {
  return (
    <Frame>
      <rect x="92" y="150" width="16" height="36" rx="6" fill="#5E4433" />
      <rect x="122" y="152" width="16" height="34" rx="6" fill="#5E4433" />
      <rect x="170" y="152" width="16" height="34" rx="6" fill="#5E4433" />
      <rect x="198" y="150" width="16" height="36" rx="6" fill="#5E4433" />
      <path d="M228 110c14 6 18 26 10 44" fill="none" stroke="#5E4433" strokeWidth="8" strokeLinecap="round" />
      <path d="M78 96c10-36 54-46 96-40 40 6 62 30 60 62-2 22-10 34-18 40l-8-12-10 16-10-14-10 16-10-14-10 16-10-14-10 16-10-14-10 16-10-14-8 10c-16-18-20-48-12-70Z" fill="#7A5A43" />
      <path d="M96 70c18-14 44-18 70-14" fill="none" stroke="#8F6E55" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="74" cy="110" rx="34" ry="32" fill="#8F6E55" />
      <path d="M52 86c-18-6-28-22-22-40 8 14 18 22 32 26Z" fill="#F4E7D2" stroke="#D9C4A4" strokeWidth="3" strokeLinejoin="round" />
      <path d="M96 86c18-6 28-22 22-40-8 14-18 22-32 26Z" fill="#F4E7D2" stroke="#D9C4A4" strokeWidth="3" strokeLinejoin="round" />
      <path d="M50 92c8-12 40-12 48 0l-8 6-8-6-8 6-8-6-8 6Z" fill="#5E4433" />
      <ellipse cx="72" cy="128" rx="18" ry="12" fill="#C9A98C" />
      <Eye x={60} y={108} />
      <Eye x={88} y={108} />
      <circle cx="66" cy="128" r="2.5" fill={INK} />
      <circle cx="78" cy="128" r="2.5" fill={INK} />
    </Frame>
  );
}

/** A tree: a trunk and a round green top. */
export function TreeScene() {
  return (
    <Frame>
      <path d="M126 186c4-28 4-52 0-76h28c-4 24-4 48 0 76Z" fill="#9A6B4A" />
      <path d="M140 128c-10-8-18-10-28-10M140 140c10-8 18-10 26-10" fill="none" stroke="#7E5538" strokeWidth="5" strokeLinecap="round" />
      <circle cx="98" cy="92" r="38" fill="#79B98C" />
      <circle cx="182" cy="92" r="38" fill="#79B98C" />
      <circle cx="140" cy="62" r="44" fill="#8FCB9E" />
      <circle cx="140" cy="104" r="34" fill="#79B98C" />
      <circle cx="116" cy="56" r="6" fill="#B5E0BF" />
      <circle cx="166" cy="78" r="5" fill="#B5E0BF" />
    </Frame>
  );
}

/** A sheep: a woolly white body, a dark face and legs. */
export function SheepScene() {
  return (
    <Frame>
      <rect x="104" y="148" width="12" height="38" rx="5" fill="#4B4A55" />
      <rect x="128" y="150" width="12" height="36" rx="5" fill="#4B4A55" />
      <rect x="164" y="150" width="12" height="36" rx="5" fill="#4B4A55" />
      <rect x="188" y="148" width="12" height="38" rx="5" fill="#4B4A55" />
      <g fill="#FBF7F0" stroke="#D8D2C8" strokeWidth="3">
        <circle cx="112" cy="126" r="28" />
        <circle cx="150" cy="134" r="30" />
        <circle cx="192" cy="124" r="28" />
        <circle cx="128" cy="96" r="28" />
        <circle cx="172" cy="94" r="30" />
      </g>
      <ellipse cx="150" cy="116" rx="44" ry="30" fill="#FBF7F0" />
      <ellipse cx="78" cy="104" rx="26" ry="30" fill="#4B4A55" />
      <ellipse cx="52" cy="90" rx="12" ry="7" fill="#4B4A55" transform="rotate(-24 52 90)" />
      <ellipse cx="102" cy="88" rx="12" ry="7" fill="#4B4A55" transform="rotate(24 102 88)" />
      <circle cx="78" cy="78" r="14" fill="#FBF7F0" stroke="#D8D2C8" strokeWidth="3" />
      <circle cx="68" cy="102" r="5" fill="#FFFDFB" />
      <circle cx="88" cy="102" r="5" fill="#FFFDFB" />
      <Eye x={68} y={103} r={2.6} />
      <Eye x={88} y={103} r={2.6} />
      <path d="M72 120c4 4 8 4 12 0" fill="none" stroke="#FFFDFB" strokeWidth="2.6" strokeLinecap="round" />
    </Frame>
  );
}

/** An owl on a branch. */
export function OwlScene() {
  return (
    <Frame>
      <path d="M40 170h200" fill="none" stroke="#9A6B4A" strokeWidth="12" strokeLinecap="round" />
      <path d="M214 170c10-10 22-12 30-8" fill="none" stroke="#9A6B4A" strokeWidth="6" strokeLinecap="round" />
      <path d="M140 34c44 0 66 34 66 78 0 34-28 56-66 56s-66-22-66-56c0-44 22-78 66-78Z" fill="#A9825F" />
      <path d="M92 52 84 26l30 14ZM188 52l8-26-30 14Z" fill="#8C6746" />
      <path d="M140 92c18 0 34 22 34 46 0 18-14 30-34 30s-34-12-34-30c0-24 16-46 34-46Z" fill="#F1DFC3" />
      <path d="M124 122l6 6 6-6M146 122l6 6 6-6M134 140l6 6 6-6" fill="none" stroke="#C9A77C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="114" cy="78" r="24" fill="#FFFDFB" stroke="#8C6746" strokeWidth="4" />
      <circle cx="166" cy="78" r="24" fill="#FFFDFB" stroke="#8C6746" strokeWidth="4" />
      <Eye x={114} y={78} r={10} />
      <Eye x={166} y={78} r={10} />
      <circle cx="118" cy="74" r="3.4" fill="#FFFDFB" />
      <circle cx="170" cy="74" r="3.4" fill="#FFFDFB" />
      <path d="M140 90l-9 12h18Z" fill="#F0A23C" />
      <path d="M76 104c-10 20-8 40 4 54 6-18 6-36-4-54ZM204 104c10 20 8 40-4 54-6-18-6-36 4-54Z" fill="#8C6746" />
      <path d="M118 166v10M130 168v8M150 168v8M162 166v10" fill="none" stroke="#F0A23C" strokeWidth="5" strokeLinecap="round" />
    </Frame>
  );
}

/** A yam: a long orange-brown root with tapered ends. */
export function YamScene() {
  return (
    <Frame>
      <path d="M36 150c14-34 54-66 104-74 44-8 84 4 104 24-10 34-50 62-100 70-46 8-88-2-108-20Z" fill="#C97B4A" />
      <path d="M52 146c18-26 50-48 90-56" fill="none" stroke="#E0A070" strokeWidth="8" strokeLinecap="round" opacity="0.8" />
      <path d="M36 150c-8 2-14 6-18 12M244 100c8-4 14-10 16-18" fill="none" stroke="#A8623A" strokeWidth="5" strokeLinecap="round" />
      <path d="M96 132l10 6M134 112l10 8M172 126l10 4M150 150l10 4M198 106l8 6" fill="none" stroke="#A8623A" strokeWidth="4" strokeLinecap="round" />
    </Frame>
  );
}

/** A tall tower of blocks, leaning a little: one more and it tips. */
export function TowerScene() {
  const block = (x: number, y: number, fill: string, turn: number) => (
    <rect x={x} y={y} width="56" height="30" rx="6" fill={fill} stroke="#E4C7A4" strokeWidth="3" transform={`rotate(${turn} ${x + 28} ${y + 15})`} />
  );
  return (
    <Frame>
      {block(112, 154, "#C9E6D4", 0)}
      {block(114, 124, "#F7F1E8", 1)}
      {block(110, 94, "#F6C3CB", -2)}
      {block(116, 64, "#CFE0F5", 3)}
      {block(120, 34, "#F6D56B", 6)}
    </Frame>
  );
}

/** The tower after it fell: blocks on the floor, every which way. */
export function TumbleScene() {
  const block = (x: number, y: number, fill: string, turn: number) => (
    <rect x={x} y={y} width="56" height="30" rx="6" fill={fill} stroke="#E4C7A4" strokeWidth="3" transform={`rotate(${turn} ${x + 28} ${y + 15})`} />
  );
  return (
    <Frame>
      {block(40, 150, "#C9E6D4", -8)}
      {block(104, 154, "#F7F1E8", 0)}
      {block(170, 148, "#F6C3CB", 14)}
      {block(78, 118, "#CFE0F5", 32)}
      {block(150, 112, "#F6D56B", -24)}
    </Frame>
  );
}

export const storyScenes = {
  tower: TowerScene,
  tumble: TumbleScene,
  mask: MaskScene,
  plum: PlumScene,
  yak: YakScene,
  tree: TreeScene,
  sheep: SheepScene,
  owl: OwlScene,
  yam: YamScene,
};
