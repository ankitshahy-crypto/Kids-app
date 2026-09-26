import type { ReactNode } from "react";

export function PictureCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="picture-card" role="img" aria-label={label}>
      <span className="card-dot card-dot-peach" aria-hidden="true" />
      <span className="card-dot card-dot-blue" aria-hidden="true" />
      {children}
    </div>
  );
}
