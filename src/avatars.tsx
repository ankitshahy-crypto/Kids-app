import type { JSX } from "react";
import type { AnimalId } from "./data/animals";

function Eyes({ left = 46, right = 74, y = 62 }: { left?: number; right?: number; y?: number }) {
  return (
    <>
      <ellipse cx={left} cy={y} rx="5" ry="6.2" fill="#2C3A4F" />
      <ellipse cx={right} cy={y} rx="5" ry="6.2" fill="#2C3A4F" />
      <circle cx={left + 1.6} cy={y - 2} r="1.6" fill="#fff" />
      <circle cx={right + 1.6} cy={y - 2} r="1.6" fill="#fff" />
    </>
  );
}

function CatAvatar() {
  return (
    <svg className="avatar-art" viewBox="0 0 120 120" aria-hidden="true">
      <path d="M34 58 28 22l26 28Z" fill="#F6B07A" />
      <path d="M86 58 92 22 66 50Z" fill="#F6B07A" />
      <path d="M38 54 34 32l16 18Z" fill="#F6C3CB" />
      <path d="M82 54 86 32 70 50Z" fill="#F6C3CB" />
      <circle cx="60" cy="66" r="34" fill="#F4A261" />
      <ellipse cx="60" cy="78" rx="16" ry="12" fill="#FFF1E0" />
      <Eyes />
      <path d="M60 70 55 76h10Z" fill="#E07A8A" />
      <path d="M44 74h12M64 74h12" stroke="#2C3A4F" strokeWidth="1.6" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

function DogAvatar() {
  return (
    <svg className="avatar-art" viewBox="0 0 120 120" aria-hidden="true">
      <ellipse cx="28" cy="72" rx="12" ry="20" fill="#C9845A" />
      <ellipse cx="92" cy="70" rx="12" ry="18" fill="#C9845A" />
      <circle cx="60" cy="66" r="34" fill="#E0A06A" />
      <ellipse cx="60" cy="80" rx="18" ry="13" fill="#F6D7BE" />
      <ellipse cx="60" cy="74" rx="7" ry="5.5" fill="#2C3A4F" />
      <Eyes y={58} />
      <path d="M54 84c4 8 10 8 14 0" fill="#F2A3A8" />
    </svg>
  );
}

function FoxAvatar() {
  return (
    <svg className="avatar-art" viewBox="0 0 120 120" aria-hidden="true">
      <path d="M32 56 26 18l28 30Z" fill="#F09455" />
      <path d="M88 56 94 18 66 48Z" fill="#F09455" />
      <path d="M36 52 32 28l16 18Z" fill="#F6C9B0" />
      <path d="M84 52 88 28 72 46Z" fill="#F6C9B0" />
      <circle cx="60" cy="68" r="32" fill="#E8874A" />
      <ellipse cx="60" cy="82" rx="16" ry="12" fill="#FFF6EA" />
      <ellipse cx="60" cy="76" rx="6" ry="4.5" fill="#2C3A4F" />
      <Eyes y={60} />
    </svg>
  );
}

function BearAvatar() {
  return (
    <svg className="avatar-art" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="30" cy="36" r="14" fill="#C4A484" />
      <circle cx="90" cy="36" r="14" fill="#C4A484" />
      <circle cx="30" cy="36" r="7" fill="#E7CDB4" />
      <circle cx="90" cy="36" r="7" fill="#E7CDB4" />
      <circle cx="60" cy="70" r="34" fill="#D7B08C" />
      <ellipse cx="60" cy="82" rx="16" ry="12" fill="#F6E6D4" />
      <ellipse cx="60" cy="76" rx="6" ry="4.5" fill="#2C3A4F" />
      <Eyes y={62} />
    </svg>
  );
}

function BunnyAvatar() {
  return (
    <svg className="avatar-art" viewBox="0 0 120 120" aria-hidden="true">
      <ellipse cx="42" cy="28" rx="10" ry="24" fill="#F7D5E0" />
      <ellipse cx="78" cy="28" rx="10" ry="24" fill="#F7D5E0" />
      <ellipse cx="42" cy="30" rx="5" ry="16" fill="#F8C2D2" />
      <ellipse cx="78" cy="30" rx="5" ry="16" fill="#F8C2D2" />
      <circle cx="60" cy="74" r="32" fill="#FBE4EC" />
      <Eyes y={70} />
      <path d="M60 78 56 83h8Z" fill="#E07A8A" />
      <path d="M52 88c5 5 11 5 16 0" fill="none" stroke="#2C3A4F" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function OwlAvatar() {
  return (
    <svg className="avatar-art" viewBox="0 0 120 120" aria-hidden="true">
      <path d="M36 40 28 22l18 14Z" fill="#C9B27C" />
      <path d="M84 40 92 22 74 36Z" fill="#C9B27C" />
      <ellipse cx="60" cy="70" rx="34" ry="32" fill="#E6D7A8" />
      <circle cx="46" cy="66" r="14" fill="#FFF8EE" />
      <circle cx="74" cy="66" r="14" fill="#FFF8EE" />
      <circle cx="46" cy="66" r="6" fill="#2C3A4F" />
      <circle cx="74" cy="66" r="6" fill="#2C3A4F" />
      <circle cx="48" cy="64" r="2" fill="#fff" />
      <circle cx="76" cy="64" r="2" fill="#fff" />
      <path d="M60 76 54 84h12Z" fill="#E0A15A" />
    </svg>
  );
}

function FrogAvatar() {
  return (
    <svg className="avatar-art" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="38" cy="40" r="16" fill="#8FCB7A" />
      <circle cx="82" cy="40" r="16" fill="#8FCB7A" />
      <circle cx="38" cy="40" r="7" fill="#2C3A4F" />
      <circle cx="82" cy="40" r="7" fill="#2C3A4F" />
      <circle cx="40" cy="38" r="2" fill="#fff" />
      <circle cx="84" cy="38" r="2" fill="#fff" />
      <ellipse cx="60" cy="78" rx="36" ry="28" fill="#A8D992" />
      <path d="M40 80c8 12 32 12 40 0" fill="none" stroke="#2C3A4F" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="46" cy="74" rx="6" ry="4" fill="#F4B0AE" opacity="0.8" />
      <ellipse cx="74" cy="74" rx="6" ry="4" fill="#F4B0AE" opacity="0.8" />
    </svg>
  );
}

function DuckAvatar() {
  return (
    <svg className="avatar-art" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="64" r="34" fill="#F6C445" />
      <ellipse cx="78" cy="74" rx="18" ry="10" fill="#F09A3A" />
      <path d="M64 74h22" stroke="#C46B22" strokeWidth="2" strokeLinecap="round" />
      <Eyes left={48} right={68} y={58} />
    </svg>
  );
}

function PigAvatar() {
  return (
    <svg className="avatar-art" viewBox="0 0 120 120" aria-hidden="true">
      <path d="M32 50 30 26l20 16Z" fill="#F4A9B8" />
      <path d="M88 50 90 26 70 42Z" fill="#F4A9B8" />
      <circle cx="60" cy="68" r="34" fill="#F8C4D0" />
      <ellipse cx="60" cy="80" rx="15" ry="10" fill="#F0A0B4" />
      <circle cx="54" cy="80" r="3" fill="#2C3A4F" />
      <circle cx="66" cy="80" r="3" fill="#2C3A4F" />
      <Eyes y={60} />
    </svg>
  );
}

function PenguinAvatar() {
  return (
    <svg className="avatar-art" viewBox="0 0 120 120" aria-hidden="true">
      <ellipse cx="60" cy="68" rx="34" ry="36" fill="#2C3A4F" />
      <ellipse cx="60" cy="76" rx="24" ry="26" fill="#FFF8EE" />
      <circle cx="46" cy="60" r="10" fill="#FFF8EE" />
      <circle cx="74" cy="60" r="10" fill="#FFF8EE" />
      <circle cx="47" cy="61" r="4.5" fill="#2C3A4F" />
      <circle cx="75" cy="61" r="4.5" fill="#2C3A4F" />
      <circle cx="48.5" cy="59.5" r="1.4" fill="#fff" />
      <circle cx="76.5" cy="59.5" r="1.4" fill="#fff" />
      <path d="M52 72h16l-8 10Z" fill="#F09A3A" />
    </svg>
  );
}

function LionAvatar() {
  return (
    <svg className="avatar-art" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="66" r="44" fill="#D98B3E" />
      <circle cx="60" cy="66" r="32" fill="#F2C069" />
      <ellipse cx="60" cy="80" rx="16" ry="12" fill="#FBE4B8" />
      <ellipse cx="60" cy="74" rx="6" ry="4.5" fill="#2C3A4F" />
      <path d="M52 86c4 5 12 5 16 0" fill="none" stroke="#2C3A4F" strokeWidth="2" strokeLinecap="round" />
      <Eyes y={60} />
    </svg>
  );
}

function KoalaAvatar() {
  return (
    <svg className="avatar-art" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="26" cy="52" r="18" fill="#A9A6AE" />
      <circle cx="94" cy="52" r="18" fill="#A9A6AE" />
      <circle cx="26" cy="52" r="9" fill="#E9C9CF" />
      <circle cx="94" cy="52" r="9" fill="#E9C9CF" />
      <circle cx="60" cy="68" r="34" fill="#C6C3CB" />
      <ellipse cx="60" cy="76" rx="9" ry="12" fill="#2C3A4F" />
      <Eyes y={60} />
    </svg>
  );
}

const avatars: Record<AnimalId, () => JSX.Element> = {
  cat: CatAvatar,
  dog: DogAvatar,
  fox: FoxAvatar,
  bear: BearAvatar,
  bunny: BunnyAvatar,
  owl: OwlAvatar,
  frog: FrogAvatar,
  duck: DuckAvatar,
  pig: PigAvatar,
  penguin: PenguinAvatar,
  lion: LionAvatar,
  koala: KoalaAvatar,
};

export function Avatar({ animal }: { animal: AnimalId }) {
  const Art = avatars[animal];
  return <Art />;
}
