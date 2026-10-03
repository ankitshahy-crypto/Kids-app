import type { ReactNode } from "react";

/**
 * Pictures for the Time & Money games.
 *
 * These games used to show words to read ("Wake", "Eat", "Tidy toys"). A
 * child who cannot read yet needs a picture to tap, so each of those words
 * has a drawing here. Same style as the other scene files: flat shapes in a
 * 280 by 210 box, made for this app.
 */

function Frame({ children }: { children: ReactNode }) {
  return (
    <svg className="art" viewBox="0 0 280 210" aria-hidden="true">
      <ellipse cx="140" cy="192" rx="72" ry="10" fill="#E7D5C6" opacity="0.7" />
      {children}
    </svg>
  );
}

/** Waking up: the sun comes up behind a bed with the covers thrown back. */
function Wake() {
  return (
    <Frame>
      <circle cx="198" cy="74" r="34" fill="#F9D35F" />
      <path d="M198 22v-12M236 36l9-9M250 74h12M160 36l-9-9" stroke="#F9D35F" strokeWidth="7" strokeLinecap="round" />
      <rect x="40" y="96" width="20" height="84" rx="8" fill="#C48F5C" />
      <rect x="40" y="132" width="200" height="36" rx="10" fill="#D9A877" />
      <rect x="224" y="118" width="18" height="62" rx="8" fill="#C48F5C" />
      <rect x="62" y="112" width="58" height="26" rx="12" fill="#FFFDFB" />
      <path d="M118 132h106c8 0 14 6 14 14v8H118Z" fill="#9CCBE8" />
      <path d="M118 132c18-22 40-22 52-6" fill="none" stroke="#7FB8DE" strokeWidth="8" strokeLinecap="round" />
    </Frame>
  );
}

/** Eating: a bowl with a spoon. */
function Bowl() {
  return (
    <Frame>
      <rect x="182" y="46" width="12" height="96" rx="6" fill="#AEB8C4" transform="rotate(24 188 94)" />
      <ellipse cx="210" cy="50" rx="13" ry="18" fill="#C7CED6" transform="rotate(24 210 50)" />
      <path d="M48 104h176c0 46-34 76-88 76s-88-30-88-76Z" fill="#7FB8DE" />
      <ellipse cx="136" cy="104" rx="88" ry="18" fill="#FBF1DC" />
      <circle cx="104" cy="102" r="9" fill="#E0A45E" />
      <circle cx="134" cy="98" r="9" fill="#E07A5F" />
      <circle cx="164" cy="104" r="9" fill="#E0A45E" />
      <circle cx="122" cy="110" r="7" fill="#F6D56B" />
      <rect x="96" y="176" width="80" height="10" rx="5" fill="#5E9CC8" />
    </Frame>
  );
}

/** School: a small schoolhouse with a bell and a flag. */
function School() {
  return (
    <Frame>
      <rect x="64" y="96" width="152" height="90" rx="6" fill="#F2B8A2" />
      <path d="M52 100l88-58 88 58Z" fill="#E07A5F" />
      <rect x="128" y="30" width="24" height="26" rx="4" fill="#FBF1DC" />
      <circle cx="140" cy="44" r="6" fill="#F2C14E" />
      <rect x="200" y="20" width="5" height="50" fill="#8A6A4A" />
      <path d="M205 22h30l-8 10 8 10h-30Z" fill="#6E9A74" />
      <rect x="122" y="134" width="36" height="52" rx="6" fill="#8A6A4A" />
      <circle cx="150" cy="162" r="3" fill="#F2C14E" />
      <rect x="80" y="116" width="28" height="28" rx="4" fill="#CFE6F7" />
      <rect x="172" y="116" width="28" height="28" rx="4" fill="#CFE6F7" />
      <path d="M94 116v28M80 130h28M186 116v28M172 130h28" stroke="#FFFDFB" strokeWidth="3" />
    </Frame>
  );
}

