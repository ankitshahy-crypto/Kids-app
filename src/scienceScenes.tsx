import type { ReactNode } from "react";

/**
 * Pictures for the Science section.
 *
 * Why this file exists: on the first phone test every "picture" in Science
 * was a colored dot (a class name with a background color). A seed, a wing,
 * a den and "rough" were all dots, so no game could be understood. These are
 * the drawings the rebuilt games need and the app did not have.
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

/** A seed lying in a little soil. */
export function SeedScene() {
  return (
    <Frame>
      <path d="M40 176c20-26 60-40 100-40s80 14 100 40Z" fill="#B98A62" />
      <path d="M52 176c22-18 54-28 88-28s66 10 88 28Z" fill="#A67850" />
      <path d="M140 96c20 0 34 16 34 34s-14 26-34 26-34-8-34-26 14-34 34-34Z" fill="#8D5A3B" />
      <path d="M128 110c-8 8-10 20-6 30" fill="none" stroke="#B98A62" strokeWidth="5" strokeLinecap="round" />
    </Frame>
  );
}

/** A sprout: two small leaves just out of the soil. */
export function SproutScene() {
  return (
    <Frame>
      <path d="M40 180c20-22 60-32 100-32s80 10 100 32Z" fill="#A67850" />
      <path d="M140 152V96" fill="none" stroke="#6E9A74" strokeWidth="8" strokeLinecap="round" />
      <path d="M140 110c-30 2-46-18-42-38 26-2 42 14 42 38Z" fill="#8FCB9E" />
      <path d="M140 100c28 0 44-18 40-38-26 0-40 14-40 38Z" fill="#79B98C" />
    </Frame>
  );
}

/** A caterpillar on a leaf. */
export function CaterpillarScene() {
  return (
    <Frame>
      <path d="M30 150c40-34 170-40 222 0-52 30-182 30-222 0Z" fill="#9BD1A8" />
      <path d="M40 150h200" fill="none" stroke="#79B98C" strokeWidth="4" strokeLinecap="round" />
      <circle cx="84" cy="118" r="24" fill="#B7DB6E" />
      <circle cx="120" cy="112" r="24" fill="#A5CF58" />
      <circle cx="156" cy="116" r="24" fill="#B7DB6E" />
      <circle cx="192" cy="108" r="28" fill="#A5CF58" />
      <path d="M182 82c-6-14-2-24 8-28M202 82c6-14 14-18 22-16" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <Eye x={184} y={104} />
      <Eye x={204} y={104} />
      <path d="M186 118c6 6 12 6 18 0" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <path d="M76 140v10M96 142v10M116 138v12M148 140v12M166 140v10" fill="none" stroke="#7FA23E" strokeWidth="5" strokeLinecap="round" />
    </Frame>
  );
}

/** A chrysalis hanging from a twig. */
export function ChrysalisScene() {
  return (
    <Frame>
      <path d="M36 44h208" fill="none" stroke="#9A6B4A" strokeWidth="12" strokeLinecap="round" />
      <path d="M196 44c14-12 26-12 36-6" fill="none" stroke="#9A6B4A" strokeWidth="6" strokeLinecap="round" />
      <path d="M140 50v16" fill="none" stroke="#7E5538" strokeWidth="5" strokeLinecap="round" />
      <path d="M140 62c26 0 38 28 34 62-4 30-16 52-34 56-18-4-30-26-34-56-4-34 8-62 34-62Z" fill="#9CC48A" />
      <path d="M112 100c18 8 38 8 56 0M108 128c20 8 44 8 64 0M116 156c16 6 32 6 48 0" fill="none" stroke="#7FA86C" strokeWidth="4" strokeLinecap="round" />
      <path d="M126 76c-6 10-8 22-6 34" fill="none" stroke="#C4E2B6" strokeWidth="5" strokeLinecap="round" />
    </Frame>
  );
}

