import type { ReactNode } from "react";

/**
 * Original flat pictures for the word ladder.
 * Simple geometry made for this app. Nothing here is traced from another product.
 */

function Frame({ children }: { children: ReactNode }) {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <ellipse cx="140" cy="192" rx="72" ry="10" fill="#E7D5C6" opacity="0.7" />
      {children}
    </svg>
  );
}

export function OneApple() {
  return (
    <Frame>
      <circle cx="140" cy="118" r="46" fill="#E07A8A" />
      <ellipse cx="140" cy="118" rx="46" ry="18" fill="#F4A8B0" opacity="0.35" />
      <path d="M140 74c8-18 22-22 28-18" fill="none" stroke="#6E9A62" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="156" cy="62" rx="14" ry="8" fill="#8FBF78" transform="rotate(-20 156 62)" />
    </Frame>
  );
}

export function Me() {
  return (
    <Frame>
      <circle cx="140" cy="78" r="28" fill="#F6C3A8" />
      <circle cx="130" cy="76" r="3" fill="#2C3A4F" />
      <circle cx="150" cy="76" r="3" fill="#2C3A4F" />
      <path d="M130 88c6 6 14 6 20 0" fill="none" stroke="#E07A8A" strokeWidth="3" strokeLinecap="round" />
      <path d="M112 112c8 28 48 28 56 0" fill="#B7D7F2" />
      <path d="M118 118c-16 8-18 28-8 36" fill="none" stroke="#F6C3A8" strokeWidth="10" strokeLinecap="round" />
      <path d="M162 118c16 8 18 28 8 36" fill="none" stroke="#F6C3A8" strokeWidth="10" strokeLinecap="round" />
    </Frame>
  );
}

export function Spot() {
  return (
    <Frame>
      <rect x="78" y="132" width="124" height="28" rx="8" fill="#F6D7BE" />
      <circle cx="140" cy="108" r="16" fill="#F6C3CB" />
      <path d="M140 92v-22" stroke="#C9846A" strokeWidth="4" strokeLinecap="round" />
    </Frame>
  );
}

export function Inside() {
  return (
    <Frame>
      <path d="M70 150h140l-16-70H86Z" fill="#E4C7A4" />
      <path d="M86 80h108l-10 18H96Z" fill="#F6E3B4" />
      <circle cx="140" cy="118" r="18" fill="#B7D7F2" />
    </Frame>
  );
}

export function Toy() {
  return (
    <Frame>
      <circle cx="140" cy="118" r="40" fill="#F6C3CB" />
      <circle cx="140" cy="118" r="16" fill="#F6E3B4" />
      <path d="M140 78v80M100 118h80" stroke="#E7A0B0" strokeWidth="4" />
    </Frame>
  );
}

export function Balloon() {
  return (
    <Frame>
      <ellipse cx="140" cy="96" rx="36" ry="46" fill="#E4D4F2" />
      <path d="M140 142c0 18 8 28 0 40" fill="none" stroke="#C9846A" strokeWidth="3" strokeLinecap="round" />
      <path d="M132 140h16l-8 10Z" fill="#F6C3CB" />
    </Frame>
  );
}

export function Stacked() {
  return (
    <Frame>
      <rect x="86" y="128" width="108" height="28" rx="6" fill="#C9E6D4" />
      <rect x="108" y="92" width="64" height="36" rx="8" fill="#F7F1E8" stroke="#E4C7A4" strokeWidth="4" />
    </Frame>
  );
}

export function Wave() {
  return (
    <Frame>
      <circle cx="140" cy="86" r="26" fill="#F6C3A8" />
      <path d="M114 118c10 24 42 24 52 0" fill="#F6D56B" />
      <path d="M96 96c-18-8-22-28-8-34" fill="none" stroke="#F6C3A8" strokeWidth="10" strokeLinecap="round" />
      <path d="M184 96c18-8 22-28 8-34" fill="none" stroke="#F6C3A8" strokeWidth="10" strokeLinecap="round" />
    </Frame>
  );
}

export function LampGlow() {
  return (
    <Frame>
      <path d="M108 130h64l10 28H98Z" fill="#E4C7A4" />
      <path d="M118 130c0-36 44-36 44 0" fill="#F6E3B4" />
      <rect x="132" y="156" width="16" height="18" fill="#C9846A" />
    </Frame>
  );
}

