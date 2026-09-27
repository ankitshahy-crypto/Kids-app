import type { ReactNode } from "react";
import type { PictogramKind } from "../data/sheets";

function Frame({ children }: { children: ReactNode }) {
  return (
    <svg className="pictogram" viewBox="0 0 120 100" aria-hidden="true">
      {children}
    </svg>
  );
}

export function Pictogram({ kind }: { kind: PictogramKind }) {
  if (kind === "moon") {
    return (
      <Frame>
        <circle cx="58" cy="50" r="28" fill="#F6D77A" />
        <circle cx="72" cy="42" r="22" fill="#fffdfb" />
      </Frame>
    );
  }
  if (kind === "tent") {
    return (
      <Frame>
        <path d="M18 82 60 18l42 64Z" fill="#F4A261" />
        <path d="M60 82V40" stroke="#C9845A" strokeWidth="4" />
      </Frame>
    );
  }
  if (kind === "igloo") {
    return (
      <Frame>
        <path d="M16 78a44 44 0 0 1 88 0Z" fill="#E4EEF8" />
        <path d="M48 78V58h24v20" fill="#fffdfb" stroke="#B7C9DC" strokeWidth="3" />
      </Frame>
    );
  }
  if (kind === "nest") {
    return (
      <Frame>
        <ellipse cx="60" cy="68" rx="36" ry="16" fill="#E0A03A" />
        <ellipse cx="60" cy="62" rx="22" ry="14" fill="#F6D7BE" />
        <ellipse cx="60" cy="58" rx="10" ry="12" fill="#F2C14E" />
      </Frame>
    );
  }
  if (kind === "octopus") {
    return (
      <Frame>
        <circle cx="60" cy="40" r="22" fill="#E07A8A" />
        <path d="M28 58c8 20 8 20 0 28M44 62c6 18 6 18 0 26M60 64c4 16 4 16 0 24M76 62c-6 18-6 18 0 26M92 58c-8 20-8 20 0 28" fill="none" stroke="#E07A8A" strokeWidth="6" strokeLinecap="round" />
      </Frame>
    );
  }
  if (kind === "umbrella") {
    return (
      <Frame>
        <path d="M20 48a40 40 0 0 1 80 0Z" fill="#7EAE86" />
        <path d="M60 48v28a10 10 0 0 0 16 6" fill="none" stroke="#4f7d58" strokeWidth="4" strokeLinecap="round" />
      </Frame>
    );
  }
  if (kind === "goat") {
    return (
      <Frame>
        <ellipse cx="62" cy="62" rx="28" ry="20" fill="#E7E0D6" />
        <circle cx="86" cy="48" r="14" fill="#F4F0EA" />
        <path d="M78 38 74 22M94 38l4-16" stroke="#C4B4A4" strokeWidth="3" strokeLinecap="round" />
      </Frame>
    );
  }
  if (kind === "egg") {
    return (
      <Frame>
        <ellipse cx="60" cy="54" rx="24" ry="30" fill="#FFF6EA" stroke="#E7C39A" strokeWidth="3" />
      </Frame>
    );
  }
  if (kind === "rain") {
    return (
      <Frame>
        <ellipse cx="58" cy="40" rx="28" ry="16" fill="#D4E5F7" />
        <path d="M40 66v12M58 70v14M76 66v12" stroke="#7EA0C4" strokeWidth="4" strokeLinecap="round" />
      </Frame>
    );
  }
  if (kind === "leaf") {
    return (
      <Frame>
        <path d="M28 70c28-48 64-40 68-8-28 8-48 8-68 8Z" fill="#7EAE86" />
        <path d="M36 66c16-16 32-22 48-24" fill="none" stroke="#4f7d58" strokeWidth="3" />
      </Frame>
    );
  }
  if (kind === "kite") {
    return (
      <Frame>
        <path d="M60 16 88 48 60 80 32 48Z" fill="#F2C14E" />
        <path d="M60 80c8 8 14 8 22 4" fill="none" stroke="#E07A8A" strokeWidth="3" strokeLinecap="round" />
      </Frame>
    );
  }
  if (kind === "jet") {
    return (
      <Frame>
        <path d="M16 54h70l16-10v20L86 58H16Z" fill="#B7C9DC" />
        <path d="M48 50 36 28h14l12 22" fill="#8AA4BE" />
      </Frame>
    );
  }
  if (kind === "wagon") {
    return (
      <Frame>
        <rect x="22" y="40" width="62" height="28" rx="6" fill="#E07A8A" />
        <circle cx="38" cy="76" r="8" fill="#2C3A4F" />
        <circle cx="74" cy="76" r="8" fill="#2C3A4F" />
      </Frame>
    );
  }
  if (kind === "van") {
    return (
      <Frame>
        <path d="M18 66V44h48l16 16v6Z" fill="#F4A261" />
        <circle cx="36" cy="70" r="8" fill="#2C3A4F" />
        <circle cx="72" cy="70" r="8" fill="#2C3A4F" />
      </Frame>
    );
  }
  if (kind === "yak") {
    return (
      <Frame>
        <ellipse cx="58" cy="60" rx="30" ry="22" fill="#8C6A4A" />
        <circle cx="86" cy="46" r="12" fill="#A07C58" />
        <path d="M40 48c-6 10-4 16 2 16M52 44c-4 12-2 18 4 16" stroke="#6B4E34" strokeWidth="3" strokeLinecap="round" />
      </Frame>
    );
  }
  if (kind === "zoo") {
    return (
      <Frame>
        <rect x="28" y="36" width="64" height="44" rx="6" fill="#E4EEF8" />
        <path d="M36 36v44M52 36v44M68 36v44M84 36v44" stroke="#B7C9DC" strokeWidth="3" />
      </Frame>
    );
  }
  if (kind === "box") {
    return (
      <Frame>
        <path d="M24 40h72v40H24Z" fill="#E7C39A" />
        <path d="M24 40 60 24l36 16" fill="#F3D3BC" />
      </Frame>
    );
  }
  return (
    <Frame>
      <rect x="26" y="34" width="68" height="48" rx="8" fill="#D7EEE3" />
      <path d="M26 48h68M48 34v48" stroke="#7EAE86" strokeWidth="3" />
    </Frame>
  );
}