/** A butterfly with its wings open. */
export function ButterflyScene() {
  return (
    <Frame>
      <path d="M136 100C110 50 60 34 36 58c-18 20-6 56 30 62 28 4 54-6 70-20Z" fill="#F29BB4" />
      <path d="M144 100c26-50 76-66 100-42 18 20 6 56-30 62-28 4-54-6-70-20Z" fill="#F29BB4" />
      <path d="M136 108c-26 4-52 22-50 48 2 22 30 26 44 6 8-12 10-34 6-54Z" fill="#F6C3A8" />
      <path d="M144 108c26 4 52 22 50 48-2 22-30 26-44 6-8-12-10-34-6-54Z" fill="#F6C3A8" />
      <circle cx="76" cy="80" r="12" fill="#FFF6EA" />
      <circle cx="204" cy="80" r="12" fill="#FFF6EA" />
      <circle cx="108" cy="148" r="8" fill="#FFF6EA" />
      <circle cx="172" cy="148" r="8" fill="#FFF6EA" />
      <rect x="132" y="70" width="16" height="100" rx="8" fill="#5F548C" />
      <circle cx="140" cy="66" r="12" fill="#5F548C" />
      <path d="M134 56c-6-14-16-20-26-18M146 56c6-14 16-20 26-18" fill="none" stroke="#5F548C" strokeWidth="4" strokeLinecap="round" />
    </Frame>
  );
}

/** A pond with reeds: where a fish or a frog lives. */
export function PondScene() {
  return (
    <Frame>
      <ellipse cx="140" cy="140" rx="116" ry="50" fill="#9BD1A8" />
      <ellipse cx="140" cy="140" rx="96" ry="38" fill="#8EB4D6" />
      <path d="M84 132c14-6 28-6 40 0M150 152c14-6 28-6 40 0" fill="none" stroke="#B7D7F2" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="176" cy="126" rx="20" ry="8" fill="#79B98C" />
      <path d="M176 126l14-6" stroke="#8EB4D6" strokeWidth="4" strokeLinecap="round" />
      <path d="M46 138V70M58 142V86M34 144V96" fill="none" stroke="#6E9A74" strokeWidth="6" strokeLinecap="round" />
      <rect x="40" y="56" width="12" height="30" rx="6" fill="#8D5A3B" />
      <rect x="52" y="72" width="12" height="28" rx="6" fill="#8D5A3B" />
    </Frame>
  );
}

/**
 * A splash in the pond: what Build's pond block does ("If at the pond, splash."), as a picture for the
 * same rule in If, then.
 */
export function SplashScene() {
  return (
    <Frame>
      <ellipse cx="140" cy="150" rx="116" ry="44" fill="#9BD1A8" />
      <ellipse cx="140" cy="150" rx="96" ry="34" fill="#8EB4D6" />
      <ellipse cx="140" cy="150" rx="54" ry="18" fill="none" stroke="#B7D7F2" strokeWidth="5" />
      <ellipse cx="140" cy="150" rx="26" ry="9" fill="#B7D7F2" />
      <path d="M140 136V62" fill="none" stroke="#8EB4D6" strokeWidth="14" strokeLinecap="round" />
      <path d="M112 128c-6-20-10-36-6-54M168 128c6-20 10-36 6-54" fill="none" stroke="#8EB4D6" strokeWidth="10" strokeLinecap="round" />
      <circle cx="140" cy="46" r="8" fill="#8EB4D6" />
      <circle cx="100" cy="60" r="6" fill="#8EB4D6" />
      <circle cx="180" cy="60" r="6" fill="#8EB4D6" />
      <circle cx="82" cy="92" r="5" fill="#B7D7F2" />
      <circle cx="198" cy="92" r="5" fill="#B7D7F2" />
      <circle cx="124" cy="36" r="4" fill="#B7D7F2" />
      <circle cx="158" cy="30" r="4" fill="#B7D7F2" />
    </Frame>
  );
}