export function Ant() {
  return (
    <Frame>
      <ellipse cx="140" cy="128" rx="28" ry="18" fill="#6E5A4E" />
      <ellipse cx="140" cy="100" rx="16" ry="14" fill="#6E5A4E" />
      <circle cx="140" cy="78" r="12" fill="#6E5A4E" />
      <path d="M128 74c-16-16-28-8-30 2M152 74c16-16 28-8 30 2" fill="none" stroke="#6E5A4E" strokeWidth="3" strokeLinecap="round" />
      <path d="M118 120 96 104M162 120 184 104M120 136 100 154M160 136 180 154" stroke="#6E5A4E" strokeWidth="3" strokeLinecap="round" />
    </Frame>
  );
}

export function Frog() {
  return (
    <Frame>
      <ellipse cx="140" cy="132" rx="58" ry="32" fill="#8FBF78" />
      <circle cx="108" cy="96" r="22" fill="#8FBF78" />
      <circle cx="172" cy="96" r="22" fill="#8FBF78" />
      <circle cx="108" cy="96" r="10" fill="#F7F1E8" />
      <circle cx="172" cy="96" r="10" fill="#F7F1E8" />
      <circle cx="108" cy="96" r="5" fill="#2C3A4F" />
      <circle cx="172" cy="96" r="5" fill="#2C3A4F" />
      <path d="M124 128c10 10 22 10 32 0" fill="none" stroke="#2C3A4F" strokeWidth="3" strokeLinecap="round" />
    </Frame>
  );
}

export function Jumper() {
  return (
    <Frame>
      <circle cx="150" cy="70" r="16" fill="#F6C3A8" />
      <path d="M150 88c8 16 6 28-8 36" fill="none" stroke="#B7D7F2" strokeWidth="12" strokeLinecap="round" />
      <path d="M142 108 118 92M146 118 168 138" fill="none" stroke="#F6C3A8" strokeWidth="8" strokeLinecap="round" />
      <path d="M136 124c-16 10-20 22-8 28" fill="none" stroke="#2C3A4F" strokeWidth="6" strokeLinecap="round" />
    </Frame>
  );
}

export function Fish() {
  return (
    <Frame>
      <ellipse cx="132" cy="118" rx="52" ry="28" fill="#F6A35C" />
      <path d="M176 118 210 90v56Z" fill="#F6C3CB" />
      <circle cx="108" cy="112" r="5" fill="#2C3A4F" />
      <path d="M96 124c10 6 18 6 26 0" fill="none" stroke="#E07A5A" strokeWidth="3" strokeLinecap="round" />
    </Frame>
  );
}

export function Milk() {
  return (
    <Frame>
      <path d="M112 70h56l10 96H102Z" fill="#F7F1E8" stroke="#E4C7A4" strokeWidth="4" />
      <rect x="124" y="54" width="32" height="18" rx="4" fill="#B7D7F2" />
    </Frame>
  );
}

export function Nest() {
  return (
    <Frame>
      <ellipse cx="140" cy="142" rx="62" ry="22" fill="#E0A06A" />
      <ellipse cx="140" cy="136" rx="40" ry="12" fill="#F6D7BE" />
      <ellipse cx="124" cy="112" rx="14" ry="18" fill="#F7F1E8" />
      <ellipse cx="156" cy="112" rx="14" ry="18" fill="#F6E3B4" />
    </Frame>
  );
}

export function Lamp() {
  return (
    <Frame>
      <path d="M96 128h88L168 78H112Z" fill="#F6E3B4" />
      <rect x="132" y="128" width="16" height="36" fill="#C9846A" />
      <rect x="112" y="162" width="56" height="10" rx="4" fill="#E4C7A4" />
    </Frame>
  );
}

export function Sand() {
  return (
    <Frame>
      <path d="M40 150h200c-20 20-180 20-200 0Z" fill="#F6E3B4" />
      <circle cx="168" cy="96" r="22" fill="#F6D56B" />
      <path d="M70 150c20-28 40-28 52 0" fill="#F4D9A0" />
    </Frame>
  );
}

