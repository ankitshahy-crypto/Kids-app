import type { ReactNode } from "react";
export function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon lock-icon">
      <rect x="5" y="10" width="14" height="10" rx="2" fill="currentColor" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function PencilMark() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="mark">
      <rect x="27" y="14" width="10" height="28" rx="2" fill="#F2C14E" />
      <rect x="27" y="10" width="10" height="6" rx="1" fill="#E07A5F" />
      <rect x="30" y="8" width="4" height="4" rx="1" fill="#5d7d64" />
      <path d="M27 42h10l-5 12z" fill="#F4C7B0" />
    </svg>
  );
}

export function BookMark() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="mark">
      <path d="M8 16h22c3 8 3 24 0 32H8V16z" fill="#F7F1E6" />
      <path d="M56 16H34c-3 8-3 24 0 32h22V16z" fill="#FFFDFB" />
      <path d="M32 18v28" stroke="#E7C9A8" strokeWidth="2" />
      <path d="M18 28c4 2 8 2 12 0" fill="none" stroke="#F4A4B4" strokeWidth="3" strokeLinecap="round" />
      <path d="M16 44h8l-2 6h-4z" fill="#E07A5F" />
    </svg>
  );
}

export function ShapesMark() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="mark">
      <circle cx="16" cy="40" r="10" fill="#F4A4B4" />
      <path d="M34 50 46 26l12 24z" fill="#8FCB7A" />
      <text x="40" y="22" textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--text-warm)" fontFamily="Fredoka, sans-serif">
        3
      </text>
    </svg>
  );
}

/** The color moment: three paint drops. */
export function PaintMark() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="mark">
      <path d="M18 14c-6 8-9 13-9 18a9 9 0 0 0 18 0c0-5-3-10-9-18z" fill="#F4A4B4" />
      <path d="M40 22c-5 7-8 11-8 15a8 8 0 0 0 16 0c0-4-3-8-8-15z" fill="#8FCB7A" />
      <path d="M50 40c-4 5-6 8-6 11a6 6 0 0 0 12 0c0-3-2-6-6-11z" fill="#7EA3C9" />
    </svg>
  );
}

export function ToyBox() {
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true" className="mark">
      <path d="M14 34 24 18h32l10 16" fill="#CDE8D4" />
      <rect x="12" y="32" width="56" height="32" rx="8" fill="#8FCBB8" />
      <circle cx="30" cy="46" r="7" fill="#F4A4B4" />
      <circle cx="46" cy="50" r="6" fill="#F2C14E" />
      <path d="M58 28 62 18l6 8z" fill="#E2A15A" />
    </svg>
  );
}

/**
 * The nest of the round-plush set: a simple woven bowl, the one on the app icon, with no eggs.
 * Whatever sits in it (the child's animal) goes between its back and its front, so it sits in the
 * nest and not on it.
 */
export function Nest({ children }: { children?: ReactNode }) {
  return (
    <span className="plush-nest mark" aria-hidden="true">
      <svg className="nest-back" viewBox="0 0 80 80">
        <ellipse cx="40" cy="52" rx="30" ry="7" fill="#8D5A3B" />
        <path d="M13 51l-4-6M11 52l6-5M67 51l4-6M69 52l-6-5" fill="none" stroke="#8D5A3B" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 52l5-4M68 52l-5-4" fill="none" stroke="#D7A87A" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      {children ? <span className="nest-sitter">{children}</span> : null}
      <svg className="nest-front" viewBox="0 0 80 80">
        <path d="M10 52c6 10 54 10 60 0c-2 14-14 20-30 20S12 66 10 52Z" fill="#A86F45" />
        <path d="M13 56c8 9 46 9 54 0" fill="none" stroke="#7E4E30" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M16 60c8 8 40 8 48 0" fill="none" stroke="#D7A87A" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M21 64c6 6 32 6 38 0" fill="none" stroke="#7E4E30" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M22 54l-2 8M31 56l-2 10M40 57l-1 12M49 56l2 10M58 54l2 8" fill="none" stroke="#D7A87A" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M10 52c6 10 54 10 60 0" fill="none" stroke="#C48B58" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function Hills() {
  return (
    <svg className="hills" viewBox="0 0 400 240" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 90c70-50 120 40 190 10s120-40 210-10v150H0Z" fill="#E5F3EA" />
      <path d="M0 140c80-40 130 30 210 8 70-20 120 10 190-8v100H0Z" fill="#F8E4D6" />
      <path d="M0 190c90-24 150 16 400-10v60H0Z" fill="#FBF6EE" />
      <circle cx="70" cy="150" r="4" fill="#7EAE86" opacity="0.45" />
      <circle cx="300" cy="120" r="6" fill="#F4A4B4" opacity="0.45" />
    </svg>
  );
}

export function StarJar() {
  return (
    <svg viewBox="0 0 120 140" aria-hidden="true" className="jar-art">
      <rect x="46" y="8" width="28" height="14" rx="4" fill="#E2A15A" />
      <path d="M28 36h64l8 78a28 18 0 0 1-80 0z" fill="#E7F6FB" stroke="#C5DCE8" strokeWidth="3" />
      <path d="M36 78l6 4-2 6h-8l-2-6z" fill="#F4A4B4" />
      <path d="M58 70l6 4-2 6h-8l-2-6z" fill="#F2C14E" />
      <path d="M78 84l6 4-2 6h-8l-2-6z" fill="#8FCB7A" />
      <path d="M48 96l6 4-2 6h-8l-2-6z" fill="#9EC0E8" />
      <path d="M70 102l6 4-2 6h-8l-2-6z" fill="#E2A15A" />
    </svg>
  );
}

export function CheckBadge() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="check-badge">
      <circle cx="12" cy="12" r="10" fill="#7EAE86" />
      <path d="M7 12.5 10.2 16 17 8.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function TabGlyph({ name }: { name: "classes" | "roster" | "goals" | "jar" | "certificates" | "notes" }) {
  if (name === "classes") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
        <path fill="currentColor" d="M4 10.5 12 4l8 6.5V20H4z" />
      </svg>
    );
  }
  if (name === "roster") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
        <circle cx="8" cy="9" r="3" fill="currentColor" />
        <circle cx="16" cy="9" r="3" fill="currentColor" />
        <path fill="currentColor" d="M3 19c1-3 3-4 5-4s4 1 5 4H3zm8 0c.4-2 2-3.2 4-3.2 2.2 0 3.8 1.2 4.6 3.2H11z" />
      </svg>
    );
  }
  if (name === "goals") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      </svg>
    );
  }
  if (name === "jar") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
        <path fill="currentColor" d="M9 3h6v2H9zM7 7h10l1 12a5 3 0 0 1-12 0z" />
      </svg>
    );
  }
  if (name === "certificates") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
        <circle cx="12" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
        <path fill="currentColor" d="m9 15 1 6 2-2 2 2 1-6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path fill="currentColor" d="M6 4h12v14l-6-3-6 3z" />
    </svg>
  );
}