/** Tidying toys: a toy box with a ball, a block and a bear's ear showing. */
function ToyBox() {
  return (
    <Frame>
      <circle cx="96" cy="84" r="26" fill="#E07A8A" />
      <path d="M72 78c16-8 32-8 48 0" fill="none" stroke="#FFFDFB" strokeWidth="5" strokeLinecap="round" />
      <rect x="128" y="62" width="40" height="40" rx="6" fill="#F2C14E" transform="rotate(-10 148 82)" />
      <circle cx="198" cy="76" r="16" fill="#C4863F" />
      <circle cx="198" cy="76" r="8" fill="#E0A45E" />
      <rect x="48" y="100" width="184" height="84" rx="10" fill="#7FB8DE" />
      <rect x="48" y="100" width="184" height="18" rx="9" fill="#5E9CC8" />
      <path d="M126 150l10 10 20-22" fill="none" stroke="#FFFDFB" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

/** Feeding the pet: a pet bowl heaped with food, and a bone on its side. */
function PetBowl() {
  return (
    <Frame>
      <path d="M78 116c10-22 40-34 62-34s52 12 62 34Z" fill="#C4863F" />
      <circle cx="112" cy="104" r="8" fill="#A66B2E" />
      <circle cx="140" cy="94" r="8" fill="#A66B2E" />
      <circle cx="168" cy="104" r="8" fill="#A66B2E" />
      <path d="M52 116h176l-16 62c-2 6-6 8-12 8H80c-6 0-10-2-12-8Z" fill="#E58FA6" />
      <rect x="46" y="110" width="188" height="16" rx="8" fill="#D0718B" />
      <path d="M114 146h52" stroke="#FFFDFB" strokeWidth="14" strokeLinecap="round" />
      <circle cx="110" cy="140" r="8" fill="#FFFDFB" />
      <circle cx="110" cy="152" r="8" fill="#FFFDFB" />
      <circle cx="170" cy="140" r="8" fill="#FFFDFB" />
      <circle cx="170" cy="152" r="8" fill="#FFFDFB" />
    </Frame>
  );
}

/** Helping at home: a broom sweeping up a little pile. */
function Broom() {
  return (
    <Frame>
      <rect x="150" y="18" width="12" height="118" rx="6" fill="#C48F5C" transform="rotate(28 156 77)" />
      <path d="M84 122l64 34-22 34c-22 2-56-16-66-36Z" fill="#F2C14E" />
      <path d="M84 122l64 34-6 10-64-34Z" fill="#E07A5F" />
      <path d="M76 148l34 20M88 140l34 20M70 160l28 16" stroke="#D9A23B" strokeWidth="4" strokeLinecap="round" />
      <circle cx="196" cy="176" r="7" fill="#C7CED6" />
      <circle cx="214" cy="182" r="5" fill="#AEB8C4" />
      <circle cx="182" cy="184" r="4" fill="#AEB8C4" />
    </Frame>
  );
}

/** A cup of lemonade with a straw and a slice of lemon. */
function Lemonade() {
  return (
    <Frame>
      <rect x="150" y="22" width="10" height="90" rx="5" fill="#E07A8A" transform="rotate(14 155 67)" />
      <path d="M84 70h112l-14 106c-1 8-6 12-14 12h-56c-8 0-13-4-14-12Z" fill="#FBF1DC" />
      <path d="M92 104h96l-10 72c-1 8-6 12-14 12h-48c-8 0-13-4-14-12Z" fill="#F9D976" />
      <circle cx="196" cy="74" r="24" fill="#F6D56B" />
      <circle cx="196" cy="74" r="17" fill="#FBF1C8" />
      <path d="M196 57v34M179 74h34M184 62l24 24M208 62l-24 24" stroke="#F6D56B" strokeWidth="3" />
      <rect x="80" y="64" width="120" height="12" rx="6" fill="#E7D5C6" />
    </Frame>
  );
}

/** The paper crown a child saves for. */
function Crown() {
  return (
    <Frame>
      <path d="M60 164V84l36 34 44-58 44 58 36-34v80Z" fill="#F2C14E" />
      <rect x="60" y="150" width="160" height="26" rx="8" fill="#E0A45E" />
      <circle cx="140" cy="60" r="10" fill="#E07A8A" />
      <circle cx="60" cy="84" r="9" fill="#7FB8DE" />
      <circle cx="220" cy="84" r="9" fill="#7FB8DE" />
      <circle cx="100" cy="163" r="6" fill="#FFFDFB" />
      <circle cx="140" cy="163" r="6" fill="#E07A8A" />
      <circle cx="180" cy="163" r="6" fill="#FFFDFB" />
    </Frame>
  );
}

export const gameScenes = {
  wake: Wake,
  bowl: Bowl,
  school: School,
  toybox: ToyBox,
  petbowl: PetBowl,
  broom: Broom,
  lemonade: Lemonade,
  crown: Crown,
};