/** A beehive on a branch. */
export function HiveScene() {
  return (
    <Frame>
      <path d="M30 40h220" fill="none" stroke="#9A6B4A" strokeWidth="12" strokeLinecap="round" />
      <path d="M140 46v14" fill="none" stroke="#7E5538" strokeWidth="6" strokeLinecap="round" />
      <path d="M140 58c40 0 62 18 62 40 0 10-4 16-8 20 8 4 10 12 10 20 0 10-6 16-12 20 4 4 6 8 6 14H82c0-6 2-10 6-14-6-4-12-10-12-20 0-8 2-16 10-20-4-4-8-10-8-20 0-22 22-40 62-40Z" fill="#F2C14E" />
      <path d="M86 118h108M78 138h124M84 158h112" fill="none" stroke="#D9A234" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="140" cy="152" rx="16" ry="18" fill="#7A5A22" />
      <ellipse cx="226" cy="96" rx="12" ry="9" fill="#F6D56B" stroke={INK} strokeWidth="3" />
      <ellipse cx="222" cy="86" rx="8" ry="6" fill="#DCEBF8" />
    </Frame>
  );
}

/** A dog house. */
export function KennelScene() {
  return (
    <Frame>
      <rect x="70" y="98" width="140" height="88" rx="6" fill="#E7B089" />
      <path d="M54 104l86-66 86 66Z" fill="#C9644F" />
      <path d="M62 104l78-60 78 60" fill="none" stroke="#A84E3D" strokeWidth="5" strokeLinejoin="round" />
      <path d="M112 186v-42a28 28 0 0 1 56 0v42Z" fill="#5E4433" />
      <rect x="118" y="100" width="44" height="12" rx="6" fill="#FFF6EA" />
      <path d="M90 186h100" stroke="#C9845A" strokeWidth="4" strokeLinecap="round" />
    </Frame>
  );
}

/** A flower with a round middle. */
export function FlowerScene() {
  return (
    <Frame>
      <path d="M140 186V104" fill="none" stroke="#6E9A74" strokeWidth="8" strokeLinecap="round" />
      <path d="M140 150c-26 2-42-12-42-30 22-2 38 10 42 30ZM140 164c24 0 40-12 42-30-22-2-38 10-42 30Z" fill="#79B98C" />
      <g fill="#F29BB4">
        <circle cx="140" cy="42" r="24" />
        <circle cx="178" cy="62" r="24" />
        <circle cx="170" cy="102" r="24" />
        <circle cx="110" cy="102" r="24" />
        <circle cx="102" cy="62" r="24" />
      </g>
      <circle cx="140" cy="76" r="22" fill="#F6D56B" />
    </Frame>
  );
}

/** Snow falling on a snowy hill, with a snowman. */
export function SnowScene() {
  return (
    <Frame>
      <rect x="20" y="16" width="240" height="170" rx="24" fill="#DCEBF8" />
      <path d="M20 150c50-22 110-22 240 0v12a24 24 0 0 1-24 24H44a24 24 0 0 1-24-24Z" fill="#FFFDFB" />
      <circle cx="140" cy="136" r="30" fill="#FFFDFB" stroke="#C5D5E0" strokeWidth="3" />
      <circle cx="140" cy="92" r="22" fill="#FFFDFB" stroke="#C5D5E0" strokeWidth="3" />
      <Eye x={133} y={88} r={3} />
      <Eye x={147} y={88} r={3} />
      <path d="M140 94l14 5-14 3Z" fill="#F0A23C" />
      <g fill="#FFFDFB">
        <circle cx="56" cy="46" r="6" />
        <circle cx="96" cy="70" r="5" />
        <circle cx="200" cy="44" r="6" />
        <circle cx="228" cy="86" r="5" />
        <circle cx="182" cy="76" r="4" />
        <circle cx="64" cy="104" r="5" />
        <circle cx="130" cy="38" r="5" />
      </g>
    </Frame>
  );
}

/** One eye. */
export function EyeScene() {
  return (
    <Frame>
      <path d="M36 104c30-44 70-62 104-62s74 18 104 62c-30 44-70 62-104 62S66 148 36 104Z" fill="#FFFDFB" stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <circle cx="140" cy="104" r="38" fill="#7BA7D1" />
      <circle cx="140" cy="104" r="18" fill={INK} />
      <circle cx="152" cy="92" r="8" fill="#FFFDFB" />
      <path d="M60 58l-10-14M96 38l-6-16M140 30V12M184 38l6-16M220 58l10-14" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
    </Frame>
  );
}

