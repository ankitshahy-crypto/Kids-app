import type { ReactNode } from "react";

/**
 * Pictures added after the first phone test of the pilot build.
 *
 * Why this file exists: every letter card and every picture word must show a
 * drawing of the word that is spoken. Before, twelve letter cards had no
 * picture at all, the short vowels borrowed a consonant's picture (i and p
 * both showed a pig), and several words showed a different thing ("pin" drew
 * a toy, "net" drew a nest). These are the missing drawings: the six letter
 * words that had none (igloo, octopus, umbrella, yo-yo, zebra, queen) and the
 * early blending words a child meets in the first weeks.
 *
 * Same style as unitScenes.tsx: flat shapes in a 280 by 210 box, made for this app.
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

export function Igloo() {
  return (
    <Frame>
      <rect x="36" y="170" width="208" height="14" rx="7" fill="#DCEBF8" />
      <path d="M52 176a88 88 0 0 1 176 0Z" fill="#F4F9FD" stroke="#A9CBE8" strokeWidth="4" strokeLinejoin="round" />
      <path
        d="M62 142h156M82 110h116M140 89v21M110 110v32M170 110v32M86 142v34M194 142v34"
        fill="none"
        stroke="#A9CBE8"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M114 176v-28a26 26 0 0 1 52 0v28Z" fill="#5E7A99" />
      <path d="M106 176v-30a34 34 0 0 1 68 0v30" fill="none" stroke="#A9CBE8" strokeWidth="4" />
    </Frame>
  );
}

export function Octopus() {
  const arm = { fill: "none", stroke: "#E58FA6", strokeWidth: 15, strokeLinecap: "round" as const };
  return (
    <Frame>
      <path d="M92 136c-14 14-34 10-40 28" {...arm} />
      <path d="M110 146c-6 18-22 20-22 38" {...arm} />
      <path d="M130 150c-2 16-8 24-4 38" {...arm} />
      <path d="M150 150c2 16 8 24 4 38" {...arm} />
      <path d="M170 146c6 18 22 20 22 38" {...arm} />
      <path d="M188 136c14 14 34 10 40 28" {...arm} />
      <path d="M140 34c-42 0-68 30-68 66 0 26 16 46 40 54h56c24-8 40-28 40-54 0-36-26-66-68-66Z" fill="#E58FA6" />
      <circle cx="120" cy="98" r="13" fill="#FFFDFB" />
      <circle cx="160" cy="98" r="13" fill="#FFFDFB" />
      <Eye x={122} y={100} r={6} />
      <Eye x={158} y={100} r={6} />
      <path d="M126 124c8 8 20 8 28 0" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <circle cx="100" cy="116" r="8" fill="#F4B6C6" />
      <circle cx="180" cy="116" r="8" fill="#F4B6C6" />
    </Frame>
  );
}

export function Umbrella() {
  return (
    <Frame>
      <path d="M140 22v14" stroke="#8B5E3C" strokeWidth="7" strokeLinecap="round" />
      <path d="M140 110v56a16 16 0 0 1-32 0" fill="none" stroke="#8B5E3C" strokeWidth="8" strokeLinecap="round" />
      <path
        d="M40 116a100 84 0 0 1 200 0q-17-18-33 0q-17-18-34 0q-16-18-33 0q-17-18-34 0q-16-18-33 0q-17-18-33 0Z"
        fill="#E07A8A"
      />
      <path d="M140 34c-24 20-34 50-34 82M140 34c24 20 34 50 34 82" fill="none" stroke="#C96478" strokeWidth="4" strokeLinecap="round" />
    </Frame>
  );
}

export function Yoyo() {
  return (
    <Frame>
      <ellipse cx="140" cy="22" rx="11" ry="9" fill="none" stroke="#8B7355" strokeWidth="5" />
      <path d="M140 31v52" stroke="#8B7355" strokeWidth="5" strokeLinecap="round" />
      <circle cx="140" cy="130" r="52" fill="#5E9BCB" />
      <circle cx="140" cy="130" r="35" fill="#F6D56B" />
      <circle cx="140" cy="130" r="13" fill="#E07A8A" />
      <path d="M104 100c8-10 18-16 30-18" fill="none" stroke="#DCEBF8" strokeWidth="6" strokeLinecap="round" opacity="0.8" />
    </Frame>
  );
}

export function Zebra() {
  const stripe = { fill: "none", stroke: INK, strokeWidth: 7, strokeLinecap: "round" as const };
  return (
    <Frame>
      <path d="M62 112c-14 8-16 28-10 44" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <rect x="78" y="134" width="16" height="50" rx="7" fill="#FFFDFB" stroke={INK} strokeWidth="3" />
      <rect x="102" y="134" width="16" height="50" rx="7" fill="#FFFDFB" stroke={INK} strokeWidth="3" />
      <rect x="150" y="134" width="16" height="50" rx="7" fill="#FFFDFB" stroke={INK} strokeWidth="3" />
      <rect x="172" y="134" width="16" height="50" rx="7" fill="#FFFDFB" stroke={INK} strokeWidth="3" />
      <path d="M78 176h16v8H78ZM102 176h16v8h-16ZM150 176h16v8h-16ZM172 176h16v8h-16Z" fill={INK} />
      <ellipse cx="128" cy="118" rx="68" ry="36" fill="#FFFDFB" stroke={INK} strokeWidth="3" />
      <path d="M166 104 190 46c6-12 30-12 38 4l14 28c6 12-4 22-16 20l-26-4-16 34Z" fill="#FFFDFB" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M196 44c-2-12 4-20 12-22 2 10 0 18-4 24Z" fill="#FFFDFB" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M186 50c-10 14-18 32-22 50" fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" />
      <path d="M92 92c6 16 6 36 0 52" {...stripe} />
      <path d="M112 86c6 20 6 44 0 64" {...stripe} />
      <path d="M132 84c6 22 6 46 0 68" {...stripe} />
      <path d="M152 88c6 18 6 40 0 58" {...stripe} />
      <path d="M180 92l14 6M186 76l14 6" {...stripe} />
      <Eye x={212} y={64} r={5} />
      <ellipse cx="236" cy="88" rx="9" ry="7" fill={INK} />
    </Frame>
  );
}

export function Queen() {
  return (
    <Frame>
      <path d="M86 192c0-34 22-52 54-52s54 18 54 52Z" fill="#9B7EC8" />
      <path d="M112 146c8 12 48 12 56 0l-8-10h-40Z" fill="#FFFDFB" />
      <path d="M92 104c-6 30 4 46 20 52h56c16-6 26-22 20-52Z" fill="#8B5E3C" />
      <circle cx="140" cy="106" r="40" fill="#F6C3A8" />
      <Eye x={126} y={104} />
      <Eye x={154} y={104} />
      <path d="M126 122c8 8 20 8 28 0" fill="none" stroke="#C96478" strokeWidth="4" strokeLinecap="round" />
      <circle cx="114" cy="116" r="7" fill="#F4A8B0" opacity="0.7" />
      <circle cx="166" cy="116" r="7" fill="#F4A8B0" opacity="0.7" />
      <path d="M100 74 106 30l18 22 16-30 16 30 18-22 6 44Z" fill="#F6D56B" stroke="#E0B84A" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="140" cy="60" r="6" fill="#E07A8A" />
      <circle cx="116" cy="62" r="4" fill="#5E9BCB" />
      <circle cx="164" cy="62" r="4" fill="#5E9BCB" />
    </Frame>
  );
}

export function MapScene() {
  return (
    <Frame>
      <path d="M44 62 106 44l68 18 62-18v106l-62 18-68-18-62 18Z" fill="#F7E7C4" stroke="#C9A66B" strokeWidth="4" strokeLinejoin="round" />
      <path d="M106 44v106M174 62v106" stroke="#C9A66B" strokeWidth="3" />
      <path d="M62 132c18-30 34-6 50-26s32 6 46-12 30-10 44-26" fill="none" stroke="#5E9BCB" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 12" />
      <path d="M196 62l16 16M212 62l-16 16" stroke="#E0574F" strokeWidth="6" strokeLinecap="round" />
      <path d="M62 82c8-10 20-10 28 0" fill="none" stroke="#8FBF78" strokeWidth="5" strokeLinecap="round" />
    </Frame>
  );
}

export function PinScene() {
  return (
    <Frame>
      <path d="M140 118v62" stroke="#9AA7B8" strokeWidth="7" strokeLinecap="round" />
      <rect x="108" y="44" width="64" height="16" rx="8" fill="#C94F60" />
      <path d="M118 60h44l-8 44h-28Z" fill="#E07A8A" />
      <rect x="100" y="102" width="80" height="18" rx="9" fill="#C94F60" />
    </Frame>
  );
}

export function NetScene() {
  return (
    <Frame>
      <path d="M58 178 146 100" stroke="#C9846A" strokeWidth="9" strokeLinecap="round" />
      <path d="M136 74c2 48 30 78 56 72 22-8 28-40 24-72Z" fill="#EAF3FA" stroke="#A9CBE8" strokeWidth="3" />
      <path d="M150 92c18 10 36 10 56 0M156 116c14 8 30 8 46 0M164 78c-2 30 10 54 28 66M190 78c2 28-2 50-10 68" fill="none" stroke="#A9CBE8" strokeWidth="3" />
      <ellipse cx="176" cy="74" rx="42" ry="14" fill="none" stroke="#8B5E3C" strokeWidth="7" />
    </Frame>
  );
}

export function PotScene() {
  return (
    <Frame>
      <path d="M116 60c-6-10 6-14 0-24M140 58c-6-10 6-14 0-24M164 60c-6-10 6-14 0-24" fill="none" stroke="#C7CED6" strokeWidth="5" strokeLinecap="round" />
      <rect x="44" y="110" width="32" height="16" rx="8" fill="#6F8499" />
      <rect x="204" y="110" width="32" height="16" rx="8" fill="#6F8499" />
      <rect x="72" y="92" width="136" height="88" rx="18" fill="#8FA3B8" />
      <rect x="60" y="80" width="160" height="18" rx="9" fill="#6F8499" />
      <circle cx="140" cy="74" r="10" fill="#6F8499" />
      <path d="M88 118c0-8 4-12 10-12" fill="none" stroke="#C7D3DF" strokeWidth="6" strokeLinecap="round" />
    </Frame>
  );
}

export function TopScene() {
  return (
    <Frame>
      <rect x="131" y="30" width="18" height="46" rx="9" fill="#5E9BCB" />
      <path d="M76 96h128l-56 80c-4 6-12 6-16 0Z" fill="#E07A8A" />
      <path d="M92 118h96l-14 20h-68Z" fill="#F6D56B" />
      <rect x="70" y="74" width="140" height="26" rx="13" fill="#8FBF78" />
      <path d="M50 150c-10 4-14 10-12 16M230 150c10 4 14 10 12 16" fill="none" stroke="#C7CED6" strokeWidth="5" strokeLinecap="round" />
    </Frame>
  );
}

export function MopScene() {
  return (
    <Frame>
      <path d="M196 28 126 132" stroke="#C9846A" strokeWidth="9" strokeLinecap="round" />
      <rect x="92" y="122" width="72" height="18" rx="9" fill="#5E9BCB" transform="rotate(-8 128 131)" />
      <path
        d="M90 140c-6 16-14 28-10 44M104 142c-4 16-8 30-4 44M118 142c-2 16-2 30 2 44M132 140c2 16 4 30 10 42M146 138c4 14 10 28 18 40M158 134c6 14 16 24 26 36"
        fill="none"
        stroke="#F2E6D0"
        strokeWidth="10"
        strokeLinecap="round"
      />
    </Frame>
  );
}

export function CapScene() {
  return (
    <Frame>
      <path d="M68 150a70 74 0 0 1 140 0Z" fill="#5E9BCB" />
      <path d="M196 132c34 0 58 10 62 26-24 6-52 2-72-8Z" fill="#3F78A8" />
      <path d="M68 150h140" stroke="#3F78A8" strokeWidth="6" strokeLinecap="round" />
      <path d="M138 78c-18 16-28 40-30 72M138 78c18 16 28 40 30 72" fill="none" stroke="#3F78A8" strokeWidth="3" />
      <circle cx="138" cy="76" r="7" fill="#3F78A8" />
    </Frame>
  );
}

export function CanScene() {
  return (
    <Frame>
      <rect x="92" y="64" width="96" height="120" rx="12" fill="#C7CED6" />
      <rect x="92" y="98" width="96" height="54" fill="#E07A8A" />
      <circle cx="140" cy="125" r="16" fill="#F6D56B" />
      <ellipse cx="140" cy="64" rx="48" ry="13" fill="#E3E8EE" stroke="#AEB8C4" strokeWidth="3" />
      <path d="M96 78c26 12 62 12 88 0M96 164c26 12 62 12 88 0" fill="none" stroke="#AEB8C4" strokeWidth="3" />
    </Frame>
  );
}

export function BatScene() {
  return (
    <Frame>
      <path d="M140 96c-22-34-64-40-104-18 22 2 30 14 30 30 14-8 26-4 32 10 10-10 26-10 42 0Z" fill="#7B6FA8" />
      <path d="M140 96c22-34 64-40 104-18-22 2-30 14-30 30-14-8-26-4-32 10-10-10-26-10-42 0Z" fill="#7B6FA8" />
      <ellipse cx="140" cy="112" rx="26" ry="34" fill="#5F548C" />
      <path d="M122 80l-6-22 16 12ZM158 80l6-22-16 12Z" fill="#5F548C" />
      <circle cx="131" cy="100" r="6" fill="#FFFDFB" />
      <circle cx="149" cy="100" r="6" fill="#FFFDFB" />
      <Eye x={131} y={101} r={3} />
      <Eye x={149} y={101} r={3} />
      <path d="M132 116c5 5 11 5 16 0" fill="none" stroke="#FFFDFB" strokeWidth="3" strokeLinecap="round" />
    </Frame>
  );
}

export function NutScene() {
  return (
    <Frame>
      <path d="M140 30c2 10 2 16 0 24" stroke="#8B5E3C" strokeWidth="7" strokeLinecap="round" />
      <path d="M92 104c0 44 22 76 48 82 26-6 48-38 48-82Z" fill="#D9A066" />
      <path d="M84 104c0-32 24-52 56-52s56 20 56 52c0 6-4 8-10 8H94c-6 0-10-2-10-8Z" fill="#8B5E3C" />
      <path d="M100 84h80M96 98h88M112 70h56" stroke="#734A2C" strokeWidth="3" strokeLinecap="round" />
      <path d="M112 128c0 16 6 30 14 38" fill="none" stroke="#EDC79A" strokeWidth="6" strokeLinecap="round" />
    </Frame>
  );
}

export function RugScene() {
  return (
    <Frame>
      <path d="M52 100h176l24 70H28Z" fill="#E07A8A" />
      <path d="M62 114h156l6 16H56ZM50 146h180l6 14H44Z" fill="#F6D56B" />
      <path d="M52 100l-6-10M76 100l-4-10M100 100l-2-10M124 100v-10M148 100v-10M172 100l2-10M196 100l4-10M220 100l6-10" stroke="#C94F60" strokeWidth="4" strokeLinecap="round" />
      <path d="M30 170l-6 10M62 170l-4 10M94 170l-2 10M126 170v10M158 170l2 10M190 170l4 10M222 170l6 10M250 170l6 10" stroke="#C94F60" strokeWidth="4" strokeLinecap="round" />
    </Frame>
  );
}

export function JugScene() {
  return (
    <Frame>
      <path d="M184 86c34-4 46 16 42 40s-22 36-46 30" fill="none" stroke="#3F78A8" strokeWidth="12" strokeLinecap="round" />
      <path d="M92 60h86l10 14-6 96c-1 9-8 14-16 14h-56c-8 0-15-5-16-14L88 76l-22-12Z" fill="#5E9BCB" />
      <path d="M96 104h84l-4 66c-1 9-8 14-16 14h-44c-8 0-15-5-16-14Z" fill="#B7D7F2" />
      <path d="M92 60h86" stroke="#3F78A8" strokeWidth="6" strokeLinecap="round" />
    </Frame>
  );
}

export function BunScene() {
  return (
    <Frame>
      <path d="M60 150c0-46 34-78 80-78s80 32 80 78c0 14-10 24-24 24H84c-14 0-24-10-24-24Z" fill="#E0A45E" />
      <path d="M72 150c0-8 6-12 14-12h108c8 0 14 4 14 12" fill="none" stroke="#C4863F" strokeWidth="5" strokeLinecap="round" />
      <path d="M112 96l8 4M140 88l8 4M166 100l8 4M124 118l8 4M156 122l8 4M96 122l8 4M182 126l8 4" stroke="#FBF1DC" strokeWidth="6" strokeLinecap="round" />
    </Frame>
  );
}

export function TapScene() {
  return (
    <Frame>
      <rect x="36" y="86" width="26" height="60" rx="8" fill="#AEB8C4" />
      <path d="M62 100h92c20 0 34 14 34 34v14h-30v-14c0-4-2-6-6-6H62Z" fill="#C7CED6" />
      <rect x="112" y="62" width="16" height="40" rx="6" fill="#AEB8C4" />
      <rect x="90" y="48" width="60" height="18" rx="9" fill="#E07A8A" />
      <rect x="154" y="146" width="38" height="10" rx="5" fill="#AEB8C4" />
      <path d="M173 164c-8 12-10 18-10 22a10 10 0 0 0 20 0c0-4-2-10-10-22Z" fill="#7FB8DE" />
    </Frame>
  );
}

export function SadScene() {
  return (
    <Frame>
      <circle cx="140" cy="106" r="66" fill="#F6D56B" />
      <Eye x={116} y={94} r={7} />
      <Eye x={164} y={94} r={7} />
      <path d="M112 142c14-16 42-16 56 0" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d="M100 84l22-10M180 84l-22-10" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <path d="M172 108c-6 10-8 14-8 18a8 8 0 0 0 16 0c0-4-2-8-8-18Z" fill="#7FB8DE" />
    </Frame>
  );
}

export const letterScenes = {
  igloo: Igloo,
  octopus: Octopus,
  umbrella: Umbrella,
  yoyo: Yoyo,
  zebra: Zebra,
  queen: Queen,
  map: MapScene,
  pin: PinScene,
  net: NetScene,
  pot: PotScene,
  top: TopScene,
  mop: MopScene,
  cap: CapScene,
  can: CanScene,
  bat: BatScene,
  nut: NutScene,
  rug: RugScene,
  jug: JugScene,
  bun: BunScene,
  tap: TapScene,
  sad: SadScene,
};