export function Hand() {
  return (
    <Frame>
      <path d="M108 150V92a10 10 0 0 1 20 0v40" fill="#F6C3A8" stroke="#E7B097" strokeWidth="3" />
      <path d="M128 108V78a10 10 0 0 1 20 0v52" fill="#F6C3A8" stroke="#E7B097" strokeWidth="3" />
      <path d="M148 112V86a10 10 0 0 1 20 0v48" fill="#F6C3A8" stroke="#E7B097" strokeWidth="3" />
      <path d="M100 120c-16 8-16 28-4 36 28 16 80 16 96-8 6-10-2-22-14-18l-18 8v-28a10 10 0 0 0-20 0v28" fill="#F6C3A8" stroke="#E7B097" strokeWidth="3" />
    </Frame>
  );
}

export function StopSign() {
  return (
    <Frame>
      <path d="M140 58 184 78v48l-44 22-44-22V78Z" fill="#F6C3CB" stroke="#E7A0B0" strokeWidth="4" />
      <rect x="132" y="148" width="16" height="28" fill="#C9846A" />
    </Frame>
  );
}

export function Drum() {
  return (
    <Frame>
      <ellipse cx="140" cy="96" rx="58" ry="16" fill="#F6D56B" />
      <path d="M82 96v36c0 12 26 22 58 22s58-10 58-22V96" fill="#E07A8A" />
      <ellipse cx="140" cy="132" rx="58" ry="16" fill="#C45A6A" />
      <path d="M70 70 108 100M210 70 172 100" stroke="#C9846A" strokeWidth="5" strokeLinecap="round" />
    </Frame>
  );
}

export function Tent() {
  return (
    <Frame>
      <path d="M48 158 140 62l92 96Z" fill="#F6E3B4" stroke="#E4C7A4" strokeWidth="4" />
      <path d="M140 78v80" stroke="#C9846A" strokeWidth="4" />
      <path d="M118 158 140 118l22 40" fill="#E7D5C6" />
    </Frame>
  );
}

export function Plant() {
  return (
    <Frame>
      <path d="M124 158h32l-6-28h-20Z" fill="#E0A06A" />
      <rect x="136" y="96" width="8" height="40" fill="#6E9A62" />
      <ellipse cx="140" cy="88" rx="28" ry="16" fill="#8FBF78" />
      <ellipse cx="112" cy="100" rx="18" ry="10" fill="#8FBF78" />
      <ellipse cx="168" cy="100" rx="18" ry="10" fill="#8FBF78" />
    </Frame>
  );
}

export function Grape() {
  return (
    <Frame>
      <circle cx="140" cy="128" r="16" fill="#C9B4E4" />
      <circle cx="122" cy="116" r="16" fill="#B7A0D8" />
      <circle cx="158" cy="116" r="16" fill="#B7A0D8" />
      <circle cx="132" cy="100" r="16" fill="#C9B4E4" />
      <circle cx="150" cy="100" r="16" fill="#D4C2EE" />
      <path d="M146 84c8-16 20-18 24-12" fill="none" stroke="#6E9A62" strokeWidth="4" strokeLinecap="round" />
    </Frame>
  );
}

export function Smile() {
  return (
    <Frame>
      <circle cx="140" cy="112" r="52" fill="#F6D56B" />
      <circle cx="122" cy="102" r="6" fill="#2C3A4F" />
      <circle cx="158" cy="102" r="6" fill="#2C3A4F" />
      <path d="M114 122c12 18 40 18 52 0" fill="none" stroke="#2C3A4F" strokeWidth="4" strokeLinecap="round" />
    </Frame>
  );
}

export const ladderScenes = {
  one: OneApple,
  me: Me,
  spot: Spot,
  inside: Inside,
  toy: Toy,
  balloon: Balloon,
  stacked: Stacked,
  wave: Wave,
  lampglow: LampGlow,
  ant: Ant,
  frog: Frog,
  jumper: Jumper,
  fish: Fish,
  milk: Milk,
  nest: Nest,
  lamp: Lamp,
  sand: Sand,
  hand: Hand,
  stopsign: StopSign,
  drum: Drum,
  tent: Tent,
  plant: Plant,
  grape: Grape,
  smile: Smile,
};