/** One ear. */
export function EarScene() {
  return (
    <Frame>
      <path d="M150 26c44 0 70 32 70 70 0 30-16 44-30 60-10 12-10 28-30 30-22 2-38-14-38-34 0-12 8-20 6-34-2-12-18-16-18-40 0-30 18-52 40-52Z" fill="#F6C9B0" stroke="#D99B7C" strokeWidth="5" />
      <path d="M148 58c26 0 40 18 40 40 0 20-12 28-20 40-6 8-6 18-14 18" fill="none" stroke="#D99B7C" strokeWidth="7" strokeLinecap="round" />
      <path d="M140 92c8-8 22-6 24 6 2 10-8 14-14 22" fill="none" stroke="#D99B7C" strokeWidth="7" strokeLinecap="round" />
      <path d="M52 78c-10 14-10 34 0 48M76 86c-6 10-6 22 0 32" fill="none" stroke="#8EB4D6" strokeWidth="6" strokeLinecap="round" />
    </Frame>
  );
}

/** A nose. */
export function NoseScene() {
  return (
    <Frame>
      <path d="M140 24c14 0 20 12 22 30 4 30 34 62 34 90 0 18-16 30-32 30-10 0-16-6-24-6s-14 6-24 6c-16 0-32-12-32-30 0-28 30-60 34-90 2-18 8-30 22-30Z" fill="#F6C9B0" stroke="#D99B7C" strokeWidth="5" />
      <ellipse cx="116" cy="150" rx="12" ry="8" fill="#B9785C" />
      <ellipse cx="164" cy="150" rx="12" ry="8" fill="#B9785C" />
      <path d="M132 50c-2 20-10 40-18 56" fill="none" stroke="#FBE3D4" strokeWidth="7" strokeLinecap="round" />
    </Frame>
  );
}

/** A mouth with the tongue out: taste. */
export function MouthScene() {
  return (
    <Frame>
      <path d="M40 92c30-26 60-30 100-10 40-20 70-16 100 10-20 50-60 76-100 76S60 142 40 92Z" fill="#E07A8A" />
      <path d="M58 98c50 14 114 14 164 0-18 36-50 56-82 56s-64-20-82-56Z" fill="#8C3B4A" />
      <path d="M72 100c44 10 92 10 136 0v8c-44 10-92 10-136 0Z" fill="#FFFDFB" />
      <path d="M108 136c10-8 54-8 64 0 6 24-6 50-32 50s-38-26-32-50Z" fill="#F29BB4" />
      <path d="M140 138v32" fill="none" stroke="#E07A9A" strokeWidth="4" strokeLinecap="round" />
    </Frame>
  );
}

/** A grey rock. */
export function RockScene() {
  return (
    <Frame>
      <path d="M48 176c-10-34 6-70 34-86 14-22 54-30 84-18 34 4 66 34 68 70 2 18-6 28-14 34Z" fill="#9AA3AD" />
      <path d="M82 90c18 8 30 22 34 42M166 72c-6 20-4 40 8 58M118 132c20-4 38-2 56-2" fill="none" stroke="#7E8791" strokeWidth="5" strokeLinecap="round" />
      <path d="M70 124c2-12 8-20 18-26" fill="none" stroke="#C3CAD1" strokeWidth="6" strokeLinecap="round" />
    </Frame>
  );
}

export const scienceScenes = {
  seed: SeedScene,
  sprout: SproutScene,
  caterpillar: CaterpillarScene,
  chrysalis: ChrysalisScene,
  butterfly: ButterflyScene,
  pond: PondScene,
  splash: SplashScene,
  hive: HiveScene,
  kennel: KennelScene,
  flower: FlowerScene,
  snow: SnowScene,
  eye: EyeScene,
  ear: EarScene,
  nose: NoseScene,
  mouth: MouthScene,
  rock: RockScene,
};
